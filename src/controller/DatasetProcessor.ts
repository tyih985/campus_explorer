import { InsightDataset, InsightDatasetKind, InsightError } from "./IInsightFacade";
import JSZip from "jszip";
import * as fs from "fs";
import * as path from "path";

export class Section {
	private readonly id: string;
	private readonly course: string;
	private readonly title: string;
	private readonly professor: string;
	private readonly department: string;
	private readonly year: number;
	private readonly average: number;
	private readonly pass: number;
	private readonly fail: number;
	private readonly audit: number;

	constructor(json: Record<string, any>) {
		try {
			this.id = String(json.id);
			this.course = String(json.Course);
			this.title = String(json.Title);
			this.professor = String(json.Professor);
			this.department = String(json.Subject);
			if (json.Year === "overall") {
				this.year = 1900;
			} else {
				this.year = Number(json.Year);
			}
			this.average = Number(json.Avg);
			this.pass = Number(json.Pass);
			this.fail = Number(json.Fail);
			this.audit = Number(json.Audit);
		} catch (err) {
			throw new InsightError(`Unexpected error thrown: ${err}`);
		}
	}

	public formatSection(): Record<string, any> {
		return {
			id: this.id,
			Course: this.course,
			Title: this.title,
			Professor: this.professor,
			Subject: this.department,
			Year: this.year,
			Avg: this.average,
			Pass: this.pass,
			Fail: this.fail,
			Audit: this.audit,
		};
	}
}

export class Dataset {
	public id: string;
	public kind: InsightDatasetKind;
	public numRows: number;
	public readonly sections: Section[];

	constructor(idstring: string, sections: Section[], kind: InsightDatasetKind) {
		this.id = idstring;
		this.sections = sections;
		this.kind = kind;
		this.numRows = sections.length;
	}

	public async saveDataset(fileName: string): Promise<void> {
		const sectionsObject = [];
		for (const s of this.sections) {
			sectionsObject.push(s.formatSection());
		}

		const data = {
			id: this.id,
			kind: this.kind,
			numRows: this.numRows,
			sections: sectionsObject,
		};

		const folderPath = path.resolve(__dirname, "..", "..", "data");
		const filePath = path.join(folderPath, `${fileName}.json`);
		try {
			await fs.promises.mkdir(folderPath, { recursive: true });

			const fileDoesNotExist = await this.checkIdstring(filePath);
			if (fileDoesNotExist) {
				await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
			} else {
				throw new InsightError("Dataset with idstring already exists.");
			}
		} catch {
			throw new InsightError("Dataset could not be saved.");
		}
	}

	private async checkIdstring(filePath: string): Promise<boolean> {
		try {
			await fs.promises.stat(filePath);
			return false;
		} catch {
			return true;
		}
	}
}

const folderPath: string = path.resolve(__dirname, "..", "..", "data");

export class DatasetProcessor {
	private datasets: Dataset[] = [];
	private ids: string[] = [];
	private setupDone: boolean = false;

	private async setup(): Promise<void> {
		try {
			const datasetFiles = await this.getDataFiles();
			this.datasets = await this.getAllDatasets(datasetFiles);
			this.ids = await this.getIdstrings();
			this.setupDone = true;
		} catch {}
	}

	private async handleSetup(): Promise<void> {
		if (!this.setupDone) {
			await this.setup();
		}
	}

	public async parseFiles(zip: string): Promise<Section[]> {
		await this.handleSetup();
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

	private async getIdstrings(): Promise<string[]> {
		const idstringPromises = this.datasets.map((dataset: Dataset) => dataset.id);
		return Promise.all(idstringPromises);
	}

	private async getDataFiles(): Promise<string[]> {
		try {
			return await fs.promises.readdir(folderPath);
		} catch (err) {
			throw new InsightError(`Unexpected error thrown: ${err}`);
		}
	}

	public hasDataset(id: string): boolean {
		return this.ids.includes(id);
	}

	public getDatasetSize(): number {
		return this.datasets.length;
	}

	public addDataset(dataset: Dataset): string[] {
		this.datasets.push(dataset);
		this.ids.push(dataset.id);
		return this.ids;
	}

	public async removeDataset(id: string): Promise<string> {
		await this.handleSetup();
		const filePath = path.join(folderPath, `${this.ids.indexOf(id)}.json`);
		fs.unlink(filePath, (err) => {
			if (err) {
				throw new InsightError("Error removing dataset.");
			}
		});
		this.datasets = this.datasets.filter((dataset) => dataset.id !== id);
		this.ids = this.ids.filter((str) => str !== id);
		return id;
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		await this.handleSetup();
		return this.datasets.map(({ sections, ...rest }) => rest);
	}
}
