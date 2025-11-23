"use client";

import { useEffect, useRef, useState } from "react";
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
import { LOCATION_CONFIG } from "../lib/locationConfig";
import { routingService } from "../lib/services";


function AutoFitBounds({ routes, fromCoords, toCoords }) {
  const map = useMap();

  useEffect(() => {
    if (!routes || routes.length === 0) return;

    // Collect all coordinates from routes and markers
    const allCoordinates = [];

    // Add route coordinates
    routes.forEach((route) => {
      if (route.coordinates && route.coordinates.length > 0) {
        allCoordinates.push(...route.coordinates);
      }
    });

    // Add from/to markers
    if (fromCoords) allCoordinates.push(fromCoords);
    if (toCoords) allCoordinates.push(toCoords);

    // If we have coordinates, fit bounds
    if (allCoordinates.length > 0) {
      const bounds = L.latLngBounds(allCoordinates);
      
      // Fit with padding and smooth animation
      map.fitBounds(bounds, {
        padding: [50, 50], // 50px padding on all sides
        maxZoom: 15, // Don't zoom in too much
        animate: true,
        duration: 0.8, // Smooth 800ms animation
      });
    }
  }, [routes, fromCoords, toCoords, map]);

  return null;
}

// Fix Leaflet default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Enhanced Component to handle routing with multiple providers
function RoutingController({
  fromCoords,
  toCoords,
  onRouteFound,
  showRouting = false,
  transportMode = 'walking'
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

    // Get proper road-following route
    const getProperRoute = async () => {
      try {
        console.log(`🗺️ Creating ${transportMode} route between points`);
        
        // Remove existing control first
        if (routingControlRef.current) {
          if (typeof routingControlRef.current.remove === 'function') {
            routingControlRef.current.remove();
          } else if (map && routingControlRef.current._map) {
            map.removeControl(routingControlRef.current);
          }
        }
        
        // Use the enhanced routing service
        const routeResult = await routingService.getRoute(
          fromCoords[0], fromCoords[1], // from lat, lon
          toCoords[0], toCoords[1],     // to lat, lon
          transportMode
        );
        
        if (routeResult.success) {
          const { coordinates, distance, duration, provider, fallback } = routeResult;
          
          // Use light blue for all search routes between two selected points
          const routeColor = "#3b82f6"; // Light blue for search routes
          
          const routeLine = L.polyline(coordinates, {
            color: routeColor,
            weight: fallback ? 4 : 6, // Slightly thicker for better visibility
            opacity: fallback ? 0.7 : 0.9,
            dashArray: fallback ? "10, 10" : null, // Dashed line for straight-line fallback
          }).addTo(map);
          
          // Add route markers for waypoints if it's not a fallback
          const waypoints = [];
          if (!fallback && coordinates.length > 10) {
            // Add intermediate waypoints for longer routes
            const step = Math.floor(coordinates.length / 5);
            for (let i = step; i < coordinates.length - step; i += step) {
              const waypoint = L.circleMarker(coordinates[i], {
                color: routeColor,
                fillColor: routeColor,
                fillOpacity: 0.8,
                radius: 3
              }).addTo(map);
              waypoints.push(waypoint);
            }
          }
          
          // Store reference for cleanup
          routingControlRef.current = {
            remove: () => {
              if (map) {
                if (routeLine) map.removeLayer(routeLine);
                waypoints.forEach(waypoint => map.removeLayer(waypoint));
              }
            },
            _map: map
          };
          
          // Fit map to show the entire route with padding
          const bounds = L.latLngBounds(coordinates);
          map.fitBounds(bounds, { padding: [30, 30] });
          
          // Call onRouteFound with route data
          if (onRouteFound) {
            onRouteFound({
              summary: {
                totalDistance: distance, // meters
                totalTime: duration, // seconds
              },
              coordinates: coordinates,
              distance: (distance / 1000).toFixed(1), // km
              duration: Math.round(duration / 60), // minutes
              profile: transportMode,
              provider: provider,
              fallback: fallback || false,
              instructions: routeResult.instructions || []
            });
          }
          
          console.log(`✅ Route created using ${provider} (${fallback ? 'fallback' : 'road-following'})`);
        }
        
      } catch (error) {
        console.error('❌ All routing providers failed:', error);
        
        // Last resort: simple straight line
        const routeLine = L.polyline([fromCoords, toCoords], {
          color: "#ef4444",
          weight: 3,
          opacity: 0.5,
          dashArray: "15, 15",
        }).addTo(map);
        
        routingControlRef.current = {
          remove: () => {
            if (map && routeLine) {
              map.removeLayer(routeLine);
            }
          },
          _map: map
        };
        
        // Calculate simple distance
        const distance = L.latLng(fromCoords).distanceTo(L.latLng(toCoords));
        const walkingSpeed = transportMode === 'walking' ? 5 : transportMode === 'cycling' ? 15 : 30;
        const duration = (distance / 1000 / walkingSpeed) * 3600; // seconds
        
        if (onRouteFound) {
          onRouteFound({
            summary: {
              totalDistance: Math.round(distance),
              totalTime: Math.round(duration),
            },
            coordinates: [fromCoords, toCoords],
            distance: (distance / 1000).toFixed(1),
            duration: Math.round(duration / 60),
            profile: transportMode,
            provider: 'emergency-fallback',
            fallback: true,
            error: error.message
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

// Custom hook to enhance route with road-following coordinates
function useEnhancedRoute(route) {
  const [enhancedPath, setEnhancedPath] = useState(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);

  useEffect(() => {
    const enhanceRoute = async () => {
      if (!route?.path || route.path.length < 2) {
        setEnhancedPath(route?.path || []);
        setRouteInfo({ provider: 'none', fallback: true });
        return;
      }

      // If route already has many points, assume it's road-following
      if (route.path.length > 10) {
        setEnhancedPath(route.path);
        setRouteInfo({ provider: 'existing', fallback: false });
        return;
      }

      try {
        setIsEnhancing(true);
        const startPoint = route.path[0];
        const endPoint = route.path[route.path.length - 1];
        
        console.log(`🗺️ Enhancing route ${route.name} with road-following path`);
        
        const routeResult = await routingService.getRoute(
          startPoint[0], startPoint[1],
          endPoint[0], endPoint[1],
          route.transportMode || 'walking'
        );
        
        if (routeResult.success && routeResult.coordinates && routeResult.coordinates.length > 2) {
          setEnhancedPath(routeResult.coordinates);
          setRouteInfo({
            provider: routeResult.provider,
            fallback: routeResult.fallback || false,
            distance: routeResult.distance,
            duration: routeResult.duration
          });
          console.log(`✅ Enhanced route ${route.name} with ${routeResult.coordinates.length} road points via ${routeResult.provider}`);
        } else {
          setEnhancedPath(route.path);
          setRouteInfo({ provider: 'original', fallback: true });
        }
      } catch (error) {
        console.warn(`Could not enhance route ${route.name}:`, error);
        setEnhancedPath(route.path);
        setRouteInfo({ provider: 'error', fallback: true, error: error.message });
      } finally {
        setIsEnhancing(false);
      }
    };

    enhanceRoute();
  }, [route]);

  return { enhancedPath, isEnhancing, routeInfo };
}

// Component for displaying individual routes with road-following enhancement
function RoadFollowingRoute({ route, onRouteClick, getRouteColor }) {
  const { enhancedPath, isEnhancing, routeInfo } = useEnhancedRoute(route);

  if (!enhancedPath || enhancedPath.length === 0) {
    return null;
  }

  // Styling based on route quality
  const isRoadFollowing = enhancedPath.length > 10 && !routeInfo?.fallback;
  const lineWeight = isEnhancing ? 2 : (isRoadFollowing ? 4 : 3);
  const lineOpacity = isEnhancing ? 0.4 : (isRoadFollowing ? 0.8 : 0.6);
  const dashArray = isEnhancing ? "5, 5" : (routeInfo?.fallback ? "10, 10" : null);

  return (
    <Polyline
      key={`${route.id}-road-following`}
      positions={enhancedPath}
      color={getRouteColor(route.safetyRating)}
      weight={lineWeight}
      opacity={lineOpacity}
      dashArray={dashArray}
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
          
          {/* Route enhancement status */}
          <div className="text-xs mt-1 pt-1 border-t">
            {isEnhancing ? (
              <p className="text-blue-500">🔄 Enhancing route...</p>
            ) : isRoadFollowing ? (
              <p className="text-green-600">
                ✓ Road-following ({enhancedPath.length} points)
              </p>
            ) : (
              <p className="text-amber-600">
                ⚠ {routeInfo?.fallback ? 'Basic route' : 'Simple route'}
              </p>
            )}
            {routeInfo && (
              <p className="text-gray-500">
                Source: {routeInfo.provider}
              </p>
            )}
          </div>
        </div>
      </Popup>
    </Polyline>
  );
}

// Enhanced click catcher with place detection
function ClickCatcher({ onMapClick, onPlaceSelect }) {
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick(e.latlng);
      if (onPlaceSelect) {
        // Reverse geocode the clicked location
        onPlaceSelect(e.latlng);
      }
    },
  });
  return null;
}

export default function Map({
  center = LOCATION_CONFIG.DEFAULT_CENTER, // London coordinates
  zoom = LOCATION_CONFIG.DEFAULT_ZOOM,
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
  onPlaceSelect = null,
  routeColor = "#3b82f6", // Default light blue color
    autoFitBounds = false,

}) {
  // Create improved custom icons with better fallback
  const createCustomIcon = (color, type) => {
    const iconConfigs = {
  hazard: { symbol: '⚠️', bgColor: color, size: [28, 36] },
  buddy: { symbol: '👤', bgColor: color, size: [28, 36] },
  from: { symbol: '📍', bgColor: '#10b981', size: [32, 40] }, 
  to: { symbol: '🎯', bgColor: '#ef4444', size: [32, 40] },    
  default: { symbol: '📍', bgColor: color, size: [26, 34] }

    };

    const config = iconConfigs[type] || iconConfigs.default;
    
    // Try to use modern CSS-based icon first
    try {
      const iconHtml = `
        <div style="
          width: ${config.size[0]}px;
          height: ${config.size[1]}px;
          background: ${config.bgColor};
          border-radius: 50% 50% 50% 0;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${Math.floor(config.size[0] * 0.5)}px;
          transform: rotate(-45deg);
          position: relative;
        ">
          <span style="transform: rotate(45deg); line-height: 1;">${config.symbol}</span>
        </div>
      `;

      return L.divIcon({
        html: iconHtml,
        className: 'custom-marker-icon',
        iconSize: config.size,
        iconAnchor: [config.size[0] / 2, config.size[1]],
        popupAnchor: [0, -config.size[1]]
      });
    } catch (error) {
      console.warn(`Failed to create custom icon for ${type}, using fallback:`, error);
      
      // Fallback to simple colored circles
      const fallbackHtml = `
        <div style="
          width: 20px;
          height: 20px;
          background: ${config.bgColor};
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: white;
          font-weight: bold;
        ">
          ${type ? type.charAt(0).toUpperCase() : 'M'}
        </div>
      `;

      return L.divIcon({
        html: fallbackHtml,
        className: 'simple-marker-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10]
      });
    }
  };

  // Get route color based on safety rating or use custom color
  const getRouteColor = (safetyRating) => {
    // If custom route color is provided, use light blue for search routes
    if (routeColor === "#3b82f6") return "#3b82f6"; // Light blue for search routes
    
    // Default safety-based colors for other routes
    if (safetyRating >= 8) return "#10b981"; // green
    if (safetyRating >= 6) return "#f59e0b"; // yellow
    return "#ef4444"; // red
  };

  return (
    <div style={{ height, width: "100%" }} className="relative z-10">
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

        {/* Auto-fit bounds to show entire route */}
        {autoFitBounds && (
          <AutoFitBounds routes={routes} fromCoords={fromCoords} toCoords={toCoords} />
        )}
        
        {/* Enhanced click catcher with place selection */}
        {(onMapClick || onPlaceSelect) && (
          <ClickCatcher onMapClick={onMapClick} onPlaceSelect={onPlaceSelect} />
        )}

        {/* Enhanced Routes with road-following capability */}
        {routes.map((route) => (
          <RoadFollowingRoute
            key={route.id}
            route={route}
            onRouteClick={onRouteClick}
            getRouteColor={getRouteColor}
          />
        ))}

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
            icon={createCustomIcon("#ef4444", "from")}
          >
            <Popup>
              <div className="text-sm">
                <strong>You</strong>
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
                <h3 className="font-semibold">{hazard.type?.replace('_', ' ') || 'Unknown Hazard'}</h3>
                <p>{hazard.description}</p>
                <p className="text-xs text-gray-500">
                  Reported: {new Date(hazard.created_at || hazard.reportedAt).toLocaleDateString()}
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
            icon={createCustomIcon(
              buddy.mode === 'cycling' ? '#10b981' : '#3b82f6', 
              "buddy"
            )}
            eventHandlers={{
              click: () => onBuddyClick(buddy),
            }}
          >
            <Popup>
              <div className="text-sm">
                <h3 className="font-semibold">{buddy.name}</h3>
                <p className="text-xs">{buddy.mode === 'cycling' ? '🚴 Cycling' : '🚶 Walking'} • {buddy.pace || 'Medium pace'}</p>
                <p className="text-xs text-gray-500">
                  {buddy.distance ? `${(buddy.distance / 1000).toFixed(1)} km away` : 'Nearby'}
                </p>
                {buddy.rating && (
                  <p className="text-xs text-gray-500">⭐ {buddy.rating}</p>
                )}
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
