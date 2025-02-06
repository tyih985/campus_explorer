import { InsightDatasetKind, InsightError } from "./IInsightFacade";
import path from "path";
import fs from "fs";
import { Section } from "./Section";
import { encodeToBase64Url } from "./DatasetProcessor";

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
		const filePath = path.join(folderPath, `${encodeToBase64Url(this.id)}.json`);
		try {
			await fs.promises.mkdir(folderPath, { recursive: true });
			await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
		} catch {
			throw new InsightError("Dataset could not be saved.");
		}
	}
}
