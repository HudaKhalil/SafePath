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


// Preserve map view state to prevent unwanted zoom changes
function PreserveMapView({ lockView = false }) {
  const map = useMap();
  const savedViewRef = useRef(null);
  const isUserInteractingRef = useRef(false);

  useEffect(() => {
    // Track user interactions
    const handleInteractionStart = () => {
      isUserInteractingRef.current = true;
    };
    
    const handleInteractionEnd = () => {
      // Save view after user interaction completes
      setTimeout(() => {
        isUserInteractingRef.current = false;
        savedViewRef.current = {
          center: map.getCenter(),
          zoom: map.getZoom()
        };
      }, 100);
    };

    const handleZoomStart = () => {
      // If zoom is starting but user isn't interacting, something triggered it programmatically
      if (!isUserInteractingRef.current && savedViewRef.current && lockView) {
        // Restore previous view
        setTimeout(() => {
          if (savedViewRef.current) {
            map.setView(savedViewRef.current.center, savedViewRef.current.zoom, { animate: false });
          }
        }, 50);
      }
    };

    // Save initial view
    if (!savedViewRef.current) {
      savedViewRef.current = {
        center: map.getCenter(),
        zoom: map.getZoom()
      };
    }

    map.on('mousedown', handleInteractionStart);
    map.on('touchstart', handleInteractionStart);
    map.on('mouseup', handleInteractionEnd);
    map.on('touchend', handleInteractionEnd);
    map.on('dragend', handleInteractionEnd);
    map.on('zoomend', handleInteractionEnd);
    
    return () => {
      map.off('mousedown', handleInteractionStart);
      map.off('touchstart', handleInteractionStart);
      map.off('mouseup', handleInteractionEnd);
      map.off('touchend', handleInteractionEnd);
      map.off('dragend', handleInteractionEnd);
      map.off('zoomend', handleInteractionEnd);
    };
  }, [map, lockView]);

  return null;
}

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

// Current Location Control Component
function CurrentLocationControl() {
  const map = useMap();
  const [userMarker, setUserMarker] = useState(null);
  const [accuracyCircle, setAccuracyCircle] = useState(null);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const latlng = [latitude, longitude];
        
        // Move map to user location
        map.flyTo(latlng, 15, {
          animate: true,
          duration: 1.5
        });

        // Remove old markers if exist
        if (userMarker) {
          map.removeLayer(userMarker);
        }
        if (accuracyCircle) {
          map.removeLayer(accuracyCircle);
        }

        // Add blue circle marker for user location
        const marker = L.circleMarker(latlng, {
          radius: 8,
          fillColor: '#4285F4',
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(map);

        // Add accuracy circle
        const circle = L.circle(latlng, {
          radius: position.coords.accuracy,
          fillColor: '#4285F4',
          fillOpacity: 0.1,
          color: '#4285F4',
          weight: 1
        }).addTo(map);

        marker.bindPopup('<div style="font-size: 14px; font-weight: 500;">You are here</div>').openPopup();
        
        setUserMarker(marker);
        setAccuracyCircle(circle);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to retrieve your location. Please check location permissions.');
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    if (!map) return;

    // Create custom control
    const LocationControl = L.Control.extend({
      onAdd: function() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        container.style.backgroundColor = 'white';
        container.style.width = '40px';
        container.style.height = '40px';
        container.style.cursor = 'pointer';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.borderRadius = '4px';
        container.style.boxShadow = '0 1px 5px rgba(0,0,0,0.2)';
        container.title = 'Go to current location';
        
        container.innerHTML = '<svg style="width: 20px; height: 20px; color: #374151;" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"></path></svg>';
        
        container.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleLocate();
        };
        
        L.DomEvent.disableClickPropagation(container);
        
        return container;
      }
    });

    const control = new LocationControl({ position: 'topright' });
    control.addTo(map);

    return () => {
      try {
        map.removeControl(control);
      } catch (e) {
        // Control might already be removed
      }
      if (userMarker) {
        try {
          map.removeLayer(userMarker);
        } catch (e) {
          // Marker might already be removed
        }
      }
      if (accuracyCircle) {
        try {
          map.removeLayer(accuracyCircle);
        } catch (e) {
          // Circle might already be removed
        }
      }
    };
  }, [map]);

  return null;
}

