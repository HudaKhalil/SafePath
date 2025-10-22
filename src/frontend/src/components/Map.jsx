'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Component to handle routing
function RoutingController({ fromCoords, toCoords, onRouteFound, showRouting = false }) {
  const map = useMap()
  const routingControlRef = useRef(null)

  useEffect(() => {
    if (!showRouting || !fromCoords || !toCoords) {
      // Remove existing routing control
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current)
        routingControlRef.current = null
      }
      return
    }

    // Import routing machine dynamically (only on client)
    import('leaflet-routing-machine').then((L) => {
      // Remove existing control first
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current)
      }

      // Create new routing control
      routingControlRef.current = L.default.Routing.control({
        waypoints: [
          L.default.latLng(fromCoords[0], fromCoords[1]),
          L.default.latLng(toCoords[0], toCoords[1])
        ],
        routeWhileDragging: false,
        addWaypoints: false,
        createMarker: () => null, // Don't create default markers
        lineOptions: {
          styles: [
            { color: '#3b82f6', weight: 6, opacity: 0.8 },
            { color: '#10b981', weight: 4, opacity: 0.9 }
          ]
        },
        show: false, // Hide the instruction panel
        collapsible: true,
        router: L.default.Routing.osrmv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1',
          profile: 'driving' // or 'walking', 'cycling'
        })
      }).on('routesfound', function(e) {
        const routes = e.routes
        if (routes.length > 0 && onRouteFound) {
          onRouteFound(routes[0])
        }
      }).addTo(map)
    }).catch(console.error)

    // Cleanup function
    return () => {
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current)
        routingControlRef.current = null
      }
    }
  }, [map, fromCoords, toCoords, showRouting, onRouteFound])

  return null
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
  onRouteClick = () => {},
  onHazardClick = () => {},
  onBuddyClick = () => {},
  onRouteFound = () => {}
}) {
  // Create custom icons
  const createCustomIcon = (color, type) => {
    const iconHtml = type === 'hazard' 
      ? `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 14px;">⚠️</div>`
      : type === 'buddy'
      ? `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 14px;">👤</div>`
      : type === 'from'
      ? `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">📍</div>`
      : type === 'to'
      ? `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🎯</div>`
      : `<div style="background-color: ${color}; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white;"></div>`
    
    return L.divIcon({
      html: iconHtml,
      className: 'custom-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    })
  }

  // Get route color based on safety rating
  const getRouteColor = (safetyRating) => {
    if (safetyRating >= 8) return '#10b981' // green
    if (safetyRating >= 6) return '#f59e0b' // yellow
    return '#ef4444' // red
  }

  return (
    <div style={{ height, width: '100%' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Routing Controller */}
        <RoutingController 
          fromCoords={fromCoords}
          toCoords={toCoords}
          showRouting={showRouting}
          onRouteFound={onRouteFound}
        />

        {/* From Location Marker */}
        {fromCoords && (
          <Marker
            position={fromCoords}
            icon={createCustomIcon('#10b981', 'from')}
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
          <Marker
            position={toCoords}
            icon={createCustomIcon('#ef4444', 'to')}
          >
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
              click: () => onRouteClick(route)
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
            icon={createCustomIcon('#ef4444', 'hazard')}
            eventHandlers={{
              click: () => onHazardClick(hazard)
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
            icon={createCustomIcon('#3b82f6', 'buddy')}
            eventHandlers={{
              click: () => onBuddyClick(buddy)
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
            icon={marker.color ? createCustomIcon(marker.color, marker.type) : undefined}
          >
            {marker.popup && <Popup>{marker.popup}</Popup>}
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}