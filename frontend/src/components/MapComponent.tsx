import { useEffect, useRef } from "react";
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from "mapbox-gl";

interface Geolocation {
	lat: number;
	lon: number;
}

interface Route {
	id: string;
	geojson: any;
}

interface MapComponentProps {
	rooms: Map<string, Geolocation>;
	routes: Route[];
}

function MapComponent ({ rooms, routes }: MapComponentProps) {
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
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
		const currentMap = mapRef.current;

		if (!currentMap.isStyleLoaded()) {
			currentMap.once("styledata", () => {});
			return;
		}

		const style = currentMap.getStyle();
		if (style && style.layers) {
			style.layers.forEach((layer) => {
				if (layer.id.startsWith("route-")) {
					if (currentMap.getLayer(layer.id)) {
						currentMap.removeLayer(layer.id);
					}
					if (currentMap.getSource(layer.id)) {
						currentMap.removeSource(layer.id);
					}
				}
			});
		}

		const colors = [
			"#800080", // purpleee
			"#FF4500", // red-orange
			"#1E90FF", // blue
			"#32CD32", // green
			"#FFD700", // yellow
			"#FF1493", // pink
			"#00CED1", // cyan
			"#DC143C", // red
			"#8A2BE2", // light purple
			"#FF8C00", // orange
		];

		routes.forEach((route, idx) => {
			if (!route.geojson) return;
			const sourceId = `route-${route.id}`;
			const color = colors[idx % colors.length];

			if (!currentMap.getSource(sourceId)) {
				currentMap.addSource(sourceId, {
					type: "geojson",
					data: route.geojson,
				});

				currentMap.addLayer({
					id: sourceId,
					type: "line",
					source: sourceId,
					layout: {
						"line-join": "round",
						"line-cap": "round",
					},
					paint: {
						"line-color": color,
						"line-width": 2,
					},
				});
			} else {
				(currentMap.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(route.geojson);
			}
		});
	}, [routes]);

    return (
        <div className="w-2/3 h-full rounded-lg flex items-center justify-center">
            <div ref={mapContainerRef} style={{width: "100%", height: "100%"}}/>
        </div>
    );
}

export default MapComponent;
