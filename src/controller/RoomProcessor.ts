import { Room } from "./Room";
import JSZip from "jszip";
import { InsightError } from "./IInsightFacade";
import { request } from "node:http";
import * as parse5 from "parse5";

export class RoomProcessor {
	public async parseHtm(zip: string): Promise<Room[]> {
		let content;
		let data;
		try {
			const zipBuffer = Buffer.from(zip, "base64");
			data = await JSZip.loadAsync(zipBuffer);
			const index = await data.files["index.htm"].async("string");
			content = parse5.parse(index);
		} catch (err) {
			throw new InsightError(`Invalid data given: ${err}`);
		}

		const table = await this.findTable(content, "views-field");
		if (table) {
			const tableContent: Record<string, any> = await this.validateTable(table, "Building", data);
			const result: Room[][] = [];
			const promises = tableContent.map(async (row: Record<string, any>) => {
				result.push(await this.validateRooms(row.rooms, row.building));
			});
			await Promise.all(promises);

			return result.flat();
		}
		throw new InsightError("No valid table found.");
	}

	private async findTable(node: any, className: string): Promise<Element | null> {
		if (node.nodeName === "table") {
			if (await this.tableContainsClass(node, className)) return node;
		}
		if (node.childNodes) {
			const promises = node.childNodes.map(async (child: ChildNode) => {
				return await this.findTable(child, className);
			});

			const result = await Promise.all(promises);
			const filtered = result.filter((item) => item !== null);
			if (filtered.length > 0) return filtered[0];
		}

		return null;
	}

	private async tableContainsClass(table: Element, className: string): Promise<boolean> {
		const children = Array.from(table.childNodes ?? []);
		const tbody = children.find((node) => node.nodeName === "tbody");

		if (tbody) {
			const promises = Array.from(tbody.childNodes).map(async (child) => {
				if (child.nodeName === "tr") {
					return Array.from(child.childNodes).some((cell) => this.cellContainsClass(cell, className));
				}
				return false;
			});

			const boolArray = await Promise.all(promises);
			return boolArray.some((value) => value);
		}
		return false;
	}

	private cellContainsClass(cell: any, className: string): boolean {
		return (
			cell.nodeName === "td" &&
			Array.from(cell.attrs ?? []).some(
				(attr: any) => attr.name === "class" && attr.value.split(" ").includes(className)
			)
		);
	}
	private async validateTable(table: Element, kind: string, data: any): Promise<Record<string, any>[]> {
		const result: Record<string, any>[] = [];
		const children = Array.from(table.childNodes ?? []);
		const tbody = children.find((node) => node.nodeName === "tbody");

		if (tbody) {
			const rows = Array.from(tbody.childNodes ?? []);
			const promises = rows.map(async (row) => {
				result.push(await this.validateRow(row as Element, kind, data));
			});
			await Promise.all(promises);
		}
		return result;
	}

	private async validateRow(row: Element, kind: string, data: any): Promise<Record<string, any>> {
		const cells = Array.from(row.childNodes ?? []).filter((cell) => cell.nodeName === "td");
		if (kind === "Building") {
			return await this.getRequiredBuildingInformation(cells as Element[], data);
		} else {
			return await this.getRequiredRoomInformation(cells as Element[]);
		}
	}

	private async getRequiredBuildingInformation(cells: any[], data: any): Promise<Record<string, any>> {
		const code = "views-field-field-building-code";
		const title = "views-field-title";
		const address = "views-field-field-building-address";

		let rooms: Record<string, any>[] = [];
		const buildingData: Record<string, any> = {};

		const promises = cells.map(async (cell) => {
			const cellClass: any = Array.from(cell.attrs ?? []).find((attr: any) => attr.name === "class");
			if (cellClass) {
				const cellClasses = cellClass.value.split(" ");
				if (cellClasses) {
					if (cellClasses.includes(code)) {
						const textNode: any = Array.from(cell.childNodes).find((node: any) => node.nodeName === "#text");
						if (textNode) buildingData.shortname = textNode.value.trim().replace(/\s+/g, " ");
					} else if (cellClasses.includes(title)) {
						const titleNode: any = Array.from(cell.childNodes ?? []).find((node: any) => node.nodeName === "a");
						if (titleNode) {
							const titleText: any = Array.from(titleNode.childNodes).find((node: any) => node.nodeName === "#text");
							if (titleText) buildingData.fullname = titleText.value.trim().replace(/\s+/g, " ");

							rooms = await this.handleBuildingFile(titleNode, data);
						}
					} else if (cellClasses.includes(address)) {
						const childNode: any = Array.from(cell.childNodes).find((node: any) => node.nodeName === "#text");
						if (childNode) buildingData.address = childNode.value.trim().replace(/\s+/g, " ");
					}
				}
			}
		});

		await Promise.all(promises);

		return {
			rooms: rooms,
			building: buildingData,
		};
	}

