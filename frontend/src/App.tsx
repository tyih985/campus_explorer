import { useEffect, useMemo, useState } from "react";
import MapComponent from "./components/MapComponent.tsx";
import RoomPairDetails from "./components/RoomPairDetails.tsx";
import Room from "./types/Room.tsx";
import { SelectedRoomsContextType, SelectedRoomsContext } from "./contexts/SelectedRoomsContext.tsx";
import RoomList from "./components/RoomList.tsx";
import {FavouritesContext, FavouritesContextType} from "./contexts/FavouritesContext.tsx";
import { getWalkingRoute, getRoomPairs } from "./directions";

export interface Geolocation {
    lat: number,
    lon: number
}

function getUniqueLocations(rooms: Room[]): Map<string, Geolocation> {
    const locations = new Map();
    rooms.forEach((room) => {
        locations.set(room.rooms_address, {
            lat: room.rooms_lat,
            lon: room.rooms_lon
        });
    });
    return locations
}


function App() {
    const [rooms, setRooms] = useState([]);
	const [routes, setRoutes] = useState<Array<{ id: string, geojson: any }>>([]);

    const defaultSelected: SelectedRoomsContextType = {
        selectedRooms: [],
        setSelectedRooms: () => {}
    }
    const [selectedRooms, setSelectedRooms] = useState<Room[]>(defaultSelected.selectedRooms);

    const defaultFavourites: FavouritesContextType = {
        favourites: [],
        setFavourites: () => {}
    }
    const [favourites, setFavourites] = useState<Room[]>(defaultFavourites.favourites);

    useEffect(() => {
        const query = {
            WHERE: {},
            OPTIONS: {
                COLUMNS: ["rooms_shortname", "rooms_number", "rooms_fullname", "rooms_lat", "rooms_lon", "rooms_address", "rooms_seats"]
            }
        }
        fetch("http://localhost:4321/query", {
            method: "POST",
            headers: {
                "Content-type": "application/json",
            },
            body: JSON.stringify(query)
        })
            .then(response => response.json())
            .then(json =>  {
                console.log(json.result);
                setRooms(json.result);
            })
            .catch(error => console.log(error));
    }, []);

    const uniqueRooms = useMemo(() => getUniqueLocations(rooms), [rooms]);

	useEffect(() => {
		async function fetchRoutes() {
			if (selectedRooms.length < 2) {
				setRoutes([]);
				return;
			}
			const pairs = getRoomPairs(selectedRooms);
			const newRoutes: Array<{ id: string, geojson: any }> = [];
			for (const [roomA, roomB] of pairs) {
				const origin: [number, number] = [roomA.rooms_lon, roomA.rooms_lat];
				const destination: [number, number] = [roomB.rooms_lon, roomB.rooms_lat];
				const geojson = await getWalkingRoute(origin, destination);
				const id = [roomA.rooms_shortname, roomB.rooms_shortname].sort().join("-");
				if (geojson) {
					newRoutes.push({ id, geojson });
				}
			}
			setRoutes(newRoutes);
		}
		fetchRoutes();
	}, [selectedRooms]);

    return (
        <>
            <h1 className="text-4xl font-bold text-center mt-6">Campus Explorer</h1>
            <div className="flex flex-col items-center mt-6 space-y-4 h-screen">

                <div className="flex justify-center items-center w-full max-w-[90%] mt-6 space-x-6 h-2/3">
                    <SelectedRoomsContext.Provider value={{ selectedRooms, setSelectedRooms }}>
						<MapComponent rooms={uniqueRooms} routes={routes} />
                        <FavouritesContext.Provider value={{ favourites, setFavourites }}>
                            <RoomList rooms={rooms}/>
                        </FavouritesContext.Provider>
						<RoomPairDetails/>
                    </SelectedRoomsContext.Provider>
                </div>
            </div>
        </>
    )
}

export default App
