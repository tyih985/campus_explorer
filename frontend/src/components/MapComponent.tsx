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
			style: "mapbox://styles/mapbox/streets-v11",
			center: [-123.2504, 49.2612],
			zoom: 15
		});

		const map = mapRef.current;
		if (!map) return;

		for (let value of rooms.values()) {
			new mapboxgl.Marker()
				.setLngLat([value.lon, value.lat])
				.addTo(map);
		}

		for (let [key, value] of rooms) {
			new mapboxgl.Marker()
				.setLngLat([value.lon, value.lat])
				.setPopup(new mapboxgl.Popup({ className:"text-gray-700 text-2-xl" }).setHTML(`<p>${key}</p>`))
				.addTo(map);
		}

		return () => {
			if (mapRef.current) {
				mapRef.current.remove();
				mapRef.current = null;
			}
		}
	}, [rooms])

	useEffect(() => {
		const map = mapRef.current;
		if (!map) return;

		const updateSelectedRouteLayer = () => {
			if (map.getLayer("selected-route")) {
				map.removeLayer("selected-route");
			}
			if (map.getSource("selected-route")) {
				map.removeSource("selected-route");
			}
			if (selectedRoute && selectedRoute.geojson) {
				map.addSource("selected-route", {
					type: "geojson",
					data: selectedRoute.geojson
				});
				map.addLayer({
					id: "selected-route",
					type: "line",
					source: "selected-route",
					layout: { "line-join": "round", "line-cap": "round" },
					paint: { "line-color": "#800080", "line-width": 3 }
				});
			}
		};

		if (!map.isStyleLoaded()) {
			map.once("styledata", updateSelectedRouteLayer);
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
