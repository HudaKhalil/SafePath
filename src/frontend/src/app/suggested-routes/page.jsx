"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { geocodingService, routingService } from "../../lib/services";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import AddressAutocomplete from "../../components/AddressAutocomplete";
import RoutesSheet from "../../components/RoutesSheet";
import { LOCATION_CONFIG } from "../../lib/locationConfig";

const Map = dynamic(() => import("../../components/Map"), { ssr: false });

export default function SuggestedRoutes() {
  const [mapKey, setMapKey] = useState(0);
  const [mapCenter, setMapCenter] = useState(null);
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
  const [showSuccessToast, setShowSuccessToast] = useState(false);

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

  useEffect(() => {
    if (routes.length > 0 || backendRoutes.length > 0) {
      // Show toast notification
      setShowSuccessToast(true);
      
      // Don't scroll - let user see routes on map and cards are visible below
      // If on mobile, user can scroll down manually to see cards
      
      // Hide toast after 4 seconds
      setTimeout(() => {
        setShowSuccessToast(false);
      }, 4000);
    }
  }, [routes.length, backendRoutes.length]);

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
      const coords = [locationData.lat, locationData.lon];
      setFromCoords(coords);
      // Center map on selected location and zoom in
      setMapCenter(coords);
      setMapZoom(15);
      setMapKey((prev) => prev + 1);
    }
  };

  const handleToLocationChange = (value, locationData) => {
    setToLocation(value);
    if (locationData) {
      const coords = [locationData.lat, locationData.lon];
      setToCoords(coords);
      // Center map on selected location and zoom in
      setMapCenter(coords);
      setMapZoom(15);
      setMapKey((prev) => prev + 1);
    }
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
    
      {/* Success Toast Notification */}
      {showSuccessToast && (
        <div 
          className="fixed top-24 left-1/2 transform -translate-x-1/2 z-9999 animate-slide-down"
          style={{
            backgroundColor: '#f0fdf4',
            border: '2px solid #06d6a0',
            boxShadow: '0 10px 40px rgba(6, 214, 160, 0.3)'
          }}
        >
          <div className="px-6 py-4 rounded-xl flex items-center gap-3">
            <span className="text-2xl">✓</span>
            <div>
              <h3 className="font-bold text-lg" style={{ color: '#0f172a' }}>Routes Found!</h3>
              <p className="text-sm" style={{ color: '#64748b' }}>
                {backendRoutes.length > 0 ? `${backendRoutes.length} routes` : `${routes.length} routes`} available on map. Scroll down to compare details.
              </p>
            </div>
          </div>
        </div>
      )}
    
      <div className="min-h-screen" style={{ backgroundColor: '#ffffff' }}>
      
        <div className="text-center pt-6 pb-3 md:pt-12 md:pb-8">
       
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--color-primary)' }}>
            Find the <span style={{ color: '#06d6a0' }}>Safest Route</span>
          </h1>
         
          <p className="mt-2" style={{ color: 'var(--color-text-primary)', opacity: 0.8 }}>
            Click on map or use the search form to plan your route
          </p>
        </div>

        <div className="relative w-full" style={{ height: 'calc(100vh - 230px)' }}>
          {/* Floating search card - desktop only */}
          <div className="hidden md:block absolute top-4 left-4 z-1000 w-96">
            <div className="p-4 rounded-2xl shadow-2xl" style={{ backgroundColor: '#ffffff' }}>
              <div className="flex justify-end mb-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    const londonCenter = [51.5074, -0.1278];
                    setUserLocation(londonCenter);
                    setMapCenter(londonCenter);
                    setMapZoom(13);
                    setMapKey((prev) => prev + 1);
                    const originalText = e.target.textContent;
                    e.target.textContent = '✓ Set to London';
                    e.target.style.backgroundColor = '#10b981';
                    setTimeout(() => {
                      e.target.textContent = originalText;
                      e.target.style.backgroundColor = '#06d6a0';
                    }, 1500);
                  }}
                  className="text-xs px-3 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1.5 border shadow-md"
                  style={{
                    backgroundColor: '#06d6a0',
                    color: '#0f172a',
                    borderColor: '#059669'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#06d6a0'}
                  title="Set current location to London for testing"
                >
                  <span className="text-base">🇬🇧</span>
                  <span className="font-medium">Set to London</span>
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

                <div className="flex justify-center gap-4 py-1">
                  <button
                    type="button"
                    onClick={() => setTransportMode("walking")}
                    className="relative group transition-all duration-200"
                    title="Walking"
                  >
                    <div 
                      className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200"
                      style={{
                        backgroundColor: transportMode === "walking" ? '#1e293b' : '#e2e8f0',
                        color: transportMode === "walking" ? '#ffffff' : '#94a3b8'
                      }}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="currentColor"
                        className="w-7 h-7"
                      >
                        <path d="M13.5 5.5c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/>
                      </svg>
                    </div>
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                      Walking
                    </span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setTransportMode("cycling")}
                    className="relative group transition-all duration-200"
                    title="Cycling"
                  >
                    <div 
                      className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200"
                      style={{
                        backgroundColor: transportMode === "cycling" ? '#1e293b' : '#e2e8f0',
                        color: transportMode === "cycling" ? '#ffffff' : '#94a3b8'
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
                        className="w-7 h-7"
                      >
                        <circle cx="18.5" cy="17.5" r="3.5"/>
                        <circle cx="5.5" cy="17.5" r="3.5"/>
                        <circle cx="15" cy="5" r="1"/>
                        <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
                      </svg>
                    </div>
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                      Cycling
                    </span>
                  </button>
                </div>

                <button
                  id="find-routes-btn"
                  type="submit"
                  className="w-full font-bold py-2.5 rounded-lg transition shadow-md text-sm"
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

          {/* Mobile Routes Sheet - visible on mobile only */}
          <div className="md:hidden">
            <RoutesSheet
              title="Plan Your Route"
              subtitle="Find the safest path"
              initialExpanded={false}
              minHeight={160}
              maxHeight={520}
            >
              <div className="space-y-2 pb-2">
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTransportMode("walking")}
                      className="relative group transition-all duration-200"
                      title="Walking"
                    >
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
                        style={{
                          backgroundColor: transportMode === "walking" ? '#1e293b' : '#e2e8f0',
                          color: transportMode === "walking" ? '#ffffff' : '#94a3b8'
                        }}
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 24 24" 
                          fill="currentColor"
                          className="w-5 h-5"
                        >
                          <path d="M13.5 5.5c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/>
                        </svg>
                      </div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setTransportMode("cycling")}
                      className="relative group transition-all duration-200"
                      title="Cycling"
                    >
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
                        style={{
                          backgroundColor: transportMode === "cycling" ? '#1e293b' : '#e2e8f0',
                          color: transportMode === "cycling" ? '#ffffff' : '#94a3b8'
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
                          className="w-5 h-5"
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
                      const originalText = e.target.textContent;
                      e.target.textContent = '✓ Set to London';
                      e.target.style.backgroundColor = '#10b981';
                      setTimeout(() => {
                        e.target.textContent = originalText;
                        e.target.style.backgroundColor = '#06d6a0';
                      }, 1500);
                    }}
                    className="text-xs px-3 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1.5 border shadow-md"
                    style={{
                      backgroundColor: '#06d6a0',
                      color: '#0f172a',
                      borderColor: '#059669'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#06d6a0'}
                    title="Set current location to London for testing"
                  >
                    <span className="text-base">🇬🇧</span>
                    <span className="font-medium">Set to London</span>
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

                  <button
                    type="submit"
                    className="w-full font-bold py-2.5 rounded-lg transition shadow-md text-sm"
                    style={{
                      backgroundColor: '#06d6a0',
                      color: '#0f172a'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#06d6a0'}
                  >
                    🔍 Find Routes
                  </button>

                  {(backendRoutes.length > 0 || routes.length > 0) && (
                    <div className="text-center mt-2">
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
                        className="text-sm underline transition-colors"
                        style={{ color: '#64748b' }}
                        onMouseEnter={(e) => e.target.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.target.style.color = '#64748b'}
                      >
                        ✕ Clear & Start Over
                      </a>
                    </div>
                  )}
                </form>
              </div>
            </RoutesSheet>
          </div>

          {/* Full screen map */}
          <div className="w-full h-full">
            <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: '#1e293b' }}>
              <div className="bg-linear-to-br from-primary-dark via-primary to-slate-700 p-3">
                <div className="flex items-center justify-center gap-4 relative">
                  <p className="text-sm font-medium" style={{ color: '#ffffff' }}>
                    {!fromCoords
                      ? "📍 Click on map to set starting point"
                      : !toCoords
                      ? "🎯 Click on map to set destination"
                      : "✓ Both points selected - click again to change destination"}
                  </p>
                  
                  {(backendRoutes.length > 0 || routes.length > 0 || (fromCoords && toCoords)) && (
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
                      className="underline transition cursor-pointer text-sm absolute right-0"
                      style={{ color: '#ffffff' }}
                      onMouseEnter={(e) => e.target.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.target.style.color = '#ffffff'}
                    >
                      Clear
                    </a>
                  )}
                </div>
                <div className="overflow-hidden" style={{ height: 'calc(100vh - 320px)' }}>
                  {!loading && (
                    <Map
                      key={mapKey}
                      center={
                        mapCenter ||
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
                      height="100%"
                      fromCoords={fromCoords}
                      toCoords={toCoords}
                      showRouting={false}
                      transportMode={transportMode}
                      autoFitBounds={false}
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