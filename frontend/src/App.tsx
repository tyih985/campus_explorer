// import { useState } from 'react'
// import './App.css'

import {useEffect, useState} from "react";


function App() {
    const [rooms, setRooms] = useState([]);
    // const [count, setCount] = useState(0)
    useEffect(() => {
        const query = {
            WHERE: {},
            OPTIONS: {
                COLUMNS: ["rooms_shortname", "rooms_number", "rooms_fullname"]
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
                <div className="w-2/3 h-full bg-gray-200 rounded-lg flex items-center justify-center text-2xl">
                    <h1 className="text-xl text-gray-600"> map </h1>
                </div>
                <div className="w-1/3 bg-white shadow-lg rounded-lg p-6 overflow-y-auto h-full text-lg">
                    <h1 className="text-2xl font-semibold mb-4 text-gray-700"> rooms list</h1>
                    <ul className="space-y-2">
                        {rooms.map((room: any, index) => (
                            <li key={index} className="p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition text-gray-700">
                                {`${room.rooms_shortname} ${room.rooms_number}`}
                            </li>
                        ))}
                    </ul>
                </div>
                </div>
            </div>
        </>
    )
}

export default App