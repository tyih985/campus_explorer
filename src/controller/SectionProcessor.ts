import { Section } from "./Section";
import JSZip from "jszip";
import { InsightError } from "./IInsightFacade";

export class SectionProcessor {
	public async parseZip(zip: string): Promise<Section[]> {
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
}
