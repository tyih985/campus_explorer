import { InsightError, InsightResult } from "./IInsightFacade";
import { Dataset } from "./Dataset";
import { Section } from "./Section";
import { makeRegexPattern } from "./QueryEngine";
import { handleORDERsingle } from "./QueryEngine";
import { handleORDERmulti } from "./QueryEngine";
import Decimal from "decimal.js";

type Predicate = (section: Section) => boolean;

export class SectionEngine {
	public performQuery(query: any, dataset: Dataset): InsightResult[] {
		const id = dataset.id;
		const filteredDataset = this.filter(query.WHERE, id, dataset);
		if (query.TRANSFORMATIONS) {
			const groups = this.handleGROUP(filteredDataset, query.TRANSFORMATIONS.GROUP, id);
			return this.handleOPTIONSAPPLY(query.OPTIONS, groups, query.TRANSFORMATIONS, id);
		}
		return this.handleOPTIONS(query.OPTIONS, id, filteredDataset);
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
		const predicates = andArray.map((subFilter) => this.makePredicate(subFilter, id));
		return (section: Section) => predicates.every((pred) => pred(section));
	}

	private handleOR(orArray: any[], id: string): Predicate {
		if (!Array.isArray(orArray) || orArray.length === 0) {
			throw new InsightError("ValidationError: OR must be a non-empty array.");
		}
		const predicates = orArray.map((subFilter) => this.makePredicate(subFilter, id));
		return (section: Section) => predicates.some((pred) => pred(section));
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
		const regexPattern = makeRegexPattern(value);
		const field = key.split("_")[1];

		const regex = new RegExp(regexPattern);
		return (section: Section) => {
			const fieldValue = section.get(field);
			return typeof fieldValue === "string" && regex.test(fieldValue);
		};
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

	private handleOPTIONS(options: any, id: string, filteredDataset: Dataset): InsightResult[] {
		const result = this.handleCOLUMNS(options.COLUMNS, filteredDataset, id);
		if (options.ORDER) {
			if (typeof options.ORDER === "string") {
				handleORDERsingle(options.ORDER, result);
			} else if (typeof options.ORDER === "object") {
				handleORDERmulti(options.ORDER, result);
			} else {
				throw new InsightError("ValidationError: ORDER must be either a string or an object.");
			}
		}
		return result;
	}

	private handleGROUP(dataset: Dataset, groupKeys: string[], id: string): Record<string, Section[]> {
		const groups: Record<string, Section[]> = {};
		for (const section of dataset.sections) {
			const composite = groupKeys
				.map((key) => {
					this.validateColumnKey(key, id);
					const field = key.split("_")[1];
					return section.get(field);
				})
				.join("_");

			if (composite in groups) {
				groups[composite].push(section);
			} else {
				groups[composite] = [section];
			}
		}
		return groups;
	}

	private handleOPTIONSAPPLY(
		options: any,
		groups: Record<string, Section[]>,
		transformations: any,
		id: string
	): InsightResult[] {
		const result: InsightResult[] = [];
		const groupKeys: string[] = transformations.GROUP;
		const applyObjs: any[] = transformations.APPLY;

		for (const composite in groups) {
			const group = groups[composite];
			const row = this.getRow(groupKeys, group, id);
			const aggregations = this.getAggregations(applyObjs, group, id);
			Object.assign(row, aggregations);
			result.push(row);
		}

		if (options.ORDER) {
			if (typeof options.ORDER === "string") {
				handleORDERsingle(options.ORDER, result);
			} else if (typeof options.ORDER === "object") {
				handleORDERmulti(options.ORDER, result);
			} else {
				throw new InsightError("ValidationError: ORDER must be either a string or an object.");
			}
		}
		return result;
	}

	private getRow(groupKeys: string[], group: Section[], id: string): InsightResult {
		const row: InsightResult = {};
		for (const groupKey of groupKeys) {
			this.validateColumnKey(groupKey, id);
			const field = groupKey.split("_")[1];
			row[groupKey] = group[0].get(field);
		}
		return row;
	}

	private getAggregations(applyObjs: any[], group: Section[], id: string): Record<string, any> {
		const aggregations: Record<string, any> = {};
		for (const obj of applyObjs) {
			const applyKey = Object.keys(obj)[0];
			const tokenObj = obj[applyKey];
			const key = Object.keys(tokenObj)[0];
			const target = tokenObj[key];
			const field = target.split("_")[1];
			aggregations[applyKey] = this.getAggregation(key, target, group, field, id);
		}
		return aggregations;
	}

	private getAggregation(key: string, target: string, group: Section[], field: any, id: string): number {
		switch (key) {
			case "MAX":
				this.validateNumericKey(target, id);
				return Math.max(...group.map((section) => Number(section.get(field))));
			case "MIN":
				this.validateNumericKey(target, id);
				return Math.min(...group.map((section) => Number(section.get(field))));
			case "AVG": {
				this.validateNumericKey(target, id);
				const sum = group.reduce((acc, section) => acc.add(new Decimal(section.get(field))), new Decimal(0));
				const average = sum.toNumber() / group.length;
				return Number(average.toFixed(2));
			}
			case "COUNT": {
				const uniqueVals = new Set();
				group.forEach((section) => uniqueVals.add(section.get(field)));
				return uniqueVals.size;
			}
			case "SUM": {
				this.validateNumericKey(target, id);
				const sum = group.reduce((acc, section) => acc.add(new Decimal(section.get(field))), new Decimal(0));
				return Number(sum.toFixed(2));
			}
			default:
				throw new InsightError("ValidationError: Invalid APPLY token.");
		}
	}
}
