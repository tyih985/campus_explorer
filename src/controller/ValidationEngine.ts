import { InsightError } from "./IInsightFacade";

export class ValidationEngine {
	public validateQuery(query: any): void {
		if (typeof query !== "object" || query === null || Array.isArray(query)) {
			throw new InsightError("ValidationError: Query must be an object.");
		}

		this.validateWHEREandOPTIONS(query);

		if (query.TRANSFORMATIONS) {
			this.validateTRANSFORMATIONS(query.TRANSFORMATIONS);
			this.validateCOLUMNS(query.OPTIONS.COLUMNS, query.TRANSFORMATIONS);
		}

		if (query.OPTIONS.ORDER) {
			this.validateORDER(query.OPTIONS.ORDER, query.OPTIONS.COLUMNS);
		}
	}

	private validateWHEREandOPTIONS(query: any): void {
		if (!query.WHERE) {
			throw new InsightError("ValidationError: Query is missing required field 'WHERE'.");
		}
		if (typeof query.WHERE !== "object" || Array.isArray(query.WHERE)) {
			throw new InsightError("ValidationError: Query field 'WHERE' should be an object.");
		}
		if (!query.OPTIONS) {
			throw new InsightError("ValidationError: Query is missing required field 'OPTIONS'.");
		}
		if (typeof query.OPTIONS !== "object" || Array.isArray(query.OPTIONS)) {
			throw new InsightError("ValidationError: Query field 'OPTIONS' should be an object.");
		}
		if (!query.OPTIONS.COLUMNS) {
			throw new InsightError("ValidationError: Query is missing required field 'COLUMNS'.");
		}
		if (!Array.isArray(query.OPTIONS.COLUMNS) || query.OPTIONS.COLUMNS.length === 0) {
			throw new InsightError("ValidationError: Query field 'COLUMNS' must be a non-empty array.");
		}
	}

	private validateTRANSFORMATIONS(transformations: any): void {
		if (typeof transformations !== "object") {
			throw new InsightError("ValidationError: Query field 'TRANSFORMATIONS' should be an object.");
		}
		if (!transformations.GROUP || !transformations.APPLY || Object.keys(transformations).length !== 2) {
			throw new InsightError("ValidationError: ORDER object must contain only 'dir' and 'keys'.");
		}
		if (
			!Array.isArray(transformations.GROUP) ||
			transformations.GROUP.length === 0 ||
			transformations.GROUP.some((key: any) => typeof key !== "string")
		) {
			throw new InsightError("ValidationError: 'GROUP' must be a non-empty array of strings.");
		}

		if (!Array.isArray(transformations.APPLY)) {
			throw new InsightError("ValidationError: 'APPLY' must be an array of objects.");
		}

		this.validateAPPLY(transformations.APPLY);
	}

	private validateAPPLY(apply: any[]): void {
		const applyKeysSet = new Set<string>();
		for (const applyObj of apply) {
			if (typeof applyObj !== "object" || applyObj === null || Array.isArray(applyObj)) {
				throw new InsightError("ValidationError: Each entry in 'APPLY' must be an object.");
			}
			const keys = Object.keys(applyObj);
			if (keys.length !== 1) {
				throw new InsightError("ValidationError: Each 'APPLY' object must have exactly one key.");
			}
			const applyKey = keys[0];
			if (applyKey.includes("_")) {
				throw new InsightError("ValidationError: APPLY key must not contain underscores.");
			}
			if (applyKeysSet.has(applyKey)) {
				throw new InsightError("ValidationError: Duplicate APPLY key found.");
			}
			applyKeysSet.add(applyKey);

			this.validateAPPLYTOKEN(applyObj[applyKey]);
		}
	}

	private validateAPPLYTOKEN(applyTokenObj: any): void {
		if (typeof applyTokenObj !== "object" || applyTokenObj === null || Array.isArray(applyTokenObj)) {
			throw new InsightError("ValidationError: The value of an 'APPLY' key must be an object.");
		}
		const applyTokenKeys = Object.keys(applyTokenObj);
		if (applyTokenKeys.length !== 1) {
			throw new InsightError("ValidationError: The 'APPLY' object must have exactly one APPLYTOKEN key.");
		}
		const applyToken = applyTokenKeys[0];
		const validApplyTokens = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
		if (!validApplyTokens.includes(applyToken)) {
			throw new InsightError("ValidationError: Invalid APPLYTOKEN.");
		}
		const field = applyTokenObj[applyToken];
		if (typeof field !== "string") {
			throw new InsightError("ValidationError: APPLYTOKEN value must be a string.");
		}
	}


	private validateCOLUMNS(columns: any, transformations: any): void {
		const groupKeys = new Set(transformations.GROUP);
		const applyKeys = new Set(transformations.APPLY.map((applyObj: any) => Object.keys(applyObj)[0]));
		for (const column of columns) {
			if (!groupKeys.has(column) && !applyKeys.has(column)) {
				throw new InsightError(
					`ValidationError: all COLUMNS keys must correspond to a GROUP key or applykey in APPLY.`
				);
			}
		}
	}

	private validateORDER(order: any, columns: string[]): void {
		if (typeof order === "object") {
			if (!order.dir || !order.keys || Object.keys(order).length !== 2) {
				throw new InsightError("ValidationError: ORDER object must contain only 'dir' and 'keys'.");
			}
			if (typeof order.dir !== "string" || !["UP", "DOWN"].includes(order.dir)) {
				throw new InsightError("ValidationError: ORDER.dir must be a string.");
			}
			if (
				!Array.isArray(order.keys) ||
				order.keys.length === 0 ||
				order.keys.some((key: any) => typeof key !== "string")
			) {
				throw new InsightError("ValidationError: ORDER.keys must be a non-empty array of strings.");
			}
			if (!order.keys.every((key: any) => columns.includes(key))) {
				throw new InsightError("ValidationError: ORDER.keys must all be present in COLUMNS.");
			}
		} else if (typeof order === "string") {
			if (!columns.includes(order)) {
				throw new InsightError("ValidationError: ORDER must be a key present in COLUMNS.");
			}
		} else {
			throw new InsightError("ValidationError: ORDER must be a string or an object.");
		}
	}
}
