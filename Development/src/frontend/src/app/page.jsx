'use client'

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Cookies from 'js-cookie';
import { geocodingService, routingService } from '../lib/services';
import { 
  getStoredLocation, 
  getStoredMapCenter, 
  getStoredMapZoom, 
  getStoredAddress,
  getCurrentLocation,
  saveLocation,
  saveMapView 
} from '../lib/locationManager';

const Map = dynamic(() => import('../components/Map'), { ssr: false });

function Section({ className = "", ...props }) {
  return <section className={`relative ${className}`} {...props} />;
}

export default function Home() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  
  // Initialize location from centralized location manager
  const [userLocation, setUserLocation] = useState(() => getStoredLocation() || getStoredMapCenter());
  const [userAddress, setUserAddress] = useState(() => getStoredAddress());
  const [searchDestination, setSearchDestination] = useState('');
  const [searchedLocation, setSearchedLocation] = useState(null);
  const [transportMode, setTransportMode] = useState('cycling');
  const [mapCenter, setMapCenter] = useState(() => getStoredMapCenter() || getStoredLocation());
  const [mapZoom, setMapZoom] = useState(() => getStoredMapZoom());
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [nearbyHazards, setNearbyHazards] = useState([]);
  const [selectedHazardId, setSelectedHazardId] = useState(null);
  const [nearbyBuddiesCount, setNearbyBuddiesCount] = useState(0);
  const [hazardTypeFilter, setHazardTypeFilter] = useState('all');
  const [hazardSourceFilter, setHazardSourceFilter] = useState('all');
  const skipAutocomplete = useRef(false);

  // Filter hazards based on selected filters
  const filteredHazards = nearbyHazards.filter(hazard => {
    const matchesType = hazardTypeFilter === 'all' || 
      (hazard.hazardType || hazard.type || '').toLowerCase().includes(hazardTypeFilter.toLowerCase());
    const matchesSource = hazardSourceFilter === 'all' || 
      (hazardSourceFilter === 'community' && hazard.source !== 'tomtom') ||
      (hazardSourceFilter === 'traffic' && hazard.source === 'tomtom');
    return matchesType && matchesSource;
  });

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
    
    const loadLocation = async () => {
      try {
        // Check if we have a stored location first (GDPR-compliant sessionStorage)
        let currentLocation = getStoredLocation();
        
        if (currentLocation) {
          console.log('📍 Using stored location:', currentLocation);
        } else {
          console.log('📍 No stored location, requesting GPS...');
          currentLocation = await getCurrentLocation({ autoSave: true });
        }
        
        setUserLocation(currentLocation);
        setMapCenter(currentLocation);
        setMapZoom(13);
        saveMapView(currentLocation, 13);
        
        // Get address for current location
        try {
          const response = await geocodingService.getAddressFromCoords(
            currentLocation[0],
            currentLocation[1]
          );
          if (response.success && response.data?.display_name) {
            saveLocation(currentLocation[0], currentLocation[1], response.data.display_name);
            setUserAddress(response.data.display_name);
          }
        } catch (error) {
          console.log('Could not get address for current location');
        }
        
        // Fetch nearby hazards and buddies within 10km
        fetchNearbyHazards(currentLocation[0], currentLocation[1]);
        fetchNearbyBuddies(currentLocation[0], currentLocation[1]);
      } catch (error) {
        console.log('Error loading location:', error);
        // Fallback handled by getCurrentLocation
        if (userLocation) {
          fetchNearbyHazards(userLocation[0], userLocation[1]);
          fetchNearbyBuddies(userLocation[0], userLocation[1]);
        }
      }
    };
    
    loadLocation();
    
    // Listen for hazard updates (when a new hazard is created)
    const handleHazardsUpdate = () => {
      console.log('🔄 Hazards updated, refreshing map...');
      const storedLocation = localStorage.getItem('userLocation');
      if (storedLocation) {
        try {
          const loc = JSON.parse(storedLocation);
          fetchNearbyHazards(loc[0], loc[1]);
        } catch (e) {
          console.log('Could not parse stored location');
        }
      }
    };
    
    window.addEventListener('hazardsUpdated', handleHazardsUpdate);
    
    return () => {
      window.removeEventListener('hazardsUpdated', handleHazardsUpdate);
    };
  }, []);

  // Fetch nearby buddies count (cycling or walking)
  const fetchNearbyBuddies = async (latitude, longitude) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      const token = Cookies.get('auth_token');
      
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_URL}/buddies/nearby?lat=${latitude}&lon=${longitude}&radius=5000&limit=100`, {
        headers,
        credentials: token ? 'include' : 'omit'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.buddies) {
          // Count only cycling or walking buddies
          const count = data.data.buddies.filter(buddy => 
            buddy.transport_mode === 'cycling' || buddy.transport_mode === 'walking'
          ).length;
          setNearbyBuddiesCount(count);
        } else {
          setNearbyBuddiesCount(0);
        }
      } else {
        setNearbyBuddiesCount(0);
      }
    } catch (error) {
      console.log('Error fetching nearby buddies:', error);
      setNearbyBuddiesCount(0);
    }
  };

  // Fetch nearby hazards within 5km radius (including TomTom traffic incidents)
  const fetchNearbyHazards = async (latitude, longitude) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      console.log('🔍 Fetching combined hazards (community + TomTom) near:', latitude, longitude);
      const response = await fetch(`${API_URL}/hazards/combined/${latitude}/${longitude}?radius=5000&limit=100&includeTomTom=true`, {
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

  // Re-fetch route when transport mode changes
  useEffect(() => {
    const refetchRoute = async () => {
      if (searchedLocation && userLocation) {
        console.log('🚶‍♂️🚴 Re-fetching route for mode:', transportMode);
        try {
          const route = await routingService.getRoute(
            userLocation[0],
            userLocation[1],
            searchedLocation.position[0],
            searchedLocation.position[1],
            transportMode
          );
          
          if (route.success && route.coordinates) {
            setRouteData({
              coordinates: route.coordinates,
              distance: route.distance,
              duration: route.duration,
              mode: transportMode // Add mode to trigger re-render
            });
          }
        } catch (error) {
          console.error('Error re-fetching route:', error);
        }
      }
    };
    
    refetchRoute();
  }, [transportMode, searchedLocation, userLocation]);

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
        transportMode
      );
      
      if (route.success && route.coordinates) {
        setRouteData({
          coordinates: route.coordinates,
          distance: route.distance,
          duration: route.duration,
          mode: transportMode
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
        transportMode
      );
      
      if (route.success && route.coordinates) {
        setRouteData({
          coordinates: route.coordinates,
          distance: route.distance,
          duration: route.duration,
          mode: transportMode
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
      <Section className="overflow-visible pt-1 sm:pt-2 md:pt-4 lg:pt-6 pb-16 sm:pb-12 md:pb-6 lg:pb-6 mb-0">
        <div className="container mx-auto max-w-5xl px-2 sm:px-4 md:px-6 lg:px-8 animate-fadeIn w-full mb-0">
          {/* New Layout for MD and larger screens */}
          <div className="hidden md:block">
            {/* Title */}
            <div className="text-center mb-2 sm:mb-5 lg:mb-6">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight" style={{ color: isDark ? '#f8fafc' : '#1e293b' }}>
                Find Your <span style={{ color: '#06d6a0' }}>Safer</span> Way
              </h1>
              <h2 className="mt-2 sm:mt-3 text-sm sm:text-base md:text-lg lg:text-xl" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
                Safer journeys for walkers &amp; cyclists
              </h2>
            </div>



            {/* Search Bar with Transport Mode Icons */}
            <div className="mb-2 sm:mb-4 max-w-3xl mx-auto">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Search Form */}
                <div className="flex-1 relative">
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
                    placeholder="Where do you want to go?"
                    className="w-full pl-10 sm:pl-12 pr-12 sm:pr-14 py-3 sm:py-3.5 rounded-full shadow-lg transition-all duration-200 focus:outline-none text-sm sm:text-base"
                    style={{
                      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                      color: isDark ? '#ffffff' : '#0f172a',
                      border: isDark ? '2px solid #06d6a0' : '2px solid #0f172a'
                    }}
                    onFocus={(e) => {
                      if (isDark) e.target.style.boxShadow = '0 0 0 3px rgba(6, 214, 160, 0.3)';
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = 'none';
                      setTimeout(() => setShowSuggestions(false), 200);
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

              {/* Transport Mode Icons - Inline Right */}
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setTransportMode('walking')}
                  className="relative group transition-all duration-200"
                  title="Walking"
                >
                  <div 
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-200"
                    style={{
                      backgroundColor: transportMode === 'walking' ? '#06d6a0' : (isDark ? '#475569' : '#e2e8f0'),
                      color: transportMode === 'walking' ? '#0f172a' : (isDark ? '#cbd5e1' : '#94a3b8'),
                      border: isDark && transportMode !== 'walking' ? '1px solid #64748b' : 'none'
                    }}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="currentColor"
                      className="w-5 h-5"
                    >
                      <path d="M14 6c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2zm-2 4c-2 0-3.5 1.5-3.5 3.5V18c0 .55.45 1 1 1s1-.45 1-1v-3.5h1V21c0 .55.45 1 1 1s1-.45 1-1v-6.5h1V21c0 .55.45 1 1 1s1-.45 1-1v-7.5C16.5 11.5 15 10 13 10h-1z"/>
                    </svg>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setTransportMode('cycling')}
                  className="relative group transition-all duration-200"
                  title="Cycling"
                >
                  <div 
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-200"
                    style={{
                      backgroundColor: transportMode === 'cycling' ? '#06d6a0' : (isDark ? '#475569' : '#e2e8f0'),
                      color: transportMode === 'cycling' ? '#0f172a' : (isDark ? '#cbd5e1' : '#94a3b8'),
                      border: isDark && transportMode !== 'cycling' ? '1px solid #64748b' : 'none'
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
            </div>
          </div>

            {/* Map */}
            <div className="relative w-full h-80 sm:h-80 md:h-96 lg:h-[400px] rounded-xl sm:rounded-2xl overflow-hidden border-2 shadow-lg" style={{ 
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            }}>
              <Map
                center={mapCenter}
                zoom={mapZoom}
                height="100%"
                onMapClick={handleMapClick}
                hazards={nearbyHazards.filter(h => h.latitude && h.longitude)}
                selectedHazardId={selectedHazardId}
                markers={[
                  {
                    position: userLocation,
                    color: '#06d6a0',
                    type: 'marker',
                    popup: <div className="text-sm"><strong>From: Your Location</strong></div>
                  },
                  ...(searchedLocation ? [{
                    position: searchedLocation.position,
                    color: '#a78bfa',
                    type: 'marker',
                    popup: <div className="text-sm"><strong>To: {searchedLocation.name}</strong></div>
                  }] : [])
                ]}
                routes={routeData ? [{
                  id: 'homepage-route',
                  coordinates: routeData.coordinates,
                  color: transportMode === 'cycling' ? '#3b82f6' : '#06d6a0',
                  weight: 4,
                  opacity: 0.7
                }] : []}
                autoFitBounds={!!routeData}
                fromCoords={userLocation}
                toCoords={searchedLocation?.position}
              />
            </div>

            {/* Nearby Hazards - Horizontal Scroll */}
            {nearbyHazards.length > 0 && (
              <div className="mt-2 sm:mt-4">
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <h3 
                    className="text-lg sm:text-xl font-bold"
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  >
                    Nearby <span style={{ color: '#06d6a0' }}>Hazards</span> ({filteredHazards.length})
                  </h3>
                  <div className="text-right">
                    <p 
                      className="text-sm sm:text-base font-medium"
                      style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                    >
                      Within 5km
                    </p>
                    {nearbyBuddiesCount > 0 && (
                      <p className="text-sm sm:text-base font-semibold mt-1" style={{ color: isDark ? '#06d6a0' : '#059669' }}>
                        Buddies Nearby ({nearbyBuddiesCount})
                      </p>
                    )}
                  </div>
                </div>

                {/* Hazard Filters */}
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
                  <select
                    value={hazardSourceFilter}
                    onChange={(e) => setHazardSourceFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer"
                    style={{
                      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                      color: isDark ? '#ffffff' : '#0f172a',
                      border: `1px solid ${isDark ? '#d1d5db' : '#cbd5e1'}`
                    }}
                  >
                    <option value="all">All Sources</option>
                    <option value="community">Community</option>
                    <option value="traffic">Traffic</option>
                  </select>
                  <select
                    value={hazardTypeFilter}
                    onChange={(e) => setHazardTypeFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer"
                    style={{
                      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                      color: isDark ? '#ffffff' : '#0f172a',
                      border: `1px solid ${isDark ? '#d1d5db' : '#cbd5e1'}`
                    }}
                  >
                    <option value="all">All Types</option>
                    <option value="pothole">Pothole</option>
                    <option value="accident">Accident</option>
                    <option value="construction">Construction</option>
                    <option value="debris">Debris</option>
                    <option value="traffic">Traffic</option>
                    <option value="road">Road</option>
                  </select>
                </div>
                
                <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-3 sm:pb-4 scrollbar-hide snap-x snap-mandatory">
                  {filteredHazards.map((hazard) => (
                    <div 
                      key={hazard.id}
                      className="flex-none w-64 sm:w-72 md:w-80 rounded-lg sm:rounded-xl p-2.5 sm:p-4 snap-start transition-transform hover:scale-[1.02] cursor-pointer"
                      style={{
                        backgroundColor: isDark ? '#0f172a' : '#e2e8f0',
                        border: isDark ? '2px solid rgba(255, 107, 107, 0.5)' : 'none',
                        boxShadow: isDark ? '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06)'
                      }}
                      onClick={() => {
                        setMapCenter([hazard.latitude, hazard.longitude]);
                        setMapZoom(16);
                        setSelectedHazardId(hazard.id);
                      }}
                    >
                      <div className="flex items-start gap-2 sm:gap-3">
                        {(hazard.image_url || hazard.imageUrl) ? (
                          <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-lg overflow-hidden shrink-0">
                            <img 
                              src={(() => {
                                const imageUrl = hazard.image_url || hazard.imageUrl;
                                if (imageUrl.startsWith('http')) return imageUrl;
                                return `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001').replace(/\/api$/, '')}${imageUrl}`;
                              })()}
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
            <div className="grid items-start gap-2 sm:gap-6 md:gap-10 lg:gap-3 lg:grid-cols-12">
              {/* Map card */}
              <div className="lg:col-span-8 order-1 lg:order-1">
                {/* Search bar with Transport Mode Icons */}
                <div className="mb-2 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
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
                      placeholder="Where do you want to go?"
                      className="w-full pl-10 sm:pl-12 pr-12 sm:pr-14 py-3 sm:py-3.5 rounded-full shadow-lg transition-all duration-200 focus:outline-none text-sm sm:text-base"
                      style={{
                        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                        color: isDark ? '#ffffff' : '#0f172a',
                        border: isDark ? '2px solid #06d6a0' : '2px solid #0f172a'
                      }}
                      onFocus={(e) => {
                        if (isDark) e.target.style.boxShadow = '0 0 0 3px rgba(6, 214, 160, 0.3)';
                      }}
                      onBlur={(e) => {
                        e.target.style.boxShadow = 'none';
                        setTimeout(() => setShowSuggestions(false), 200);
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

                    {/* Transport Mode Icons - Inline Right */}
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setTransportMode('walking')}
                        className="relative group transition-all duration-200"
                        title="Walking"
                      >
                        <div 
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-200"
                          style={{
                            backgroundColor: transportMode === 'walking' ? '#06d6a0' : (isDark ? '#475569' : '#e2e8f0'),
                            color: transportMode === 'walking' ? '#0f172a' : (isDark ? '#cbd5e1' : '#94a3b8'),
                            border: isDark && transportMode !== 'walking' ? '1px solid #64748b' : 'none'
                          }}
                        >
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 24 24" 
                            fill="currentColor"
                            className="w-5 h-5"
                          >
                            <path d="M14 6c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2zm-2 4c-2 0-3.5 1.5-3.5 3.5V18c0 .55.45 1 1 1s1-.45 1-1v-3.5h1V21c0 .55.45 1 1 1s1-.45 1-1v-6.5h1V21c0 .55.45 1 1 1s1-.45 1-1v-7.5C16.5 11.5 15 10 13 10h-1z"/>
                          </svg>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransportMode('cycling')}
                        className="relative group transition-all duration-200"
                        title="Cycling"
                      >
                        <div 
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-200"
                          style={{
                            backgroundColor: transportMode === 'cycling' ? '#06d6a0' : (isDark ? '#475569' : '#e2e8f0'),
                            color: transportMode === 'cycling' ? '#0f172a' : (isDark ? '#cbd5e1' : '#94a3b8'),
                            border: isDark && transportMode !== 'cycling' ? '1px solid #64748b' : 'none'
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
                  </div>
                </div>

                <div className="relative w-full h-80 sm:h-72 md:h-96 lg:h-[280px] xl:h-[300px] rounded-xl sm:rounded-2xl overflow-hidden border-2 shadow-lg" style={{ 
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }}>
                  <Map
                    center={mapCenter}
                    zoom={mapZoom}
                    height="100%"
                    onMapClick={handleMapClick}
                    hazards={nearbyHazards.filter(h => h.latitude && h.longitude)}
                    selectedHazardId={selectedHazardId}
                    markers={[
                      {
                        position: userLocation,
                        color: '#06d6a0',
                        type: 'marker',
                        popup: <div className="text-sm"><strong>From: Your Location</strong></div>
                      },
                      ...(searchedLocation ? [{
                        position: searchedLocation.position,
                        color: '#a78bfa',
                        type: 'marker',
                        popup: <div className="text-sm"><strong>To: {searchedLocation.name}</strong></div>
                      }] : [])
                    ]}
                    routes={routeData ? [{
                      id: 'homepage-route',
                      coordinates: routeData.coordinates,
                      color: transportMode === 'cycling' ? '#3b82f6' : '#06d6a0',
                      weight: 4,
                      opacity: 0.7
                    }] : []}
                    autoFitBounds={!!routeData}
                    fromCoords={userLocation}
                    toCoords={searchedLocation?.position}
                  />
                </div>

                {/* Clear Destination Link - Below Map */}
                {(searchedLocation || routeData) && (
                  <div className="mt-2 flex justify-end pr-2">
                    <button
                      onClick={() => {
                        console.log('Clearing destination...');
                        setSearchedLocation(null);
                        setRouteData(null);
                        setSearchDestination('');
                        setMapCenter(userLocation);
                        setMapZoom(13);
                      }}
                      className="text-sm underline hover:no-underline transition-all duration-200"
                      style={{
                        color: isDark ? '#ffffff' : '#0f172a'
                      }}
                    >
                      Clear
                    </button>
                  </div>
                )}
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
                    Nearby <span style={{ color: '#06d6a0' }}>Hazards</span> ({filteredHazards.length})
                  </h3>
                  <div className="text-right">
                    <p 
                      className="text-sm sm:text-base font-medium"
                      style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                    >
                      Within 5km
                    </p>
                    {nearbyBuddiesCount > 0 && (
                      <p className="text-sm sm:text-base font-semibold mt-1" style={{ color: isDark ? '#06d6a0' : '#059669' }}>
                        Buddies Nearby ({nearbyBuddiesCount})
                      </p>
                    )}
                  </div>
                </div>

                {/* Hazard Filters */}
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
                  <select
                    value={hazardSourceFilter}
                    onChange={(e) => setHazardSourceFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer"
                    style={{
                      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                      color: isDark ? '#ffffff' : '#0f172a',
                      border: `1px solid ${isDark ? '#d1d5db' : '#cbd5e1'}`
                    }}
                  >
                    <option value="all">All Sources</option>
                    <option value="community">Community</option>
                    <option value="traffic">Traffic</option>
                  </select>
                  <select
                    value={hazardTypeFilter}
                    onChange={(e) => setHazardTypeFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer"
                    style={{
                      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                      color: isDark ? '#ffffff' : '#0f172a',
                      border: `1px solid ${isDark ? '#d1d5db' : '#cbd5e1'}`
                    }}
                  >
                    <option value="all">All Types</option>
                    <option value="pothole">Pothole</option>
                    <option value="accident">Accident</option>
                    <option value="construction">Construction</option>
                    <option value="debris">Debris</option>
                    <option value="traffic">Traffic</option>
                    <option value="road">Road</option>
                  </select>
                </div>
                
                <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                  {filteredHazards.map((hazard, index) => {
                    return (
                    <div 
                      key={hazard.id}
                      className="flex-none w-56 sm:w-64 md:w-72 rounded-lg sm:rounded-xl p-3 sm:p-4 snap-start transition-transform hover:scale-[1.02] cursor-pointer relative"
                      style={{
                        backgroundColor: isDark ? '#0f172a' : '#e2e8f0',
                        border: isDark ? '2px solid rgba(255, 107, 107, 0.5)' : 'none',
                        boxShadow: isDark ? '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06)'
                      }}
                      onClick={() => {
                        setMapCenter([hazard.latitude, hazard.longitude]);
                        setMapZoom(16);
                        setSelectedHazardId(hazard.id);
                      }}
                    >
                      {/* Source Badge - Top Right */}
                      {hazard.source && (
                        <div className="absolute top-2 right-2">
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium shadow-md"
                            style={{
                              backgroundColor: hazard.source === 'tomtom' ? 'rgba(255, 152, 0, 0.95)' : 'rgba(6, 214, 160, 0.95)',
                              color: '#ffffff'
                            }}
                          >
                            {hazard.source === 'tomtom' ? (
                              <>🚦</>
                            ) : (
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                            )}
                          </span>
                        </div>
                      )}

                      <div className="flex items-start gap-2 sm:gap-3">
                        {(hazard.image_url || hazard.imageUrl) ? (
                          <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-lg overflow-hidden shrink-0">
                            <img 
                              src={(() => {
                                const imageUrl = hazard.image_url || hazard.imageUrl;
                                if (imageUrl.startsWith('http')) return imageUrl;
                                return `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001').replace(/\/api$/, '')}${imageUrl}`;
                              })()}
                              alt={hazard.hazardType || 'Hazard'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = '<div class="w-full h-full rounded-full flex items-center justify-center" style="background-color: #ff6b6b;"><span class="text-lg sm:text-xl">⚠️</span></div>';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#ff6b6b' }}>
                            <span className="text-base sm:text-lg">⚠️</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base sm:text-lg" style={{ color: isDark ? '#f8fafc' : '#1e293b' }}>
                            {hazard.hazardType || hazard.type || 'Unknown Hazard'}
                          </h3>
                          {(() => {
                            const dateField = hazard.reportedAt || hazard.reported_at || hazard.created_at || hazard.createdAt || hazard.start_date;
                            if (dateField) {
                              try {
                                const date = new Date(dateField);
                                if (!isNaN(date.getTime())) {
                                  return (
                                    <p className="text-xs mt-0.5" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                                      {date.toLocaleDateString('en-GB', { 
                                        day: 'numeric', 
                                        month: 'short', 
                                        year: 'numeric' 
                                      })}
                                    </p>
                                  );
                                }
                              } catch (e) {
                                console.error('Error parsing date:', e);
                              }
                            }
                            return null;
                          })()}
                          <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
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
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>
    </main>
  );
}
