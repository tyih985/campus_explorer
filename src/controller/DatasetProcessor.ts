import { InsightDataset, InsightError } from "./IInsightFacade";
import JSZip from "jszip";
import * as fs from "fs";
import * as path from "path";
import { Dataset } from "./Dataset";
import { Section } from "./Section";

const folderPath: string = path.resolve(__dirname, "..", "..", "data");

export class DatasetProcessor {
	private datasets: Dataset[] = [];
	private ids: Record<string, string> = {};
	private nextFile: number = 0;

	private async setup(): Promise<void> {
		try {
			const datasetFiles = await this.getDataFiles();
			this.datasets = await this.getAllDatasets(datasetFiles);
			this.ids = await this.getIdstrings(datasetFiles);
			this.nextFile = await this.setNextFile();
		} catch {}
	}

	public async parseFiles(zip: string): Promise<Section[]> {
		await this.setup();
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

	private async getAllDatasets(files: string[]): Promise<Dataset[]> {
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

	private async getIdstrings(files: string[]): Promise<Record<string, string>> {
		const idPromises = this.datasets.map(async (dataset, index) => {
			return {
				[dataset.id]: path.basename(files[index], ".json"),
			};
		});
		const result = await Promise.all(idPromises);

		return result.reduce((id, filename) => ({ ...id, ...filename }), {} as Record<string, string>);
	}

	private async getDataFiles(): Promise<string[]> {
		try {
			return await fs.promises.readdir(folderPath);
		} catch (err) {
			throw new InsightError(`Unexpected error thrown: ${err}`);
		}
	}

	private async setNextFile(): Promise<number> {
		let largest = -1;
		const promises = Object.values(this.ids).map(async (value) => {
			if (Number(value) > largest) {
				largest = Number(value);
			}
		});
		await Promise.all(promises);
		if (largest === -1) {
			return 0;
		}
		return largest + 1;
	}

	public async hasDataset(id: string): Promise<boolean> {
		await this.setup();
		return id in this.ids;
	}

	public async getNextFileName(): Promise<number> {
		await this.setup();
		const rtn = this.nextFile;
		this.nextFile = await this.setNextFile();
		return rtn;
	}

	public async addDataset(): Promise<string[]> {
		await this.setup();
		return Object.keys(this.ids);
	}

	public async removeDataset(id: string): Promise<string> {
		await this.setup();

		const fileName = this.ids[id as keyof typeof this.ids];
		const filePath = path.join(folderPath, `${String(fileName)}.json`);

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
		await this.setup();
		return this.datasets.map(({ sections, ...rest }) => rest);
	}
}
