import { InsightDataset, InsightError } from "./IInsightFacade";
import JSZip from "jszip";
import * as fs from "fs";
import * as path from "path";
import { Dataset } from "./Dataset";
import { Section } from "./Section";

const folderPath: string = path.resolve(__dirname, "..", "..", "data");

export function encodeToBase64Url(str: string): string {
	return Buffer.from(str, "utf-8")
		.toString("base64") // Standard Base64
		.replace(/\+/g, "-") // Replace + with -
		.replace(/\//g, "_") // Replace / with _
		.replace(/=+$/, ""); // Remove trailing =
}

export class DatasetProcessor {
	private datasets: InsightDataset[] = [];
	private ids: Record<string, string> = {};

	private async loadData(): Promise<void> {
		try {
			const datasetFiles = await this.getDataFiles();
			await this.getData(datasetFiles);
		} catch {}
	}

	public async parseFiles(zip: string): Promise<Section[]> {
		try {
			const zipBuffer = Buffer.from(zip, "base64");
			const data = await JSZip.loadAsync(zipBuffer);
			const courses = Object.keys(data.files).filter((file) => file.startsWith("courses/"));

			const filePromises = courses.map(async (filePath) => {
				try {
					const fileContent = await data.files[filePath].async("string");
					const json = JSON.parse(fileContent);
					return json.result;
				} catch {
					return null;
				}
			});

			const result = (await Promise.all(filePromises)).filter(Boolean);
			return this.validateSections(result.flat());
		} catch {
			throw new InsightError("Invalid zip file given.");
		}
	}

	private validateSections(json: Record<string, any>[]): Section[] {
		const result = [];
		for (const item of json) {
			try {
				if (this.hasRequiredQueryKeys(item)) {
					result.push(new Section(item));
				}
			} catch {}
		}

		return result;
	}

	private hasRequiredQueryKeys(json: Record<string, unknown>): boolean {
		const requiredKeys = ["id", "Course", "Title", "Professor", "Subject", "Year", "Avg", "Pass", "Fail", "Audit"];
		return requiredKeys.every((key) => key in json);
	}

	private async getData(files: string[]): Promise<void> {
		try {
			const cachedFiles = new Set(Object.values(this.ids));
			const loadNeeded = files.filter((file) => !cachedFiles.has(path.basename(file, ".json")));

			const jsonDataPromises = loadNeeded.map(async (file) => {
				const filePath = path.join(folderPath, file);
				const content = await fs.promises.readFile(filePath, "utf-8");
				const data = JSON.parse(content);
				this.datasets.push({
					id: data.id,
					kind: data.kind,
					numRows: data.numRows,
				});
				this.ids[data.id] = encodeToBase64Url(data.id);
			});
			await Promise.all(jsonDataPromises);
			return;
		} catch (err) {
			throw new InsightError(`Unexpected error thrown: ${err}`);
		}
	}

	private async getDataFiles(): Promise<string[]> {
		try {
			return await fs.promises.readdir(folderPath);
		} catch (err) {
			throw new InsightError(`Unexpected error thrown: ${err}`);
		}
	}

	public async hasDataset(id: string): Promise<boolean> {
		await this.loadData();
		return id in this.ids;
	}

	public async getFilename(id: string): Promise<string> {
		return encodeToBase64Url(id);
	}

	public async addDataset(dataset: Dataset): Promise<string[]> {
		this.datasets.push({
			id: dataset.id,
			kind: dataset.kind,
			numRows: dataset.numRows,
		});
		this.ids[dataset.id] = encodeToBase64Url(dataset.id);
		return Object.keys(this.ids);
	}

	public async removeDataset(id: string): Promise<string> {
		const filename = this.ids[id as keyof typeof this.ids];
		const filePath = path.join(folderPath, `${filename}.json`);

		fs.unlink(filePath, (err) => {
			if (err) {
				throw new InsightError(`Error removing dataset: ${err}`);
			}
		});
		this.datasets = this.datasets.filter((dataset) => dataset.id !== id);
		delete this.ids[id];
		return id;
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		await this.loadData();
		return this.datasets;
	}

	public async getDataset(id: string): Promise<Dataset> {
		if (!(id in this.ids)) {
			await this.loadData();
		}
		const filename = `${this.ids[id]}.json`;
		const filePath = path.join(folderPath, filename);
		try {
			const content = await fs.promises.readFile(filePath, "utf-8");
			const data = JSON.parse(content);
			return new Dataset(data.id, data.sections, data.kind);
		} catch (err) {
			throw new InsightError(`Unexpected error occurred: ${err}`);
		}
	}
}