	private async validateRooms(rooms: Record<string, any>[], building: Record<string, any>): Promise<Room[]> {
		const result: Room[] = [];
		const buildingKeys = ["fullname", "shortname", "address"];
		const roomKeys = ["number", "seats", "type", "furniture", "href"];

		if (buildingKeys.every((key) => key in building)) {
			const geolocation = await this.getGeolocation(building.address);

			if (!geolocation.error) {
				building.lat = geolocation.lat;
				building.lon = geolocation.lon;

				const filteredRooms = rooms.filter((room) => roomKeys.every((key) => key in room));
				const promises = filteredRooms.map(async (room) => {
					result.push(new Room({ ...building, ...room }));
				});

				await Promise.all(promises);
			}
		}
		return result;
	}

	private async getGeolocation(address: string): Promise<any> {
		const URI = encodeURIComponent(address);
		return new Promise((resolve, reject) => {
			const req = request(`http://cs310.students.cs.ubc.ca:11316/api/v1/project_team232/${URI}`, (res) => {
				let data = "";

				res.on("data", (chunk) => {
					data += chunk;
				});

				res.on("end", () => {
					resolve(JSON.parse(data));
				});
			});

			req.on("error", (err) => {
				reject(err);
			});

			req.end();
		});
	}

	private async handleBuildingFile(elem: any, data: any): Promise<Record<string, any>[]> {
		const titleAttr: any = Array.from(elem.attrs).find((attr: any) => attr.name === "href");
		if (titleAttr) {
			const link = titleAttr.value;
			const file = data.files[link.slice(2)];
			if (file) {
				const getFile = await file.async("string");
				const content = parse5.parse(getFile);
				const table = await this.findTable(content, "views-field");
				if (table) {
					return await this.validateTable(table, "Room", data);
				}
			}
		}
		return [];
	}

	private async getRequiredRoomInformation(cells: any[]): Promise<Record<string, any>> {
		const number = "views-field-field-room-number";
		const seats = "views-field-field-room-capacity";
		const furniture = "views-field-field-room-furniture";
		const type = "views-field-field-room-type";

		const result: Record<string, any> = {};
		const promises = cells.map(async (cell) => {
			const cellClass: any = Array.from(cell.attrs).find((attr: any) => attr.name === "class");
			if (cellClass) {
				const classes = cellClass.value.split(" ");

				if (classes.includes(number)) {
					const numberLink: any = Array.from(cell.childNodes).find((node: any) => node.nodeName === "a");
					if (numberLink) {
						const numberLinkAttr: any = Array.from(numberLink.attrs).find((attr: any) => attr.name === "href");
						const linkChildren: any = Array.from(numberLink.childNodes).find((node: any) => node.nodeName === "#text");

						if (numberLinkAttr) result.href = numberLinkAttr.value;
						if (linkChildren) result.number = linkChildren.value;
					}
				} else if (classes.includes(seats)) {
					const childNode: any = Array.from(cell.childNodes).find((node: any) => node.nodeName === "#text");
					if (childNode) result.seats = childNode.value.trim().replace(/\s+/g, " ");
				} else if (classes.includes(furniture)) {
					const childNode: any = Array.from(cell.childNodes).find((node: any) => node.nodeName === "#text");
					if (childNode) result.furniture = childNode.value.trim().replace(/\s+/g, " ");
				} else if (classes.includes(type)) {
					const childNode: any = Array.from(cell.childNodes).find((node: any) => node.nodeName === "#text");
					if (childNode) result.type = childNode.value.trim().replace(/\s+/g, " ");
				}
			}
		});
		await Promise.all(promises);
		return result;
	}
}
