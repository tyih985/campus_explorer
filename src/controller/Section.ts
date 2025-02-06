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

	// eslint-disable-next-line @ubccpsc310/descriptive/max-lines-per-function
	public get(field: string): string | number {
		const fieldDict = {
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
		if (Object.hasOwn(fieldDict as object, field as string)) {
			return (fieldDict as any)[field as string];
		}
		throw new InsightError("Invalid query key given.");
	}
}
