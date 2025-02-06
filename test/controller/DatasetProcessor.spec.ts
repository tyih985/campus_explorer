import {
	DatasetCache,
	DatasetProcessor,
	decodeFromBase64Url,
	encodeToBase64Url,
} from "../../src/controller/DatasetProcessor";
import { clearDisk } from "../TestUtil";
import chaiAsPromised from "chai-as-promised";
import { expect, use } from "chai";
import { beforeEach } from "mocha";
import { Dataset } from "../../src/controller/Dataset";
import { InsightDatasetKind, InsightError } from "../../src/controller/IInsightFacade";

use(chaiAsPromised);

describe("DatasetProcessor", function () {
	let datasetProcessor: DatasetProcessor;
	let datasetCache: DatasetCache;

	before(async function () {
		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();
	});

	describe("EncodeDecodeBase64Url", function () {
		it("should encode and decode string correctly", function () {
			try {
				const string = "Hello World!";
				const encode = encodeToBase64Url(string);
				const decode = decodeFromBase64Url(encode);
				expect(decode).to.be.equal(string);
			} catch (err) {
				expect.fail(`Unexpected error thrown: ${err}`);
			}
		});
	});

	describe("DatasetCache", function () {
		before(function () {
			datasetCache = DatasetCache.getInstance();
		});

		beforeEach(async function () {
			await clearDisk();
			datasetProcessor = new DatasetProcessor();
		});

		it("should ignore when no data files are loaded", async function () {
			const datasets = await datasetCache.getDatasets();
			expect(datasets).to.deep.equal([]);
		});

		it("should load dataset properly with empty cache", async function () {
			const dataset1 = new Dataset("abc", [], InsightDatasetKind.Sections);
			const dataset2 = new Dataset("sections", [], InsightDatasetKind.Sections);
			const result = await datasetProcessor.addDataset(dataset1);
			expect(result).to.have.members(["abc"]);
			const secondResult = await datasetProcessor.addDataset(dataset2);
			expect(secondResult).to.have.members(["abc", "sections"]);
			const datasets = await datasetCache.getDatasets();
			expect(datasets).to.have.deep.members([dataset1, dataset2]);
		});
	});

	describe("DatasetProcessor", function () {
		beforeEach(async function () {
			await clearDisk();
			datasetProcessor = new DatasetProcessor();
		});

		after(async function () {
			await clearDisk();
		});

		it("should get datasets correctly across instances", async function () {
			const otherDatasetProcessor = new DatasetProcessor();
			await datasetProcessor.addDataset(new Dataset("data", [], InsightDatasetKind.Sections));
			await datasetProcessor.addDataset(new Dataset("test", [], InsightDatasetKind.Sections));
			const result = await otherDatasetProcessor.getDatasets();
			const secondResult = await datasetProcessor.getDatasets();
			expect(result).to.have.deep.members(secondResult);
		});

		it("should get correct dataset given idstring", async function () {
			const dataset = new Dataset("this-is-valid", [], InsightDatasetKind.Sections);
			await datasetProcessor.addDataset(new Dataset("simple idstring", [], InsightDatasetKind.Sections));
			await datasetProcessor.addDataset(dataset);
			const result = await datasetProcessor.getDataset("this-is-valid");
			expect(result).to.deep.equal(dataset);
		});

		it("should reject when trying to remove nonexistent file", async function () {
			try {
				await datasetProcessor.removeDataset("invalid");
				expect.fail("Error should be thrown.");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should remove datasets correctly", async function () {
			const dataset1 = new Dataset("dataset 1", [], InsightDatasetKind.Sections);
			const dataset2 = new Dataset("dataset 2", [], InsightDatasetKind.Sections);
			const dataset3 = new Dataset("dataset 3", [], InsightDatasetKind.Sections);
			await datasetProcessor.addDataset(dataset1);
			await datasetProcessor.removeDataset("dataset 1");
			const result = await datasetProcessor.getDatasets();
			expect(result).to.deep.equal([]);
			await datasetProcessor.addDataset(dataset2);
			await datasetProcessor.addDataset(dataset3);
			await datasetProcessor.addDataset(dataset1);
			await datasetProcessor.removeDataset("dataset 2");
			const result2 = await datasetProcessor.getDatasets();
			expect(result2).to.have.deep.members([dataset1, dataset3]);
			await datasetProcessor.removeDataset("dataset 1");
			await datasetProcessor.removeDataset("dataset 3");
			expect(await datasetProcessor.getDatasets()).to.deep.equal([]);
		});
	});
});
