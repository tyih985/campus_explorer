import { useEffect, useRef } from "react";
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from "mapbox-gl";
import { useSelectedRouteContext } from "../contexts/SelectedRouteContext";

interface Geolocation {
	lat: number;
	lon: number;
}

interface MapComponentProps {
	rooms: Map<string, Geolocation>;
}

function MapComponent ({ rooms }: MapComponentProps) {
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
	const { selectedRoute } = useSelectedRouteContext();
    console.log(rooms);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        mapboxgl.accessToken = 'pk.eyJ1IjoiYXJpcmkiLCJhIjoiY204bDg0aTRvMDJyajJpb2h6MjR2aGpjMyJ9.M4NVyZ2FrkCZJhkHhO0pXQ'
        mapRef.current = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: "mapbox://styles/mapbox/streets-v11", // Add map style
            center: [-123.2504, 49.2612],
            zoom: 15
        });

        for (let value of rooms.values()) {
            new mapboxgl.Marker()
                .setLngLat([value.lon, value.lat])
                .addTo(mapRef.current);
        }

        for (let [key, value] of rooms) {
            new mapboxgl.Marker()
                .setLngLat([value.lon, value.lat])
                .setPopup(new mapboxgl.Popup({ className:"text-gray-700 text-2-xl" }).setHTML(`<p>${key}</p>`))
                .addTo(mapRef.current);
        }

        return () => {
            mapRef.current.remove()
        }
    }, [rooms])

	useEffect(() => {
		if (!mapRef.current) return;

		const updateSelectedRouteLayer = () => {
			if (mapRef.current.getLayer("selected-route")) {
				mapRef.current.removeLayer("selected-route");
			}
			if (mapRef.current.getSource("selected-route")) {
				mapRef.current.removeSource("selected-route");
			}
			if (selectedRoute && selectedRoute.geojson) {
				mapRef.current.addSource("selected-route", {
					type: "geojson",
					data: selectedRoute.geojson
				});
				mapRef.current.addLayer({
					id: "selected-route",
					type: "line",
					source: "selected-route",
					layout: { "line-join": "round", "line-cap": "round" },
					paint: { "line-color": "#800080", "line-width": 3 }
				});
			}
		};

		if (!mapRef.current.isStyleLoaded()) {
			mapRef.current.once("styledata", updateSelectedRouteLayer);
		} else {
			updateSelectedRouteLayer();
		}
	}, [selectedRoute]);

    return (
        <div className="w-2/3 h-full rounded-lg flex items-center justify-center">
            <div ref={mapContainerRef} style={{width: "100%", height: "100%"}}/>
        </div>
    );
}

export default MapComponent;
