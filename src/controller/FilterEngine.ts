import { InsightDatasetKind, InsightError } from "./IInsightFacade";
import { Dataset } from "./Dataset";
import { Data } from "./QueryEngine";

type Predicate = (data: Data) => boolean;

export class FilterEngine {
	public filter(where: any, id: string, dataset: Dataset): Dataset {
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

		const predicate = this.makePredicate(where, id, dataset.kind);
		let filteredData: any[];
		if (dataset.kind === "sections") {
			filteredData = dataset.sections.filter(predicate);
		} else {
			filteredData = dataset.rooms.filter(predicate);
		}
		return new Dataset(dataset.id, filteredData, dataset.kind);
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
			return `.*${removeSurroundingAsterisks}$`;
		} else if (keyEndsWithAsterisk) {
			return `^${removeSurroundingAsterisks}.*`;
		} else {
			return `^${value}$`;
		}
	}

	public validateNumericKey(key: string, id: string, kind: string): void {
		let validNumericFields: string[];
		if (kind === "rooms") {
			validNumericFields = ["lat", "lon", "seats"];
		} else {
			validNumericFields = ["avg", "pass", "fail", "audit", "year"];
		}
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

	private validateStringKey(key: string, id: string, kind: string): void {
		let validStringFields: string[];
		if (kind === "rooms") {
			validStringFields = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
		} else {
			validStringFields = ["dept", "id", "instructor", "title", "uuid"];
		}
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

	private makePredicate(filter: any, id: string, kind: InsightDatasetKind): Predicate {
		const filterKey = Object.keys(filter)[0];
		switch (filterKey) {
			case "AND":
				return this.handleAND(filter.AND, id, kind);
			case "OR":
				return this.handleOR(filter.OR, id, kind);
			case "NOT":
				return this.handleNOT(filter.NOT, id, kind);
			case "GT":
			case "LT":
			case "EQ":
				return this.handleComp(filter[filterKey], filterKey, id, kind);
			case "IS":
				return this.handleIS(filter.IS, id, kind);
			default:
				throw new InsightError("ValidationError: Invalid filter key.");
		}
	}

	private handleAND(andArray: any[], id: string, kind: InsightDatasetKind): Predicate {
		if (!Array.isArray(andArray) || andArray.length === 0) {
			throw new InsightError("ValidationError: AND must be a non-empty array.");
		}
		const predicates = andArray.map((subFilter) => this.makePredicate(subFilter, id, kind));
		return (data: Data) => predicates.every((pred) => pred(data));
	}

	private handleOR(orArray: any[], id: string, kind: InsightDatasetKind): Predicate {
		if (!Array.isArray(orArray) || orArray.length === 0) {
			throw new InsightError("ValidationError: OR must be a non-empty array.");
		}
		const predicates = orArray.map((subFilter) => this.makePredicate(subFilter, id, kind));
		return (data: Data) => predicates.some((pred) => pred(data));
	}

	private handleNOT(notObj: any, id: string, kind: InsightDatasetKind): Predicate {
		if (typeof notObj !== "object" || Array.isArray(notObj)) {
			throw new InsightError("ValidationError: Must contain a valid filter object.");
		}
		if (Object.keys(notObj).length !== 1) {
			throw new InsightError("ValidationError: Should only have one key.");
		}
		const predicate = this.makePredicate(notObj, id, kind);
		return (data: Data) => !predicate(data);
	}

	private handleComp(compObj: any, comp: string, id: string, kind: InsightDatasetKind): Predicate {
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
		this.validateNumericKey(key, id, kind);

		const field = key.split("_")[1];
		return (data: Data) => {
			const sectionValue = data.get(field);
			if (typeof sectionValue !== "number") {
				return false;
			}
			switch (comp) {
				case "GT":
					return sectionValue > value;
				case "LT":
					return sectionValue < value;
				case "EQ":
					return sectionValue === value;
				default:
					return false;
			}
		};
	}

	private handleIS(isObj: any, id: string, kind: InsightDatasetKind): Predicate {
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

		this.validateStringKey(key, id, kind);
		const regexPattern = this.makeRegexPattern(value);
		const field = key.split("_")[1];

		const regex = new RegExp(regexPattern);
		return (data: Data) => {
			const fieldValue = data.get(field);
			return typeof fieldValue === "string" && regex.test(fieldValue);
		};
	}
}
