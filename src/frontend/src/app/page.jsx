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
        },
        (error) => {
          console.log('Geolocation error:', error.message);
          // Don't reset to London - keep the existing location from localStorage
        },
        {
          timeout: 10000,
          enableHighAccuracy: true,
          maximumAge: 60000
        }
      );
    }
  }, []);

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
      <Section className="overflow-visible pt-4 sm:pt-8 md:pt-20 lg:pt-6 pb-20 sm:pb-16 md:pb-10 lg:pb-0 mb-0">
        <div className="container mx-auto max-w-5xl px-3 sm:px-4 md:px-6 lg:px-8 animate-fadeIn w-full mb-0">
          <div className="grid items-start gap-3 sm:gap-6 md:gap-10 lg:gap-4 lg:grid-cols-12">
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

              <div className="relative w-full h-56 sm:h-72 md:h-96 lg:h-[340px] xl:h-[360px] rounded-xl sm:rounded-2xl overflow-hidden border-2 shadow-lg" style={{ 
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
              }}>
                <Map
                  center={mapCenter}
                  zoom={mapZoom}
                  height="100%"
                  onMapClick={handleMapClick}
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

              {/* Buddy Preview Section - Desktop Only */}
              <div className="hidden lg:block mt-8 animate-fadeIn">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold" style={{ color: isDark ? '#f8fafc' : '#1e293b' }}>
                    Find Buddy Near Me
                  </h2>
                  <button
                    onClick={(e) => handleProtectedAction(e, '/findBuddy')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all duration-200"
                    style={{
                      backgroundColor: isDark ? '#06d6a0' : '#06d6a0',
                      color: '#0f172a'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#06d6a0'}
                  >
                    Find Buddy
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Buddy Cards - Compact Desktop Version */}
                <div className="space-y-2">
                  {/* Mock Buddy 1 */}
                  <div 
                    className="rounded-lg p-2 border shadow-sm transition-transform hover:scale-[1.01]"
                    style={{
                      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                      borderColor: isDark ? 'rgba(6, 214, 160, 0.5)' : 'rgba(6, 214, 160, 0.4)',
                      boxShadow: isDark ? '0 1px 3px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#06d6a0' }}>
                        <svg className="w-4 h-4" style={{ color: '#0f172a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm" style={{ color: isDark ? '#f8fafc' : '#1e293b' }}>Sarah J.</h3>
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                          <span>🚶 0.8 km</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mock Buddy 2 */}
                  <div 
                    className="rounded-lg p-2 border shadow-sm transition-transform hover:scale-[1.01]"
                    style={{
                      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                      borderColor: isDark ? 'rgba(6, 214, 160, 0.5)' : 'rgba(6, 214, 160, 0.4)',
                      boxShadow: isDark ? '0 1px 3px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#06d6a0' }}>
                        <svg className="w-4 h-4" style={{ color: '#0f172a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm" style={{ color: isDark ? '#f8fafc' : '#1e293b' }}>Michael C.</h3>
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                          <span>🚴 1.2 km</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mock Buddy 3 */}
                  <div 
                    className="rounded-lg p-2 border shadow-sm transition-transform hover:scale-[1.01]"
                    style={{
                      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                      borderColor: isDark ? 'rgba(6, 214, 160, 0.5)' : 'rgba(6, 214, 160, 0.4)',
                      boxShadow: isDark ? '0 1px 3px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#06d6a0' }}>
                        <svg className="w-4 h-4" style={{ color: '#0f172a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm" style={{ color: isDark ? '#f8fafc' : '#1e293b' }}>Emma W.</h3>
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                          <span>🚶 2.1 km</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Buddy Preview Section */}
          <div className="lg:hidden mt-4 sm:mt-8 md:mt-16 lg:mt-0 animate-fadeIn">
            <div className="flex items-center justify-between mb-3 sm:mb-6">
              <h2 className="text-lg sm:text-xl md:text-3xl font-bold" style={{ color: isDark ? '#f8fafc' : '#1e293b' }}>
                Find Buddy Near Me
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
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
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
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
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
