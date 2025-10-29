// Alternative routing implementation that can be swapped in later
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export function useRoutingMachine({ fromCoords, toCoords, onRouteFound, showRouting = false }) {
  const map = useMap();
  const routingControlRef = useRef(null);

  useEffect(() => {
    if (!showRouting || !fromCoords || !toCoords || !map) {
      // Clean up existing routing control
      if (routingControlRef.current) {
        try {
          if (typeof routingControlRef.current.remove === 'function') {
            routingControlRef.current.remove();
          } else if (routingControlRef.current._map) {
            map.removeControl(routingControlRef.current);
          }
        } catch (error) {
          console.warn('Error removing routing control:', error);
        }
        routingControlRef.current = null;
      }
      return;
    }

    // Load routing machine properly
    let isMounted = true;

    const loadRouting = async () => {
      try {
        // Import the routing machine
        const LRM = await import('leaflet-routing-machine');
        
        if (!isMounted) return;

        // Clean up any existing control
        if (routingControlRef.current) {
          try {
            map.removeControl(routingControlRef.current);
          } catch (e) {
            console.warn('Could not remove existing control:', e);
          }
        }

        // Create the routing control
        const control = LRM.default.control({
          waypoints: [
            L.latLng(fromCoords[0], fromCoords[1]),
            L.latLng(toCoords[0], toCoords[1])
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
          show: false,
          collapsible: true,
          router: LRM.default.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1',
            profile: 'foot' // walking routes
          })
        });

        // Add event listener
        control.on('routesfound', function(e) {
          if (isMounted && onRouteFound && e.routes.length > 0) {
            onRouteFound(e.routes[0]);
          }
        });

        // Add to map
        control.addTo(map);
        routingControlRef.current = control;

      } catch (error) {
        console.warn('Could not load routing machine, using simple line:', error);
        
        if (!isMounted) return;

        // Fallback to simple line
        const polyline = L.polyline([fromCoords, toCoords], {
          color: '#10b981',
          weight: 4,
          opacity: 0.9,
          dashArray: '5, 10'
        }).addTo(map);

        routingControlRef.current = {
          remove: () => {
            if (map && polyline) {
              map.removeLayer(polyline);
            }
          }
        };

        // Mock route data for fallback
        if (onRouteFound) {
          const distance = L.latLng(fromCoords).distanceTo(L.latLng(toCoords));
          onRouteFound({
            summary: {
              totalDistance: Math.round(distance),
              totalTime: Math.round(distance / 1000 * 12 * 60) // walking speed
            },
            coordinates: [fromCoords, toCoords]
          });
        }
      }
    };

    loadRouting();

    return () => {
      isMounted = false;
      if (routingControlRef.current) {
        try {
          if (typeof routingControlRef.current.remove === 'function') {
            routingControlRef.current.remove();
          } else if (routingControlRef.current._map) {
            map.removeControl(routingControlRef.current);
          }
        } catch (error) {
          console.warn('Error during cleanup:', error);
        }
        routingControlRef.current = null;
      }
    };
  }, [map, fromCoords, toCoords, showRouting, onRouteFound]);

  return null;
}

// Simple component wrapper
export default function RoutingMachine(props) {
  useRoutingMachine(props);
  return null;
}