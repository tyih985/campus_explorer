import { useEffect, useState } from "react";
import { useSelectedRoomsContext } from "../contexts/SelectedRoomsContext";
import { useSelectedRouteContext } from "../contexts/SelectedRouteContext";
import Room from "../types/Room";
import { getRoomPairs } from "../directions";

interface PairEstimate {
	room1: Room;
	room2: Room;
	time: number | null;
}

interface RoomPairDetailsProps {
	routes: Array<{ id: string; geojson: any }>;
}

export default function RoomPairDetails({ routes }: RoomPairDetailsProps) {
	const { selectedRooms } = useSelectedRoomsContext();
	const { selectedRoute, setSelectedRoute } = useSelectedRouteContext();
	const [pairEstimates, setPairEstimates] = useState<PairEstimate[]>([]);

	async function fetchWalkingTime(room1: Room, room2: Room): Promise<number | null> {
		const accessToken = 'pk.eyJ1IjoiYXJpcmkiLCJhIjoiY204bDg0aTRvMDJyajJpb2h6MjR2aGpjMyJ9.M4NVyZ2FrkCZJhkHhO0pXQ';
		if (room1.rooms_lat === room2.rooms_lat && room1.rooms_lon === room2.rooms_lon) {
			return 2;
		}
		const start = `${room1.rooms_lon},${room1.rooms_lat}`;
		const end = `${room2.rooms_lon},${room2.rooms_lat}`;
		const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${start};${end}?access_token=${accessToken}&geometries=geojson`;
		try {
			const response = await fetch(url);
			const data = await response.json();
			if (data.routes && data.routes.length > 0) {
				return Math.round(data.routes[0].duration / 60);
			}
		} catch (error) {
			console.error("Error fetching walking time:", error);
		}
		return null;
	}

	useEffect(() => {
		if (selectedRooms.length < 2) {
			setPairEstimates([]);
			return;
		}
		const pairs = getRoomPairs(selectedRooms);
		async function fetchAllPairs() {
			const estimates: PairEstimate[] = [];
			await Promise.all(
				pairs.map(async ([room1, room2]) => {
					const time = await fetchWalkingTime(room1, room2);
					estimates.push({ room1, room2, time });
				})
			);
			setPairEstimates(estimates);
		}
		fetchAllPairs();
	}, [selectedRooms]);

	const id = (room1: Room, room2: Room) => {
		return [room1.rooms_shortname, room2.rooms_shortname].sort().join("-");
	};

	if (selectedRooms.length < 2) {
		return null;
	}

	return (
		<div className="w-1/3 bg-white shadow-lg rounded-lg p-6 h-full overflow-y-auto">
			<h1 className="text-2xl font-semibold mb-4 text-gray-700">Walking Distances</h1>
			<table className="w-full text-left border-collapse">
				<tbody>
				{pairEstimates.map((pair, index) => {
					const routeId = id(pair.room1, pair.room2);
					const isSelected = selectedRoute?.id === routeId;
					return (
						<tr
							key={index}
							className={`border-b cursor-pointer transition duration-150 ease-in-out ${isSelected ? "bg-blue-200 hover:bg-blue-300" : "bg-gray-100 hover:bg-gray-200"}`}
							onClick={() => {
								if (isSelected) {
									setSelectedRoute(null);
								} else {
									const matchingRoute = routes.find(route => route.id === routeId);
									if (matchingRoute) {
										setSelectedRoute(matchingRoute);
									}
								}
							}}
						>
							<td className="py-2 w-3/4 text-gray-700 whitespace-nowrap font-bold">
								{pair.room1.rooms_shortname} {pair.room1.rooms_number} - {pair.room2.rooms_shortname} {pair.room2.rooms_number}
							</td>
							<td className="py-2 w-1/4 text-gray-700">
								{pair.time !== null ? `${pair.time} min` : <span className="text-gray-500 italic">N/A</span>}
							</td>
						</tr>
					);
				})}
				</tbody>
			</table>
		</div>
	);
}
