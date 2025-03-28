import React, { createContext, useContext } from "react";

export interface SelectedRoute {
	id: string;
	geojson: any;
}

export interface SelectedRouteContextType {
	selectedRoute: SelectedRoute | null;
	setSelectedRoute: React.Dispatch<React.SetStateAction<SelectedRoute | null>>;
}

export const SelectedRouteContext = createContext<SelectedRouteContextType | undefined>(undefined);

export const useSelectedRouteContext = () => {
	const context = useContext(SelectedRouteContext);
	if (context === undefined) {
		throw new Error("SelectedRouteContext not found");
	}
	return context;
};
