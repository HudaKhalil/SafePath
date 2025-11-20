"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { geocodingService, routingService } from "../../lib/services";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import AddressAutocomplete from "../../components/AddressAutocomplete";
import { LOCATION_CONFIG } from "../../lib/locationConfig";

const Map = dynamic(() => import("../../components/Map"), { ssr: false });

export default function SuggestedRoutes() {
  const [mapKey, setMapKey] = useState(0);
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
  const [showRouting, setShowRouting] = useState(false);
  const [backendRoutes, setBackendRoutes] = useState([]);
  const [backendLoading, setBackendLoading] = useState(false);
  const [mapZoom, setMapZoom] = useState(14);
  const resultsRef = useRef(null);

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

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => setUserLocation(LOCATION_CONFIG.DEFAULT_CENTER)
      );
    } else setUserLocation(LOCATION_CONFIG.DEFAULT_CENTER);
  };

  const handleFromLocationChange = (value, locationData) => {
    setFromLocation(value);
    if (locationData) setFromCoords([locationData.lat, locationData.lon]);
  };

  const handleToLocationChange = (value, locationData) => {
    setToLocation(value);
    if (locationData) setToCoords([locationData.lat, locationData.lon]);
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
         mode: transportMode
       })
     });

     if (!response.ok) {
       throw new Error(`API returned ${response.status}: ${response.statusText}`);
     }

     const result = await response.json();

     if (result.success && result.data) {
       const { fastest, safest } = result.data;
       
       console.log('🚀 Route data received from API:');
       console.log('Fastest route coordinates:', fastest.coordinates?.length, 'points');
       console.log('Safest route coordinates:', safest.coordinates?.length, 'points');
       console.log('Sample fastest coords:', fastest.coordinates?.slice(0, 3));
       console.log('Sample safest coords:', safest.coordinates?.slice(0, 3));
       
       const formattedRoutes = [
         {
           id: 'fastest',
           name: 'Fastest Route',
           type: 'fastest',
           color: '#3b82f6',
           coordinates: fastest.coordinates || [],
           distance: fastest.distance,
           estimatedTime: fastest.time,
           safetyRating: (1 - fastest.safetyScore) * 10,
           safetyScore: fastest.safetyScore,
           instructions: fastest.instructions || [],
           provider: result.provider
         },
         {
           id: 'safest',
           name: 'Safest Route',
           type: 'safest',
           color: '#10b981',
           coordinates: safest.coordinates || [],
           distance: safest.distance,
           estimatedTime: safest.time,
           safetyRating: (1 - safest.safetyScore) * 10,
           safetyScore: safest.safetyScore,
           instructions: safest.instructions || [],
           provider: result.provider
         }
       ];

       console.log('📍 Formatted routes:', formattedRoutes.map(r => ({
         id: r.id,
         coordinatesCount: r.coordinates.length,
         firstCoord: r.coordinates[0],
         lastCoord: r.coordinates[r.coordinates.length - 1]
       })));

       setRoutes(formattedRoutes);
       setShowRouting(false);
     } else {
       setError(result.message || "Failed to find routes");
     }
   } catch (error) {
     console.error("Route finding error:", error);
     setError("Failed to find routes. Please try again.");
   } finally {
     setLoading(false);
   }
 };

 const handleAutoFindRoutes = async () => {
  if (!fromCoords || !toCoords) return

  setLoading(true)
  setError('')

  try {
    const routeResult = await routingService.getRoute(
      fromCoords[0],
      fromCoords[1],
      toCoords[0],
      toCoords[1],
      transportMode
    )

    if (routeResult.success) {
      const formattedRoute = {
        id: Date.now(),
        name: transportMode === 'cycling' ? 'Cycling Route' : 'Walking Route',
        type: 'balanced',
        color: '#3b82f6',
        coordinates: routeResult.coordinates,
        distance: (routeResult.distance / 1000).toFixed(2),
        estimatedTime: Math.round(routeResult.duration / 60),
        safetyRating: 8,
        instructions: routeResult.instructions || [],
      }

      setRoutes([formattedRoute])
      setShowRouting(true)
    } else {
      setError(routeResult.message || 'Failed to find route')
    }
  } catch (error) {
    console.error('Auto route finding error:', error)
    setError('Failed to find route automatically.')
  } finally {
    setLoading(false)
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
        setTimeout(() => handleAutoFindRoutes(), 500);
      } else {
        setToLocation(addressText);
        setToCoords(coords);
        console.log('✓ Updated TO location');
        setTimeout(() => handleAutoFindRoutes(), 500);
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
    
      <div className="min-h-screen" style={{ background: 'var(--bg-body)' }}>
      
        <div className="text-center pt-12 pb-8">
       
          <h1 className="text-4xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Find the <span style={{ color: '#06d6a0' }}>Safest Route</span>
          </h1>
         
          <p className="mt-2" style={{ color: 'var(--color-text-primary)', opacity: 0.8 }}>
            Click on map or use the search form to plan your route
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-6 pb-20 grid lg:grid-cols-5 gap-8">
       
          <div className="lg:col-span-2">
            <div className="p-6 rounded-2xl shadow-xl h-fit sticky top-24" style={{ backgroundColor: '#ffffff' }}>
              <form onSubmit={handleFindRoutes} className="space-y-6">
                <AddressAutocomplete
                  value={fromLocation}
                  onChange={handleFromLocationChange}
                  placeholder="Enter starting location"
                  icon="from"
                />
                <AddressAutocomplete
                  value={toLocation}
                  onChange={handleToLocationChange}
                  placeholder="Enter destination"
                  icon="to"
                />

                <div className="flex justify-center gap-6 py-2">
                  <label className="flex items-center gap-2 cursor-pointer" style={{ color: '#0f172a' }}>
                    <input
                      type="radio"
                      name="mode"
                      value="walking"
                      checked={transportMode === "walking"}
                      onChange={(e) => setTransportMode(e.target.value)}
                    />
                    🚶 Walking
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer" style={{ color: '#0f172a' }}>
                    <input
                      type="radio"
                      name="mode"
                      value="cycling"
                      checked={transportMode === "cycling"}
                      onChange={(e) => setTransportMode(e.target.value)}
                    />
                    🚴 Cycling
                  </label>
                </div>

               
                <button
                  type="submit"
                  className="w-full font-bold py-3 rounded-lg transition shadow-md"
                  style={{
                    backgroundColor: '#06d6a0',
                    color: '#0f172a'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#06d6a0'}
                >
                  🔍 Find Routes
                </button>
              </form>
            </div>
          </div>

        
          <div className="lg:col-span-3">
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10" style={{ backgroundColor: '#ffffff' }}>
              <div className="bg-gradient-to-br from-primary-dark via-primary to-slate-700 p-4">
                <div className="text-center mb-3">
                  <div className="flex items-center justify-center gap-3 mb-2">
           
                    <p className="text-sm font-medium" style={{ color: '#ffffff' }}>
                      {!fromCoords
                        ? "📍 Click on map to set starting point"
                        : !toCoords
                        ? "🎯 Click on map to set destination"
                        : "✓ Both points selected - click again to change destination"}
                    </p>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        const londonCenter = [51.5074, -0.1278];
                        setUserLocation(londonCenter);
                        setMapKey((prev) => prev + 1);
                        const originalText = e.target.textContent;
                        e.target.textContent = '✓ Set to London';
                        e.target.classList.add('bg-green-500');
                        setTimeout(() => {
                          e.target.textContent = originalText;
                          e.target.classList.remove('bg-green-500');
                        }, 1500);
                      }}
                      className="text-xs px-3 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1.5 backdrop-blur-sm border shadow-lg"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                        borderColor: 'rgba(255, 255, 255, 0.3)'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                      title="Set current location to London for testing"
                    >
                      <span className="text-base">🇬🇧</span>
                      <span className="font-medium">Set to London</span>
                    </button>
                  </div>
                  {(backendRoutes.length > 0 || routes.length > 0 || (fromCoords && toCoords)) && (
                    <div className="flex justify-center mb-4">
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setBackendRoutes([]);
                          setRoutes([]);
                          setFromLocation("");
                          setToLocation("");
                          setFromCoords(null);
                          setToCoords(null);
                          setShowRouting(false);
                          setSelectedRoute(null);
                          setMapKey((prev) => prev + 1);
                        }}
                        className="underline transition cursor-pointer text-lg"
                        style={{ color: '#ffffff' }}
                        onMouseEnter={(e) => e.target.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.target.style.color = '#ffffff'}
                      >
                        Clear Selection
                      </a>
                    </div>
                  )}
                </div>
                <div className="rounded-xl overflow-hidden">
                  {!loading && (
                    <Map
                      key={mapKey}
                      center={
                        selectedRoute?.coordinates?.[0] ||
                        fromCoords ||
                        userLocation ||
                        LOCATION_CONFIG.DEFAULT_CENTER
                      }
                      zoom={mapZoom}
                      routes={[
                        ...routes.map((r) => ({
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
                      height="600px"
                      fromCoords={fromCoords}
                      toCoords={toCoords}
                      showRouting={false}
                      transportMode={transportMode}
                      autoFitBounds={true}
                      onPlaceSelect={
                        routes.length === 0 ? handleMapPlaceSelect : null
                      }
                    />
                  )}
                  {loading && (
                    <div className="bg-gray-100 rounded-lg h-[600px] flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-accent mx-auto mb-3"></div>
                        <p>Loading map...</p>
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

        {routes.length > 0 && (
          <section ref={resultsRef} className="max-w-6xl mx-auto py-8 rounded-2xl shadow-lg mt-8" style={{ backgroundColor: '#ffffff' }}>
            <h2 className="text-2xl font-bold text-center mb-6" style={{ color: '#0f172a' }}>
              Route Comparison
            </h2>
            <div className="grid md:grid-cols-2 gap-6 px-6">
              {routes.map((route) => (
                <div
                  key={route.id}
                  className={`bg-gray-50 rounded-xl p-6 shadow-md border-2 ${
                    route.type === 'fastest' ? 'border-blue-500' : 'border-green-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {route.type === 'fastest' ? '⚡' : '🛡️'}
                      </span>
                      <div>
                        <h3 className="text-xl font-bold" style={{ color: '#0f172a' }}>
                          {route.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {route.type === 'fastest' ? 'Quickest path' : 'Safest path'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-gray-600 font-medium">Distance</span>
                      <span className="text-xl font-bold text-blue-600">
                        {route.distance} km
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-gray-600 font-medium">Time</span>
                      <span className="text-xl font-bold text-blue-600">
                        {route.estimatedTime} min
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-gray-600 font-medium">Safety Score</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              route.safetyRating >= 7 ? 'bg-green-500' : 
                              route.safetyRating >= 5 ? 'bg-yellow-500' : 
                              'bg-red-500'
                            }`}
                            style={{ width: `${route.safetyRating * 10}%` }}
                          />
                        </div>
                        <span className={`text-xl font-bold ${
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
                    onClick={() => startNavigation(route)}
                    className={`w-full font-bold py-3 rounded-lg transition shadow-md ${
                      route.type === 'fastest' 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    Start {route.type === 'fastest' ? 'Fastest' : 'Safest'} Route
                  </button>
                </div>
              ))}
            </div>

            {routes.length === 2 && (
              <div className="mt-6 px-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-bold text-blue-900 mb-2">Route Analysis</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>
                      • The safest route is {((routes[1].distance / routes[0].distance - 1) * 100).toFixed(0)}% longer 
                      but {((routes[0].safetyRating / routes[1].safetyRating - 1) * 100).toFixed(0)}% safer
                    </p>
                    <p>
                      • Time difference: {Math.abs(routes[0].estimatedTime - routes[1].estimatedTime).toFixed(1)} minutes
                    </p>
                    <p>
                      • Safety scores are based on crime data, lighting conditions, and historical hazard reports
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {routes.length > 0 && routes[0].fallback && (
          <div className="max-w-4xl mx-auto bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mt-6">
            Warning: Route is a straight line (fallback). Real road routing is unavailable. Distance may not be accurate.
          </div>
        )}

       
        {backendRoutes.length > 0 && (
          <section className="max-w-6xl mx-auto py-8 rounded-2xl shadow-lg mt-8" style={{ backgroundColor: '#ffffff' }}>
            <h2 className="text-2xl font-bold text-center mb-6" style={{ color: '#0f172a' }}>
              🛡️ Suggested Routes
            </h2>
            <div className="space-y-4 px-6">
              {[...backendRoutes]
                .sort((a, b) => b.safetyRating - a.safetyRating)
                .map((route) => (
                  <div
                    key={route.id}
                    className={`bg-gray-50 rounded-xl p-6 shadow-md cursor-pointer ${selectedRoute?.id === route.id ? 'ring-2 ring-blue-500' : ''}`}
                    onClick={() => setSelectedRoute(route)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🛡️</span>
                        <div>
                          <h3 className="text-lg font-bold" style={{ color: '#0f172a' }}>
                            {route.name}
                          </h3>
                          <p className="text-sm text-gray-500 capitalize">
                            {route.difficulty} route
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getSafetyBadgeColor(
                          route.safetyRating
                        )}`}
                      >
                        Safety: {route.safetyRating}/10
                      </span>
                    </div>
                    <div className="grid grid-cols-3 text-center mb-4">
                      <div>
                        <p className="text-xl font-semibold text-blue-600">
                          {route.distanceKm} km
                        </p>
                        <p className="text-sm text-gray-500">Distance</p>
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-blue-600">
                          {route.estimatedTimeMinutes} min
                        </p>
                        <p className="text-sm text-gray-500">Duration</p>
                      </div>
                      <div>
                        <p
                          className={`text-xl font-semibold ${getSafetyColor(
                            route.safetyRating
                          )}`}
                        >
                          {route.safetyRating}
                        </p>
                        <p className="text-sm text-gray-500">Safety</p>
                      </div>
                    </div>
                    {route.description && (
                      <div className="mb-2 text-gray-700 text-sm">
                        {route.description}
                      </div>
                    )}
                    <div className="pt-4 border-t border-gray-200 flex flex-col items-center gap-2">
                      {selectedRoute?.id === route.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startBackendNavigation(route);
                          }}
                          className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition shadow-md"
                        >
                          Start Navigation
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>
    </ProtectedRoute>
  );
}