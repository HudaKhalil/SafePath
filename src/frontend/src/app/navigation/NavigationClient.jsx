"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { LOCATION_CONFIG } from "../../lib/locationConfig";
import websocketClient from "../../lib/websocketClient";
import RoutesSheet from "../../components/RoutesSheet";

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

  // Track WebSocket authentication state
  const [isWebSocketReady, setIsWebSocketReady] = useState(false);

  // Connect to WebSocket for hazard detection
  useEffect(() => {
    websocketClient.connect();
    
    // Listen for authentication success
    websocketClient.on('authenticated', (data) => {
      console.log('✅ WebSocket ready for hazard detection');
      setIsWebSocketReady(true);
    });
    
    websocketClient.on('nearby_hazards', (data) => {
      console.log('📍 Received hazards data:', data);
      if (data.hazards && Array.isArray(data.hazards)) {
        console.log('All hazards:', data.hazards.map(h => ({
          id: h.id,
          type: h.hazard_type,
          distance: h.distance_meters,
          severity: h.severity
        })));
        
        // Filter hazards that are within 100m and on the route
        const within100m = data.hazards.filter(h => h.distance_meters <= 100);
        console.log(`Hazards within 100m: ${within100m.length}`, within100m.map(h => h.distance_meters));
        
        const hazardsOnRoute = within100m.filter(h => 
          isHazardOnRoute(h.latitude, h.longitude)
        );
        
        console.log(`✅ Found ${hazardsOnRoute.length} hazards within 100m on route (out of ${data.hazards.length} total)`);
        setNearbyHazards(hazardsOnRoute);
        
        // Remove alerts for hazards that are no longer nearby or on route
        setHazardAlerts(prev => {
          const currentHazardIds = hazardsOnRoute.map(h => h.id);
          return prev.filter(alert => 
            !alert.hazardId || currentHazardIds.includes(alert.hazardId)
          );
        });
        
        // Show alerts for ALL hazards within 100m on route
        hazardsOnRoute.forEach(hazard => {
          const alertMessage = `${hazard.severity === 'critical' || hazard.severity === 'high' ? 'Warning' : 'Notice'}: ${hazard.hazard_type.replace(/_/g, ' ')} ahead, ${Math.round(hazard.distance_meters)} meters away`;
          addHazardAlert(alertMessage, hazard.severity, hazard.id);
          
          // Voice alerts only for high and critical severity
          if (hazard.severity === 'high' || hazard.severity === 'critical') {
            speak(alertMessage);
          }
        });
        
        console.log(`🚨 Showing alerts for ${hazardsOnRoute.length} hazards:`, hazardsOnRoute.map(h => ({
          type: h.hazard_type,
          distance: h.distance_meters,
          severity: h.severity
        })));
      }
    });

    return () => {
      websocketClient.disconnect();
      setIsWebSocketReady(false);
    };
  }, []);

  // Check for hazards along route periodically
  useEffect(() => {
    if (currentPosition && isTracking && isWebSocketReady) {
      const now = Date.now();
      
      // Check for hazards immediately on first position, then every 15 seconds
      if (hazardCheckRef.current === 0 || now - hazardCheckRef.current > 15000) {
        console.log('🔍 Checking for hazards at position:', currentPosition);
        websocketClient.sendUserPosition(
          currentPosition[0],
          currentPosition[1],
          1500 // 1.5km radius for navigation
        );
        hazardCheckRef.current = now;
      }
    }
  }, [currentPosition, isTracking, isWebSocketReady]);

  const addHazardAlert = (message, severity, hazardId) => {
    const alert = {
      id: hazardId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      severity,
      timestamp: new Date(),
      hazardId
    };

    setHazardAlerts(prev => {
      // Check if alert for this hazard already exists
      if (hazardId && prev.some(a => a.hazardId === hazardId)) {
        return prev;
      }
      return [alert, ...prev.slice(0, 4)]; // Keep last 5 alerts
    });
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

  // Check if hazard is along the route path (within 150m of any route segment)
  const isHazardOnRoute = (hazardLat, hazardLon) => {
    if (routeCoordinates.length === 0) {
      console.log('⚠️ No route coordinates available');
      return true; // Show all hazards if no route loaded yet
    }

    for (let i = 0; i < routeCoordinates.length - 1; i++) {
      const segmentStart = routeCoordinates[i];
      const segmentEnd = routeCoordinates[i + 1];

      // Find closest point on this segment to the hazard
      const closestPoint = closestPointOnSegment(
        hazardLat,
        hazardLon,
        segmentStart[0],
        segmentStart[1],
        segmentEnd[0],
        segmentEnd[1]
      );

      const distance = calculateDistance(hazardLat, hazardLon, closestPoint[0], closestPoint[1]);

      // If hazard is within 150m of the route segment, it's on the route
      if (distance < 0.15) { // 0.15 km = 150 meters
        console.log(`✅ Hazard at [${hazardLat}, ${hazardLon}] is ${Math.round(distance * 1000)}m from route`);
        return true;
      }
    }

    console.log(`❌ Hazard at [${hazardLat}, ${hazardLon}] is not on route`);
    return false;
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
    
    // Save navigation state to preserve route when returning
    try {
      sessionStorage.setItem('returning_from_navigation', 'true');
      sessionStorage.setItem('last_navigation_route_id', routeId);
    } catch (error) {
      console.error("Error saving navigation state:", error);
    }
    
    router.push("/suggested-routes");
  };

  if (!routeCoordinates.length) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-slate-900 dark:border-white mx-auto mb-4"></div>
          <p>Loading navigation...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-white dark:bg-slate-900">
      {/* Map Layer - Full screen */}
      <div className="absolute inset-0" style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '120px' }}>
        {nearbyHazards.length > 0 && console.log('🗺️ Passing hazards to Map:', nearbyHazards)}
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

      {/* Top Navigation Bar - Fixed Above Map */}
      <div className="fixed top-[104px] left-0 right-0 z-[1000] bg-slate-900 shadow-xl">
        <div className="px-2 py-2">
          {/* Current Instruction */}
          <div className="bg-slate-800/95 rounded-lg p-2 mb-1.5 border border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <div className="text-2xl flex-shrink-0 !text-[#06d6a0]">
                  {instructions[currentInstructionIndex] 
                    ? getInstructionIcon(instructions[currentInstructionIndex].instruction)
                    : "🧭"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="!text-[#06d6a0] text-sm font-bold leading-tight truncate">
                    {hasArrived 
                      ? "You have arrived!"
                      : instructions[currentInstructionIndex]?.instruction || "Continue on route"}
                  </div>
                  {!hasArrived && distanceToNextTurn > 0 && (
                    <div className="text-blue-300 text-xs">
                      in {formatDistance(distanceToNextTurn)}
                    </div>
                  )}
                </div>
              </div>
              
              {/* GPS Status */}
              <div className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ml-2 ${
                isTracking ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              }`}>
                {isTracking ? '📍' : '❌'}
              </div>
            </div>

            {/* Off-route warning */}
            {isOffRoute && (
              <div className="bg-orange-500 text-white px-2 py-1 rounded-md text-xs font-semibold animate-pulse mt-1.5">
                ⚠️ You are off the planned route
              </div>
            )}
          </div>

          {/* Route Progress Bar */}
          <div className="bg-slate-800/95 rounded-lg p-2 border border-slate-700">
            <div className="flex justify-between text-white text-base mb-1.5">
              <span className="font-bold text-lg">{routeProgress}%</span>
              <span className="font-bold text-lg">{formatDistance(totalDistanceRemaining)}</span>
              <span className="font-bold text-lg">{estimatedTimeRemaining} min</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${routeProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panel - Popup Sheet */}
      <RoutesSheet
        title="Navigation"
        subtitle=""
        initialExpanded={false}
        minHeight={100}
        collapsedHeight={100}
        maxHeight={400}
        enableFullHeight={true}
      >
        <div className="p-4 pt-2 md:pt-4 space-y-3">
          {/* Hazard Alerts Section */}
          {hazardAlerts.length > 0 && (
            <div className="space-y-2">
              {hazardAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg shadow-lg border-2 animate-pulse ${
                    alert.severity === 'critical'
                      ? 'bg-red-100 text-red-900 border-red-300 dark:bg-red-900/30 dark:text-red-100 dark:border-red-600'
                      : alert.severity === 'high'
                      ? 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-900/30 dark:text-orange-100 dark:border-orange-600'
                      : alert.severity === 'medium'
                      ? 'bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-100 dark:border-yellow-600'
                      : 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/30 dark:text-blue-100 dark:border-blue-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="text-2xl flex-shrink-0">⚠️</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm leading-tight">{alert.message}</p>
                        <p className="text-xs opacity-75 mt-1">
                          {alert.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setHazardAlerts(prev => prev.filter(a => a.id !== alert.id))}
                      className="text-2xl hover:opacity-70 flex-shrink-0 w-6 h-6 flex items-center justify-center leading-none"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Next Instructions */}
          <div className="bg-slate-200 dark:bg-[#334155] rounded-lg p-3 border border-slate-400 dark:border-slate-600">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-slate-900 dark:text-white font-bold text-base">Upcoming Turns</h3>
              
              {/* Safety Badge */}
              <div className={`px-2.5 py-1 rounded-full text-sm font-semibold ${
                routeSafety >= 7 ? 'bg-green-500 text-white' : 
                routeSafety >= 5 ? 'bg-yellow-500 text-gray-900' : 
                'bg-red-500 text-white'
              }`}>
                Safety: {parseFloat(routeSafety).toFixed(1)}/10
              </div>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-400 dark:scrollbar-thumb-slate-600">
              {instructions.slice(currentInstructionIndex, currentInstructionIndex + 4).map((inst, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center gap-3 p-4 rounded-2xl border hover:shadow-md transition-all ${
                    idx === 0 ? 'bg-[#6ff8a1]/20 dark:!bg-slate-800 border-gray-200 dark:border-slate-700' : 'bg-white dark:!bg-slate-800 border-gray-200 dark:border-slate-700'
                  }`}
                >
                  <div className="text-2xl shrink-0" style={{ color: 'var(--from-to-label-color)' }}>
                    {getInstructionIcon(inst.instruction)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-900 dark:text-white text-base font-bold">
                      {inst.instruction || "Continue straight"}
                    </div>
                  </div>
                </div>
              ))}
              
              {instructions.length === 0 && (
                <div className="text-slate-600 dark:text-slate-400 text-sm text-center py-3">
                  Follow the route on the map
                </div>
              )}
            </div>
          </div>

          {/* Exit Button */}
          <button
            onClick={exitNavigation}
            className="w-full font-bold py-3 px-4 rounded-lg transition-colors shadow-lg"
            style={{ backgroundColor: '#06d6a0', color: '#1e293b' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#05c090'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#06d6a0'}
          >
            Exit Navigation
          </button>
        </div>
      </RoutesSheet>

      {/* Arrival Modal */}
      {hasArrived && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
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
