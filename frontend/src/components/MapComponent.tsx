import { useEffect, useRef } from "react";
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from "mapbox-gl";


function MapComponent ({ rooms }: any) {
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
            zoom: 18
        });

        for (let value of rooms.values()) {
            new mapboxgl.Marker()
                .setLngLat([value.lon, value.lat])
                .addTo(mapRef.current);
        }

        return () => {
            mapRef.current.remove()
        }
    }, [rooms])

    return (
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }}/>
    );
}

export default MapComponent;
