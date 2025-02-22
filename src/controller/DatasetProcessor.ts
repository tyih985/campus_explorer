import { InsightDataset, InsightDatasetKind, InsightError } from "./IInsightFacade";
import * as fs from "fs";
import * as path from "path";
import { Dataset } from "./Dataset";
import { Section } from "./Section";
import { Room } from "./Room";
import { RoomProcessor } from "./RoomProcessor";
import { SectionProcessor } from "./SectionProcessor";

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
	private sectionProcessor: SectionProcessor = new SectionProcessor();
	private roomProcessor: RoomProcessor = new RoomProcessor();

	public async parse(zip: string, kind: InsightDatasetKind): Promise<Section[] | Room[]> {
		if (kind === "sections") {
			return this.sectionProcessor.parseZip(zip);
		} else {
			return this.roomProcessor.parseHtm(zip);
		}
	}

	private async loadData(): Promise<void> {
		try {
			const datasetFiles = await this.getDataFiles();
			await this.getData(datasetFiles);
		} catch {}
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
			if (await this.pathExists(folderPath)) {
				return await fs.promises.readdir(folderPath);
			}
			return [];
		} catch (err) {
			throw new InsightError(`Unexpected error thrown: ${err}`);
		}
	}

	private async pathExists(pathString: string): Promise<boolean> {
		try {
			await fs.promises.access(pathString, fs.constants.F_OK);
			return true;
		} catch {
			return false;
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
		if (await this.pathExists(filePath)) {
			fs.unlink(filePath, (err) => {
				if (err) {
					throw new InsightError(`Error removing dataset: ${err}`);
				}
			});
			this.datasets = this.datasets.filter((dataset) => dataset.id !== id);
			delete this.ids[id];
			return id;
		}
		throw new InsightError("Cannot remove given dataset as it does not exist.");
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

			let dataset;
			const kind = data.kind;
			if (kind === "sections") {
				dataset = data.data.map((section: any) => new Section(section));
			} else {
				dataset = data.data.map((room: any) => new Room(room));
			}

			return new Dataset(data.id, dataset, kind);
		} catch (err) {
			throw new InsightError(`Unexpected error occurred: ${err}`);
		}
	}
}
