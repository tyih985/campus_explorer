import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import { DatasetProcessor } from "./DatasetProcessor";
import { QueryEngine } from "./QueryEngine";
import { Dataset } from "./Dataset";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

function isValidIdstring(id: string): boolean {
	if (id.includes("_") || id.trim().length === 0) {
		throw new InsightError("Given idstring is invalid.");
	}
	return true;
}

function isBase64(str: string): boolean {
	return Buffer.from(str, "base64").toString("base64") === str.replace(/\r?\n|\r/g, "");
}

export default class InsightFacade implements IInsightFacade {
	private datasetProcessor: DatasetProcessor = new DatasetProcessor();
	private queryEngine: QueryEngine = new QueryEngine();

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		isValidIdstring(id);
		if (!isBase64(content)) {
			throw new InsightError("Given content string is not in base 64.");
		}
		if (await this.datasetProcessor.hasDataset(id)) {
			throw new InsightError("Dataset with given idstring already exists.");
		}

		const data = await this.datasetProcessor.parse(content, kind);
		if (data.length === 0) {
			throw new InsightError(`No valid ${kind} found.`);
		}

		const dataset = new Dataset(id, data, kind);
		await dataset.saveDataset(await this.datasetProcessor.getFilename(id));

		return await this.datasetProcessor.addDataset(dataset);
	}

	public async removeDataset(id: string): Promise<string> {
		isValidIdstring(id);
		if (await this.datasetProcessor.hasDataset(id)) {
			return await this.datasetProcessor.removeDataset(id);
		} else {
			throw new NotFoundError("Dataset with given idstring not found.");
		}
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		const result = await this.queryEngine.performQuery(query, this.datasetProcessor);
		const tooLarge: number = 5000;
		if (result.length > tooLarge) {
			throw new ResultTooLargeError("Query returned more than 5000 results");
		}
		return result;
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		return this.datasetProcessor.listDatasets();
	}
}
