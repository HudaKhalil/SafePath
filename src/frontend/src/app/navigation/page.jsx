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