// Simple OSM preview route that owns drawing logic
function OSMPreviewRoute({ fromCoords, toCoords, transportMode, enablePreview, onRouteFound }) {
  const map = useMap();
  const routeLayerRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    // If preview disabled or no points -> remove and exit
    if (!enablePreview || !fromCoords || !toCoords) {
      if (routeLayerRef.current) {
        map.removeLayer(routeLayerRef.current);
        routeLayerRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const fetchAndDraw = async () => {
      try {
        const routeResult = await routingService.getRoute(
          fromCoords[0], fromCoords[1],
          toCoords[0], toCoords[1],
          transportMode
        );

        if (cancelled || !routeResult || !routeResult.success || !routeResult.coordinates?.length) return;

        const coords = routeResult.coordinates;
        const distance = routeResult.distance;
        const duration = routeResult.duration;

        const color = transportMode === 'walking' ? '#10b981' : '#1d4ed8';

        const polyline = L.polyline(coords, {
          color,
          weight: 5,
          opacity: 0.9,
        });

        // Replace previous preview route without blank gap
        if (routeLayerRef.current) {
          map.removeLayer(routeLayerRef.current);
        }

        polyline.addTo(map);
        // Don't auto-fit bounds on preview - let user control zoom
        // map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
        routeLayerRef.current = polyline;

        if (onRouteFound) {
          onRouteFound({
            distanceKm: distance / 1000,
            durationMin: duration / 60,
            mode: transportMode,
          });
        }
      } catch (err) {
        console.error("OSM preview route error", err);
      }
    };

    fetchAndDraw();

    return () => {
      cancelled = true;
      // keep last drawn route to avoid StrictMode flash; removal handled next draw
    };
  }, [map, fromCoords, toCoords, transportMode, enablePreview, onRouteFound]);

  return null;
}

// Custom hook to enhance route with road-following coordinates
function useEnhancedRoute(route) {
  const [enhancedPath, setEnhancedPath] = useState(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);

  useEffect(() => {
    const enhanceRoute = async () => {
      // Support both 'path' and 'coordinates' property names
      const routePath = route?.path || route?.coordinates;
      
      if (!routePath || routePath.length < 2) {
        setEnhancedPath(routePath || []);
        setRouteInfo({ provider: 'none', fallback: true });
        return;
      }

      // If route already has many points, assume it's road-following
      if (routePath.length > 10) {
        setEnhancedPath(routePath);
        setRouteInfo({ provider: 'existing', fallback: false });
        return;
      }

      try {
        setIsEnhancing(true);
        const startPoint = routePath[0];
        const endPoint = routePath[routePath.length - 1];
        
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
          setEnhancedPath(routePath);
          setRouteInfo({ provider: 'original', fallback: true });
        }
      } catch (error) {
        console.warn(`Could not enhance route ${route.name}:`, error);
        setEnhancedPath(routePath);
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
  const lineWeight = isEnhancing ? 2 : (isRoadFollowing ? 5 : 4);
  const lineOpacity = isEnhancing ? 0.4 : (isRoadFollowing ? 0.9 : 0.7);
  const dashArray = isEnhancing ? "5, 5" : (routeInfo?.fallback ? "10, 10" : null);
  
  // Use route's own color if provided, otherwise fall back to safety-based color
  const routeColor = route.color || getRouteColor(route.safetyRating);

  return (
    <Polyline
      key={`${route.id}-road-following`}
      positions={enhancedPath}
      color={routeColor}
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
  transportMode = 'walking', // walking, cycling
  enablePreview = false,
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
  to: { symbol: '🎯', bgColor: '#eab308', size: [32, 40] },    
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

        {/* Current Location Button */}
        <CurrentLocationControl />

        {/* Preserve map view to prevent unwanted zoom changes */}
        <PreserveMapView />

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
        {/* OSM live preview route */}
        <OSMPreviewRoute
          fromCoords={fromCoords}
          toCoords={toCoords}
          transportMode={transportMode}
          enablePreview={enablePreview}
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
          <Marker position={toCoords} icon={createCustomIcon("#eab308", "to")}>
            <Popup>
              <div className="text-sm">
                <strong>Destination</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Hazards - filter out invalid coordinates to prevent _leaflet_pos errors */}
        {hazards
          .filter((h) => Number.isFinite(h.latitude) && Number.isFinite(h.longitude))
          .map((hazard) => (
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
        {/* Buddies - filter out invalid coordinates to prevent _leaflet_pos errors */}
        {buddies
          .filter((b) => Number.isFinite(b.latitude) && Number.isFinite(b.longitude))
          .map((buddy) => (
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

        {/* Custom Markers - filter out invalid coordinates to prevent _leaflet_pos errors */}
        {markers
          .filter((m) => Array.isArray(m.position) && m.position.length === 2 && Number.isFinite(m.position[0]) && Number.isFinite(m.position[1]))
          .map((marker, index) => (
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
