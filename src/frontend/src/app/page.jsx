'use client'

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Cookies from 'js-cookie';
import { geocodingService, routingService } from '../lib/services';

const Map = dynamic(() => import('../components/Map'), { ssr: false });

function Section({ className = "", ...props }) {
  return <section className={`relative ${className}`} {...props} />;
}

export default function Home() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  
  // Initialize location from localStorage or default to London
  const [userLocation, setUserLocation] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('userLocation');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return [51.5074, -0.1278];
        }
      }
    }
    return [51.5074, -0.1278];
  });
  
  const [userAddress, setUserAddress] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userAddress') || 'Current Location';
    }
    return 'Current Location';
  });
  
  const [searchDestination, setSearchDestination] = useState('');
  const [searchedLocation, setSearchedLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('userLocation');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return [51.5074, -0.1278];
        }
      }
    }
    return [51.5074, -0.1278];
  });
  const [mapZoom, setMapZoom] = useState(13);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [nearbyHazards, setNearbyHazards] = useState([]);
  const skipAutocomplete = useRef(false);

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

  // Debounced autocomplete search
  useEffect(() => {
    if (!searchDestination.trim() || searchDestination.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      skipAutocomplete.current = false;
      return;
    }

    // Skip autocomplete if a selection was just made
    if (skipAutocomplete.current) {
      skipAutocomplete.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const response = await geocodingService.searchLocations(searchDestination, { limit: 5 });
        if (response.success && response.data?.locations) {
          setSuggestions(response.data.locations);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Autocomplete error:', error);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchDestination]);

  // Get user's current location
  useEffect(() => {
    // Reset to clean state when returning to homepage
    setSearchDestination('');
    setSearchedLocation(null);
    setRouteData(null);
    setSuggestions([]);
    setShowSuggestions(false);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const currentLocation = [position.coords.latitude, position.coords.longitude];
          
          // Save to localStorage
          localStorage.setItem('userLocation', JSON.stringify(currentLocation));
          
          setUserLocation(currentLocation);
          // Update map center to current location
          setMapCenter(currentLocation);
          setMapZoom(13);
          
          // Get address for current location
          try {
            const response = await geocodingService.getAddressFromCoords(
              position.coords.latitude,
              position.coords.longitude
            );
            if (response.success && response.data?.display_name) {
              localStorage.setItem('userAddress', response.data.display_name);
              setUserAddress(response.data.display_name);
            }
          } catch (error) {
            console.log('Could not get address for current location');
          }
          
          // Fetch nearby hazards within 10km
          fetchNearbyHazards(currentLocation[0], currentLocation[1]);
        },
        (error) => {
          console.log('Geolocation error:', error.message);
          // Don't reset to London - keep the existing location from localStorage
          // Still fetch hazards for stored location
          const storedLocation = localStorage.getItem('userLocation');
          if (storedLocation) {
            try {
              const loc = JSON.parse(storedLocation);
              fetchNearbyHazards(loc[0], loc[1]);
            } catch (e) {
              console.log('Could not parse stored location');
            }
          }
        },
        {
          timeout: 10000,
          enableHighAccuracy: true,
          maximumAge: 60000
        }
      );
    }
  }, []);

  // Fetch nearby hazards within 5km radius
  const fetchNearbyHazards = async (latitude, longitude) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      console.log('🔍 Fetching hazards near:', latitude, longitude);
      const response = await fetch(`${API_URL}/hazards/near/${latitude}/${longitude}?radius=5000&limit=100`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Hazards API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Hazards data received:', data);
        if (data.success && data.data && data.data.hazards && Array.isArray(data.data.hazards)) {
          console.log('✅ Setting', data.data.hazards.length, 'hazards');
          setNearbyHazards(data.data.hazards);
        } else {
          console.log('⚠️ Data format invalid or empty');
          setNearbyHazards([]);
        }
      } else {
        console.log('❌ API response not OK');
        setNearbyHazards([]);
      }
    } catch (error) {
      console.log('❌ Error fetching hazards:', error);
      setNearbyHazards([]);
    }
  };

  const handleProtectedAction = (e, path) => {
    e.preventDefault();
    const token = Cookies.get('auth_token');
    
    if (!token) {
      // Not authenticated, redirect to login
      router.push('/auth/login');
    } else {
      // Authenticated, navigate to requested page
      router.push(path);
    }
  };

  const handleSuggestionClick = async (location) => {
    const newLocation = [parseFloat(location.lat), parseFloat(location.lon)];
    
    // Immediately hide suggestions and prevent them from showing again
    setShowSuggestions(false);
    setSuggestions([]);
    skipAutocomplete.current = true;
    
    // Update search and map to show destination
    setSearchDestination(location.display_name);
    setSearchedLocation({
      position: newLocation,
      name: location.display_name
    });
    setMapCenter(newLocation);
    setMapZoom(15);
    
    // Fetch and display route from current location to destination
    try {
      const route = await routingService.getRoute(
        userLocation[0],
        userLocation[1],
        newLocation[0],
        newLocation[1],
        'walking'
      );
      
      if (route.success && route.coordinates) {
        setRouteData({
          coordinates: route.coordinates,
          distance: route.distance,
          duration: route.duration
        });
        
        // Adjust map to show full route
        const bounds = [[userLocation[0], userLocation[1]], newLocation];
        setMapCenter([
          (userLocation[0] + newLocation[0]) / 2,
          (userLocation[1] + newLocation[1]) / 2
        ]);
        setMapZoom(13);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  const handleMapClick = async (latlng) => {
    // When user clicks on map, show location marker and update search field
    const newLocation = [latlng.lat, latlng.lng];
    
    // Reverse geocode to get location name
    try {
      const response = await geocodingService.getAddressFromCoords(latlng.lat, latlng.lng);
      if (response.success && response.data?.display_name) {
        setSearchedLocation({
          position: newLocation,
          name: response.data.display_name
        });
        setSearchDestination(response.data.display_name);
      } else {
        // Fallback if reverse geocoding fails
        setSearchedLocation({
          position: newLocation,
          name: `Location: ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`
        });
        setSearchDestination(`${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      // Fallback to coordinates
      setSearchedLocation({
        position: newLocation,
        name: `Location: ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`
      });
      setSearchDestination(`${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`);
    }
    
    setMapCenter(newLocation);
    setMapZoom(15);
    
    // Fetch and display route from current location to clicked location
    try {
      const route = await routingService.getRoute(
        userLocation[0],
        userLocation[1],
        newLocation[0],
        newLocation[1],
        'walking'
      );
      
      if (route.success && route.coordinates) {
        setRouteData({
          coordinates: route.coordinates,
          distance: route.distance,
          duration: route.duration
        });
        
        // Adjust map to show full route
        setMapCenter([
          (userLocation[0] + newLocation[0]) / 2,
          (userLocation[1] + newLocation[1]) / 2
        ]);
        setMapZoom(13);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };
  return (
    <main style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', minHeight: '100vh' }} className="w-full">
      <Section className="overflow-visible pt-4 sm:pt-4 md:pt-6 lg:pt-8 pb-20 sm:pb-16 md:pb-8 lg:pb-8 mb-0">
        <div className="container mx-auto max-w-5xl px-3 sm:px-4 md:px-6 lg:px-8 animate-fadeIn w-full mb-0">
          {/* New Layout for MD and larger screens */}
          <div className="hidden md:block">
            {/* Title */}
            <div className="text-center mb-4 sm:mb-5 lg:mb-6">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight" style={{ color: isDark ? '#f8fafc' : '#1e293b' }}>
                Find Your <span style={{ color: '#06d6a0' }}>Safer</span> Way
              </h1>
              <h2 className="mt-2 sm:mt-3 text-sm sm:text-base md:text-lg lg:text-xl" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
                Safer journeys for walkers &amp; cyclists
              </h2>
            </div>

            {/* Quick Actions */}
            <div className="mb-4 sm:mb-5 lg:mb-6 flex gap-3 sm:gap-4 max-w-2xl mx-auto">
              <button
                onClick={(e) => handleProtectedAction(e, '/suggested-routes')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = isDark ? '2px solid #ffffff' : '2px solid #1e293b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = 'none';
                }}
                title="Plan a safe journey with suggested routes"
                className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 rounded-full font-semibold text-sm sm:text-base transition-all duration-200 hover:scale-[1.02]"
                style={{
                  backgroundColor: isDark ? '#06d6a0' : '#06d6a0',
                  color: '#0f172a'
                }}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Go Safe
              </button>
              <button
                onClick={(e) => handleProtectedAction(e, '/report-hazards')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = isDark ? '2px solid #ffffff' : '2px solid #1e293b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = 'none';
                }}
                title="Report hazards to help keep others safe"
                className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 rounded-full font-semibold text-sm sm:text-base transition-all duration-200 hover:scale-[1.02]"
                style={{
                  backgroundColor: isDark ? '#ef4444' : '#ef4444',
                  color: '#ffffff'
                }}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Report Hazard
              </button>
            </div>

            {/* Search Bar */}
            <div className="mb-3 sm:mb-4 max-w-2xl mx-auto relative">
              {/* Search bar - Continue from above */}
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!searchDestination.trim()) return;
                  
                  // Check authentication
                  const token = Cookies.get('auth_token');
                  if (!token) {
                    router.push('/auth/login');
                    return;
                  }
                  
                  // Always fetch current location address to ensure we have the real address
                  let fromAddress = userAddress;
                  try {
                    const addressResponse = await geocodingService.getAddressFromCoords(userLocation[0], userLocation[1]);
                    if (addressResponse.success && addressResponse.data?.display_name) {
                      fromAddress = addressResponse.data.display_name;
                    }
                  } catch (error) {
                    console.log('Could not get address for current location');
                  }
                  
                  // Check if we already have the searched location (route already drawn)
                  if (searchedLocation && searchedLocation.position) {
                    // Use the already-found location
                    router.push(`/suggested-routes?fromLat=${userLocation[0]}&fromLng=${userLocation[1]}&fromAddress=${encodeURIComponent(fromAddress)}&toLat=${searchedLocation.position[0]}&toLng=${searchedLocation.position[1]}&toAddress=${encodeURIComponent(searchedLocation.name)}&mode=walk`);
                    return;
                  }
                  
                  // Otherwise, geocode the destination and redirect to suggested-routes
                  try {
                    const response = await geocodingService.searchLocations(searchDestination, { limit: 1 });
                    if (response.success && response.data?.locations && response.data.locations.length > 0) {
                      const location = response.data.locations[0];
                      const newLocation = [parseFloat(location.lat), parseFloat(location.lon)];
                      
                      // Navigate to suggested-routes with pre-filled data
                      router.push(`/suggested-routes?fromLat=${userLocation[0]}&fromLng=${userLocation[1]}&fromAddress=${encodeURIComponent(fromAddress)}&toLat=${newLocation[0]}&toLng=${newLocation[1]}&toAddress=${encodeURIComponent(location.display_name)}&mode=walk`);
                    } else {
                      alert('Could not find that location. Please try again.');
                    }
                  } catch (error) {
                    console.error('Geocoding error:', error);
                    alert('Error finding location. Please try again.');
                  }
                }} className="relative">
                  {/* Search Icon */}
                  <svg 
                    className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 z-10" 
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  
                  <input
                    type="text"
                    value={searchDestination}
                    onChange={(e) => setSearchDestination(e.target.value)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="Where do you want to go?"
                    className="w-full pl-10 sm:pl-12 pr-12 sm:pr-14 py-3 sm:py-3.5 rounded-full shadow-lg transition-all duration-200 focus:outline-none text-sm sm:text-base"
                    style={{
                      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                      color: isDark ? '#ffffff' : '#0f172a',
                      border: isDark ? '2px solid #06d6a0' : '2px solid #0f172a'
                    }}
                  />
                  
                  {/* Search Submit Button */}
                  <button
                    type="submit"
                    disabled={!searchDestination.trim()}
                    className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 rounded-full transition-all duration-200"
                    style={{
                      backgroundColor: searchDestination.trim() ? '#06d6a0' : (isDark ? '#334155' : '#e2e8f0'),
                      cursor: searchDestination.trim() ? 'pointer' : 'not-allowed',
                      opacity: searchDestination.trim() ? 1 : 0.5
                    }}
                    onMouseEnter={(e) => {
                      if (searchDestination.trim()) {
                        e.target.style.backgroundColor = '#059669';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (searchDestination.trim()) {
                        e.target.style.backgroundColor = '#06d6a0';
                      }
                    }}
                  >
                    <svg 
                      className="w-4 sm:w-5 h-4 sm:h-5" 
                      style={{ color: searchDestination.trim() ? '#0f172a' : (isDark ? '#64748b' : '#94a3b8') }}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </form>

                {/* Autocomplete Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <div 
                    className="absolute w-full mt-2 rounded-lg shadow-2xl border-2 overflow-hidden z-50"
                    style={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: isDark ? '#06d6a0' : '#0f172a'
                    }}
                  >
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-4 py-3 cursor-pointer transition-colors duration-150 border-b"
                        style={{
                          borderColor: isDark ? 'rgba(6, 214, 160, 0.2)' : 'rgba(0, 0, 0, 0.1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f1f5f9';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <svg 
                            className="w-5 h-5 mt-0.5 shrink-0" 
                            style={{ color: '#06d6a0' }}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <div 
                              className="text-sm font-medium truncate"
                              style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                            >
                              {suggestion.display_name.split(',')[0]}
                            </div>
                            <div 
                              className="text-xs truncate mt-0.5"
                              style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                            >
                              {suggestion.display_name.split(',').slice(1).join(',')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Loading indicator */}
                {loadingSuggestions && !showSuggestions && (
                  <div 
                    className="absolute w-full mt-2 rounded-lg shadow-lg border-2 p-4 text-center"
                    style={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: isDark ? '#06d6a0' : '#0f172a',
                      color: isDark ? '#ffffff' : '#0f172a'
                    }}
                  >
                    <div className="animate-pulse">Searching...</div>
                  </div>
                )}
              </div>

            {/* Map */}
            <div className="relative w-full h-64 sm:h-80 md:h-96 lg:h-[400px] rounded-xl sm:rounded-2xl overflow-hidden border-2 shadow-lg" style={{ 
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            }}>
              <Map
                center={mapCenter}
                zoom={mapZoom}
                height="100%"
                onMapClick={handleMapClick}
                hazards={nearbyHazards.filter(h => h.latitude && h.longitude)}
                markers={[
                  {
                    position: userLocation,
                    color: '#06d6a0',
                    type: 'marker',
                    popup: <div className="text-sm"><strong>From: Your Location</strong></div>
                  },
                  ...(searchedLocation ? [{
                    position: searchedLocation.position,
                    color: '#ef4444',
                    type: 'marker',
                    popup: <div className="text-sm"><strong>To: {searchedLocation.name}</strong></div>
                  }] : [])
                ]}
                routes={routeData ? [{
                  id: 'homepage-route',
                  coordinates: routeData.coordinates,
                  color: '#06d6a0',
                  weight: 4,
                  opacity: 0.7
                }] : []}
              />
            </div>

            {/* Nearby Hazards - Horizontal Scroll */}
            {nearbyHazards.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 
                    className="text-lg sm:text-xl font-bold"
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  >
                    Nearby <span style={{ color: '#06d6a0' }}>Hazards</span> ({nearbyHazards.length})
                  </h3>
                  <p 
                    className="text-xs sm:text-sm"
                    style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                  >
                    Within 5km
                  </p>
                </div>
                
                <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                  {nearbyHazards.map((hazard) => (
                    <div 
                      key={hazard.id}
                      className="flex-none w-64 sm:w-72 md:w-80 rounded-lg sm:rounded-xl p-3 sm:p-4 snap-start transition-transform hover:scale-[1.02] cursor-pointer"
                      style={{
                        backgroundColor: isDark ? '#0f172a' : '#e2e8f0',
                        border: isDark ? '2px solid rgba(255, 107, 107, 0.5)' : 'none',
                        boxShadow: isDark ? '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06)'
                      }}
                      onClick={() => {
                        setMapCenter([hazard.latitude, hazard.longitude]);
                        setMapZoom(16);
                      }}
                    >
                      <div className="flex items-start gap-2 sm:gap-3">
                        {(hazard.image_url || hazard.imageUrl) ? (
                          <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-lg overflow-hidden shrink-0">
                            <img 
                              src={`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001').replace(/\/api$/, '')}${hazard.image_url || hazard.imageUrl}`}
                              alt={hazard.hazardType || 'Hazard'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = '<div class="w-full h-full rounded-full flex items-center justify-center" style="background-color: #ff6b6b;"><span class="text-lg sm:text-xl">⚠️</span></div>';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#ff6b6b' }}>
                            <span className="text-lg sm:text-xl">⚠️</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base sm:text-lg" style={{ color: isDark ? '#f8fafc' : '#1e293b' }}>
                            {hazard.hazardType || hazard.type || 'Unknown Hazard'}
                          </h3>
                          <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
                            {hazard.severity && (
                              <span 
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-sm font-semibold"
                                style={{
                                  backgroundColor: hazard.severity === 'high' ? 'rgba(239, 68, 68, 0.2)' : hazard.severity === 'medium' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                  color: isDark ? '#ffffff' : '#1e293b'
                                }}
                              >
                                {hazard.severity}
                              </span>
                            )}
                            {hazard.distanceMeters && (
                              <span className="text-xs" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                                {hazard.distanceMeters >= 1000 
                                  ? `${(hazard.distanceMeters / 1000).toFixed(1)} km away` 
                                  : `${hazard.distanceMeters} m away`}
                              </span>
                            )}
                          </div>
                          <p 
                            className="text-xs mt-2 line-clamp-2"
                            style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                          >
                            {hazard.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Old Layout for Small Screens */}
          <div className="md:hidden">
            <div className="grid items-start gap-3 sm:gap-6 md:gap-10 lg:gap-3 lg:grid-cols-12">
              {/* Map card */}
              <div className="lg:col-span-8 order-1 lg:order-1">
                {/* Search bar */}
                <div className="mb-3 sm:mb-4 relative">
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!searchDestination.trim()) return;
                    
                    // Check authentication
                    const token = Cookies.get('auth_token');
                    if (!token) {
                      router.push('/auth/login');
                      return;
                    }
                    
                    // Always fetch current location address to ensure we have the real address
                    let fromAddress = userAddress;
                    try {
                      const addressResponse = await geocodingService.getAddressFromCoords(userLocation[0], userLocation[1]);
                      if (addressResponse.success && addressResponse.data?.display_name) {
                        fromAddress = addressResponse.data.display_name;
                      }
                    } catch (error) {
                      console.log('Could not get address for current location');
                    }
                    
                    // Check if we already have the searched location (route already drawn)
                    if (searchedLocation && searchedLocation.position) {
                      // Use the already-found location
                      router.push(`/suggested-routes?fromLat=${userLocation[0]}&fromLng=${userLocation[1]}&fromAddress=${encodeURIComponent(fromAddress)}&toLat=${searchedLocation.position[0]}&toLng=${searchedLocation.position[1]}&toAddress=${encodeURIComponent(searchedLocation.name)}&mode=walk`);
                      return;
                    }
                    
                    // Otherwise, geocode the destination and redirect to suggested-routes
                    try {
                      const response = await geocodingService.searchLocations(searchDestination, { limit: 1 });
                      if (response.success && response.data?.locations && response.data.locations.length > 0) {
                        const location = response.data.locations[0];
                        const newLocation = [parseFloat(location.lat), parseFloat(location.lon)];
                        
                        // Navigate to suggested-routes with pre-filled data
                        router.push(`/suggested-routes?fromLat=${userLocation[0]}&fromLng=${userLocation[1]}&fromAddress=${encodeURIComponent(fromAddress)}&toLat=${newLocation[0]}&toLng=${newLocation[1]}&toAddress=${encodeURIComponent(location.display_name)}&mode=walk`);
                      } else {
                        alert('Could not find that location. Please try again.');
                      }
                    } catch (error) {
                      console.error('Geocoding error:', error);
                      alert('Error finding location. Please try again.');
                    }
                  }} className="relative">
                    {/* Search Icon */}
                    <svg 
                      className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 z-10" 
                      style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    
                    <input
                      type="text"
                      value={searchDestination}
                      onChange={(e) => setSearchDestination(e.target.value)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      placeholder="Where do you want to go?"
                      className="w-full pl-10 sm:pl-12 pr-12 sm:pr-14 py-3 sm:py-3.5 rounded-full shadow-lg transition-all duration-200 focus:outline-none text-sm sm:text-base"
                      style={{
                        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                        color: isDark ? '#ffffff' : '#0f172a',
                        border: isDark ? '2px solid #06d6a0' : '2px solid #0f172a'
                      }}
                    />
                    
                    {/* Search Submit Button */}
                    <button
                      type="submit"
                      disabled={!searchDestination.trim()}
                      className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 rounded-full transition-all duration-200"
                      style={{
                        backgroundColor: searchDestination.trim() ? '#06d6a0' : (isDark ? '#334155' : '#e2e8f0'),
                        cursor: searchDestination.trim() ? 'pointer' : 'not-allowed',
                        opacity: searchDestination.trim() ? 1 : 0.5
                      }}
                      onMouseEnter={(e) => {
                        if (searchDestination.trim()) {
                          e.target.style.backgroundColor = '#059669';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (searchDestination.trim()) {
                          e.target.style.backgroundColor = '#06d6a0';
                        }
                      }}
                    >
                      <svg 
                        className="w-4 sm:w-5 h-4 sm:h-5" 
                        style={{ color: searchDestination.trim() ? '#0f172a' : (isDark ? '#64748b' : '#94a3b8') }}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </form>

                  {/* Autocomplete Suggestions */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div 
                      className="absolute w-full mt-2 rounded-lg shadow-2xl border-2 overflow-hidden z-50"
                      style={{
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        borderColor: isDark ? '#06d6a0' : '#0f172a'
                      }}
                    >
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="px-4 py-3 cursor-pointer transition-colors duration-150 border-b"
                          style={{
                            borderColor: isDark ? 'rgba(6, 214, 160, 0.2)' : 'rgba(0, 0, 0, 0.1)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f1f5f9';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <svg 
                              className="w-5 h-5 mt-0.5 shrink-0" 
                              style={{ color: '#06d6a0' }}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <div 
                                className="text-sm font-medium truncate"
                                style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                              >
                                {suggestion.display_name.split(',')[0]}
                              </div>
                              <div 
                                className="text-xs truncate mt-0.5"
                                style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                              >
                                {suggestion.display_name.split(',').slice(1).join(',')}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Loading indicator */}
                  {loadingSuggestions && !showSuggestions && (
                    <div 
                      className="absolute w-full mt-2 rounded-lg shadow-lg border-2 p-4 text-center"
                      style={{
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        borderColor: isDark ? '#06d6a0' : '#0f172a',
                        color: isDark ? '#ffffff' : '#0f172a'
                      }}
                    >
                      <div className="animate-pulse">Searching...</div>
                    </div>
                  )}
                </div>

                <div className="relative w-full h-56 sm:h-72 md:h-96 lg:h-[280px] xl:h-[300px] rounded-xl sm:rounded-2xl overflow-hidden border-2 shadow-lg" style={{ 
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }}>
                  <Map
                    center={mapCenter}
                    zoom={mapZoom}
                    height="100%"
                    onMapClick={handleMapClick}
                    hazards={nearbyHazards.filter(h => h.latitude && h.longitude)}
                    markers={[
                      {
                        position: userLocation,
                        color: '#06d6a0',
                        type: 'marker',
                        popup: <div className="text-sm"><strong>From: Your Location</strong></div>
                      },
                      ...(searchedLocation ? [{
                        position: searchedLocation.position,
                        color: '#ef4444',
                        type: 'marker',
                        popup: <div className="text-sm"><strong>To: {searchedLocation.name}</strong></div>
                      }] : [])
                    ]}
                    routes={routeData ? [{
                      id: 'homepage-route',
                      coordinates: routeData.coordinates,
                      color: '#06d6a0',
                      weight: 4,
                      opacity: 0.7
                    }] : []}
                  />
                </div>
              </div>

              {/* Copy + CTAs */}
              <div className="lg:col-span-4 order-2 lg:order-2 text-center lg:text-left flex flex-col justify-between">
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-4xl xl:text-5xl font-bold leading-tight" style={{ color: isDark ? '#f8fafc' : '#1e293b' }}>
                    Find Your <span style={{ color: '#06d6a0' }}>Safer</span> Way
                  </h1>
                  <h2 className="mt-1.5 sm:mt-2 lg:mt-2 text-sm sm:text-base md:text-xl lg:text-lg" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
                    Safer journeys for walkers &amp; cyclists
                  </h2>

                  <div className="mt-4 sm:mt-6 lg:mt-6 flex flex-col sm:flex-row gap-2.5 sm:gap-3 lg:gap-3 lg:justify-start justify-center">
                    <button
                      onClick={(e) => handleProtectedAction(e, '/suggested-routes')}
                      className="btn-primary inline-flex items-center gap-2 justify-center text-sm sm:text-base lg:text-base px-5 sm:px-6 lg:px-6 py-2.5 sm:py-3 lg:py-2.5 rounded-lg min-h-[42px] lg:min-h-0 w-full sm:w-auto"
                      title="Plan a safe journey"
                    >
                      Go Safe
                    </button>
                    <button
                      onClick={(e) => handleProtectedAction(e, '/report-hazards')}
                      className="inline-flex items-center gap-2 justify-center text-sm sm:text-base lg:text-base px-5 sm:px-6 lg:px-6 py-2.5 sm:py-3 lg:py-2.5 rounded-lg font-semibold transition-all duration-200 min-h-[42px] lg:min-h-0 w-full sm:w-auto"
                      style={{
                        backgroundColor: '#f87171',
                        color: '#ffffff'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#ef4444'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#f87171'}
                      title="Help others: report a hazard here"
                    >
                      Report Hazard
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Nearby Hazards - Small/Medium Screens */}
            {nearbyHazards.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 
                    className="text-lg sm:text-xl font-bold"
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  >
                    Nearby <span style={{ color: '#06d6a0' }}>Hazards</span> ({nearbyHazards.length})
                  </h3>
                  <p 
                    className="text-xs sm:text-sm"
                    style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                  >
                    Within 5km
                  </p>
                </div>
                
                <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                  {nearbyHazards.map((hazard) => (
                    <div 
                      key={hazard.id}
                      className="flex-none w-64 sm:w-72 md:w-80 rounded-lg sm:rounded-xl p-3 sm:p-4 snap-start transition-transform hover:scale-[1.02] cursor-pointer"
                      style={{
                        backgroundColor: isDark ? '#0f172a' : '#e2e8f0',
                        border: isDark ? '2px solid rgba(255, 107, 107, 0.5)' : 'none',
                        boxShadow: isDark ? '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06)'
                      }}
                      onClick={() => {
                        setMapCenter([hazard.latitude, hazard.longitude]);
                        setMapZoom(16);
                      }}
                    >
                      <div className="flex items-start gap-2 sm:gap-3">
                        {(hazard.image_url || hazard.imageUrl) ? (
                          <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-lg overflow-hidden shrink-0">
                            <img 
                              src={`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001').replace(/\/api$/, '')}${hazard.image_url || hazard.imageUrl}`}
                              alt={hazard.hazardType || 'Hazard'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = '<div class="w-full h-full rounded-full flex items-center justify-center" style="background-color: #ff6b6b;"><span class="text-lg sm:text-xl">⚠️</span></div>';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#ff6b6b' }}>
                            <span className="text-lg sm:text-xl">⚠️</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base sm:text-lg" style={{ color: isDark ? '#f8fafc' : '#1e293b' }}>
                            {hazard.hazardType || hazard.type || 'Unknown Hazard'}
                          </h3>
                          <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
                            {hazard.severity && (
                              <span 
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-sm font-semibold"
                                style={{
                                  backgroundColor: hazard.severity === 'high' ? 'rgba(239, 68, 68, 0.2)' : hazard.severity === 'medium' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                  color: isDark ? '#ffffff' : '#1e293b'
                                }}
                              >
                                {hazard.severity}
                              </span>
                            )}
                            {hazard.distanceMeters && (
                              <span className="text-xs" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                                {hazard.distanceMeters >= 1000 
                                  ? `${(hazard.distanceMeters / 1000).toFixed(1)} km away` 
                                  : `${hazard.distanceMeters} m away`}
                              </span>
                            )}
                          </div>
                          <p 
                            className="text-xs mt-2 line-clamp-2"
                            style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                          >
                            {hazard.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Buddy Preview Section - Below Map, All Screens */}
          <div className="mt-4 sm:mt-5 animate-fadeIn">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold" style={{ color: isDark ? '#f8fafc' : '#1e293b' }}>
                Find a <span style={{ color: '#06d6a0' }}>Buddy</span>
              </h2>
              <button
                onClick={(e) => handleProtectedAction(e, '/findBuddy')}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200"
                style={{
                  backgroundColor: isDark ? '#06d6a0' : '#06d6a0',
                  color: '#0f172a'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#06d6a0'}
              >
                Find Buddy
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Buddy Cards - Horizontal Scroll */}
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
              {/* Mock Buddy 1 */}
              <div 
                className="flex-none w-64 sm:w-72 md:w-80 rounded-lg sm:rounded-xl p-3 sm:p-4 snap-start transition-transform hover:scale-[1.02]"
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#e2e8f0',
                  border: isDark ? '2px solid rgba(6, 214, 160, 0.5)' : 'none',
                  boxShadow: isDark ? '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06)'
                }}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#06d6a0' }}>
                    <svg className="w-5 sm:w-6 h-5 sm:h-6" style={{ color: '#0f172a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg" style={{ color: isDark ? '#f8fafc' : '#1e293b' }}>Sarah Johnson</h3>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'rgba(6, 214, 160, 0.2)', color: isDark ? '#ffffff' : '#1e293b' }}>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
                        </svg>
                        Walking
                      </span>
                      <span className="text-xs" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>0.8 km away</span>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs font-medium" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Available now</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mock Buddy 2 */}
              <div 
                className="flex-none w-64 sm:w-72 md:w-80 rounded-lg sm:rounded-xl p-3 sm:p-4 snap-start transition-transform hover:scale-[1.02]"
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#e2e8f0',
                  border: isDark ? '2px solid rgba(6, 214, 160, 0.5)' : 'none',
                  boxShadow: isDark ? '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06)'
                }}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#06d6a0' }}>
                    <svg className="w-5 sm:w-6 h-5 sm:h-6" style={{ color: '#0f172a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg" style={{ color: isDark ? '#f8fafc' : '#1e293b' }}>Michael Chen</h3>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'rgba(6, 214, 160, 0.2)', color: isDark ? '#ffffff' : '#1e293b' }}>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M5 18.89H6.41421L12 13.3042L17.5858 18.89H19V17.4758L12 10.4758L5 17.4758V18.89Z"/>
                          <path d="M21 15.89C20.4477 15.89 20 16.3377 20 16.89C20 17.4423 20.4477 17.89 21 17.89C21.5523 17.89 22 17.4423 22 16.89C22 16.3377 21.5523 15.89 21 15.89ZM19 16.89C19 15.7854 19.8954 14.89 21 14.89C22.1046 14.89 23 15.7854 23 16.89C23 17.9946 22.1046 18.89 21 18.89C19.8954 18.89 19 17.9946 19 16.89Z"/>
                          <path d="M3 15.89C2.44772 15.89 2 16.3377 2 16.89C2 17.4423 2.44772 17.89 3 17.89C3.55228 17.89 4 17.4423 4 16.89C4 16.3377 3.55228 15.89 3 15.89ZM1 16.89C1 15.7854 1.89543 14.89 3 14.89C4.10457 14.89 5 15.7854 5 16.89C5 17.9946 4.10457 18.89 3 18.89C1.89543 18.89 1 17.9946 1 16.89Z"/>
                          <circle cx="12" cy="6" r="2"/>
                        </svg>
                        Cycling
                      </span>
                      <span className="text-xs" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>1.2 km away</span>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs font-medium" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Available now</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile View All Button */}
            <button
              onClick={(e) => handleProtectedAction(e, '/findBuddy')}
              className="sm:hidden w-full mt-2.5 sm:mt-4 inline-flex items-center gap-2 justify-center px-4 py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200"
              style={{
                backgroundColor: isDark ? '#06d6a0' : '#06d6a0',
                color: '#0f172a'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#06d6a0'}
            >
              Find Buddy
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </Section>
    </main>
  );
}
