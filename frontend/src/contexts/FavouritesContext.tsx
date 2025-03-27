import React, { createContext, useContext } from 'react';
import Room from '../types/Room.tsx';

export interface FavouritesContextType {
    favourites: Room[];
    setFavourites: React.Dispatch<React.SetStateAction<Room[]>>;
}

export const FavouritesContext = createContext<FavouritesContextType | undefined>(undefined);

export const useFavouritesContext = () => {
    const context = useContext(FavouritesContext);
    if (context === undefined) {
        throw new Error('context not found');
    }
    return context;
};