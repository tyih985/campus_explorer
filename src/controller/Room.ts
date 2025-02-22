import { InsightError } from "./IInsightFacade";

export class Room {
	private readonly fullname: string;
	private readonly shortname: string;
	private readonly number: string;
	private readonly name: string;
	private readonly address: string;
	private readonly lat: number;
	private readonly lon: number;
	private readonly seats: number;
	private readonly type: string;
	private readonly furniture: string;
	private readonly href: string;

	constructor(data: Record<string, any>) {
		try {
			this.fullname = String(data.fullname);
			this.shortname = String(data.shortname);
			this.number = String(data.number);
			this.name = `${this.shortname}_${this.number}`;
			this.address = String(data.address);
			this.lat = Number(data.lat);
			this.lon = Number(data.lon);
			this.seats = Number(data.seats);
			this.type = String(data.type);
			this.furniture = String(data.furniture);
			this.href = String(data.href);
		} catch {
			throw new InsightError("Invalid data given for rooms.");
		}
	}

	public formatRoom(): Record<string, any> {
		return {
			fullname: this.fullname,
			shortname: this.shortname,
			number: this.number,
			name: this.name,
			address: this.address,
			lat: this.lat,
			lon: this.lon,
			seats: this.seats,
			type: this.type,
			furniture: this.furniture,
			href: this.href,
		};
	}

	public get(field: string): string | number {
		const fieldDict = {
			fullname: this.fullname,
			shortname: this.shortname,
			number: this.number,
			name: this.name,
			address: this.address,
			lat: this.lat,
			lon: this.lon,
			seats: this.seats,
			type: this.type,
			furniture: this.furniture,
			href: this.href,
		};

		if (Object.hasOwn(fieldDict as object, field as string)) {
			return (fieldDict as any)[field as string];
		}
		throw new InsightError("Invalid query key given.");
	}
}
