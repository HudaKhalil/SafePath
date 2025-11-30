"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { LOCATION_CONFIG } from "../../lib/locationConfig";
import websocketClient from "../../lib/websocketClient";

const Map = dynamic(() => import("../../components/Map"), { ssr: false });

export default function NavigationClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Route info from URL params
  const routeId = searchParams.get("routeId");
  const routeName = searchParams.get("name");
  const routeType = searchParams.get("type");
  const routeDistance = searchParams.get("distance");
  const routeTime = searchParams.get("time");
  const routeSafety = searchParams.get("safety");
  
  // Navigation state
  const [currentPosition, setCurrentPosition] = useState(null);
  const [snappedPosition, setSnappedPosition] = useState(null); // Position snapped to route
  const [isTracking, setIsTracking] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [instructions, setInstructions] = useState([]);
  const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);
  const [distanceToNextTurn, setDistanceToNextTurn] = useState(0);
  const [heading, setHeading] = useState(0);
  const [hasArrived, setHasArrived] = useState(false);
  const [totalDistanceRemaining, setTotalDistanceRemaining] = useState(parseFloat(routeDistance) || 0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(parseInt(routeTime) || 0);
  const [routeProgress, setRouteProgress] = useState(0); // Percentage completed
  const [isOffRoute, setIsOffRoute] = useState(false); // User too far from route
  const [nearbyHazards, setNearbyHazards] = useState([]); // Hazards along route
  const [hazardAlerts, setHazardAlerts] = useState([]); // Active hazard warnings
  
  const watchIdRef = useRef(null);
  const synthesisRef = useRef(null);
  const lastPositionRef = useRef(null);
  const lastAnnouncementRef = useRef(0); // Prevent announcement spam
  const hazardCheckRef = useRef(0); // Last hazard check timestamp

  // Get route data from sessionStorage (stored when route was selected)
  useEffect(() => {
    try {
      const storedRoute = sessionStorage.getItem(`route_${routeId}`);
      if (storedRoute) {
        const route = JSON.parse(storedRoute);
        setRouteCoordinates(route.coordinates || []);
        setInstructions(route.instructions || []);
      }
    } catch (error) {
      console.error("Error loading route data:", error);
    }
  }, [routeId]);

  // Start GPS tracking
  useEffect(() => {
    if ("geolocation" in navigator) {
      const options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      };

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, heading: deviceHeading } = position.coords;
          const rawPosition = [latitude, longitude];
          setCurrentPosition(rawPosition);

          // Snap position to route
          if (routeCoordinates.length > 0) {
            const snapped = snapToRoute(latitude, longitude);
            
            if (snapped && snapped.distance < 0.1) { // Within 100 meters
              setSnappedPosition(snapped.position);
              setIsOffRoute(false);
              
              // Calculate heading based on route direction
              if (snapped.segmentIndex < routeCoordinates.length - 1) {
                const nextPoint = routeCoordinates[snapped.segmentIndex + 1];
                const calculatedHeading = calculateBearing(
                  snapped.position[0],
                  snapped.position[1],
                  nextPoint[0],
                  nextPoint[1]
                );
                setHeading(calculatedHeading);
              } else if (deviceHeading !== null) {
                setHeading(deviceHeading);
              }

              // Update navigation progress
              updateNavigationProgress(snapped.position[0], snapped.position[1], snapped.segmentIndex);
            } else {
              // Too far from route - warn user
              setSnappedPosition(rawPosition);
              setIsOffRoute(true);
              
              // Announce off-route warning (but not too frequently)
              const now = Date.now();
              if (now - lastAnnouncementRef.current > 10000) { // Every 10 seconds max
                speak("You are off the planned route. Returning to route.");
                lastAnnouncementRef.current = now;
              }
              
              if (deviceHeading !== null) {
                setHeading(deviceHeading);
              }
            }
          } else {
            setSnappedPosition(rawPosition);
            if (deviceHeading !== null) {
              setHeading(deviceHeading);
            }
          }

          setIsTracking(true);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setIsTracking(false);
        },
        options
      );
    }

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [routeCoordinates, instructions, currentInstructionIndex]);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      synthesisRef.current = window.speechSynthesis;
    }
  }, []);

  // Connect to WebSocket for hazard detection
  useEffect(() => {
    websocketClient.connect();
    
    websocketClient.on('nearby_hazards', (data) => {
      if (data.hazards && Array.isArray(data.hazards)) {
        setNearbyHazards(data.hazards);
        
        // Alert on high-risk hazards within 300m
        const criticalHazards = data.hazards.filter(
          h => (h.severity === 'high' || h.severity === 'critical') && 
               h.distance_meters < 300
        );
        
        criticalHazards.forEach(hazard => {
          const alertMessage = `Warning: ${hazard.hazard_type.replace('_', ' ')} ahead, ${Math.round(hazard.distance_meters)} meters away`;
          addHazardAlert(alertMessage, hazard.severity);
          speak(alertMessage);
        });
      }
    });

    return () => {
      websocketClient.disconnect();
    };
  }, []);

  // Check for hazards along route periodically
  useEffect(() => {
    if (currentPosition && isTracking) {
      const now = Date.now();
      
      // Check for hazards every 15 seconds
      if (now - hazardCheckRef.current > 15000) {
        websocketClient.sendUserPosition(
          currentPosition[0],
          currentPosition[1],
          500 // 500m radius for navigation
        );
        hazardCheckRef.current = now;
      }
    }
  }, [currentPosition, isTracking]);

  const addHazardAlert = (message, severity) => {
    const alert = {
      id: Date.now(),
      message,
      severity,
      timestamp: new Date()
    };

    setHazardAlerts(prev => [alert, ...prev.slice(0, 2)]); // Keep last 3 alerts

    // Auto-dismiss after 15 seconds
    setTimeout(() => {
      setHazardAlerts(prev => prev.filter(a => a.id !== alert.id));
    }, 15000);
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  // Calculate bearing between two points
  const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
    const x =
      Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
      Math.sin((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.cos(dLon);
    const bearing = Math.atan2(y, x);
    return ((bearing * 180) / Math.PI + 360) % 360; // Convert to degrees
  };

  // Find closest point on route and snap to it
  const snapToRoute = (currentLat, currentLon) => {
    if (routeCoordinates.length === 0) return null;

    let minDistance = Infinity;
    let closestPoint = null;
    let closestIndex = 0;
    let closestSegmentIndex = 0;

    // Find closest point on any route segment
    for (let i = 0; i < routeCoordinates.length - 1; i++) {
      const segmentStart = routeCoordinates[i];
      const segmentEnd = routeCoordinates[i + 1];

      // Calculate closest point on this segment
      const snapped = closestPointOnSegment(
        currentLat,
        currentLon,
        segmentStart[0],
        segmentStart[1],
        segmentEnd[0],
        segmentEnd[1]
      );

      const dist = calculateDistance(currentLat, currentLon, snapped[0], snapped[1]);

      if (dist < minDistance) {
        minDistance = dist;
        closestPoint = snapped;
        closestIndex = i;
        closestSegmentIndex = i;
      }
    }

    return {
      position: closestPoint,
      segmentIndex: closestSegmentIndex,
      distance: minDistance,
    };
  };

  // Find closest point on a line segment
  const closestPointOnSegment = (px, py, ax, ay, bx, by) => {
    const atob = { x: bx - ax, y: by - ay };
    const atop = { x: px - ax, y: py - ay };
    const len = atob.x * atob.x + atob.y * atob.y;
    let dot = atop.x * atob.x + atop.y * atob.y;
    const t = Math.min(1, Math.max(0, dot / len));

    return [ax + atob.x * t, ay + atob.y * t];
  };

  // Update navigation progress
  const updateNavigationProgress = (currentLat, currentLon, segmentIndex) => {
    if (instructions.length === 0 || routeCoordinates.length === 0) return;

    // Check if arrived at destination
    const destination = routeCoordinates[routeCoordinates.length - 1];
    const distanceToDestination = calculateDistance(
      currentLat,
      currentLon,
      destination[0],
      destination[1]
    );

    if (distanceToDestination < 0.05) { // Within 50 meters
      setHasArrived(true);
      speak("You have arrived at your destination");
      return;
    }

    // Calculate route progress percentage
    const totalSegments = routeCoordinates.length - 1;
    const progress = ((segmentIndex / totalSegments) * 100).toFixed(0);
    setRouteProgress(progress);

    // Calculate remaining distance from current position
    let remaining = 0;
    
    // Distance from current position to next waypoint
    if (segmentIndex < routeCoordinates.length - 1) {
      remaining += calculateDistance(
        currentLat,
        currentLon,
        routeCoordinates[segmentIndex + 1][0],
        routeCoordinates[segmentIndex + 1][1]
      );
    }
    
    // Add distances of all remaining segments
    for (let i = segmentIndex + 1; i < routeCoordinates.length - 1; i++) {
      remaining += calculateDistance(
        routeCoordinates[i][0],
        routeCoordinates[i][1],
        routeCoordinates[i + 1][0],
        routeCoordinates[i + 1][1]
      );
    }
    setTotalDistanceRemaining(remaining);

    // Update estimated time (assuming average speed)
    const avgSpeed = routeType === "cycling" ? 15 : 5; // km/h
    const timeRemaining = (remaining / avgSpeed) * 60; // minutes
    setEstimatedTimeRemaining(Math.round(timeRemaining));

    // Find next turn instruction
    // Instructions are typically at specific waypoints
    if (currentInstructionIndex < instructions.length - 1) {
      // Estimate next instruction point (simplified)
      const instructionInterval = Math.floor(routeCoordinates.length / Math.max(instructions.length, 1));
      const nextInstructionIndex = (currentInstructionIndex + 1) * instructionInterval;
      const nextInstructionPoint = routeCoordinates[
        Math.min(nextInstructionIndex, routeCoordinates.length - 1)
      ];
      
      if (nextInstructionPoint) {
        const distanceToNext = calculateDistance(
          currentLat,
          currentLon,
          nextInstructionPoint[0],
          nextInstructionPoint[1]
        );
        setDistanceToNextTurn(distanceToNext);

        // Announce upcoming turn
        if (distanceToNext < 0.1 && distanceToNext > 0.05) { // 50-100m
          const nextInstruction = instructions[currentInstructionIndex + 1]?.instruction || "continue";
          const now = Date.now();
          if (now - lastAnnouncementRef.current > 5000) { // Don't repeat within 5 seconds
            speak(`In ${Math.round(distanceToNext * 1000)} meters, ${nextInstruction}`);
            lastAnnouncementRef.current = now;
          }
        } else if (distanceToNext < 0.05) { // Less than 50m
          const nextInstruction = instructions[currentInstructionIndex + 1]?.instruction || "Continue straight";
          setCurrentInstructionIndex(prev => Math.min(prev + 1, instructions.length - 1));
          speak(nextInstruction);
          lastAnnouncementRef.current = Date.now();
        }
      }
    }
  };

  // Text-to-speech function
  const speak = (text) => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel(); // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      synthesisRef.current.speak(utterance);
    }
  };

  // Format distance
  const formatDistance = (km) => {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
  };

  // Get instruction icon
  const getInstructionIcon = (instruction) => {
    const text = instruction?.toLowerCase() || "";
    if (text.includes("left")) return "↰";
    if (text.includes("right")) return "↱";
    if (text.includes("straight") || text.includes("continue")) return "↑";
    if (text.includes("arrive")) return "🏁";
    return "➤";
  };

  // Exit navigation
  const exitNavigation = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
    }
    router.push("/suggested-routes");
  };

  if (!routeCoordinates.length) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading navigation...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden md:overflow-y-auto md:h-auto md:min-h-screen bg-slate-900">
      {/* Hazard Alert Banners */}
      {hazardAlerts.length > 0 && (
        <div className="absolute top-0 left-0 right-0 z-50 p-4 space-y-2">
          {hazardAlerts.map(alert => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg shadow-lg animate-pulse ${
                alert.severity === 'critical' || alert.severity === 'high'
                  ? 'bg-red-500 text-white'
                  : 'bg-yellow-500 text-gray-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg">{alert.message}</span>
                <button
                  onClick={() => setHazardAlerts(prev => prev.filter(a => a.id !== alert.id))}
                  className="ml-4 text-2xl hover:opacity-70"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Map */}
      <div className="absolute inset-0 md:relative md:h-96">
        <Map
          center={snappedPosition || routeCoordinates[0] || LOCATION_CONFIG.DEFAULT_CENTER}
          zoom={18}
          routes={[
            {
              id: routeId,
              color: routeType === "fastest" ? "#3b82f6" : "#10b981",
              coordinates: routeCoordinates,
            },
          ]}
          height="100vh"
          showUserLocation={true}
          userLocation={snappedPosition}
          userHeading={heading}
          followUser={true}
          hazards={nearbyHazards}
          markers={[
            // Starting point marker
            routeCoordinates.length > 0 && {
              position: routeCoordinates[0],
              color: "#10b981",
              type: "from",
              popup: <div className="text-sm"><strong>Start</strong></div>
            },
            // Destination marker
            routeCoordinates.length > 0 && {
              position: routeCoordinates[routeCoordinates.length - 1],
              color: "#eab308",
              type: "to",
              popup: <div className="text-sm"><strong>Destination</strong></div>
            }
          ].filter(Boolean)}
        />
      </div>

      {/* Top Navigation Bar */}
      <div className="absolute md:relative top-0 left-0 right-0 z-40 bg-gradient-to-b from-slate-900/95 to-slate-900/80 md:bg-slate-900 backdrop-blur-sm pt-safe">
        <div className="p-3">
          {/* Current Instruction */}
          <div className="bg-white/10 rounded-xl p-3 mb-2 backdrop-blur-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="text-3xl">
                  {instructions[currentInstructionIndex] 
                    ? getInstructionIcon(instructions[currentInstructionIndex].instruction)
                    : "🧭"}
                </div>
                <div>
                  <div className="text-white text-base font-bold leading-tight">
                    {hasArrived 
                      ? "You have arrived!"
                      : instructions[currentInstructionIndex]?.instruction || "Continue on route"}
                  </div>
                  {!hasArrived && distanceToNextTurn > 0 && (
                    <div className="text-blue-200 text-xs">
                      in {formatDistance(distanceToNextTurn)}
                    </div>
                  )}
                </div>
              </div>
              
              {/* GPS Status */}
              <div className={`px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                isTracking ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              }`}>
                {isTracking ? '📍 GPS' : '❌'}
              </div>
            </div>

            {/* Off-route warning */}
            {isOffRoute && (
              <div className="bg-orange-500 text-white px-2 py-1 rounded-lg text-xs font-semibold animate-pulse">
                ⚠️ You are off the planned route
              </div>
            )}
          </div>

          {/* Route Progress Bar */}
          <div className="bg-white/10 rounded-lg p-2 backdrop-blur-md">
            <div className="flex justify-between text-white text-xs mb-1">
              <span>{routeProgress}%</span>
              <span>{formatDistance(totalDistanceRemaining)}</span>
              <span>{estimatedTimeRemaining} min</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div 
                className="bg-gradient-to-r from-blue-500 to-green-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${routeProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panel - Upcoming Instructions */}
      <div className="absolute md:relative bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-slate-900/95 to-slate-900/80 md:bg-slate-900 backdrop-blur-sm pb-safe">
        <div className="p-4 pb-6">
          {/* Next Instructions */}
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-md mb-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-white font-bold text-base">Upcoming Turns</h3>
              
              {/* Safety Badge */}
              <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                routeSafety >= 7 ? 'bg-green-500 text-white' : 
                routeSafety >= 5 ? 'bg-yellow-500 text-gray-900' : 
                'bg-red-500 text-white'
              }`}>
                Safety: {parseFloat(routeSafety).toFixed(1)}/10
              </div>
            </div>
            
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {instructions.slice(currentInstructionIndex, currentInstructionIndex + 2).map((inst, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center space-x-2 p-2 rounded-lg ${
                    idx === 0 ? 'bg-blue-500/30' : 'bg-white/5'
                  }`}
                >
                  <div className="text-xl">
                    {getInstructionIcon(inst.instruction)}
                  </div>
                  <div className="flex-1">
                    <div className="text-white text-xs">
                      {inst.instruction || "Continue straight"}
                    </div>
                  </div>
                </div>
              ))}
              
              {instructions.length === 0 && (
                <div className="text-white/60 text-xs text-center py-2">
                  Follow the route on the map
                </div>
              )}
            </div>
          </div>

          {/* Exit Button */}
          <button
            onClick={exitNavigation}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg"
          >
            Exit Navigation
          </button>
        </div>
      </div>

      {/* Arrival Modal */}
      {hasArrived && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center animate-bounce">
            <div className="text-6xl mb-4">🏁</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">You've Arrived!</h2>
            <p className="text-gray-600 mb-6">You have reached your destination</p>
            <button
              onClick={exitNavigation}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              Finish Navigation
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
