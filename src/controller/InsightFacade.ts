import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";
import { DatasetProcessor } from "./DatasetProcessor";
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

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		isValidIdstring(id);
		if (!isBase64(content)) {
			throw new InsightError("Given content string is not in base 64.");
		}
		if (await this.datasetProcessor.hasDataset(id)) {
			throw new InsightError("Dataset with given idstring already exists.");
		}

		const sections = await this.datasetProcessor.parseFiles(content);
		if (sections.length === 0) {
			throw new InsightError("No valid sections found.");
		}
		const dataset = new Dataset(id, sections, kind);
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
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::performQuery() is unimplemented! - query=${query};`);
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		return this.datasetProcessor.listDatasets();
	}
}
