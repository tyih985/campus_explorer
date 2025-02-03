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
		this.id = String(json.id);
		this.course = String(json.Course);
		this.title = String(json.Title);
		this.professor = String(json.Professor);
		this.department = String(json.Subject);
		this.year = Number(json.Year);
		this.average = Number(json.Avg);
		this.pass = Number(json.Pass);
		this.fail = Number(json.Fail);
		this.audit = Number(json.Audit);
	}

	public formatSection(): Record<string, any> {
		return {
			uuid: this.id,
			id: this.course,
			title: this.title,
			instructor: this.professor,
			dept: this.department,
			year: this.year,
			avg: this.average,
			pass: this.pass,
			fail: this.fail,
			audit: this.audit,
		};
	}
}

export class Dataset {
	public id: string;
	public kind: InsightDatasetKind;
	public numRows: number;
	public readonly sections: Section[];

	constructor(idString: string, sections: Section[], kind: InsightDatasetKind) {
		this.id = idString;
		this.sections = sections;
		this.kind = kind;
		this.numRows = sections.length;
	}

	public async saveDataset(): Promise<void> {
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
		const filePath = path.join(folderPath, `${this.id}.json`);
		try {
			await fs.promises.mkdir(folderPath, { recursive: true });

			const fileDoesNotExist = await this.checkIdstring(filePath);
			if (fileDoesNotExist) {
				await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
			} else {
				throw new InsightError("Dataset with idstring already exists.");
			}
		} catch (_err) {
			throw new InsightError("Dataset could not be saved.");
		}
	}

	private async checkIdstring(filePath: string): Promise<boolean> {
		try {
			await fs.promises.stat(filePath);
			return false;
		} catch (_err) {
			return true;
		}
	}
}

const folderPath: string = path.resolve(__dirname, "..", "..", "data");

export class DatasetProcessor {
	private datasets: Dataset[] = [];
	private idStrings: string[] = [];
	private setupDone: boolean = false;

	private async setup(): Promise<void> {
		try {
			const datasetFiles = await this.getDataFiles();
			this.idStrings = datasetFiles.map((file) => path.basename(file, path.extname(file)));
			this.datasets = await this.getAllDatasets(datasetFiles);
			this.setupDone = true;
		} catch (_err) {}
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
				} catch (_err) {
					return null;
				}
			});

			const result = (await Promise.all(filePromises)).filter(Boolean);
			return this.filterForValidSections(result.flat());
		} catch (_err) {
			throw new InsightError("Invalid zip file given.");
		}
	}

	private filterForValidSections(json: Record<string, any>[]): Section[] {
		const result = [];
		for (const item of json) {
			if (this.hasRequiredQueryKeys(item)) {
				const filtered = this.filterForRequiredQueryKeys(item);
				result.push(new Section(filtered));
			}
		}
		return result;
	}

	private hasRequiredQueryKeys(json: Record<string, unknown>): boolean {
		const requiredKeys = ["id", "Course", "Title", "Professor", "Subject", "Year", "Avg", "Pass", "Fail", "Audit"];
		return requiredKeys.every((key) => key in json);
	}

	private filterForRequiredQueryKeys(item: Record<string, any>): Record<string, any> {
		const requiredKeys = ["id", "Course", "Title", "Professor", "Subject", "Year", "Avg", "Pass", "Fail", "Audit"];
		const filtered: Record<string, any> = {};
		for (const key of requiredKeys) {
			if (key in item) {
				filtered[key] = item[key];
			}
		}
		return filtered;
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

	private async getDataFiles(): Promise<string[]> {
		try {
			return await fs.promises.readdir(folderPath);
		} catch (err) {
			throw new InsightError(`Unexpected error thrown: ${err}`);
		}
	}

	public hasDataset(id: string): boolean {
		return this.idStrings.includes(id);
	}

	public addDataset(dataset: Dataset): string[] {
		this.datasets.push(dataset);
		this.idStrings.push(dataset.id);
		return this.idStrings;
	}

	public async removeDataset(id: string): Promise<string> {
		const filePath = path.join(folderPath, `${id}.json`);
		fs.unlink(filePath, (err) => {
			if (err) {
				throw new InsightError("Error removing dataset.");
			}
		});
		this.datasets = this.datasets.filter((dataset) => dataset.id !== id);
		this.idStrings = this.idStrings.filter((str) => str !== id);
		return id;
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		return this.datasets.map(({ sections, ...rest }) => rest);
	}
}
