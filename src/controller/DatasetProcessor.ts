import { InsightDataset, InsightError } from "./IInsightFacade";
import JSZip from "jszip";
import * as fs from "fs-extra";
import * as path from "path";
import { Dataset } from "./Dataset";
import { Section } from "./Section";

const folderPath: string = path.resolve(__dirname, "..", "..", "data");

export function encodeToBase64Url(str: string): string {
	return Buffer.from(str, "utf-8").toString("base64url");
}

function decodeFromBase64Url(str: string): string {
	return Buffer.from(str, "base64url").toString("utf-8");
}

class DatasetCache {
	private static instance: DatasetCache;
	private datasets: Dataset[] = [];
	private ids: Record<string, string> = {};

	public static getInstance(): DatasetCache {
		if (!DatasetCache.instance) {
			DatasetCache.instance = new DatasetCache();
		}
		return DatasetCache.instance;
	}

	private async loadDataset(id: string): Promise<void> {
		if (!(id in this.ids)) {
			try {
				const filePath = path.join(folderPath, `${encodeToBase64Url(id)}.json`);
				fs.readFile(filePath, "utf-8", (err, data) => {
					if (err) {
						throw new InsightError("Error loading dataset from disk.");
					}
					const content = JSON.parse(data);
					this.datasets.push(
						new Dataset(
							content.id,
							content.sections.map((section: any) => new Section(section)),
							content.kind
						)
					);
					this.ids[id] = encodeToBase64Url(id);
				});
			} catch (err) {
				throw new InsightError(`Unexpected error thrown: ${err}`);
			}
		}
	}

	private async loadAllDatasets(): Promise<void> {
		if (!(await this.folderExists())) {
			this.datasets = [];
			this.ids = {};
			return;
		}

		const files = await this.getDataFiles();
		const cachedFiles = new Set(Object.values(this.ids));
		const loadNeeded = files.filter((file) => !cachedFiles.has(file));
		const filePromises = loadNeeded.map(async (filename) => {
			const id = decodeFromBase64Url(path.basename(filename, ".json"));
			await this.loadDataset(id);
		});
		await Promise.all(filePromises);
	}

	private async folderExists(): Promise<boolean> {
		try {
			await fs.promises.access(folderPath, fs.constants.F_OK);
			return true;
		} catch {
			return false;
		}
	}

	private async getDataFiles(): Promise<string[]> {
		try {
			return await fs.promises.readdir(folderPath);
		} catch (err) {
			throw new InsightError(`Unexpected error thrown: ${err}`);
		}
	}

	public async getDatasets(): Promise<Dataset[]> {
		await this.loadAllDatasets();
		return this.datasets;
	}

	public async getIds(): Promise<Record<string, string>> {
		await this.loadAllDatasets();
		return this.ids;
	}

	public addDataset(dataset: Dataset): void {
		this.datasets.push(dataset);
		this.ids[dataset.id] = encodeToBase64Url(dataset.id);
	}

	public removeDataset(id: string): void {
		this.datasets = this.datasets.filter((dataset) => dataset.id !== id);
		delete this.ids[id];
	}
}

export class DatasetProcessor {
	private data: DatasetCache = DatasetCache.getInstance();

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

	public async hasDataset(id: string): Promise<boolean> {
		const ids = await this.data.getIds();
		return id in ids;
	}

	public async addDataset(dataset: Dataset): Promise<string[]> {
		this.data.addDataset(dataset);
		return Object.keys(await this.data.getIds());
	}

	public async removeDataset(id: string): Promise<string> {
		const filePath = path.join(folderPath, `${encodeToBase64Url(id)}.json`);

		fs.unlink(filePath, (err) => {
			if (err) {
				throw new InsightError(`Error removing dataset: ${err}`);
			}
		});
		this.data.removeDataset(id);
		return id;
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		const datasets = await this.data.getDatasets();
		return datasets.map(({ sections, ...rest }) => rest);
	}

	public async getDatasets(): Promise<Dataset[]> {
		return this.data.getDatasets();
	}

	public async getDataset(id: string): Promise<Dataset> {
		const datasets = await this.data.getDatasets();
		const ids = await this.data.getIds();
		return datasets[Object.keys(ids).indexOf(id)];
	}
}
