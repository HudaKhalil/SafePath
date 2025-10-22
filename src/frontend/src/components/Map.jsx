"use client";

import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Component to handle routing
function RoutingController({
  fromCoords,
  toCoords,
  onRouteFound,
  showRouting = false,
  transportMode = 'walking' // walking, cycling, driving
}) {
  const map = useMap();
  const routingControlRef = useRef(null);

  useEffect(() => {
    if (!showRouting || !fromCoords || !toCoords) {
      // Remove existing routing control
      if (routingControlRef.current) {
        if (typeof routingControlRef.current.remove === 'function') {
          routingControlRef.current.remove();
        } else if (map && routingControlRef.current._map) {
          map.removeControl(routingControlRef.current);
        }
        routingControlRef.current = null;
      }
      return;
    }

    // Use OpenRouteService or OSRM for proper road-following routes
    const getProperRoute = async () => {
      try {
        console.log(`Creating ${transportMode} route between points`);
        
        // Remove existing control first
        if (routingControlRef.current) {
          if (typeof routingControlRef.current.remove === 'function') {
            routingControlRef.current.remove();
          } else if (map && routingControlRef.current._map) {
            map.removeControl(routingControlRef.current);
          }
        }
        
        // Map transport modes to OSRM profiles
        const profileMap = {
          'walking': 'foot',
          'cycling': 'bike', 
          'driving': 'car'
        };
        
        const profile = profileMap[transportMode] || 'foot';
        
        // Use OSRM Demo API for routing (free but rate-limited)
        const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${fromCoords[1]},${fromCoords[0]};${toCoords[1]},${toCoords[0]}?overview=full&geometries=geojson`;
        
        const response = await fetch(osrmUrl);
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]); // Convert lon,lat to lat,lon
          
          // Create a polyline following the actual route
          const routeLine = L.polyline(coordinates, {
            color: transportMode === 'cycling' ? "#3b82f6" : transportMode === 'walking' ? "#10b981" : "#6b7280",
            weight: 4,
            opacity: 0.9,
          }).addTo(map);
          
          // Store reference for cleanup
          routingControlRef.current = {
            remove: () => {
              if (map && routeLine) {
                map.removeLayer(routeLine);
              }
            },
            _map: map
          };
          
          // Fit map to show the entire route
          const bounds = L.latLngBounds(coordinates);
          map.fitBounds(bounds, { padding: [20, 20] });
          
          // Call onRouteFound with actual route data
          if (onRouteFound) {
            const distance = route.distance / 1000; // Convert to km
            const duration = route.duration / 60; // Convert to minutes
            
            onRouteFound({
              summary: {
                totalDistance: route.distance, // meters
                totalTime: route.duration, // seconds
              },
              coordinates: coordinates,
              distance: distance.toFixed(1),
              duration: Math.round(duration),
              profile: transportMode
            });
          }
        } else {
          throw new Error('No routes found');
        }
        
      } catch (error) {
        console.warn('OSRM routing failed, falling back to straight line:', error);
        
        // Fallback to straight line if routing service fails
        const routeLine = L.polyline([fromCoords, toCoords], {
          color: "#10b981",
          weight: 4,
          opacity: 0.7,
          dashArray: "10, 10", // Dashed line to indicate it's not following roads
        }).addTo(map);
        
        // Store reference for cleanup
        routingControlRef.current = {
          remove: () => {
            if (map && routeLine) {
              map.removeLayer(routeLine);
            }
          },
          _map: map
        };
        
        // Calculate simple distance and call onRouteFound
        if (onRouteFound) {
          const distance = L.latLng(fromCoords).distanceTo(L.latLng(toCoords)) / 1000; // km
          const walkingSpeed = transportMode === 'walking' ? 5 : transportMode === 'cycling' ? 15 : 50; // km/h
          const duration = (distance / walkingSpeed) * 60; // minutes
          
          onRouteFound({
            summary: {
              totalDistance: Math.round(distance * 1000), // meters
              totalTime: Math.round(duration * 60), // seconds
            },
            coordinates: [fromCoords, toCoords],
            distance: distance.toFixed(1),
            duration: Math.round(duration),
            profile: transportMode,
            fallback: true
          });
        }
      }
    };
    
    getProperRoute();

    // Cleanup function
    return () => {
      if (routingControlRef.current) {
        if (typeof routingControlRef.current.remove === 'function') {
          routingControlRef.current.remove();
        }
        routingControlRef.current = null;
      }
    };
  }, [map, fromCoords, toCoords, showRouting, onRouteFound, transportMode]);

  return null;
}

// capture map clicks and bubble up
function ClickCatcher({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick(e.latlng);
    },
  });
  return null;
}

export default function Map({
  center = [51.5074, -0.1278],
  zoom = 13,
  height = "400px",
  routes = [],
  hazards = [],
  buddies = [],
  markers = [],
  fromCoords = null,
  toCoords = null,
  showRouting = false,
  transportMode = 'walking', // walking, cycling
  onRouteClick = () => {},
  onHazardClick = () => {},
  onBuddyClick = () => {},
  onRouteFound = () => {},
  onMapClick = null,
}) {
  // Create custom icons
  const createCustomIcon = (color, type) => {
    const iconHtml =
      type === "hazard"
        ? `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 14px;">⚠️</div>`
        : type === "buddy"
        ? `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 14px;">👤</div>`
        : type === "from"
        ? `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">📍</div>`
        : type === "to"
        ? `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🎯</div>`
        : `<div style="background-color: ${color}; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white;"></div>`;

    return L.divIcon({
      html: iconHtml,
      className: "custom-marker",
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  };

  // Get route color based on safety rating
  const getRouteColor = (safetyRating) => {
    if (safetyRating >= 8) return "#10b981"; // green
    if (safetyRating >= 6) return "#f59e0b"; // yellow
    return "#ef4444"; // red
  };

  return (
    <div style={{ height, width: "100%" }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        className="rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* click catcher */}
        {onMapClick && <ClickCatcher onMapClick={onMapClick} />}
        {/* Routing Controller */}
        <RoutingController
          fromCoords={fromCoords}
          toCoords={toCoords}
          showRouting={showRouting}
          transportMode={transportMode}
          onRouteFound={onRouteFound}
        />
        {/* From Location Marker */}
        {fromCoords && (
          <Marker
            position={fromCoords}
            icon={createCustomIcon("#10b981", "from")}
          >
            <Popup>
              <div className="text-sm">
                <strong>Starting Point</strong>
              </div>
            </Popup>
          </Marker>
        )}
        {/* To Location Marker */}
        {toCoords && (
          <Marker position={toCoords} icon={createCustomIcon("#ef4444", "to")}>
            <Popup>
              <div className="text-sm">
                <strong>Destination</strong>
              </div>
            </Popup>
          </Marker>
        )}
        {/* Routes */}
        {routes.map((route) => (
          <Polyline
            key={route.id}
            positions={route.path || []}
            color={getRouteColor(route.safetyRating)}
            weight={4}
            opacity={0.8}
            eventHandlers={{
              click: () => onRouteClick(route),
            }}
          >
            <Popup>
              <div className="text-sm">
                <h3 className="font-semibold">{route.name}</h3>
                <p>Safety Rating: {route.safetyRating}/10</p>
                <p>Distance: {route.distance} km</p>
                <p>Duration: {route.estimatedTime} min</p>
              </div>
            </Popup>
          </Polyline>
        ))}
        {/* Hazards */}
        {hazards.map((hazard) => (
          <Marker
            key={hazard.id}
            position={[hazard.latitude, hazard.longitude]}
            icon={createCustomIcon("#ef4444", "hazard")}
            eventHandlers={{
              click: () => onHazardClick(hazard),
            }}
          >
            <Popup>
              <div className="text-sm">
                <h3 className="font-semibold">{hazard.type}</h3>
                <p>{hazard.description}</p>
                <p className="text-xs text-gray-500">
                  Reported: {new Date(hazard.reportedAt).toLocaleDateString()}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
        {/* Buddies */}
        {buddies.map((buddy) => (
          <Marker
            key={buddy.id}
            position={[buddy.latitude, buddy.longitude]}
            icon={createCustomIcon("#3b82f6", "buddy")}
            eventHandlers={{
              click: () => onBuddyClick(buddy),
            }}
          >
            <Popup>
              <div className="text-sm">
                <h3 className="font-semibold">{buddy.name}</h3>
                <p>Available for: {buddy.availableFor}</p>
                <p className="text-xs text-gray-500">
                  Distance: {buddy.distance?.toFixed(1)} km away
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
        {/* Custom Markers */}
        {markers.map((marker, index) => (
          <Marker
            key={index}
            position={marker.position}
            icon={
              marker.color
                ? createCustomIcon(marker.color, marker.type)
                : undefined
            }
          >
            {marker.popup && <Popup>{marker.popup}</Popup>}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
