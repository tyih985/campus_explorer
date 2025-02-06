import { InsightError, InsightResult } from "./IInsightFacade";
import { DatasetProcessor } from "./DatasetProcessor";
import { Dataset } from "./Dataset";
import { Section } from "./Section";

export class QueryEngine {
	public async performQuery(query: any, datasetProcessor: DatasetProcessor): Promise<InsightResult[]> {
		await this.validateQuery(query);
		const id = this.getDatasetId(query);
		if (!(await datasetProcessor.hasDataset(id))) {
			throw new InsightError("ValidationError: Dataset not found.");
		}
		const dataset = await datasetProcessor.getDataset(id);
		const filteredDataset = this.filter(query.WHERE, id, dataset);
		return this.handleOPTIONS(query.OPTIONS, id, filteredDataset);
	}

	private getDatasetId(query: any): string {
		const firstKey = query.OPTIONS.COLUMNS[0];
		const parsedKey = firstKey.split("_");
		if (parsedKey.length !== 2) {
			throw new InsightError("ValidationError: Failure finding id.");
		}
		return parsedKey[0];
	}

	private async validateQuery(query: any): Promise<void> {
		if (typeof query !== "object" || query === null) {
			throw new InsightError("ValidationError: Query must be an object.");
		}
		if (!query.WHERE) {
			throw new InsightError("ValidationError: Query is missing required field 'WHERE'.");
		}
		if (typeof query.WHERE !== "object") {
			throw new InsightError("ValidationError: Query field 'WHERE' should be an object.");
		}
		if (!query.OPTIONS) {
			throw new InsightError("ValidationError: Query is missing required field 'OPTIONS'.");
		}
		if (typeof query.OPTIONS !== "object") {
			throw new InsightError("ValidationError: Query field 'OPTIONS' should be an object.");
		}
		if (!query.OPTIONS.COLUMNS) {
			throw new InsightError("ValidationError: Query is missing required field 'COLUMNS'.");
		}
		if (!Array.isArray(query.OPTIONS.COLUMNS)) {
			throw new InsightError("ValidationError: Query field 'COLUMNS' should be an array.");
		}
		if (query.OPTIONS.COLUMNS.length === 0) {
			throw new InsightError("ValidationError: Query field 'COLUMNS' cannot be empty.");
		}
		if (query.OPTIONS.ORDER && typeof query.OPTIONS.ORDER !== "string") {
			throw new InsightError("ValidationError: Invalid ORDER type.");
		}
		if (query.OPTIONS.ORDER && !query.OPTIONS.COLUMNS.includes(query.OPTIONS.ORDER)) {
			throw new InsightError("ValidationError: Cannot order by non-existent columns.");
		}
	}

	private validateNumericKey(key: string, id: string): void {
		const validNumericFields = ["avg", "pass", "fail", "audit", "year"];
		const match = key.match(/^([^_]+)_([^_]+)$/);
		if (!match) {
			throw new InsightError(`ValidationError: Key is not properly formatted.`);
		}
		const [, reqid, field] = match;
		if (reqid !== id) {
			throw new InsightError(`ValidationError: Cannot query more than one dataset.'`);
		}
		if (!validNumericFields.includes(field)) {
			throw new InsightError("ValidationError: Invalid numeric key.");
		}
	}

	private validateStringKey(key: string, id: string): void {
		const validStringFields = ["dept", "id", "instructor", "title", "uuid"];
		const match = key.match(/^([^_]+)_([^_]+)$/);
		if (!match) {
			throw new InsightError(`ValidationError: Key is not properly formatted.`);
		}
		const [, reqid, field] = match;
		if (reqid !== id) {
			throw new InsightError(`ValidationError: Cannot query more than one dataset.'`);
		}
		if (!validStringFields.includes(field)) {
			throw new InsightError("ValidationError: Invalid string key.");
		}
	}

	private validateColumnKey(key: string, id: string): void {
		const validFields = ["dept", "id", "instructor", "title", "uuid", "avg", "pass", "fail", "audit", "year"];
		const match = key.match(/^([^_]+)_([^_]+)$/);
		if (!match) {
			throw new InsightError(`ValidationError: Key is not properly formatted.`);
		}
		const [, reqid, field] = match;
		if (reqid !== id) {
			throw new InsightError(`ValidationError: Cannot query more than one dataset.'`);
		}
		if (!validFields.includes(field)) {
			throw new InsightError("ValidationError: Invalid string key.");
		}
	}

	private filter(query: any, id: string, dataset: Dataset): Dataset {
		const validFilterKeys = ["AND", "OR", "NOT", "GT", "LT", "EQ", "IS"];
		if (Array.isArray(query)) {
			throw new InsightError("ValidationError: Query should be an object.");
		}
		if (Object.keys(query).length === 0) {
			return dataset;
		}
		if (Object.keys(query).length !== 1) {
			throw new InsightError("ValidationError: Should only have one key.");
		}
		const filterKey = Object.keys(query)[0];
		if (!validFilterKeys.includes(filterKey)) {
			throw new InsightError(`ValidationError: Invalid filter key.`);
		}

		switch (filterKey) {
			case "AND":
				return this.handleAND(query.AND, id, dataset);
			case "OR":
				return this.handleOR(query.OR, id, dataset);
			case "NOT":
				return this.handleNOT(query.NOT, id, dataset);
			case "GT":
			case "LT":
			case "EQ":
				return this.handleOp(query, id, dataset);
			case "IS":
				return this.handleIS(query.IS, id, dataset);
			default:
				throw new InsightError("ValidationError: Invalid filter key.");
		}
	}

