function RoomDetails({ room, index }: any) {
    return (
        <li key={index} className="p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition text-gray-700">
            {`${room.rooms_shortname} ${room.rooms_number}`}
        </li>
    )
}

export default RoomDetails