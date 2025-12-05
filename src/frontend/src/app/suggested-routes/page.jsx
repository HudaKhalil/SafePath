"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { geocodingService, hazardsService } from "../../lib/services";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import AddressAutocomplete from "../../components/AddressAutocomplete";
import RoutesSheet from "../../components/RoutesSheet";
import SafetySettings, { SafetySettingsButton, getSafetyWeights, getCurrentPreset, getPresetName } from "../../components/SafetySettings";
import { LOCATION_CONFIG } from "../../lib/locationConfig";

const normalizeCoordinates = (lat, lon) => {
  const parsedLat = typeof lat === 'string' ? parseFloat(lat) : lat;
  const parsedLon = typeof lon === 'string' ? parseFloat(lon) : lon;
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLon)) {
    return null;
  }
  return [parsedLat, parsedLon];
};

const Map = dynamic(() => import("../../components/Map"), { ssr: false });

function SuggestedRoutesContent() {
  const [mapKey, setMapKey] = useState(0);
  const [mapCenter, setMapCenter] = useState(null);
  const [isDark, setIsDark] = useState(false);
  
  const clearBackendRoutes = () => {
    setBackendRoutes([]);
    setSelectedRoute(null);
  };
  const startBackendNavigation = (route) => {
    const routeData = {
      coordinates: route.path || [],
      instructions: route.instructions || [],
      type: route.difficulty,
      distance: route.distanceKm,
      time: route.estimatedTimeMinutes,
      safety: route.safetyRating
    };
    
    sessionStorage.setItem(`route_${route.id}`, JSON.stringify(routeData));
    
    // Save complete search state for restoration
    const searchState = {
      fromLocation,
      toLocation,
      fromCoords,
      toCoords,
      transportMode,
      routes,
      backendRoutes,
      selectedRouteId: route.id,
      selectedRoute: route,
      mapCenter,
      mapZoom
    };
    sessionStorage.setItem('route_search_state', JSON.stringify(searchState));
    
    const url =
      `/navigation` +
      `?routeId=${encodeURIComponent(route.id)}` +
      `&name=${encodeURIComponent(route.name)}` +
      `&type=${encodeURIComponent(route.difficulty)}` +
      `&distance=${encodeURIComponent(route.distanceKm)}` +
      `&time=${encodeURIComponent(route.estimatedTimeMinutes)}` +
      `&safety=${encodeURIComponent(route.safetyRating)}`;
    router.push(url);
  };
  const router = useRouter();
  const searchParams = useSearchParams();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [error, setError] = useState("");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [fromCoords, setFromCoords] = useState(null);
  const [toCoords, setToCoords] = useState(null);
  const [transportMode, setTransportMode] = useState("cycling");
  const [backendRoutes, setBackendRoutes] = useState([]);
  const [backendLoading, setBackendLoading] = useState(false);
  const [mapZoom, setMapZoom] = useState(14);
  const resultsRef = useRef(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showRoutePanel, setShowRoutePanel] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(true);
  const [previewRouteInfo, setPreviewRouteInfo] = useState(null);
  const [showSafetySettings, setShowSafetySettings] = useState(false);
  const [safetyWeights, setSafetyWeights] = useState(null);
  const [currentSafetyPreset, setCurrentSafetyPreset] = useState('balanced');
  const [hazards, setHazards] = useState([]);

  const desktopPanelViewportHeight = 'calc(100vh - 96px)';
  const mobileComparisonViewportHeight = 'calc(100vh - 140px)';

  const fetchBackendRoutes = async () => {
    setBackendLoading(true);
    setError("");
    try {
      const res = await fetch("/api/routes");
      const data = await res.json();
      if (data.success && data.data?.routes) {
        setBackendRoutes(data.data.routes);
        console.log("Fetched backendRoutes:", data.data.routes);
      } else {
        setError(data.message || "Failed to fetch suggested routes");
      }
    } catch (err) {
      setError("Failed to fetch suggested routes");
    } finally {
      setBackendLoading(false);
    }
  };

  const loadHazardsForArea = async (lat, lng, radius = 5000) => {
    try {
      console.log(`Loading hazards for area: lat=${lat}, lng=${lng}, radius=${radius}`);
      const response = await hazardsService.getNearbyHazards(lat, lng, { radius, limit: 50 });
      console.log('Hazards API response:', response);
      if (response.success) {
        const hazardsData = response.data?.hazards || [];
        setHazards(hazardsData);
        console.log(`Loaded ${hazardsData.length} hazards in area:`, hazardsData);
      } else {
        console.warn('Failed to load hazards:', response);
        setHazards([]);
      }
    } catch (error) {
      console.error('Error loading hazards:', error);
      setHazards([]);
    }
  };

  useEffect(() => {
    getUserLocation();
    // Load saved safety weights and preset
    setSafetyWeights(getSafetyWeights());
    setCurrentSafetyPreset(getCurrentPreset());
    
    // Check if returning from navigation
    const returningFromNav = sessionStorage.getItem('returning_from_navigation');
    const lastRouteId = sessionStorage.getItem('last_navigation_route_id');
    
    if (returningFromNav === 'true' && lastRouteId) {
      // Restore route data from sessionStorage
      try {
        const storedRouteData = sessionStorage.getItem(`route_${lastRouteId}`);
        const storedSearchState = sessionStorage.getItem('route_search_state');
        
        if (storedRouteData && storedSearchState) {
          const routeData = JSON.parse(storedRouteData);
          const searchState = JSON.parse(storedSearchState);
          
          // Restore search parameters
          setFromLocation(searchState.fromLocation || '');
          setToLocation(searchState.toLocation || '');
          setFromCoords(searchState.fromCoords || null);
          setToCoords(searchState.toCoords || null);
          setTransportMode(searchState.transportMode || 'cycling');
          
          // Restore routes (this will make them visible on map)
          if (searchState.routes) {
            setRoutes(searchState.routes);
          }
          if (searchState.backendRoutes) {
            setBackendRoutes(searchState.backendRoutes);
          }
          
          // Restore selected route
          if (searchState.selectedRouteId) {
            setSelectedRouteId(searchState.selectedRouteId);
            setSelectedRoute(searchState.selectedRoute || null);
          }
          
          // Restore map state
          if (searchState.mapCenter) {
            setMapCenter(searchState.mapCenter);
          }
          if (searchState.mapZoom) {
            setMapZoom(searchState.mapZoom);
          }
          
          // Show route panel
          setShowRoutePanel(true);
          
          console.log('Route state restored after navigation');
        }
        
        // Clear the flags
        sessionStorage.removeItem('returning_from_navigation');
        sessionStorage.removeItem('last_navigation_route_id');
      } catch (error) {
        console.error('Error restoring route state:', error);
      }
      
      // Skip URL parameter parsing since we restored from session
      return;
    }
    
    // Parse URL parameters for pre-filled route
    const fromLat = searchParams.get('fromLat');
    const fromLng = searchParams.get('fromLng');
    const fromAddress = searchParams.get('fromAddress');
    const toLat = searchParams.get('toLat');
    const toLng = searchParams.get('toLng');
    const toAddress = searchParams.get('toAddress');
    const mode = searchParams.get('mode');
    
    // Set transport mode if provided
    if (mode === 'walk' || mode === 'walking') {
      setTransportMode('walking');
    } else if (mode === 'cycle' || mode === 'cycling') {
      setTransportMode('cycling');
    }
    
    // Populate from location (current location)
    if (fromLat && fromLng) {
      const fromCoordinates = normalizeCoordinates(fromLat, fromLng);
      if (fromCoordinates) {
        setFromCoords(fromCoordinates);
        
        // Always fetch the actual address from coordinates
        geocodingService.getAddressFromCoords(fromLat, fromLng).then(response => {
          if (response.success && response.data?.display_name) {
            console.log('From address fetched:', response.data.display_name);
            setFromLocation(response.data.display_name);
          } else {
            console.log('Failed to fetch from address, using fallback');
            setFromLocation('Current Location');
          }
        }).catch((error) => {
          console.error('Error fetching from address:', error);
          setFromLocation('Current Location');
        });
      }
    }
    
    // Populate to location (destination)
    if (toLat && toLng) {
      const toCoordinates = normalizeCoordinates(toLat, toLng);
      if (toCoordinates) {
        setToCoords(toCoordinates);
        // Use provided address or reverse geocode
        if (toAddress) {
          setToLocation(decodeURIComponent(toAddress));
        } else {
          geocodingService.getAddressFromCoords(toLat, toLng).then(response => {
            if (response.success && response.data?.display_name) {
              setToLocation(response.data.display_name);
            }
          });
        }
      }
    }
    
    // Center map to show both locations if both are provided
    if (fromLat && fromLng && toLat && toLng) {
      const fromCoordinates = normalizeCoordinates(fromLat, fromLng);
      const toCoordinates = normalizeCoordinates(toLat, toLng);
      if (fromCoordinates && toCoordinates) {
        // Calculate center point between from and to
        const centerLat = (fromCoordinates[0] + toCoordinates[0]) / 2;
        const centerLng = (fromCoordinates[1] + toCoordinates[1]) / 2;
        setMapCenter([centerLat, centerLng]);
        setMapZoom(13);
      }
    } else if (toLat && toLng) {
      // If only destination, center on it
      const toCoordinates = normalizeCoordinates(toLat, toLng);
      if (toCoordinates) {
        setMapCenter(toCoordinates);
        setMapZoom(15);
      }
    }
  }, [searchParams]);

  // Track dark mode changes
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (routes.length > 0 || backendRoutes.length > 0) {
      // Show toast notification
      setShowSuccessToast(true);
      // Open route panel automatically
      setShowRoutePanel(true);
      
      // Hide toast after 4 seconds
      setTimeout(() => {
        setShowSuccessToast(false);
      }, 4000);
    }
  }, [routes.length, backendRoutes.length]);

  // Load hazards when fromCoords or toCoords change
  useEffect(() => {
    if (fromCoords || toCoords) {
      const lat = fromCoords ? fromCoords[0] : (toCoords ? toCoords[0] : null);
      const lng = fromCoords ? fromCoords[1] : (toCoords ? toCoords[1] : null);
      if (lat && lng) {
        loadHazardsForArea(lat, lng, 5000);
      }
    } else if (userLocation) {
      loadHazardsForArea(userLocation[0], userLocation[1], 5000);
    }
  }, [fromCoords, toCoords, userLocation]);

  // Whenever transport mode changes, just clear preview info text
  useEffect(() => {
    setPreviewRouteInfo(null);
  }, [transportMode]);

  // Handle transport mode change - clears comparison routes and resets to preview
  const handleTransportModeChange = (newMode) => {
    if (newMode === transportMode) return; // No change needed
    
    // Clear comparison routes and reset to preview mode
    setRoutes([]);
    setSelectedRouteId(null);
    setShowRoutePanel(false);
    setTransportMode(newMode);
  };

  const handlePreviewRouteInfo = (summary) => {
    if (!summary || !summary.distanceKm || !summary.durationMin) return;

    setPreviewRouteInfo({
      distanceKm: Number(summary.distanceKm.toFixed(1)),
      durationMin: Math.round(summary.durationMin),
      mode: summary.mode,
    });
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const location = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(location);
          if (!mapCenter) setMapCenter(location);
        },
        () => {
          setUserLocation(LOCATION_CONFIG.DEFAULT_CENTER);
          if (!mapCenter) setMapCenter(LOCATION_CONFIG.DEFAULT_CENTER);
        }
      );
    } else {
      setUserLocation(LOCATION_CONFIG.DEFAULT_CENTER);
      if (!mapCenter) setMapCenter(LOCATION_CONFIG.DEFAULT_CENTER);
    }
  };

  const handleFromLocationChange = (value, locationData) => {
    setFromLocation(value);
    if (locationData) {
      const coords = normalizeCoordinates(locationData.lat, locationData.lon);
      if (coords) {
        setFromCoords(coords);
        setMapCenter(coords);
        setMapZoom(15);
        setMapKey((prev) => prev + 1);
        return;
      }
    }
    setFromCoords(null);
  };

  const handleToLocationChange = (value, locationData) => {
    setToLocation(value);
    if (locationData) {
      const coords = normalizeCoordinates(locationData.lat, locationData.lon);
      if (coords) {
        setToCoords(coords);
        setMapCenter(coords);
        setMapZoom(15);
        setMapKey((prev) => prev + 1);
        return;
      }
    }
    setToCoords(null);
  };



 const handleFindRoutes = async (e) => {
   e.preventDefault();
   if (!fromCoords || !toCoords) {
     setError("Please select both starting location and destination");
     return;
   }

   setLoading(true);
   setError("");

   try {
     const getAuthToken = () => {
       const cookies = document.cookie.split(';');
       const authCookie = cookies.find(c => c.trim().startsWith('auth_token='));
       return authCookie ? authCookie.split('=')[1] : null;
     };

     const token = getAuthToken();
     if (!token) {
       setError("Authentication required. Please log in.");
       setLoading(false);
       return;
     }

     const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
     const baseUrl = apiUrl.replace(/\/api$/, '');
     console.log('Calling API:', `${baseUrl}/api/routes/find`);
     
     // Get current safety weights for the request
     const currentWeights = safetyWeights || getSafetyWeights();
     console.log('🛡️ Using safety weights:', currentWeights);
     
     const response = await fetch(`${baseUrl}/api/routes/find`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${token}`
       },
       credentials: 'include',
       body: JSON.stringify({
         fromLat: fromCoords[0],
         fromLon: fromCoords[1],
         toLat: toCoords[0],
         toLon: toCoords[1],
         mode: transportMode,
         userPreferences: {
           factorWeights: currentWeights
         }
       })
     });

     const result = await response.json();

     if (!response.ok) {
       const errorMessage = result.message || result.error || `API returned ${response.status}: ${response.statusText}`;
       setError(errorMessage);
       setLoading(false);
       return;
     }

     if (result.success && result.data) {
       const { fastest, safest } = result.data;
       
       console.log('🚀 Route data received from API:');
       console.log('Fastest route:', {
         coordinates: fastest.coordinates?.length + ' points',
         distance: fastest.distance + ' km',
         time: fastest.time + ' min',
         safetyRating: fastest.safetyRating,
         mode: fastest.mode,
         provider: fastest.provider,
         isPureOSRM: fastest.isPureOSRM
       });
       console.log('Safest route:', {
         coordinates: safest.coordinates?.length + ' points',
         distance: safest.distance + ' km',
         time: safest.time + ' min',
         safetyRating: safest.safetyRating,
         mode: safest.mode,
         provider: safest.provider,
         sameAsFastest: safest.sameAsFastest
       });
       
       const formattedRoutes = [
         {
           id: 'fastest',
           name: 'Fastest Route',
           type: 'fastest',
           color: '#a78bfa', // Light purple for fastest
           coordinates: fastest.coordinates || [],
           distance: fastest.distance,
           estimatedTime: fastest.time,
           // Use safetyRating directly from API (already 0-10 scale)
           safetyRating: fastest.safetyRating ?? ((1 - fastest.safetyScore) * 10),
           safetyScore: fastest.safetyScore,
           instructions: fastest.instructions || [],
           provider: fastest.provider || result.provider,
           mode: fastest.mode,
           isPureOSRM: fastest.isPureOSRM
         },
         {
           id: 'safest',
           name: 'Safest Route',
           type: 'safest',
           color: '#4CBB17', // Kelly green for safest
           coordinates: safest.coordinates || [],
           distance: safest.distance,
           estimatedTime: safest.time,
           // Use safetyRating directly from API (already 0-10 scale)
           safetyRating: safest.safetyRating ?? ((1 - safest.safetyScore) * 10),
           safetyScore: safest.safetyScore,
           instructions: safest.instructions || [],
           provider: safest.provider || result.provider,
           mode: safest.mode,
           sameAsFastest: safest.sameAsFastest
         }
       ];

       console.log('📍 Formatted routes:', formattedRoutes.map(r => ({
         id: r.id,
         coordinatesCount: r.coordinates.length,
         firstCoord: r.coordinates[0],
         lastCoord: r.coordinates[r.coordinates.length - 1]
       })));

       setRoutes(formattedRoutes);
       // Auto-select fastest route to show on map
       setSelectedRouteId('fastest');
     } else {
       // Show specific error message from backend
       const errorMsg = result.error || result.message || "Failed to find routes";
       setError(errorMsg);
       console.warn('Route calculation failed:', errorMsg);
     }
   } catch (error) {
     console.error("Route finding error:", error);
     setError(error.message || "Failed to find routes. Please try again.");
   } finally {
     setLoading(false);
   }
 };

  const handleMapPlaceSelect = async (latlng) => {
    console.log('🗺️ Map clicked at:', latlng);
    
    try {
      let addressText = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
      console.log('📍 Initial coords:', addressText);
      
      try {
        console.log('🔄 Trying backend reverse geocoding...');
        const response = await geocodingService.getAddressFromCoords(
          latlng.lat,
          latlng.lng
        );

        console.log('✓ Backend response:', response);
        
        if (response.success && response.data?.location?.display_name) {
          addressText = response.data.location.display_name;
          console.log('✓ Got address from backend:', addressText);
        } else {
          console.log('❌ No display_name in backend response, trying Nominatim...');
        }
      } catch (error) {
        console.log('❌ Backend reverse geocoding failed:', error);
        console.log('🔄 Trying direct Nominatim...');
        
        try {
          const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&addressdetails=1`;
          const nominatimResponse = await fetch(nominatimUrl);
          const nominatimData = await nominatimResponse.json();
          
          console.log('✓ Nominatim response:', nominatimData);
          if (nominatimData.display_name) {
            addressText = nominatimData.display_name;
            console.log('✓ Got address from Nominatim:', addressText);
          }
        } catch (nominatimError) {
          console.warn('❌ Direct Nominatim also failed:', nominatimError);
        }
      }

      const coords = [latlng.lat, latlng.lng];
      console.log('📌 Setting location to:', addressText);

      if (!fromCoords) {
        setFromLocation(addressText);
        setFromCoords(coords);
        console.log('✓ Set FROM location');
      } else if (!toCoords) {
        setToLocation(addressText);
        setToCoords(coords);
        console.log('✓ Set TO location');
      } else {
        setToLocation(addressText);
        setToCoords(coords);
        console.log('✓ Updated TO location');
      }
    } catch (error) {
      console.error("Error getting address from coordinates:", error);
    }
  };

  const startNavigation = (route) => {
    const routeData = {
      coordinates: route.coordinates || [],
      instructions: route.instructions || [],
      type: route.type,
      distance: route.distance,
      time: route.estimatedTime,
      safety: route.safetyRating
    };
    
    sessionStorage.setItem(`route_${route.id}`, JSON.stringify(routeData));
    
    // Save complete search state for restoration
    const searchState = {
      fromLocation,
      toLocation,
      fromCoords,
      toCoords,
      transportMode,
      routes,
      backendRoutes,
      selectedRouteId: route.id,
      selectedRoute: route,
      mapCenter,
      mapZoom
    };
    sessionStorage.setItem('route_search_state', JSON.stringify(searchState));
    
    const url =
      `/navigation` +
      `?routeId=${encodeURIComponent(route.id)}` +
      `&name=${encodeURIComponent(route.name)}` +
      `&type=${encodeURIComponent(route.type)}` +
      `&distance=${encodeURIComponent(route.distance)}` +
      `&time=${encodeURIComponent(route.estimatedTime)}` +
      `&safety=${encodeURIComponent(route.safetyRating)}`;

    router.push(url);
  };

  const getSafetyColor = (rating) => {
    if (rating >= 8) return "text-green-600";
    if (rating >= 6) return "text-yellow-600";
    return "text-red-600";
  };

  const getSafetyBadgeColor = (rating) => {
    if (rating >= 8) return "bg-green-100 text-green-800";
    if (rating >= 6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <ProtectedRoute>
    
      {/* Success Toast Notification */}
      {showSuccessToast && (
        <div 
          className="fixed top-24 left-1/2 transform -translate-x-1/2 z-9999 animate-slide-down"
          style={{
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : '#f0fdf4',
            border: '2px solid #06d6a0',
            boxShadow: '0 10px 40px rgba(6, 214, 160, 0.3)'
          }}
        >
          <div className="px-6 py-4 rounded-xl flex items-center gap-3">
            <span className="text-2xl">✓</span>
            <div>
              <h3 className="font-bold text-lg" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>Routes Found!</h3>
              <p className="text-sm" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                {backendRoutes.length > 0 ? `${backendRoutes.length} routes` : `${routes.length} routes`} available on map. Scroll down to compare details.
              </p>
            </div>
          </div>
        </div>
      )}
    
      <div className="min-h-screen" style={{ backgroundColor: isDark ? 'transparent' : '#ffffff' }}>
      
        <div className="text-center pt-6 pb-3 md:pt-12 md:pb-8">
       
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: isDark ? '#f8fafc' : 'var(--color-primary)' }}>
            Find the <span style={{ color: '#06d6a0' }}>Safest Route</span>
          </h1>
         
          <p className="mt-2" style={{ color: 'var(--color-text-primary)', opacity: 0.8 }}>
            Click on map or use the search form to plan your route
          </p>
        </div>

        <div className="relative w-full" style={{ height: 'calc(100vh - 230px)' }}>
          {/* Search Panel - Collapsible from Left (Desktop) */}
          <div 
            className={`hidden md:block fixed top-20 left-0 z-1000 transition-transform duration-300 ease-in-out ${
              showSearchPanel ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{ 
              width: '420px',
              height: desktopPanelViewportHeight,
              boxShadow: '4px 0 12px rgba(0, 0, 0, 0.15)'
            }}
          >
            {/* Toggle Button */}
            <button
              onClick={() => setShowSearchPanel(!showSearchPanel)}
              className="absolute right-0 top-1/2 translate-x-full -translate-y-1/2 py-6 px-3 rounded-r-lg shadow-lg transition-all"
              style={{ 
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                color: isDark ? '#06d6a0' : '#0f172a'
              }}
              title={showSearchPanel ? 'Hide search' : 'Show search'}
            >
              <span className="text-xl font-bold">
                {showSearchPanel ? '←' : '→'}
              </span>
            </button>

            {/* Panel Content */}
            <div 
              className="h-full overflow-y-auto"
              style={{ 
                background: isDark 
                  ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' 
                  : '#ffffff',
                borderRight: isDark ? '1px solid #334155' : '1px solid #e5e7eb'
              }}
            >
              <div className="p-4 pt-8" style={{ 
                background: 'transparent'
              }}>
              {/* Title and Subtitle */}
              <div className="mb-6 flex items-center justify-between pt-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold mb-1" style={{ color: isDark ? '#ffffff' : '#1e293b' }}>
                    Plan Your <span style={{ color: '#06d6a0' }}>Route</span>
                  </h2>
                  <p className="text-base hidden min-[428px]:block" style={{ color: isDark ? '#ffffff' : '#64748b' }}>
                    Find the safest path
                  </p>
                </div>
                <button
                  onClick={() => setShowSafetySettings(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200"
                  style={{
                    backgroundColor: isDark ? 'rgba(6, 214, 160, 0.15)' : 'rgba(15, 23, 42, 0.08)',
                  }}
                  title="Safety Settings"
                >
                  <span className="text-sm font-medium" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
                    {getPresetName(currentSafetyPreset)}
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" stroke={isDark ? '#06d6a0' : '#0f172a'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </button>
              </div>
              
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  {fromLocation && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setFromLocation("");
                        setToLocation("");
                        setFromCoords(null);
                        setToCoords(null);
                        setRoutes([]);
                        setBackendRoutes([]);
                        setSelectedRoute(null);
                        setMapKey((prev) => prev + 1);
                      }}
                      className="text-sm px-3 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1.5 border shadow-md"
                      style={{
                        backgroundColor: '#06d6a0',
                        color: '#0f172a',
                        borderColor: '#059669'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#059669';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#06d6a0';
                      }}
                      title="Clear all selections"
                    >
                      <span className="font-semibold">Clear</span>
                    </button>
                  )}
                  {/* Walk/Cycle mode buttons */}
                  <button
                    type="button"
                    onClick={() => handleTransportModeChange("walking")}
                    className="relative group transition-all duration-200"
                    title="Walking"
                  >
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200"
                      style={{
                        backgroundColor: transportMode === "walking" ? '#06d6a0' : (isDark ? '#475569' : '#e2e8f0'),
                        color: transportMode === "walking" ? '#0f172a' : (isDark ? '#cbd5e1' : '#94a3b8'),
                        border: isDark && transportMode !== "walking" ? '1px solid #64748b' : 'none'
                      }}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="currentColor"
                        className="w-6 h-6"
                      >
                        <path d="M13.5 5.5c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/>
                      </svg>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTransportModeChange("cycling")}
                    className="relative group transition-all duration-200"
                    title="Cycling"
                  >
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200"
                      style={{
                        backgroundColor: transportMode === "cycling" ? '#06d6a0' : (isDark ? '#475569' : '#e2e8f0'),
                        color: transportMode === "cycling" ? '#0f172a' : (isDark ? '#cbd5e1' : '#94a3b8'),
                        border: isDark && transportMode !== "cycling" ? '1px solid #64748b' : 'none'
                      }}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className="w-6 h-6"
                      >
                        <circle cx="18.5" cy="17.5" r="3.5"/>
                        <circle cx="5.5" cy="17.5" r="3.5"/>
                        <circle cx="15" cy="5" r="1"/>
                        <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
                      </svg>
                    </div>
                  </button>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    const londonCenter = [51.5074, -0.1278];
                    setUserLocation(londonCenter);
                    setMapCenter(londonCenter);
                    setMapZoom(13);
                    setMapKey((prev) => prev + 1);
                    const span = e.currentTarget.querySelector('.london-text');
                    if (span) {
                      span.textContent = '✓ Set to London';
                      setTimeout(() => {
                        span.textContent = 'Set to London';
                      }, 1500);
                    }
                  }}
                  className="text-base transition-all duration-200 flex items-center gap-1.5 focus:outline-none"
                  style={{
                    backgroundColor: 'transparent',
                    color: isDark ? '#06d6a0' : '#1e293b',
                    border: 'none',
                    padding: 0,
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = isDark ? '#ffffff' : '#06d6a0'}
                  onMouseLeave={(e) => e.currentTarget.style.color = isDark ? '#06d6a0' : '#1e293b'}
                  title="Set current location to London for testing"
                >
                  <span className="text-lg">🇬🇧</span>
                  <span className="font-medium london-text hover:underline">Set to London</span>
                </button>
              </div>
              <form onSubmit={handleFindRoutes} className="space-y-3">
                <AddressAutocomplete
                  value={fromLocation}
                  onChange={handleFromLocationChange}
                  placeholder="Choose starting point or click on map"
                  icon="from"
                />
                <AddressAutocomplete
                  value={toLocation}
                  onChange={handleToLocationChange}
                  placeholder="Choose destination or click on map"
                  icon="to"
                />

                <div className="flex justify-center">
                  <button
                    id="find-routes-btn"
                    type="submit"
                    className="font-bold py-2.5 px-8 rounded-lg text-sm"
                    style={{
                      backgroundColor: '#06d6a0',
                      color: '#0f172a'
                    }}
                  >
                    Find Routes
                  </button>
                </div>
                
                {/* Preview Route Info */}
                {previewRouteInfo && fromCoords && toCoords && (
                  <div 
                    className="mt-3 rounded-lg p-3 border"
                    style={{
                      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(248, 250, 252, 0.8)',
                      borderColor: isDark ? '#475569' : '#e5e7eb'
                    }}
                  >
                    <div className="flex items-center justify-around">
                      <div className="text-center">
                        <p className="text-lg font-bold" style={{ color: '#3b82f6' }}>
                          {previewRouteInfo.distanceKm} km
                        </p>
                        <p className="text-xs" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Distance</p>
                      </div>
                      <div className="w-px h-10" style={{ backgroundColor: isDark ? '#475569' : '#e5e7eb' }}></div>
                      <div className="text-center">
                        <p className="text-lg font-bold" style={{ color: '#3b82f6' }}>
                          {previewRouteInfo.durationMin} min
                        </p>
                        <p className="text-xs" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Duration</p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t text-center" style={{ borderColor: isDark ? '#475569' : '#e5e7eb' }}>
                      <p className="text-xs flex items-center justify-center gap-1.5" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M12 16v-4"/>
                          <path d="M12 8h.01"/>
                        </svg>
                        <span>Preview route via OSM</span>
                      </p>
                    </div>
                  </div>
                )}
              </form>
            </div>
            
              {/* Safety Settings Overlay Panel */}
              <SafetySettings
                isOpen={showSafetySettings}
                onClose={() => setShowSafetySettings(false)}
                isDark={isDark}
                onSettingsChange={(weights, presetId) => {
                  setSafetyWeights(weights);
                  setCurrentSafetyPreset(presetId || getCurrentPreset());
                  console.log('🛡️ Safety weights updated:', weights, 'Preset:', presetId);
                }}
              />
            </div>
          </div>

          {/* Mobile Routes Sheet - visible on mobile only */}
          <div className="md:hidden">
            <RoutesSheet
              key={routes.length > 0 ? 'routes-active' : 'routes-empty'}
              title={
                <span style={{ color: isDark ? '#ffffff' : '#1e293b' }}>
                  Plan Your <span style={{ color: '#06d6a0' }}>Route</span>
                </span>
              }
              subtitle={typeof window !== 'undefined' && window.innerWidth >= 428 ? "Find the safest path" : ""}
              initialExpanded={false}
              minHeight={160}
              collapsedHeight={112}
              contentMinHeight={360}
              settingsButton={
                <button
                  onClick={() => setShowSafetySettings(true)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full transition-all duration-200"
                  style={{
                    backgroundColor: isDark ? 'rgba(6, 214, 160, 0.15)' : 'rgba(15, 23, 42, 0.08)',
                  }}
                  title="Safety Settings"
                >
                  <span className="text-sm font-medium" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
                    {getPresetName(currentSafetyPreset)}
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" stroke={isDark ? '#06d6a0' : '#0f172a'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </button>
              }
            >
              <div className="space-y-2 pb-2 pt-2">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex gap-2 items-center">
                    {fromLocation && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setFromLocation("");
                          setToLocation("");
                          setFromCoords(null);
                          setToCoords(null);
                          setRoutes([]);
                          setBackendRoutes([]);
                          setSelectedRoute(null);
                          setMapKey((prev) => prev + 1);
                        }}
                        className="text-sm px-3 py-1.5 rounded-full transition-all duration-200 flex items-center border shadow-md"
                        style={{
                          backgroundColor: '#06d6a0',
                          color: '#0f172a',
                          borderColor: '#059669'
                        }}
                        title="Clear all selections"
                      >
                        <span className="font-semibold">Clear</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleTransportModeChange("walking")}
                      className="relative group transition-all duration-200"
                      title="Walking"
                    >
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200"
                        style={{
                          backgroundColor: transportMode === "walking" ? '#06d6a0' : (isDark ? '#475569' : '#e2e8f0'),
                          color: transportMode === "walking" ? '#0f172a' : (isDark ? '#cbd5e1' : '#94a3b8'),
                          border: isDark && transportMode !== "walking" ? '1px solid #64748b' : 'none'
                        }}
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 24 24" 
                          fill="currentColor"
                          className="w-6 h-6"
                        >
                          <path d="M13.5 5.5c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/>
                        </svg>
                      </div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => handleTransportModeChange("cycling")}
                      className="relative group transition-all duration-200"
                      title="Cycling"
                    >
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200"
                        style={{
                          backgroundColor: transportMode === "cycling" ? '#06d6a0' : (isDark ? '#475569' : '#e2e8f0'),
                          color: transportMode === "cycling" ? '#0f172a' : (isDark ? '#cbd5e1' : '#94a3b8'),
                          border: isDark && transportMode !== "cycling" ? '1px solid #64748b' : 'none'
                        }}
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          className="w-6 h-6"
                        >
                          <circle cx="18.5" cy="17.5" r="3.5"/>
                          <circle cx="5.5" cy="17.5" r="3.5"/>
                          <circle cx="15" cy="5" r="1"/>
                          <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
                        </svg>
                      </div>
                    </button>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      const londonCenter = [51.5074, -0.1278];
                      setUserLocation(londonCenter);
                      setMapCenter(londonCenter);
                      setMapZoom(13);
                      setMapKey((prev) => prev + 1);
                      const span = e.currentTarget.querySelector('.london-text');
                      if (span) {
                        span.textContent = '✓ Set to London';
                        setTimeout(() => {
                          span.textContent = 'Set to London';
                        }, 1500);
                      }
                    }}
                    className="text-base transition-all duration-200 flex items-center gap-1.5 focus:outline-none"
                    style={{
                      backgroundColor: 'transparent',
                      color: isDark ? '#06d6a0' : '#1e293b',
                      border: 'none',
                      padding: 0,
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = isDark ? '#ffffff' : '#06d6a0'}
                    onMouseLeave={(e) => e.currentTarget.style.color = isDark ? '#06d6a0' : '#1e293b'}
                    title="Set current location to London for testing"
                  >
                    <span className="text-lg">🇬🇧</span>
                    <span className="font-medium london-text hover:underline">Set to London</span>
                  </button>
                </div>
                <form onSubmit={handleFindRoutes} className="space-y-2">
                  <AddressAutocomplete
                    value={fromLocation}
                    onChange={handleFromLocationChange}
                    placeholder="Choose starting point or click on map"
                    icon="from"
                  />
                  <AddressAutocomplete
                    value={toLocation}
                    onChange={handleToLocationChange}
                    placeholder="Choose destination or click on map"
                    icon="to"
                  />

                  <div className="flex justify-center">
                    <button
                      type="submit"
                      className="font-bold py-2.5 px-8 rounded-lg text-sm"
                      style={{
                        backgroundColor: '#06d6a0',
                        color: '#0f172a'
                      }}
                    >
                      Find Routes
                    </button>
                  </div>
                  
                  {/* Preview Route Info - Mobile */}
                  {previewRouteInfo && fromCoords && toCoords && (
                    <div 
                      className="mt-3 rounded-lg p-3 border"
                      style={{
                        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(248, 250, 252, 0.8)',
                        borderColor: isDark ? '#475569' : '#e5e7eb'
                      }}
                    >
                      <div className="flex items-center justify-around">
                        <div className="text-center">
                          <p className="text-lg font-bold" style={{ color: '#3b82f6' }}>
                            {previewRouteInfo.distanceKm} km
                          </p>
                          <p className="text-xs" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Distance</p>
                        </div>
                        <div className="w-px h-10" style={{ backgroundColor: isDark ? '#475569' : '#e5e7eb' }}></div>
                        <div className="text-center">
                          <p className="text-lg font-bold" style={{ color: '#3b82f6' }}>
                            {previewRouteInfo.durationMin} min
                          </p>
                          <p className="text-xs" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Duration</p>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t text-center" style={{ borderColor: isDark ? '#475569' : '#e5e7eb' }}>
                        <p className="text-xs flex items-center justify-center gap-1.5" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 16v-4"/>
                            <path d="M12 8h.01"/>
                          </svg>
                          <span>Preview route via OSM</span>
                        </p>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </RoutesSheet>
            
            {/* Mobile Safety Settings Full Screen Overlay */}
            {showSafetySettings && (
              <div 
                className="fixed inset-0 z-1001 flex flex-col"
                style={{ 
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                }}
              >
                <SafetySettings
                  isOpen={showSafetySettings}
                  onClose={() => setShowSafetySettings(false)}
                  isDark={isDark}
                  onSettingsChange={(weights, presetId) => {
                    setSafetyWeights(weights);
                    setCurrentSafetyPreset(presetId || getCurrentPreset());
                    console.log('🛡️ Safety weights updated:', weights, 'Preset:', presetId);
                  }}
                />
              </div>
            )}
          </div>

          {/* Full screen map */}
          <div className="w-full h-full px-3 md:px-0">
            <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: '#1e293b' }}>
              <div className="bg-linear-to-br from-primary-dark via-primary to-slate-700 p-3">
                <div className="flex items-center justify-center gap-4">
                  <p className="text-sm font-medium" style={{ color: '#ffffff' }}>
                    {!fromCoords
                      ? "📍 Click on map to set starting point"
                      : !toCoords
                      ? "🎯 Click on map to set destination"
                      : "✓ Both points selected - click again to change destination"}
                  </p>
                </div>
                <div className="overflow-hidden relative" style={{ height: 'calc(100vh - 320px)' }}>
                  <Map
                    key={mapKey}
                    center={
                      mapCenter ||
                      userLocation ||
                      LOCATION_CONFIG.DEFAULT_CENTER
                    }
                    zoom={mapZoom}
                    routes={[
                      ...routes
                        .filter((r) => selectedRouteId === null || r.id === selectedRouteId)
                        .map((r) => ({
                          id: r.id,
                          name: r.name,
                          type: r.type,
                          color: r.color || "#3b82f6",
                          coordinates: r.coordinates || [],
                          safetyRating: r.safetyRating,
                          distance: r.distance,
                          estimatedTime: r.estimatedTime,
                          path: r.coordinates || [],
                        })),
                      ...backendRoutes.map((r) => ({
                        id: r.id,
                        name: r.name,
                        type: 'backend',
                        color: "#10b981",
                        coordinates: r.path?.coordinates || [],
                        safetyRating: r.safetyRating,
                        distance: r.distanceKm,
                        estimatedTime: r.estimatedTimeMinutes,
                        path: r.path?.coordinates || [],
                      })),
                    ]}
                    hazards={hazards.filter(h => h.latitude && h.longitude)}
                    height="100%"
                    fromCoords={fromCoords}
                    toCoords={toCoords}
                    transportMode={transportMode}
                    enablePreview={!!fromCoords && !!toCoords && routes.length === 0}
                    autoFitBounds={false}
                    onPlaceSelect={
                      routes.length === 0 ? handleMapPlaceSelect : null
                    }
                    onRouteFound={handlePreviewRouteInfo}
                  />
                  {loading && (
                    <div className="absolute inset-0 bg-gray-100/80 dark:bg-slate-800/80 flex items-center justify-center z-50">
                      <div className="text-center text-gray-500 dark:text-gray-300">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-accent mx-auto mb-3"></div>
                        <p>Finding routes...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ERROR - SAME FOR BOTH MODES */}
        {error && (
          <div className="max-w-4xl mx-auto bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-6">
            {error}
          </div>
        )}

        {/* Collapsible Route Panel - Desktop */}
        {routes.length > 0 && (
          <>
            {/* Toggle Button - Always Visible */}
            <button
              onClick={() => setShowRoutePanel(!showRoutePanel)}
              className="hidden md:block fixed top-1/2 py-6 px-3 rounded-l-lg shadow-lg transition-all z-1001"
              style={{ 
                right: showRoutePanel ? '380px' : '0',
                transform: 'translateY(-50%)',
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                color: isDark ? '#06d6a0' : '#0f172a',
                transitionProperty: 'all',
                transitionDuration: '300ms'
              }}
              title={showRoutePanel ? 'Hide routes' : 'Show routes'}
            >
              <span className="text-xl font-bold">
                {showRoutePanel ? '→' : '←'}
              </span>
            </button>

          <div 
            className={`hidden md:block fixed top-20 right-0 z-1000 transition-transform duration-300 ease-in-out ${
              showRoutePanel ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{ 
              width: '380px',
              height: desktopPanelViewportHeight,
              boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.15)',
              overflow: 'hidden'
            }}
          >

            {/* Panel Content */}
            <div 
              className="h-full overflow-y-scroll overflow-x-hidden route-panel-scroll flex flex-col"
              style={{ 
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                scrollbarWidth: 'thin',
                scrollbarColor: isDark ? '#475569 #1e293b' : '#cbd5e1 #f1f5f9'
              }}
            >
              <div className="sticky top-0 z-10 p-4 border-b shrink-0" style={{ 
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                borderColor: isDark ? '#334155' : '#e5e7eb'
              }}>
                <h2 className="text-xl font-bold" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                  Route Comparison
                </h2>
              </div>
              
              <div className="p-4 flex-1 pb-12">
                <div className="space-y-4 pb-16">
                {routes.map((route) => (
                  <div
                    key={route.id}
                    className="rounded-xl p-4 shadow-md border-2 cursor-pointer transition-all duration-200"
                    style={{
                      backgroundColor: isDark ? '#334155' : '#f9fafb',
                      borderColor: route.type === 'fastest' ? '#a78bfa' : '#4CBB17',
                      boxShadow: selectedRouteId === route.id ? `0 0 0 3px ${route.type === 'fastest' ? '#a78bfa' : '#4CBB17'}40` : undefined,
                      transform: selectedRouteId === route.id ? 'scale(1.02)' : undefined
                    }}
                    onClick={() => setSelectedRouteId(route.id)}
                  >
                    <div className="mb-3">
                      <h3 className="text-lg font-bold" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                        {route.name}
                      </h3>
                      <p className="text-xs" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>
                        {route.type === 'fastest' ? 'Quickest path' : 'Safest path'}
                        {selectedRouteId === route.id && ' • Showing on map'}
                      </p>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff' }}>
                        <span className="text-sm font-medium" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Distance</span>
                        <span className="text-lg font-bold" style={{ color: route.type === 'fastest' ? '#a78bfa' : '#4CBB17' }}>
                          {route.distance} km
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff' }}>
                        <span className="text-sm font-medium" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Time</span>
                        <span className="text-lg font-bold" style={{ color: route.type === 'fastest' ? '#a78bfa' : '#4CBB17' }}>
                          {route.estimatedTime} min
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff' }}>
                        <span className="text-sm font-medium" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Safety Score</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                route.safetyRating >= 7 ? 'bg-green-500' : 
                                route.safetyRating >= 5 ? 'bg-yellow-500' : 
                                'bg-red-500'
                              }`}
                              style={{ width: `${route.safetyRating * 10}%` }}
                            />
                          </div>
                          <span className={`text-sm font-bold ${
                            route.safetyRating >= 7 ? 'text-green-600' : 
                            route.safetyRating >= 5 ? 'text-yellow-600' : 
                            'text-red-600'
                          }`}>
                            {route.safetyRating.toFixed(1)}/10
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startNavigation(route);
                      }}
                      className="w-full font-bold py-2.5 rounded-lg transition shadow-md text-sm"
                      style={{
                        backgroundColor: route.type === 'fastest' ? '#a78bfa' : '#4CBB17',
                        color: '#ffffff'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = route.type === 'fastest' ? '#8b5cf6' : '#3DA512'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = route.type === 'fastest' ? '#a78bfa' : '#4CBB17'}
                    >
                      Start {route.type === 'fastest' ? 'Fastest' : 'Safest'} Route
                    </button>
                  </div>
                ))}
                </div>

                {routes.length === 2 && (
                  <div className="sticky bottom-4">
                    <div className="rounded-lg p-3 mx-2 shadow-md" style={{ 
                      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
                      border: `1px solid ${isDark ? '#3b82f6' : '#bfdbfe'}`
                    }}>
                      <h4 className="font-bold mb-2 text-base" style={{ color: isDark ? '#60a5fa' : '#1e40af' }}>Route Analysis</h4>
                      <div className="text-sm space-y-1" style={{ color: isDark ? '#93c5fd' : '#1e40af' }}>
                        <p>
                          • Safest is {Math.abs(((routes[1].distance - routes[0].distance) / routes[0].distance) * 100).toFixed(0)}% {routes[1].distance >= routes[0].distance ? 'longer' : 'shorter'}
                          {routes[1].safetyRating > routes[0].safetyRating && ` with better safety (${routes[1].safetyRating.toFixed(1)} vs ${routes[0].safetyRating.toFixed(1)})`}
                        </p>
                        {Math.abs(routes[0].estimatedTime - routes[1].estimatedTime) >= 0.5 && (
                          <p>
                            • Time difference: {(Math.round(Math.abs(routes[0].estimatedTime - routes[1].estimatedTime) * 2) / 2).toFixed(1)} min
                          </p>
                        )}
                        <p>
                          • Based on crime data, lighting & hazard reports
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          </>
        )}

        {/* Mobile Route Cards - Below Map */}
        {routes.length > 0 && (
          <section
            className="md:hidden max-w-6xl mx-auto rounded-2xl shadow-lg mt-4 mb-24"
            style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff'
            }}
          >
            <div className="sticky top-0 z-10 py-4 px-4 border-b" style={{ 
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              borderColor: isDark ? '#334155' : '#e5e7eb'
            }}>
              <h2 className="text-xl font-bold text-center" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                Route Comparison
              </h2>
              <p className="text-xs text-center mt-1" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>
                Tap a route to view on map • Scroll for analysis
              </p>
            </div>
            <div className="space-y-3 px-4 py-4 pb-24">
              {routes.map((route) => (
                <div
                  key={route.id}
                  className="rounded-xl p-4 shadow-md border-2 cursor-pointer transition-all duration-200"
                  style={{
                    backgroundColor: isDark ? '#334155' : '#f9fafb',
                    borderColor: route.type === 'fastest' ? '#a78bfa' : '#4CBB17',
                    boxShadow: selectedRouteId === route.id ? `0 0 0 3px ${route.type === 'fastest' ? '#a78bfa' : '#4CBB17'}40` : undefined,
                    transform: selectedRouteId === route.id ? 'scale(1.02)' : undefined
                  }}
                  onClick={() => setSelectedRouteId(route.id)}
                >
                  <div className="mb-3">
                    <h3 className="text-lg font-bold" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                      {route.name}
                    </h3>
                    <p className="text-xs" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>
                      {route.type === 'fastest' ? 'Quickest path' : 'Safest path'}
                      {selectedRouteId === route.id && ' • Showing on map'}
                    </p>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff' }}>
                      <span className="text-sm font-medium" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Distance</span>
                      <span className="text-lg font-bold" style={{ color: route.type === 'fastest' ? '#a78bfa' : '#4CBB17' }}>
                        {route.distance} km
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff' }}>
                      <span className="text-sm font-medium" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Time</span>
                      <span className="text-lg font-bold" style={{ color: route.type === 'fastest' ? '#a78bfa' : '#4CBB17' }}>
                        {route.estimatedTime} min
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff' }}>
                      <span className="text-sm font-medium" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Safety</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              route.safetyRating >= 7 ? 'bg-green-500' : 
                              route.safetyRating >= 5 ? 'bg-yellow-500' : 
                              'bg-red-500'
                            }`}
                            style={{ width: `${route.safetyRating * 10}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold ${
                          route.safetyRating >= 7 ? 'text-green-600' : 
                          route.safetyRating >= 5 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {route.safetyRating.toFixed(1)}/10
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startNavigation(route);
                    }}
                    className="w-full font-bold py-2.5 rounded-lg transition shadow-md text-sm"
                    style={{
                      backgroundColor: route.type === 'fastest' ? '#a78bfa' : '#4CBB17',
                      color: '#ffffff'
                    }}
                  >
                    Start {route.type === 'fastest' ? 'Fastest' : 'Safest'} Route
                  </button>
                </div>
              ))}

              {routes.length === 2 && (
                <div className="rounded-xl p-4 mt-4 mb-12 shadow-lg border-2" style={{ 
                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
                  borderColor: isDark ? '#3b82f6' : '#bfdbfe'
                }}>
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5" style={{ color: isDark ? '#60a5fa' : '#1e40af' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 12l2 2 4-4"/>
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                    <h4 className="font-bold text-lg" style={{ color: isDark ? '#60a5fa' : '#1e40af' }}>
                      Route Analysis
                    </h4>
                  </div>
                  <div className="space-y-2.5 text-sm" style={{ color: isDark ? '#93c5fd' : '#1e40af' }}>
                    <div className="flex items-start gap-2 p-2 rounded-lg" style={{ backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(191, 219, 254, 0.3)' }}>
                      <span className="shrink-0">📏</span>
                      <p>
                        <strong>Distance:</strong> Safest is {Math.abs(((routes[1].distance - routes[0].distance) / routes[0].distance) * 100).toFixed(0)}% {routes[1].distance >= routes[0].distance ? 'longer' : 'shorter'} than fastest
                      </p>
                    </div>
                    
                    {Math.abs(routes[0].estimatedTime - routes[1].estimatedTime) >= 0.5 && (
                      <div className="flex items-start gap-2 p-2 rounded-lg" style={{ backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(191, 219, 254, 0.3)' }}>
                        <span className="shrink-0">⏱️</span>
                        <p>
                          <strong>Time difference:</strong> {(Math.round(Math.abs(routes[0].estimatedTime - routes[1].estimatedTime) * 2) / 2).toFixed(1)} minutes
                        </p>
                      </div>
                    )}
                    
                    {routes[1].safetyRating > routes[0].safetyRating && (
                      <div className="flex items-start gap-2 p-2 rounded-lg" style={{ backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(191, 219, 254, 0.3)' }}>
                        <span className="shrink-0">🛡️</span>
                        <p>
                          <strong>Safety improvement:</strong> Safest route scores {routes[1].safetyRating.toFixed(1)}/10 vs {routes[0].safetyRating.toFixed(1)}/10
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-2 p-2 rounded-lg" style={{ backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(191, 219, 254, 0.3)' }}>
                      <span className="shrink-0">📊</span>
                      <p>
                        Based on crime data, lighting conditions & hazard reports
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {routes.length > 0 && routes[0].fallback && (
          <div className="max-w-4xl mx-auto bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mt-6">
            Warning: Route is a straight line (fallback). Real road routing is unavailable. Distance may not be accurate.
          </div>
        )}

        {/* Backend Routes - Collapsible Side Panel (Desktop) */}
        {backendRoutes.length > 0 && (
          <div 
            className={`hidden md:block fixed top-20 right-0 z-1000 transition-transform duration-300 ease-in-out ${
              showBackendPanel ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{ 
              width: '380px',
              height: desktopPanelViewportHeight,
              boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.15)',
              overflow: 'hidden'
            }}
          >
            {/* Toggle Button */}
            <button
              onClick={() => setShowBackendPanel(!showBackendPanel)}
              className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 py-6 px-3 rounded-l-lg shadow-lg transition-all"
              style={{ 
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                color: isDark ? '#06d6a0' : '#0f172a'
              }}
              title={showBackendPanel ? 'Hide backend routes' : 'Show backend routes'}
            >
              <span className="text-xl font-bold">
                {showBackendPanel ? '→' : '←'}
              </span>
            </button>

            {/* Panel Content */}
            <div 
              className="h-full overflow-y-scroll overflow-x-hidden route-panel-scroll flex flex-col"
              style={{ 
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                scrollbarWidth: 'thin',
                scrollbarColor: isDark ? '#475569 #1e293b' : '#cbd5e1 #f1f5f9'
              }}
            >
              <div className="sticky top-0 z-10 p-4 border-b shrink-0" style={{ 
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                borderColor: isDark ? '#334155' : '#e5e7eb'
              }}>
                <h2 className="text-xl font-bold" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                  🛡️ Suggested Routes
                </h2>
              </div>
              
              <div className="p-4 space-y-3 flex-1 pb-8">
              {[...backendRoutes]
                .sort((a, b) => b.safetyRating - a.safetyRating)
                .map((route) => (
                  <div
                    key={route.id}
                    className="rounded-xl p-4 shadow-md cursor-pointer"
                    style={{
                      backgroundColor: isDark ? '#334155' : '#f9fafb',
                      border: `2px solid ${selectedRoute?.id === route.id ? '#3b82f6' : (isDark ? '#475569' : '#e5e7eb')}`
                    }}
                    onClick={() => setSelectedRoute(route)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🛡️</span>
                        <div>
                          <h3 className="text-base font-bold" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                            {route.name}
                          </h3>
                          <p className="text-xs capitalize" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>
                            {route.difficulty} route
                          </p>
                        </div>
                      </div>
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: route.safetyRating >= 8 ? '#dcfce7' : route.safetyRating >= 6 ? '#fef9c3' : '#fee2e2',
                          color: route.safetyRating >= 8 ? '#166534' : route.safetyRating >= 6 ? '#854d0e' : '#991b1b'
                        }}
                      >
                        {route.safetyRating}/10
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center mb-3">
                      <div>
                        <p className="text-lg font-semibold" style={{ color: '#3b82f6' }}>
                          {route.distanceKm} km
                        </p>
                        <p className="text-xs" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Distance</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold" style={{ color: '#3b82f6' }}>
                          {route.estimatedTimeMinutes} min
                        </p>
                        <p className="text-xs" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Duration</p>
                      </div>
                      <div>
                        <p className={`text-lg font-semibold ${
                          route.safetyRating >= 8 ? 'text-green-600' : 
                          route.safetyRating >= 6 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {route.safetyRating}
                        </p>
                        <p className="text-xs" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Safety</p>
                      </div>
                    </div>
                    {route.description && (
                      <div className="mb-2 text-xs" style={{ color: isDark ? '#94a3b8' : '#4b5563' }}>
                        {route.description}
                      </div>
                    )}
                    {selectedRoute?.id === route.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startBackendNavigation(route);
                        }}
                        className="w-full font-bold py-2 rounded-lg transition shadow-md text-sm mt-2"
                        style={{
                          backgroundColor: '#3b82f6',
                          color: '#ffffff'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
                      >
                        Start Navigation
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Backend Routes - Below Map */}
        {backendRoutes.length > 0 && (
          <section className="md:hidden max-w-6xl mx-auto py-6 rounded-2xl shadow-lg mt-6" style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff' }}>
            <h2 className="text-xl font-bold text-center mb-4 px-4" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
              🛡️ Suggested Routes
            </h2>
            <div className="space-y-3 px-4">
              {[...backendRoutes]
                .sort((a, b) => b.safetyRating - a.safetyRating)
                .map((route) => (
                  <div
                    key={route.id}
                    className="rounded-xl p-4 shadow-md cursor-pointer"
                    style={{
                      backgroundColor: isDark ? '#334155' : '#f9fafb',
                      border: `2px solid ${selectedRoute?.id === route.id ? '#3b82f6' : (isDark ? '#475569' : '#e5e7eb')}`
                    }}
                    onClick={() => setSelectedRoute(route)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🛡️</span>
                        <div>
                          <h3 className="text-base font-bold" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                            {route.name}
                          </h3>
                          <p className="text-xs capitalize" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>
                            {route.difficulty} route
                          </p>
                        </div>
                      </div>
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: route.safetyRating >= 8 ? '#dcfce7' : route.safetyRating >= 6 ? '#fef9c3' : '#fee2e2',
                          color: route.safetyRating >= 8 ? '#166534' : route.safetyRating >= 6 ? '#854d0e' : '#991b1b'
                        }}
                      >
                        {route.safetyRating}/10
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center mb-3">
                      <div>
                        <p className="text-lg font-semibold" style={{ color: '#3b82f6' }}>
                          {route.distanceKm} km
                        </p>
                        <p className="text-xs" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Distance</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold" style={{ color: '#3b82f6' }}>
                          {route.estimatedTimeMinutes} min
                        </p>
                        <p className="text-xs" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Duration</p>
                      </div>
                      <div>
                        <p className={`text-lg font-semibold ${
                          route.safetyRating >= 8 ? 'text-green-600' : 
                          route.safetyRating >= 6 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {route.safetyRating}
                        </p>
                        <p className="text-xs" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Safety</p>
                      </div>
                    </div>
                    {route.description && (
                      <div className="mb-2 text-xs" style={{ color: isDark ? '#94a3b8' : '#4b5563' }}>
                        {route.description}
                      </div>
                    )}
                    {selectedRoute?.id === route.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startBackendNavigation(route);
                        }}
                        className="w-full font-bold py-2 rounded-lg transition shadow-md text-sm mt-2"
                        style={{
                          backgroundColor: '#3b82f6',
                          color: '#ffffff'
                        }}
                      >
                        Start Navigation
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>
    </ProtectedRoute>
  );
}

export default function SuggestedRoutes() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06d6a0] mx-auto mb-4"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading route planner...</p>
        </div>
      </div>
    }>
      <SuggestedRoutesContent />
    </Suspense>
  );
}