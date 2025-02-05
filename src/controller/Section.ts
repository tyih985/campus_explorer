import { InsightError } from "./IInsightFacade";

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
			if ("Section" in json && json.Section === "overall") {
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

	public get(field: string): string | number {
		switch (field) {
			case "uuid": { return this.id; }
			case "id": { return this.course; }
			case "title": { return this.title }
			case "instructor": { return this.professor; }
			case "dept": { return this.department; }
			case "year": { return this.year; }
			case "avg": { return this.average }
			case "pass": { return this.pass; }
			case "fail": { return this.fail; }
			case "audit": { return this.audit; }
			default: { throw new InsightError("Incorrect key given."); }
		}
	}
}
