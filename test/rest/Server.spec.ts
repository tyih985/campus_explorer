import { expect } from "chai";
import request from "supertest";
import { StatusCodes } from "http-status-codes";
import { Log } from "@ubccpsc310/project-support";
import Server from "../../src/rest/Server";
import * as fs from "fs-extra";
import {clearDisk} from "../TestUtil";

describe("Facade C3", function () {
	let server: Server;
	const port = 4321;

	before(async function () {
		server = new Server(port);
		try {
			await clearDisk();
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

	beforeEach(function () {
		// might want to add some process logging here to keep track of what is going on
	});

	afterEach(function () {
		// might want to add some process logging here to keep track of what is going on
	});

	// Sample on how to format PUT requests
	it("PUT test for courses dataset", async function () {
		const SERVER_URL = "http://localhost:4321";
		const ENDPOINT_URL = "/dataset/abc/sections";
		const ZIP_FILE_DATA = await fs.readFile("test/resources/archives/pair.zip");

		try {
			const res = await request(SERVER_URL)
				.put(ENDPOINT_URL)
				.send(ZIP_FILE_DATA)
				.set("Content-Type", "application/x-zip-compressed");
			expect(res.status).to.be.equal(StatusCodes.OK);
			expect(res.body).to.deep.equal({
				result: ['abc']
			});
		} catch (err) {
			Log.error(err);
			expect.fail();
		}
	});

	// The other endpoints work similarly. You should be able to find all instructions in the supertest documentation
});
