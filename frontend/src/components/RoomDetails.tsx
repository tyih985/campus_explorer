import { useSelectedRoomsContext } from "../contexts/SelectedRoomsContext.tsx";
import {useState} from "react";

function RoomDetails({ room, index }: any) {
    const [ expanded, setExpanded ] = useState(false);
    const { selectedRooms, setSelectedRooms } = useSelectedRoomsContext();
    const isSelected = selectedRooms.includes(room as never);


    const handleCheckboxChange = (room: never) => {
        if (selectedRooms.includes(room)) {
            setSelectedRooms(selectedRooms.filter(r => r !== room));
            setExpanded(!expanded);
        } else if (selectedRooms.length < 5) {
            setSelectedRooms([...selectedRooms, room])
            setExpanded(!expanded);

        }
    };

    return (
        <li key={index}
            className={`p-3 rounded-lg transition cursor-pointer text-gray-700
                ${isSelected ? "bg-blue-200 hover:bg-blue-300" : "bg-gray-100 hover:bg-gray-200"}`
            }
            onClick={(e) => {
                e.stopPropagation();
                handleCheckboxChange(room as never);
            }}
        >
            <div className="flex items-center gap-x-4">
                <span className="font-semibold text-2xl">{`${room.rooms_shortname} ${room.rooms_number}`}</span>
            </div>

            {expanded && (
                <div className="mt-2 pl-4 flex flex-col">
                    <span className="text-lg text-gray-600">{room.rooms_fullname}</span>
                    <span className="text-lg text-gray-500">{`${room.rooms_address}`}</span>
                    <span className="text-lg text-gray-500">{`Seats: ${room.rooms_seats}`}</span>
                </div>
            )}

        </li>
    )
}

export default RoomDetails