import { InsightDataset, InsightError } from "./IInsightFacade";
import JSZip from "jszip";
import * as fs from "fs";
import * as path from "path";
import { Dataset } from "./Dataset";
import { Section } from "./Section";

const folderPath: string = path.resolve(__dirname, "..", "..", "data");

class DatasetCache {
	private static instance: DatasetCache;
	private datasets: Dataset[] = [];
	private ids: Record<string, string> = {};
	private nextFile: number = 0;
	private loadDone: boolean = false;

	public static getInstance(): DatasetCache {
		if (!DatasetCache.instance) {
			DatasetCache.instance = new DatasetCache();
		}
		return DatasetCache.instance;
	}

	private async loadData(): Promise<void> {
		if (!await this.folderExists()) {
			this.datasets = [];
			this.ids = {};
			this.nextFile = 0;
			this.loadDone = true;
		}
		if (!this.loadDone) {
			try {
				const datasetFiles = await this.getDataFiles();
				this.datasets = await this.readDatasetsFromFile(datasetFiles);
				this.ids = await this.updateIdStrings(datasetFiles);
				await this.setNextFile();
				this.loadDone = true;
			} catch {}
		}
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

	private async readDatasetsFromFile(files: string[]): Promise<Dataset[]> {
		try {
			const jsonDataPromises = files.map(async (file) => {
				const filePath = path.join(folderPath, file);
				const content = await fs.promises.readFile(filePath, "utf-8");
				const data = JSON.parse(content);

				return new Dataset(
					data.id,
					data.sections.map((section: any) => new Section(section)),
					data.kind
				);
			});

			return await Promise.all(jsonDataPromises);
		} catch (err) {
			throw new InsightError(`Unexpected error thrown: ${err}`);
		}
	}

	private async updateIdStrings(files: string[]): Promise<Record<string, string>> {
		const idPromises = this.datasets.map(async (dataset, index) => {
			return {
				[dataset.id]: path.basename(files[index], ".json"),
			};
		});
		const result = await Promise.all(idPromises);

		return result.reduce((id, filename) => ({ ...id, ...filename }), {} as Record<string, string>);
	}

	public async setNextFile(): Promise<void> {
		if (!this.loadDone) {
			let largest = -1;
			const promises = Object.values(this.ids).map(async (value) => {
				if (Number(value) > largest) {
					largest = Number(value);
				}
			});
			await Promise.all(promises);
			if (largest === -1) {
				this.nextFile = 0;
			} else {
				this.nextFile =largest + 1;
			}
		} else {
			this.nextFile++;
		}
	}

	public async getDatasets(): Promise<Dataset[]> {
		await this.loadData();
		return this.datasets;
	}

	public async getIds(): Promise<Record<string, string>> {
		await this.loadData();
		return this.ids;
	}

	public async getNextFile(): Promise<number> {
		await this.loadData();
		return this.nextFile;
	}


	public addDataset(dataset: Dataset, filename: string): void {
		this.datasets.push(dataset);
		this.ids[dataset.id] = filename;
	}

	public removeDataset(id: string): void {
		this.datasets = this.datasets.filter((dataset) => dataset.id !== id);
		delete this.ids[id];
	}
}


export class DatasetProcessor {
	private data: DatasetCache = DatasetCache.getInstance()


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

	public async getNextFileName(): Promise<number> {
		const rtn = await this.data.getNextFile();
		await this.data.setNextFile();
		return rtn;
	}

	public async addDataset(dataset: Dataset, filename: string): Promise<string[]> {
		this.data.addDataset(dataset, filename);
		return Object.keys(await this.data.getIds());
	}

	public async removeDataset(id: string): Promise<string> {
		const ids: Record<string, string> = await this.data.getIds()
		const fileName = ids[id as keyof typeof ids];
		const filePath = path.join(folderPath, `${String(fileName)}.json`);

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
		const datasetPromises = datasets.map(async (dataset) => {
			if (dataset.id === id) {
				return dataset;
			}
			return null;
		});
		const result = await Promise.all(datasetPromises);
		return result.filter(dataset => dataset !== null)[0];
	}
}
