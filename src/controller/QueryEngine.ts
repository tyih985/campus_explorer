import { InsightError, InsightResult } from "./IInsightFacade";
import { DatasetProcessor } from "./DatasetProcessor";
import { FilterEngine } from "./FilterEngine";
import { ValidationEngine } from "./ValidationEngine";
import { Dataset } from "./Dataset";
import {Section} from "./Section";
import Decimal from "decimal.js";

export class QueryEngine {
	private filterEngine: FilterEngine;
	private validationEngine: ValidationEngine;

	constructor() {
		this.filterEngine = new FilterEngine();
		this.validationEngine = new ValidationEngine();
	}

	public async performQuery(query: any, datasetProcessor: DatasetProcessor): Promise<InsightResult[]> {
		this.validationEngine.validateQuery(query);
		const dataset = await this.getRequestedDataset(query, datasetProcessor);
		const id = dataset.id;
		const filteredDataset = this.filterEngine.filter(query.WHERE, id, dataset);
		if (query.TRANSFORMATIONS) {
			const groups = this.handleGROUP(filteredDataset, query.TRANSFORMATIONS.GROUP, id);
			return this.handleOPTIONSAPPLY(query.OPTIONS, groups, query.TRANSFORMATIONS, id);
		}
		return this.handleOPTIONS(query.OPTIONS, id, filteredDataset);
	}

	private async getRequestedDataset(query: any, datasetProcessor: DatasetProcessor): Promise<Dataset> {
		const columns: string[] = query.OPTIONS.COLUMNS;
		const promises: Array<Promise<Dataset | null>> = [];
		for (const key of columns) {
			const parsedKey = key.split("_");
			if (parsedKey.length !== 2) {
				throw new InsightError("ValidationError: Failure finding id.");
			}
			const id = parsedKey[0];
			promises.push(datasetProcessor.getDataset(id).catch(() => null));
		}
		const results = await Promise.all(promises);
		for (const result of results) {
			if (result !== null) {
				return result;
			}
		}
		throw new InsightError("ValidationError: Failure finding id.");
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

	private handleORDERsingle(order: string, result: InsightResult[]): void {
		result.sort((first, second) => {
			const valA = first[order];
			const valB = second[order];
			if (valA < valB) {
				return -1;
			} else if (valA > valB) {
				return 1;
			} else {
				return 0;
			}
		});
	}

	private handleORDERmulti(order: any, result: InsightResult[]): void {
		const direction = order.dir === "UP" ? 1 : -1;
		result.sort((first, second) => {
			for (const key of order.keys) {
				const valA = first[key];
				const valB = second[key];
				if (valA < valB) return -1 * direction;
				if (valA > valB) return 1 * direction;
			}
			return 0;
		});
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
				this.handleORDERsingle(options.ORDER, result);
			} else if (typeof options.ORDER === "object") {
				this.handleORDERmulti(options.ORDER, result);
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
				this.handleORDERsingle(options.ORDER, result);
			} else if (typeof options.ORDER === "object") {
				this.handleORDERmulti(options.ORDER, result);
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
				this.filterEngine.validateNumericKey(target, id);
				return Math.max(...group.map((section) => Number(section.get(field))));
			case "MIN":
				this.filterEngine.validateNumericKey(target, id);
				return Math.min(...group.map((section) => Number(section.get(field))));
			case "AVG": {
				this.filterEngine.validateNumericKey(target, id);
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
				this.filterEngine.validateNumericKey(target, id);
				const sum = group.reduce((acc, section) => acc.add(new Decimal(section.get(field))), new Decimal(0));
				return Number(sum.toFixed(2));
			}
			default:
				throw new InsightError("ValidationError: Invalid APPLY token.");
		}
	}
}
