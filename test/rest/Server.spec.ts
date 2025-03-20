import { expect } from "chai";
import request from "supertest";
import { StatusCodes } from "http-status-codes";
import { Log } from "@ubccpsc310/project-support";
import Server from "../../src/rest/Server";
import * as fs from "fs-extra";
import { clearDisk } from "../TestUtil";

describe("Facade C3", function () {
	let server: Server;
	const port = 4321;

	before(async function () {
		server = new Server(port);
		try {
			await server.start();
		} catch (err) {
			expect.fail(`Unexpected error starting server: ${err}`);
		}
	});

	after(async function () {
		try {
			await server.stop();
		} catch (err) {
			expect.fail(`Unexpected error stopping server: ${err}`);
		}
	});

	beforeEach(async function () {
		// might want to add some process logging here to keep track of what is going on
		await clearDisk();
	});

	afterEach(async function () {
		// might want to add some process logging here to keep track of what is going on
	});

	// Sample on how to format PUT requests
	it("PUT test for courses dataset", async function () {
		const SERVER_URL = "http://localhost:4321";
		const ENDPOINT_URL = "/dataset/abc/sections";
		const ZIP_FILE_DATA = await fs.readFile("test/resources/archives/simpleSections2.zip");

		try {
			const res = await request(SERVER_URL)
				.put(ENDPOINT_URL)
				.send(ZIP_FILE_DATA)
				.set("Content-Type", "application/x-zip-compressed");
			expect(res.status).to.be.equal(StatusCodes.OK);
			expect(res.body).to.deep.equal({
				result: ["abc"],
			});
		} catch (err) {
			Log.error(err);
			expect.fail();
		}
	});

	// The other endpoints work similarly. You should be able to find all instructions in the supertest documentation
	it("DELETE test for non-existent dataset", async function () {
		const SERVER_URL = "http://localhost:4321";
		const ENDPOINT_URL = "/dataset/id";

		try {
			const res = await request(SERVER_URL).delete(ENDPOINT_URL);
			expect(res.status).to.be.equal(StatusCodes.NOT_FOUND);
		} catch (err) {
			Log.error(err);
			expect.fail();
		}
	});

	it("DELETE test for added dataset", async function () {
		const SERVER_URL = "http://localhost:4321";
		const ADD_ENDPOINT_URL = "/dataset/id/sections";
		const DELETE_ENDPOINT_URL = "/dataset/id";
		const ZIP_FILE_DATA = await fs.readFile("test/resources/archives/simpleSections1.zip");

		try {
			const putRes = await request(SERVER_URL)
				.put(ADD_ENDPOINT_URL)
				.send(ZIP_FILE_DATA)
				.set("Content-Type", "application/x-zip-compressed");
			expect(putRes.status).to.be.equal(StatusCodes.OK);
			expect(putRes.body).to.deep.equal({
				result: ["id"],
			});

			const res = await request(SERVER_URL).put(DELETE_ENDPOINT_URL);
			expect(res.status).to.be.equal(StatusCodes.NOT_FOUND);
		} catch (err) {
			Log.error(err);
			expect.fail();
		}
	});

	it("DELETE test for invalid idstring", async function () {
		const SERVER_URL = "http://localhost:4321";
		const ENDPOINT_URL = "/dataset/abc_123";

		try {
			const res = await request(SERVER_URL).delete(ENDPOINT_URL);
			expect(res.status).to.be.equal(StatusCodes.BAD_REQUEST);
		} catch (err) {
			Log.error(err);
			expect.fail();
		}
	});

	it("POST test for sections query", async function () {
		const SERVER_URL = "http://localhost:4321";
		const ADD_ENDPOINT_URL = "/dataset/sections/sections";
		const QUERY_ENDPOINT_URL = "/query";
		const ZIP_FILE_DATA = await fs.readFile("test/resources/archives/pair.zip");

		const query = {
			WHERE: {
				IS: { sections_dept: "*nb" },
			},
			OPTIONS: { COLUMNS: ["sections_dept", "sections_id"] },
		};

		const expected = [
			{ sections_dept: "aanb", sections_id: "504" },
			{ sections_dept: "aanb", sections_id: "504" },
			{ sections_dept: "aanb", sections_id: "551" },
			{ sections_dept: "aanb", sections_id: "551" },
		];

		try {
			await request(SERVER_URL)
				.put(ADD_ENDPOINT_URL)
				.send(ZIP_FILE_DATA)
				.set("Content-Type", "application/x-zip-compressed");
			const postRes = await request(SERVER_URL)
				.post(QUERY_ENDPOINT_URL)
				.send(query)
				.set("Content-Type", "application/json");
			expect(postRes.status).to.be.equal(StatusCodes.OK);
			expect(postRes.body.result).to.deep.equal(expected);
		} catch (err) {
			Log.error(err);
			expect.fail();
		}
	});

	it("POST test for invalid query (missing WHERE)", async function () {
		const SERVER_URL = "http://localhost:4321";
		const QUERY_ENDPOINT_URL = "/query";

		const query = {
			OPTIONS: {},
		};

		const expected = "ValidationError: Query is missing required field 'WHERE'.";

		try {
			const postRes = await request(SERVER_URL)
				.post(QUERY_ENDPOINT_URL)
				.send(query)
				.set("Content-Type", "application/json");
			expect(postRes.status).to.be.equal(StatusCodes.BAD_REQUEST);
			expect(postRes.body.error).to.be.equal(expected);
		} catch (err) {
			Log.error(err);
			expect.fail();
		}
	});

	it("GET test", async function () {
		const SERVER_URL = "http://localhost:4321";
		const LIST_ENDPOINT_URL = "/datasets";

		try {
			const res = await request(SERVER_URL).get(LIST_ENDPOINT_URL);
			expect(res.status).to.be.equal(StatusCodes.OK);
			expect(res.body.result).to.deep.equal([]);
		} catch (err) {
			Log.error(err);
			expect.fail();
		}
	});
});
