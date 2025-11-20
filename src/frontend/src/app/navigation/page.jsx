"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { LOCATION_CONFIG } from "../../lib/locationConfig";
import websocketClient from "../../lib/websocketClient";

const Map = dynamic(() => import("../../components/Map"), { ssr: false });

export default function NavigationPage() {
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

