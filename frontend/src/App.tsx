import { useEffect, useState } from "react";
import MapComponent from "./components/MapComponent.tsx";
import RoomDetails from "./components/RoomDetails.tsx";

interface Room {
    rooms_fullname: string,
    rooms_shortname: string,
    rooms_number: string,
    rooms_name: string,
    rooms_address: string,
    rooms_lat: number,
    rooms_lon: number,
    rooms_seats: number,
    rooms_type: string,
    rooms_furniture: string,
    rooms_href: string
}

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
    // const [count, setCount] = useState(0)
    useEffect(() => {
        const query = {
            WHERE: {},
            OPTIONS: {
                COLUMNS: ["rooms_shortname", "rooms_number", "rooms_fullname", "rooms_lat", "rooms_lon", "rooms_address"]
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

    return (
        <>
            <h1 className="text-4xl font-bold text-center mt-6">Campus Explorer</h1>
            <div className="flex flex-col items-center mt-6 space-y-4 h-screen">

                <div className="w-full max-w-2xl px-4">
                <input
                    type="text"
                    placeholder="Search for a room or building name here..."
                    className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                </div>

                <div className="flex justify-center items-center w-full max-w-[90%] mt-6 space-x-6 h-2/3">
                <div className="w-2/3 h-full rounded-lg flex items-center justify-center">
                    {/*<h1 className="text-xl text-gray-600"> map </h1>*/}
                    <MapComponent rooms={getUniqueLocations(rooms)}/>
                </div>
                <div className="w-1/3 bg-white shadow-lg rounded-lg p-6 overflow-y-auto h-full text-lg">
                    <h1 className="text-2xl font-semibold mb-4 text-gray-700"> rooms list</h1>
                    <ul className="space-y-2">
                        {rooms.map((room: Room, index) => (
                            <RoomDetails room={room} index={index}/>
                        ))}
                    </ul>
                </div>
                </div>
            </div>
        </>
    )
}

export default App