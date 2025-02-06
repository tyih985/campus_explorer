import { DatasetProcessor, encodeToBase64Url } from "../../src/controller/DatasetProcessor";
import { clearDisk } from "../TestUtil";
import chaiAsPromised from "chai-as-promised";
import { expect, use } from "chai";
import { beforeEach } from "mocha";
import { Dataset } from "../../src/controller/Dataset";
import { InsightDatasetKind, InsightError } from "../../src/controller/IInsightFacade";

use(chaiAsPromised);

describe("DatasetProcessor", function () {
	let datasetProcessor: DatasetProcessor;

	before(async function () {
		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();
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
			const dataset1 = new Dataset("data", [], InsightDatasetKind.Sections);
			const dataset2 = new Dataset("test", [], InsightDatasetKind.Sections);
			await dataset1.saveDataset(encodeToBase64Url(dataset1.id));
			await dataset2.saveDataset(encodeToBase64Url(dataset2.id));

			const result = await otherDatasetProcessor.listDatasets();
			const secondResult = await datasetProcessor.listDatasets();
			expect(result).to.have.deep.members(secondResult);
		});

		it("should get correct dataset given idstring", async function () {
			const dataset1 = new Dataset("this-is-valid", [], InsightDatasetKind.Sections);
			const dataset2 = new Dataset("simple idstring", [], InsightDatasetKind.Sections);
			await dataset1.saveDataset(encodeToBase64Url(dataset1.id));
			await dataset2.saveDataset(encodeToBase64Url(dataset2.id));
			const result = await datasetProcessor.getDataset("this-is-valid");
			expect(result).to.deep.equal(dataset1);
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
			await dataset1.saveDataset(encodeToBase64Url(dataset1.id));
			const list = await datasetProcessor.listDatasets();
			expect(list).to.have.deep.members([
				{
					id: "dataset 1",
					kind: InsightDatasetKind.Sections,
					numRows: 0,
				},
			]);
			await datasetProcessor.removeDataset("dataset 1");
			const result = await datasetProcessor.listDatasets();
			expect(result).to.deep.equal([]);
		});
	});
});
