import { InsightDatasetKind, InsightError } from "./IInsightFacade";
import path from "path";
import fs from "fs";
import { Section } from "./Section";

export class Dataset {
	public id: string;
	public kind: InsightDatasetKind;
	public numRows: number;
	public readonly sections: Section[] | null;

	constructor(idstring: string, sections: Section[], kind: InsightDatasetKind) {
		this.id = idstring;
		this.sections = sections;
		this.kind = kind;
		this.numRows = sections.length;
	}

	public async saveDataset(fileName: string): Promise<void> {
		const sectionsObject: Object[] = [];
		if (this.sections) {
			const sectionPromises = this.sections.map(async (section) => {
				sectionsObject.push(section.formatSection());
			});
			await Promise.all(sectionPromises);
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
