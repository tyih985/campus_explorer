import React, { createContext, useContext } from 'react';
import Room from '../types/Room.tsx';

export interface SelectedRoomsContextType {
    selectedRooms: Room[];
    setSelectedRooms: React.Dispatch<React.SetStateAction<Room[]>>;
}

export const SelectedRoomsContext = createContext<SelectedRoomsContextType | undefined>(undefined);

export const useSelectedRoomsContext = () => {
    const context = useContext(SelectedRoomsContext);
    if (context === undefined) {
        throw new Error('context not found');
    }
    return context;
};