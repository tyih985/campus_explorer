import Room from "../types/Room.tsx";
import RoomDetails from "./RoomDetails.tsx";
import { useState } from "react";
import { useFavouritesContext } from "../contexts/FavouritesContext.tsx";

function RoomList({ rooms }: any) {
    const { favourites } = useFavouritesContext();
    const [activeTab, setActiveTab] = useState("all");


    return (
        <div className="w-1/3 bg-white shadow-lg rounded-lg p-6 overflow-y-auto h-full text-lg">
            <h1 className="text-2xl font-semibold mb-4 text-gray-700"> Rooms List</h1>
            <div className="flex mb-4 border-b">
                <button
                    className={`py-2 px-4 ${activeTab === "all" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-500"}`}
                    onClick={() => setActiveTab("all")}
                >
                    All Rooms
                </button>
                <button
                    className={`py-2 px-4 ${activeTab === "favourites" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-500"}`}
                    onClick={() => setActiveTab("favourites")}
                >
                    Favourites
                </button>
            </div>
            <ul className="space-y-2">
                {activeTab === "all"
                    ? rooms.map((room: Room, index: number) => <RoomDetails key={index} room={room} index={index}/>)
                    : favourites.map((room: Room, index: number) => <RoomDetails key={index} room={room} index={index}/>)}
            </ul>
        </div>
    )
}

export default RoomList