	private handleAND(andArray: any[], id: string, dataset: Dataset): Dataset {
		if (!Array.isArray(andArray) || andArray.length === 0) {
			throw new InsightError(`ValidationError: AND must be a non-empty array.`);
		}
		for (const sub of andArray) {
			dataset = this.filter(sub, id, dataset);
		}
		return dataset;
	}

	private handleOR(orArray: any[], id: string, dataset: Dataset): Dataset {
		if (!Array.isArray(orArray) || orArray.length === 0) {
			throw new InsightError(`ValidationError: OR must be a non-empty array.`);
		}
		const unionSections = new Set<Section>();
		for (const sub of orArray) {
			const filteredDataset = this.filter(sub, id, dataset);
			filteredDataset.sections.forEach((section) => unionSections.add(section));
		}
		return new Dataset(dataset.id, Array.from(unionSections), dataset.kind);
	}

	private handleNOT(notObject: any, id: string, dataset: Dataset): Dataset {
		const notDataset = this.filter(notObject, id, dataset);
		const remaining = dataset.sections.filter((section) => !notDataset.sections.includes(section));
		return new Dataset(dataset.id, remaining, dataset.kind);
	}

	private handleOp(query: any, id: string, dataset: Dataset): Dataset {
		const opObj = Object.keys(query)[0];
		const compObj = query[opObj];
		const keys = Object.keys(compObj);
		if (keys.length !== 1) {
			throw new InsightError(`ValidationError: Should only have one key.`);
		}
		const key = Object.keys(compObj)[0];
		const value = compObj[key];
		if (typeof value !== "number") {
			throw new InsightError(`ValidationError: Invalid query.`);
		}
		this.validateNumericKey(key, id);

		return new Dataset(
			dataset.id,
			dataset.sections.filter((section) => {
				const field = section.get(key.split("_")[1]) as number;
				switch (opObj) {
					case "GT":
						return field > value;
					case "LT":
						return field < value;
					case "EQ":
						return field === value;
					default:
						return false;
				}
			}),
			dataset.kind
		);
	}

	private handleIS(isObj: any, id: string, dataset: Dataset): Dataset {
		const keys = Object.keys(isObj);
		if (keys.length !== 1) {
			throw new InsightError("ValidationError: IS filter must have exactly one key.");
		}
		const key = keys[0];
		const value: string = isObj[key];
		this.validateStringKey(key, id);

		const keyStartsWithAsterisk = value.startsWith("*");
		const keyEndsWithAsterisk = value.endsWith("*");

		const removeSurroundingAsterisks = value.replace(/^\*|\*$/g, "");
		if (removeSurroundingAsterisks.includes("*")) {
			throw new InsightError("ValidationError: No asterisks allowed in middle of string.");
		}

		let regexPattern: string;
		if (keyStartsWithAsterisk && keyEndsWithAsterisk) {
			regexPattern = `.*${removeSurroundingAsterisks}.*`;
		} else if (keyStartsWithAsterisk) {
			regexPattern = `.*${removeSurroundingAsterisks}$`;
		} else if (keyEndsWithAsterisk) {
			regexPattern = `^${removeSurroundingAsterisks}.*`;
		} else {
			regexPattern = `^${value}$`;
		}

		const regex = new RegExp(regexPattern);

		return new Dataset(
			dataset.id,
			dataset.sections.filter((section) => {
				const field = section.get(key.split("_")[1]);
				return typeof field === "string" && regex.test(field);
			}),
			dataset.kind
		);
	}

	private handleOPTIONS(options: any, id: string, filteredDataset: Dataset): InsightResult[] {
		const result = this.handleCOLUMNS(options.COLUMNS, filteredDataset, id);
		if (options.ORDER) {
			this.handleORDER(options.ORDER, options.COLUMNS, result);
		}
		return result;
	}

	private handleCOLUMNS(columnKeys: string[], filteredDataset: Dataset, id: string): InsightResult[] {
		if (!columnKeys || !Array.isArray(columnKeys) || columnKeys.length === 0) {
			throw new InsightError("ValidationError: COLUMNS must be a non-empty array.");
		}
		return filteredDataset.sections.map((section) => {
			const row: InsightResult = {};
			columnKeys.forEach((key) => {
				this.validateColumnKey(key, id);
				const field = key.split("_")[1];
				row[key] = section.get(field);
			});
			return row;
		});
	}

	private handleORDER(order: string, columns: string[], result: InsightResult[]): void {
		if (!columns.includes(order)) {
			throw new InsightError("ValidationError: ORDER must be in COLUMNS.");
		}
		result.sort((first, second) => {
			const valA = first[order];
			const valB = second[order];
			if (typeof valA === "number" && typeof valB === "number") {
				return valA - valB;
			} else if (typeof valA === "string" && typeof valB === "string") {
				return valA.localeCompare(valB);
			} else {
				return 0;
			}
		});
	}
}
