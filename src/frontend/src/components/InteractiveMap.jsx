"use client";
/**
 * Interactive map component using React Leaflet (JavaScript)
 * - Displays routes, safety info, click-to-select destination
 */

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ---- default markers fix (production) ----
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// ---- custom marker icons ----
const createCustomIcon = (color, size = [25, 41]) =>
  L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background-color: ${color};
        width: ${size[0]}px;
        height: ${size[1]}px;
        border-radius: 50% 50% 50% 0;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1]],
    popupAnchor: [0, -size[1]],
  });

const originIcon = createCustomIcon("#10B981"); // green
const destinationIcon = createCustomIcon("#EF4444"); // red
const riskAreaIcon = createCustomIcon("#F59E0B", [20, 32]); // orange small

// ---- map click handler ----
function MapEventHandler({ onLocationSelect }) {
  const map = useMap();

  useEffect(() => {
    const handle = (e) => {
      const { lat, lng } = e.latlng;
      onLocationSelect?.(`${lat.toFixed(4)}, ${lng.toFixed(4)}`, "destination");
    };
    map.on("click", handle);
    return () => map.off("click", handle);
  }, [map, onLocationSelect]);

  return null;
}

// ---- color by safety score ----
const getRouteColor = (s) => {
  if ((s ?? 0) >= 80) return "#10B981"; // safe
  if ((s ?? 0) >= 60) return "#F59E0B"; // moderate
  return "#EF4444"; // higher risk
};

export default function InteractiveMap({
  center = [53.3498, -6.2603], // Dublin default
  routes = [],
  selectedRoute = null,
  onLocationSelect,
}) {
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);

  // fit map to selected route
  useEffect(() => {
    if (!map || !selectedRoute?.coordinates) return;
    try {
      const coords = selectedRoute.coordinates.map((c) =>
        Array.isArray(c) ? [c[1], c[0]] : [c.lat ?? c.latitude, c.lng ?? c.longitude]
      );
      if (coords.length) {
        const bounds = L.latLngBounds(coords);
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    } catch (e) {
      console.error("Error fitting bounds:", e);
    }
  }, [map, selectedRoute]);

  // demo risk markers
  useEffect(() => {
    if (selectedRoute?.risk_areas) {
      const riskMarkers = selectedRoute.risk_areas.map((area, i) => ({
        id: `risk-${i}`,
        position: [
          area.location?.lat ?? center[0] + Math.random() * 0.01,
          area.location?.lng ?? center[1] + Math.random() * 0.01,
        ],
        data: area,
      }));
      setMarkers(riskMarkers);
    } else {
      setMarkers([]);
    }
  }, [selectedRoute, center]);

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        whenCreated={setMap}
        zoomControl
        scrollWheelZoom
      >
        <TileLayer
          maxZoom={19}
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        <MapEventHandler onLocationSelect={onLocationSelect} />

        {routes.map((route, idx) => {
          if (!route.coordinates?.length) return null;
          try {
            const positions = route.coordinates.map((c) =>
              Array.isArray(c) ? [c[1], c[0]] : [c.lat ?? c.latitude, c.lng ?? c.longitude]
            );
            const isSelected = selectedRoute && (selectedRoute.id === route.id);
            const color = getRouteColor(route.safety_score ?? 75);

            return (
              <Polyline
                key={route.id ?? idx}
                positions={positions}
                pathOptions={{
                  color,
                  weight: isSelected ? 6 : 4,
                  opacity: isSelected ? 0.8 : 0.6,
                }}
                smoothFactor={1}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-medium text-gray-900">Route {idx + 1}</h3>
                    <div className="text-sm text-gray-600 mt-1">
                      <p>Duration: {Math.round((route.duration ?? 900) / 60)} minutes</p>
                      <p>Distance: {((route.distance ?? 1000) / 1000).toFixed(1)} km</p>
                      <p>Safety Score: {route.safety_score ?? 75}%</p>
                    </div>
                  </div>
                </Popup>
              </Polyline>
            );
          } catch (e) {
            console.error("Error rendering route:", e, route);
            return null;
          }
        })}

        {/* origin marker */}
        {selectedRoute?.coordinates?.length > 0 && (
          <Marker
            position={[
              selectedRoute.coordinates[0][1] ?? selectedRoute.coordinates[0].lat,
              selectedRoute.coordinates[0][0] ?? selectedRoute.coordinates[0].lng,
            ]}
            icon={originIcon}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-medium text-green-700">Starting Point</h3>
                <p className="text-sm text-gray-600">Your journey begins here</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* destination marker */}
        {selectedRoute?.coordinates?.length > 1 && (
          <Marker
            position={[
              selectedRoute.coordinates[selectedRoute.coordinates.length - 1][1] ??
                selectedRoute.coordinates[selectedRoute.coordinates.length - 1].lat,
              selectedRoute.coordinates[selectedRoute.coordinates.length - 1][0] ??
                selectedRoute.coordinates[selectedRoute.coordinates.length - 1].lng,
            ]}
            icon={destinationIcon}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-medium text-red-700">Destination</h3>
                <p className="text-sm text-gray-600">Your journey ends here</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* risk markers */}
        {markers.map((m) => (
          <Marker key={m.id} position={m.position} icon={riskAreaIcon}>
            <Popup>
              <div className="p-2">
                <h3 className="font-medium text-orange-700">Risk Area</h3>
                <div className="text-sm text-gray-600 mt-1">
                  <p>Type: {m.data.risk_type ?? "General"}</p>
                  <p>Severity: {m.data.severity ?? "Medium"}</p>
                  {m.data.description && <p className="mt-1">{m.data.description}</p>}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* legend */}
      <div className="absolute top-4 right-4 z-[1000]">
        <div className="bg-white rounded-lg shadow-md p-2">
          <div className="text-xs text-gray-600 mb-2">Legend</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-1 bg-green-500 mr-2 rounded" />
              <span>Safe Route</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-1 bg-orange-500 mr-2 rounded" />
              <span>Moderate Risk</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-1 bg-red-500 mr-2 rounded" />
              <span>Higher Risk</span>
            </div>
          </div>
        </div>
      </div>

      {/* loading overlay */}
      {routes.length === 0 && (
        <div className="absolute inset-0 bg-gray-50/80 flex items-center justify-center z-[1000]">
          <div className="text-center">
            <div className="text-gray-500 mb-2">🗺️</div>
            <p className="text-gray-600 text-sm">
              Enter your route details to see safety information
            </p>
            <p className="text-gray-500 text-xs mt-1">Click on the map to set destination</p>
          </div>
        </div>
      )}
    </div>
  );
}
