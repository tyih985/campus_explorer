import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import { clearDisk, getContentFromArchives, loadTestQuery } from "../TestUtil";

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";

use(chaiAsPromised);

export interface ITestQuery {
	title?: string;
	input: unknown;
	errorExpected: boolean;
	expected: any;
}

describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let noSections: string;
	let noCoursesFolder: string;
	let simpleSections1: string;
	let simpleSections2: string;
	let simpleSections3: string;
	let simpleSections4: string;

	let rooms: string;

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("pair.zip");
		noSections = await getContentFromArchives("noSections.zip");
		noCoursesFolder = await getContentFromArchives("noCoursesFolder.zip");
		simpleSections1 = await getContentFromArchives("simpleSections1.zip");
		simpleSections2 = await getContentFromArchives("simpleSections2.zip");
		simpleSections3 = await getContentFromArchives("simpleSections3.zip");
		simpleSections4 = await getContentFromArchives("simpleSections4.zip");

		rooms = await getContentFromArchives("campus.zip");

		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();
	});

	describe("AddDataset", function () {
		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
		});

		it("should reject with an empty dataset id", async function () {
			// Read the "Free Mutant Walkthrough" in the spec for tips on how to get started!
			try {
				await facade.addDataset("", sections, InsightDatasetKind.Sections);
				expect.fail("Error should be thrown!");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should reject with only whitespace id", async function () {
			try {
				await facade.addDataset("    ", sections, InsightDatasetKind.Sections);
				expect.fail("Error should be thrown!");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should reject with idstring containing underscore)", async function () {
			try {
				await facade.addDataset("123_abc", sections, InsightDatasetKind.Sections);
				expect.fail("Error should be thrown!");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should pass with valid idstring", async function () {
			try {
				const result = await facade.addDataset("a", simpleSections1, InsightDatasetKind.Sections);
				expect(result).to.have.members(["a"]);
			} catch (err) {
				expect.fail(`addDataset threw unexpected error: ${err}`);
			}
		});

		it("should reject with id of existing dataset", async function () {
			try {
				await facade.addDataset("sections", simpleSections1, InsightDatasetKind.Sections);
				await facade.addDataset("sections", simpleSections2, InsightDatasetKind.Sections);
				expect.fail("Error should be thrown!");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should pass with two valid datasets", async function () {
			try {
				await facade.addDataset("abc", simpleSections1, InsightDatasetKind.Sections);
				const result = await facade.addDataset("123", simpleSections2, InsightDatasetKind.Sections);
				expect(result).to.have.members(["abc", "123"]);
			} catch (err) {
				expect.fail(`addDataset threw unexpected error: ${err}`);
			}
		});

		it("should reject with not base64 string of zip file)", async function () {
			try {
				await facade.addDataset("a*c", "invalidZip", InsightDatasetKind.Sections);
				expect.fail("Error should be thrown!");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should reject with wrong folder name in zip file", async function () {
			try {
				await facade.addDataset("abc", noCoursesFolder, InsightDatasetKind.Sections);
				expect.fail("Error should be thrown!");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should reject with no sections in dataset", async function () {
			try {
				await facade.addDataset("abc", noSections, InsightDatasetKind.Sections);
				expect.fail("Error should be thrown!");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should pass with valid room", async function () {
			try {
				const result = await facade.addDataset("abc", rooms, InsightDatasetKind.Rooms);
				expect(result).to.have.members(["abc"]);
			} catch (err) {
				expect.fail(`Unexpected error thrown: ${err}`);
			}
		});
	});

	describe("RemoveDataset", function () {
		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
		});

		it("should reject with no added dataset but valid idstring", async function () {
			try {
				await facade.removeDataset("abc");
				expect.fail("Error should be thrown!");
			} catch (err) {
				expect(err).to.be.an.instanceOf(NotFoundError);
			}
		});

		it("should reject with empty idstring", async function () {
			try {
				await facade.removeDataset("");
				expect.fail("Error should be thrown!");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should reject with only whitespace idstring", async function () {
			try {
				await facade.removeDataset("   ");
				expect.fail("Error should be thrown!");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should reject with invalid idstring with underscore", async function () {
			try {
				await facade.removeDataset("abc_123");
				expect.fail("Error should be thrown!");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should pass with valid idstring of dataset", async function () {
			try {
				await facade.addDataset("abc", simpleSections1, InsightDatasetKind.Sections);
				const result = await facade.removeDataset("abc");
				expect(result).to.equal("abc");
			} catch (err) {
				expect.fail(`removeDataset threw unexpected error: ${err}`);
			}
		});

		it("should reject with repeated deletion attempts of dataset", async function () {
			try {
				await facade.addDataset("123", simpleSections1, InsightDatasetKind.Sections);
				const result = await facade.removeDataset("123");
				expect(result).to.equal("123");
				await facade.removeDataset("123");
				expect.fail("Error shoud be thrown!");
			} catch (err) {
				expect(err).to.be.an.instanceOf(NotFoundError);
			}
		});

		it("should pass with multiple datasets added and removed", async function () {
			try {
				await facade.addDataset("abc", simpleSections1, InsightDatasetKind.Sections);
				await facade.addDataset("abc 123", simpleSections2, InsightDatasetKind.Sections);
				const firstResult = await facade.removeDataset("abc");
				const secondResult = await facade.removeDataset("abc 123");
				expect(firstResult).to.equal("abc");
				expect(secondResult).to.equal("abc 123");
			} catch (err) {
				expect.fail(`removeDataset threw an unexpected error: ${err}`);
			}
		});
	});

	describe("ListDataset", function () {
		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
		});

		it("should resolve with no datasets", async function () {
			try {
				const result = await facade.listDatasets();
				expect(result).to.have.members([]);
			} catch (err) {
				expect.fail(`Unexpected error: ${err}`);
			}
		});

		it("should resolve with list of all datasets", async function () {
			try {
				const expected1 = { id: "EFGH5678", kind: InsightDatasetKind.Sections, numRows: 2 };
				const expected2 = { id: "i9j0k", kind: InsightDatasetKind.Sections, numRows: 4 };

				await facade.addDataset("EFGH5678", simpleSections3, InsightDatasetKind.Sections);
				const list1 = await facade.listDatasets();
				expect(list1).to.have.length(1);
				expect(list1).to.deep.include.members([expected1]);

				await facade.addDataset("i9j0k", simpleSections4, InsightDatasetKind.Sections);
				const list2 = await facade.listDatasets();
				expect(list2).to.have.length(2);
				expect(list2).to.deep.include.members([expected1, expected2]);
			} catch (err) {
				expect.fail(`Unexpected error: ${err}`);
			}
		});

		it("should return correct result with another instance of InsightFacade", async function () {
			await facade.addDataset("dataset 1", simpleSections1, InsightDatasetKind.Sections);
			await facade.addDataset("dataset 2", simpleSections2, InsightDatasetKind.Sections);
			const secondFacade = new InsightFacade();
			const result = await secondFacade.listDatasets();
			expect(result).to.deep.members([
				{
					id: "dataset 1",
					kind: InsightDatasetKind.Sections,
					numRows: 4,
				},
				{
					id: "dataset 2",
					kind: InsightDatasetKind.Sections,
					numRows: 5,
				},
			]);
		});
	});

	describe("PerformQuery", function () {
		/**
		 * Loads the TestQuery specified in the test name and asserts the behaviour of performQuery.
		 *
		 * Note: the 'this' parameter is automatically set by Mocha and contains information about the test.
		 */
		async function checkQuery(this: Mocha.Context): Promise<void> {
			if (!this.test) {
				throw new Error(
					"Invalid call to checkQuery." +
						"Usage: 'checkQuery' must be passed as the second parameter of Mocha's it(..) function." +
						"Do not invoke the function directly."
				);
			}
			// Destructuring assignment to reduce property accesses
			const { input, expected, errorExpected } = await loadTestQuery(this.test.title);
			let result: InsightResult[] = []; // dummy value before being reassigned
			try {
				result = await facade.performQuery(input);
			} catch (err) {
				if (!errorExpected) {
					expect.fail(`performQuery threw unexpected error: ${err}`);
				}
				// TODO: replace this failing assertion with your assertions. You will need to reason about the code in this function
				// to determine what to put here :)
				if (expected === "InsightError") {
					expect(err).to.be.an.instanceOf(InsightError);
				} else if (expected === "ResultTooLargeError") {
					expect(err).to.be.an.instanceOf(ResultTooLargeError);
				}
				return;
			}
			if (errorExpected) {
				expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
			}
			// TODO: replace this failing assertion with your assertions. You will need to reason about the code in this function
			// to determine what to put here :)
			expect(result).to.have.deep.members(expected);
		}

		before(async function () {
			facade = new InsightFacade();

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises: Promise<string[]>[] = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
				facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms)
			];

			try {
				await Promise.all(loadDatasetPromises);
			} catch (err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}
		});

		after(async function () {
			await clearDisk();
		});

		// Examples demonstrating how to test performQuery using the JSON Test Queries.
		// The relative path to the query file must be given in square brackets.
		it("[valid/simple.json] SELECT dept, avg WHERE avg > 97", checkQuery);
		it("[valid/logic.json] SELECT dept, id, avg WHERE avg < 60 AND id is 3*", checkQuery);
		it("[valid/wildcard_exact.json] SELECT dept, course WHERE course is 695", checkQuery);
		it("[valid/wildcard_contains.json] SELECT dept, uuid WHERE uuid contains 1234", checkQuery);
		it("[valid/wildcard_suffix.json] SELECT dept, id WHERE dept is *nb", checkQuery);
		it("[valid/not.json] SELECT title, avg WHERE avg NOT > 50", checkQuery);
		it("[valid/order.json] SELECT instructor, dept, id WHERE instructor ends with greg ORDER by dept", checkQuery);
		it(
			"[valid/complex.json] SELECT dept, id, avg WHERE (avg > 90 AND dept is adhe) OR avg = 95 ORDER by avg",
			checkQuery
		);
		it("[valid/complex_1.json] SELECT, dept, title, year WHERE filter ORDER by title", checkQuery);
		it("[valid/empty_result.json] SELECT title, avg WHERE avg is not > -1", checkQuery);
		it("[valid/and.json] SELECT avg WHERE avg > 90 AND dept is biol", checkQuery);
		it("[valid/or.json] SELECT title, avg WHERE avg > 90 OR dept is biol", checkQuery);
		it("[valid/gt.json] SELECT dept, id, audit WHERE audit > 20", checkQuery);
		it("[valid/lt.json] SELECT dept, pass WHERE pass < 1", checkQuery);
		it("[valid/eq.json] SELECT dept, fail WHERE fail = 100", checkQuery);

		it(
			"[valid/apply_avg.json] SELECT shortname, apply key WHERE address contains Main Mall and lat < 100 GROUP BY shortname APPLY KEY = Avg(seats)",
			checkQuery
		);
		it(
			"[valid/apply_count.json] SELECT shortname, apply key WHERE address contains Main Mall and lat < 100 GROUP BY shortname APPLY KEY = Count(seats)",
			checkQuery
		);
		it(
			"[valid/apply_count_string.json] SELECT shortname, apply key FROM * GROUP BY shortname APPLY Count(furniture)",
			checkQuery
		);
		it(
			"[valid/apply_max.json] SELECT shortname, apply key WHERE address contains Main Mall and lat < 100 GROUP BY shortname APPLY KEY = Max(seats)",
			checkQuery
		);
		it(
			"[valid/apply_min.json] SELECT shortname, apply key WHERE address contains Main Mall and lat < 100 GROUP BY shortname APPLY KEY = Min(seats)",
			checkQuery
		);
		it(
			"[valid/apply_sum.json] SELECT shortname, apply key WHERE address contains Main Mall and lat < 100 GROUP BY shortname APPLY KEY = Sum(seats)",
			checkQuery
		);
		it(
			"[valid/multiple_apply.json] SELECT dept, apply key, maxAverage WHERE dept = 'a*' GROUP BY dept APPLY apply key = COUNT(instructor), maxAverage = MAX(avg)",
			checkQuery
		);
		it(
			"[valid/multiple_groups.json] SELECT dept, apply key, maxAverage WHERE dept = 'an*' GROUP BY dept, id APPLY apply key = Count(instructor), maxAverage = Max(avg)",
			checkQuery
		);
		it(
			"[valid/order_multiple_down.json] SELECT name, address, type WHERE seats > 30 ORDER DOWN BY address, type, name",
			checkQuery
		);
		it(
			"[valid/order_multiple_up.json] SELECT name, address, type WHERE seats > 300 ORDER UP BY address, type, name",
			checkQuery
		);
		it("[valid/simple_rooms.json] SELECT shortname, maxSeats WHERE furniture = '*Tables*' and seats > 300", checkQuery);
		it(
			"[valid/simple_transformations.json] SELECT address, overallCapacity GROUP BY rooms_address APPLY overallCapacity = SUM(seats)",
			checkQuery
		);

		it("[invalid/invalid.json] Query missing WHERE", checkQuery);
		it("[invalid/invalid_query_key.json] Query where keys are invalid", checkQuery);
		it("[invalid/too_large_results.json] Query selecting all entries", checkQuery);
		it("[invalid/missing_options.json] Query missing OPTIONS", checkQuery);
		it("[invalid/missing_columns.json] Query missing COLUMNS", checkQuery);
		it("[invalid/reference_datasets.json] Query referencing more than 1 dataset", checkQuery);
		it("[invalid/empty_columns.json] Query where columns are empty", checkQuery);
		it("[invalid/invalid_inputstring.json] Query with invalid inputstring", checkQuery);
		it("[invalid/invalid_where_object.json] Query with invalid WHERE", checkQuery);
		it("[invalid/invalid_keytype.json] Query with wrong keytype in comparator", checkQuery);
		it("[invalid/order_not_in_columns.json] Query where ORDER key not in COLUMNS", checkQuery);
		it("[invalid/empty_filter.json] Query where AND is empty", checkQuery);
		it("[invalid/invalid_filter.json] Query with invalid filter", checkQuery);

		it("[invalid/empty_transformations.json] Query where TRANSFORMATIONS is empty", checkQuery);
		it("[invalid/invalid_applykey.json] Query with invalid apply key", checkQuery);
		it("[invalid/invalid_avg_apply.json] Query with wrong query key type in AVG", checkQuery);
		it("[invalid/invalid_columns_groups.json] Query where COLUMNS keys are not one of GROUPS or APPLY", checkQuery);
		it("[invalid/invalid_max_apply.json] Query with wrong query key type in MAX", checkQuery);
		it("[invalid/invalid_min_apply.json] Query with wrong query key type in MIN", checkQuery);
		it("[invalid/invalid_order_dir.json] Query where ORDER has invalid dir", checkQuery);
		it("[invalid/invalid_sum_apply.json] Query with wrong query key type in SUM", checkQuery);
		it("[invalid/same_applykey.json] Query with duplicate apply key", checkQuery);
		it("[invalid/invalid_apply_field.json] Query where invalid field is in APPLY", checkQuery);
	});
});
