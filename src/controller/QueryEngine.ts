import { InsightError, InsightResult } from "./IInsightFacade";
import { DatasetProcessor } from "./DatasetProcessor";
import { Dataset } from "./Dataset";
import { Section } from "./Section";

type Predicate = (section: Section) => boolean;

export class QueryEngine {
	public async performQuery(query: any, datasetProcessor: DatasetProcessor): Promise<InsightResult[]> {
		this.validateQuery(query);
		const id = this.getDatasetId(query);
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

	private validateQuery(query: any): void {
		if (typeof query !== "object" || query === null) {
			throw new InsightError("ValidationError: Query must be an object.");
		}
		if (!query.WHERE) {
			throw new InsightError("ValidationError: Query is missing required field 'WHERE'.");
		}
		if (typeof query.WHERE !== "object" || Array.isArray(query)) {
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

	private makeRegexPattern(value: string): string {
		const removeSurroundingAsterisks = value.replace(/^\*|\*$/g, "");
		if (removeSurroundingAsterisks.includes("*")) {
			throw new InsightError("ValidationError: No asterisks allowed in middle of string.");
		}
		const keyStartsWithAsterisk = value.startsWith("*");
		const keyEndsWithAsterisk = value.endsWith("*");

		if (keyStartsWithAsterisk && keyEndsWithAsterisk) {
			return `.*${removeSurroundingAsterisks}.*`;
		} else if (keyStartsWithAsterisk) {
			return`.*${removeSurroundingAsterisks}$`;
		} else if (keyEndsWithAsterisk) {
			return`^${removeSurroundingAsterisks}.*`;
		} else {
			return `^${value}$`;
		}
	}

	private filter(where: any, id: string, dataset: Dataset): Dataset {
		const validFilterKeys = ["AND", "OR", "NOT", "GT", "LT", "EQ", "IS"];
		if (Object.keys(where).length === 0) {
			return dataset;
		}
		if (Object.keys(where).length !== 1) {
			throw new InsightError("ValidationError: Should only have one key.");
		}
		const filterKey = Object.keys(where)[0];
		if (!validFilterKeys.includes(filterKey)) {
			throw new InsightError(`ValidationError: Invalid filter key.`);
		}

		const predicate = this.makePredicate(where, id);
		const filteredSections = dataset.sections.filter(predicate);
		return new Dataset(dataset.id, filteredSections, dataset.kind);
	}

	private makePredicate(filter: any, id: string): Predicate {
		const filterKey = Object.keys(filter)[0];
		switch (filterKey) {
			case "AND":
				return this.handleAND(filter.AND, id);
			case "OR":
				return this.handleOR(filter.OR, id);
			case "NOT":
				return this.handleNOT(filter.NOT, id);
			case "GT":
			case "LT":
			case "EQ":
				return this.handleComp(filter[filterKey], filterKey, id);
			case "IS":
				return this.handleIS(filter.IS, id);
			default:
				throw new InsightError("ValidationError: Invalid filter key.");
		}
	}

	private handleAND(andArray: any[], id: string): Predicate {
		if (!Array.isArray(andArray) || andArray.length === 0) {
			throw new InsightError("ValidationError: AND must be a non-empty array.");
		}
		const predicates = andArray.map(subFilter => this.makePredicate(subFilter, id));
		return (section: Section) => predicates.every(pred => pred(section));
	}

	private handleOR(orArray: any[], id: string): Predicate {
		if (!Array.isArray(orArray) || orArray.length === 0) {
			throw new InsightError("ValidationError: OR must be a non-empty array.");
		}
		const predicates = orArray.map(subFilter => this.makePredicate(subFilter, id));
		return (section: Section) => predicates.some(pred => pred(section));
	}

	private handleNOT(notObj: any, id: string): Predicate {
		if (typeof notObj !== "object" || Array.isArray(notObj)) {
			throw new InsightError("ValidationError: Must contain a valid filter object.");
		}
		if (Object.keys(notObj).length !== 1) {
			throw new InsightError("ValidationError: Should only have one key.");
		}
		const predicate = this.makePredicate(notObj, id);
		return (section: Section) => !predicate(section);
	}

	private handleComp(compObj: any, comp: string, id: string): Predicate {
		if (typeof compObj !== "object" || Array.isArray(compObj)) {
			throw new InsightError("ValidationError: Must contain a valid filter object.");
		}
		if (Object.keys(compObj).length !== 1) {
			throw new InsightError("ValidationError: Should only have one key.");
		}
		const key = Object.keys(compObj)[0];
		const value = compObj[key];
		if (typeof value !== "number") {
			throw new InsightError("ValidationError: Comparison requires numeric value.");
		}
		this.validateNumericKey(key, id);

		const field = key.split("_")[1];
		return (section: Section) => {
			const sectionValue = section.get(field);
			if (typeof sectionValue !== "number") {
				return false;
			}
			switch (comp) {
				case "GT": return sectionValue > value;
				case "LT": return sectionValue < value;
				case "EQ": return sectionValue === value;
				default: return false;
			}
		};
	}

	private handleIS(isObj: any, id: string): Predicate {
		if (typeof isObj !== "object" || Array.isArray(isObj)) {
			throw new InsightError("ValidationError: Must contain a valid filter object.");
		}
		if (Object.keys(isObj).length !== 1) {
			throw new InsightError("ValidationError: Should only have one key.");
		}

		const key = Object.keys(isObj)[0];
		const value = isObj[key];
		if (typeof value !== "string") {
			throw new InsightError("ValidationError: IS filter requires a string value.");
		}

		this.validateStringKey(key, id);
		const regexPattern = this.makeRegexPattern(value);
		const field = key.split("_")[1];

		const regex = new RegExp(regexPattern);
		return (section: Section) => {
			const fieldValue = section.get(field);
			return typeof fieldValue === "string" && regex.test(fieldValue);
		};
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
