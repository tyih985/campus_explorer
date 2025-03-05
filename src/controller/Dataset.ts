import { InsightDatasetKind, InsightError } from "./IInsightFacade";
import path from "path";
import fs from "fs";
import { Section } from "./Section";
import { Room } from "./Room";

export class Dataset {
	public id: string;
	public kind: InsightDatasetKind;
	public numRows: number;
	public readonly sections: Section[];
	public readonly rooms: Room[];
	private readonly data: Section[] | Room[];

	constructor(idstring: string, data: Section[] | Room[], kind: InsightDatasetKind) {
		this.id = idstring;
		this.kind = kind;
		this.numRows = data.length;
		this.data = data;
		this.sections = [];
		this.rooms = [];

		if (this.kind === "sections") this.sections = data as Section[];
		else this.rooms = data as Room[];
	}

	public async saveDataset(fileName: string): Promise<void> {
		const object: Object[] = [];
		let promises;

		if (this.data) {
			if (this.kind === InsightDatasetKind.Sections) {
				promises = this.sections.map(async (section: Section) => {
					object.push(section.formatSection());
				});
			} else {
				promises = (this.data as Room[]).map(async (room: Room) => {
					object.push(room.formatRoom());
				});
			}

			await Promise.all(promises);
		}

		const data = {
			id: this.id,
			kind: this.kind,
			numRows: this.numRows,
			data: object,
		};

		const folderPath = path.resolve(__dirname, "..", "..", "data");
		const filePath = path.join(folderPath, `${fileName}.json`);
		try {
			await fs.promises.mkdir(folderPath, { recursive: true });
			await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
		} catch {
			throw new InsightError("Dataset could not be saved.");
		}
	}
}
