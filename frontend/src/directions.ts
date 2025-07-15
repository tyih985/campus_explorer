import Room from "./types/Room.tsx";

const MAPBOX_ACCESS_TOKEN = "pk.eyJ1IjoiYXJpcmkiLCJhIjoiY204bDg0aTRvMDJyajJpb2h6MjR2aGpjMyJ9.M4NVyZ2FrkCZJhkHhO0pXQ";

export async function getWalkingRoute(origin: [number, number], destination: [number, number]): Promise<any> {
	const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${origin.join(",")};${destination.join(",")}?access_token=${MAPBOX_ACCESS_TOKEN}&geometries=geojson`;
	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error("Failed to fetch directions");
		}
		const data = await response.json();
		return data.routes?.[0]?.geometry || null;
	} catch (err) {
		console.error(err);
		return null;
	}
}

export function getRoomPairs(rooms: Room[]): Array<[Room, Room]> {
	const pairs: Array<[Room, Room]> = [];
	for (let i = 0; i < rooms.length; i++) {
		for (let j = i + 1; j < rooms.length; j++) {
			pairs.push([rooms[i], rooms[j]]);
		}
	}
	return pairs;
}
