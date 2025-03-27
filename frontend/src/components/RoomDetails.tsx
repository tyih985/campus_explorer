import { useSelectedRoomsContext } from "../contexts/SelectedRoomsContext.tsx";
import {useEffect, useState} from "react";
import {useFavouritesContext} from "../contexts/FavouritesContext.tsx";
import HeartIcon from "./HeartIcon.tsx";


function RoomDetails({ room, index }: any) {
    const { selectedRooms, setSelectedRooms } = useSelectedRoomsContext();
    const { favourites, setFavourites } = useFavouritesContext();

    const [ expanded, setExpanded ] = useState(selectedRooms.some((selected) =>
        room.rooms_shortname === selected.rooms_shortname &&
        room.rooms_number === selected.rooms_number));

    const [ liked, setLiked ] = useState(favourites.some((favourite) =>
        room.rooms_shortname === favourite.rooms_shortname &&
        room.rooms_number === favourite.rooms_number));

    const isSelected = selectedRooms.includes(room as never);

    useEffect(() => {
        setLiked(favourites.some((favourite) =>
            room.rooms_shortname === favourite.rooms_shortname &&
            room.rooms_number === favourite.rooms_number
        ));

        setExpanded(selectedRooms.some((selected) =>
            room.rooms_shortname === selected.rooms_shortname &&
            room.rooms_number === selected.rooms_number
        ));
    }, [favourites, selectedRooms, room]);


    const handleCheckboxChange = (room: never) => {
        if (selectedRooms.includes(room)) {
            setSelectedRooms(selectedRooms.filter(r => r !== room));
            setExpanded(!expanded);
        } else if (selectedRooms.length < 5) {
            setSelectedRooms([...selectedRooms, room])
            setExpanded(!expanded);
        }
    };

    const handleLikeChange = (room: never) => {
        if (favourites.includes(room)) {
            setFavourites(favourites.filter(r => r !== room));
        } else {
            setFavourites([...favourites, room]);
        }
        setLiked(!liked);
    }

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
            <div className="flex justify-between items-center w-full">
            <div>
            <div className="flex items-center gap-x-4">
                <span className="font-semibold text-xl">{ `${room.rooms_shortname} ${room.rooms_number}` }</span>
            </div>

            {expanded && (
                <div className="mt-2 pl-4 flex flex-col">
                    <span className="text-lg text-gray-600">{ room.rooms_fullname }</span>
                    <span className="text-lg text-gray-500">{ `${room.rooms_address}` }</span>
                    <span className="text-lg text-gray-500">{ `Seats: ${room.rooms_seats}` }</span>
                </div>
            )}
            </div>
            <div className="mr-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleLikeChange(room as never)
                    }}
                >
                    <HeartIcon filled={ liked }/>
                </button>
            </div>
            </div>
        </li>
    )
}

export default RoomDetails
