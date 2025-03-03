import { InsightError, InsightResult } from "./IInsightFacade";
import { DatasetProcessor } from "./DatasetProcessor";
import { SectionEngine } from "./SectionEngine";
// import { RoomEngine } from "./RoomEngine";
import { Dataset } from "./Dataset";

export class QueryEngine {
	private sectionEngine: SectionEngine;
	// private roomEngine: RoomEngine;

	constructor() {
		this.sectionEngine = new SectionEngine();
		// this.roomEngine = new RoomEngine();
	}

	public async performQuery(query: any, datasetProcessor: DatasetProcessor): Promise<InsightResult[]> {
		this.validateQuery(query);
		const dataset = await this.getRequestedDataset(query, datasetProcessor);
		if (dataset.kind === "sections") {
			return this.sectionEngine.performQuery(query, dataset);
		}
		// else if (dataset.kind === "rooms") {
		// 	return this.roomEngine.performQuery(query.WHERE, dataset);
		// }
		throw new InsightError("ValidationError: Invalid dataset kind.");
	}

	private async getRequestedDataset(query: any, datasetProcessor: DatasetProcessor): Promise<Dataset> {
		const columns: string[] = query.OPTIONS.COLUMNS;
		for (const key of columns) {
			const parsedKey = key.split("_");
			if (parsedKey.length !== 2) {
				throw new InsightError("ValidationError: Failure finding id.");
			}
			const id = parsedKey[0];
			try {
				// eslint-disable-next-line @ubccpsc310/descriptive/no-await-in-loop
				const dataset = await datasetProcessor.getDataset(id);
				return dataset; // Return the first valid dataset found
			} catch {
				// Ignore errors and continue checking other dataset IDs
			}
		}
		throw new InsightError("ValidationError: Failure finding id.");
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

		if (!Array.isArray(query.OPTIONS.COLUMNS || query.OPTIONS.COLUMNS.length === 0)) {
			throw new InsightError("ValidationError: Query field 'COLUMNS' must be a non-empty array.");
		}

		if (query.TRANSOFORMATIONS) {
			this.validateTRANSFORMATIONS(query.TRANSOFORMATIONS);
			// TODO check that every column corresponds to a key in GROUP or APPLY
		}

		if (query.OPTIONS.SORT) {
			this.validateSORT(query.OPTIONS.COLUMNS, query.OPTIONS.SORT);
		}
	}

	private validateTRANSFORMATIONS(transformations: any): void {
		// TODO
	}

	private validateSORT(columns: any, sort: any): void {
		if (typeof sort === "object") {
			if (!("dir" in sort) || !("keys" in sort) || sort.keys.length !== 2) {
				throw new InsightError("ValidationError: SORT object must contain only 'dir' and 'keys'.");
			}
			if (typeof sort.dir !== "string" || !["UP", "DOWN"].includes(sort.dir)) {
				throw new InsightError("ValidationError: SORT.dir must be a string.");
			}
			if (
				!Array.isArray(sort.keys) ||
				sort.keys.length === 0 ||
				sort.keys.some((key: any) => typeof key !== "string")
			) {
				throw new InsightError("ValidationError: SORT.keys must be a non-empty array of strings.");
			}
			if (!sort.keys.every((key: any) => columns.includes(key))) {
				throw new InsightError("ValidationError: SORT.keys must all be present in COLUMNS.");
			}
		} else if (typeof sort === "string") {
			if (!columns.includes(sort)) {
				throw new InsightError("ValidationError: SORT must be a key present in COLUMNS.");
			}
		} else {
			throw new InsightError("ValidationError: SORT must be a string or an object.");
		}
	}
}
