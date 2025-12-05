'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import Toast from '../../components/Toast';

const Map = dynamic(() => import('../../components/Map'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export default function FindBuddy() {
  // Panel & UI state
  const [showBuddyPanel, setShowBuddyPanel] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [isMdScreen, setIsMdScreen] = useState(false);
  const [isLgScreen, setIsLgScreen] = useState(false);
  const [activeTab, setActiveTab] = useState('nearby');
  
  // Location state
  const [userLocation, setUserLocation] = useState([51.5074, -0.1278]);
  
  // Buddies state
  const [buddies, setBuddies] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [acceptedBuddies, setAcceptedBuddies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedBuddy, setSelectedBuddy] = useState(null);
  
  // Filters state
  const [radius, setRadius] = useState(5000);
  const [transportMode, setTransportMode] = useState('all');
  
  // Route planning state
  const [routeStart, setRouteStart] = useState('');
  const [routeEnd, setRouteEnd] = useState('');
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [endSuggestions, setEndSuggestions] = useState([]);
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showEndSuggestions, setShowEndSuggestions] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState(null);
  const [isSearchingRoute, setIsSearchingRoute] = useState(false);
  const [routeBuddies, setRouteBuddies] = useState([]);
  
  // Group routes state
  const [groupRoutes, setGroupRoutes] = useState([]);
  const [routeName, setRouteName] = useState('');
  const [selectedBuddiesForRoute, setSelectedBuddiesForRoute] = useState([]);
  const [showCreateGroupRoute, setShowCreateGroupRoute] = useState(false);
  
  // Hazards state (for map display)
  const [hazards, setHazards] = useState([]);
  
  // Toast state
  const [toast, setToast] = useState(null);

  // Debounce ref
  const searchTimeoutRef = useRef(null);

  // Get auth token
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
    }
    return null;
  };

  // Theme detection
  useEffect(() => {
    setIsLightMode(!document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(() => {
      setIsLightMode(!document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Screen size detection
  useEffect(() => {
    const handleResize = () => {
      setIsMdScreen(window.innerWidth >= 768);
      setIsLgScreen(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get user location
  useEffect(() => {
    console.log('⏱️ Getting user location in background...');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = [position.coords.latitude, position.coords.longitude];
          console.log('✓ Real location obtained:', location);
          setUserLocation(location);
        },
        (error) => {
          console.log(`ℹ️ Using default location (geolocation ${error.message.toLowerCase()})`);
        },
        { timeout: 3000, enableHighAccuracy: false, maximumAge: 300000 }
      );
    }
  }, []);

  // ==========================================
  // API CALLS
  // ==========================================

  const fetchNearbyBuddies = async () => {
    if (!userLocation) return;
    setIsLoading(true);
    setError(null);
    try {
      const token = getToken();
      const params = new URLSearchParams({
        lat: userLocation[0].toString(),
        lon: userLocation[1].toString(),
        radius: radius.toString(),
        limit: '50'
      });
      if (transportMode !== 'all') {
        params.append('transport_mode', transportMode);
      }
      const response = await fetch(`${API_URL}/api/buddies/nearby?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setBuddies(data.data?.buddies || []);
      } else {
        setError(data.message || 'Failed to fetch buddies');
      }
    } catch (err) {
      console.error('Error fetching buddies:', err);
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/buddies/requests?status=pending`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setPendingRequests(data.data?.requests || []);
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
    }
  };

  const fetchAcceptedBuddies = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/buddies/accepted`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setAcceptedBuddies(data.data?.buddies || []);
      }
    } catch (err) {
      console.error('Error fetching accepted buddies:', err);
    }
  };

  const fetchGroupRoutes = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/buddies/group-routes`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setGroupRoutes(data.data?.routes || []);
      }
    } catch (err) {
      console.error('Error fetching group routes:', err);
    }
  };

  const fetchHazards = useCallback(async () => {
    if (!userLocation) return;
    try {
      const token = getToken();
      const response = await fetch(
        `${API_URL}/api/hazards/nearby?lat=${userLocation[0]}&lon=${userLocation[1]}&radius=10000&limit=50`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include'
        }
      );
      const data = await response.json();
      if (data.success) {
        setHazards(data.data?.hazards || []);
      }
    } catch (err) {
      console.error('Error fetching hazards:', err);
    }
  }, [userLocation]);

  const sendBuddyRequest = async (receiverId) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/buddies/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          receiver_id: receiverId,
          message: 'Hey! Would you like to be travel buddies?'
        })
      });
      const data = await response.json();
      if (data.success) {
        setToast({ message: '✅ Buddy request sent!', type: 'success' });
        fetchNearbyBuddies();
        fetchPendingRequests();
      } else {
        setToast({ message: data.message || 'Failed to send request', type: 'error' });
      }
    } catch (err) {
      console.error('Error sending request:', err);
      setToast({ message: 'Failed to send request', type: 'error' });
    }
  };

  const respondToRequest = async (requestId, action) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/buddies/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ action })
      });
      const data = await response.json();
      if (data.success) {
        if (action === 'accept') {
          setToast({ message: '✅ Buddy request accepted! You can now plan routes together.', type: 'success' });
        }
        fetchPendingRequests();
        fetchAcceptedBuddies();
        fetchNearbyBuddies();
      } else {
        setToast({ message: data.message || `Failed to ${action} request`, type: 'error' });
      }
    } catch (err) {
      console.error('Error responding to request:', err);
      setToast({ message: `Failed to ${action} request`, type: 'error' });
    }
  };

  // Location search with Nominatim
  const searchLocation = async (query, type) => {
    if (query.length < 3) {
      if (type === 'start') setStartSuggestions([]);
      else setEndSuggestions([]);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
        );
        const data = await response.json();
        if (type === 'start') {
          setStartSuggestions(data);
          setShowStartSuggestions(true);
        } else {
          setEndSuggestions(data);
          setShowEndSuggestions(true);
        }
      } catch (err) {
        console.error('Error searching location:', err);
      }
    }, 300);
  };

  const selectLocation = (suggestion, type) => {
    const coords = [parseFloat(suggestion.lat), parseFloat(suggestion.lon)];
    if (type === 'start') {
      setRouteStart(suggestion.display_name);
      setStartCoords(coords);
      setShowStartSuggestions(false);
    } else {
      setRouteEnd(suggestion.display_name);
      setEndCoords(coords);
      setShowEndSuggestions(false);
    }
  };

  const clearRoute = (type) => {
    if (type === 'start') {
      setRouteStart('');
      setStartCoords(null);
      setStartSuggestions([]);
    } else {
      setRouteEnd('');
      setEndCoords(null);
      setEndSuggestions([]);
    }
    setRouteCoordinates(null);
    setShowCreateGroupRoute(false);
    setRouteBuddies([]);
  };

  const findRouteAndBuddies = async () => {
    if (!startCoords || !endCoords) {
      setToast({ message: '⚠️ Please select both start and end locations', type: 'warning' });
      return;
    }

    setIsSearchingRoute(true);
    try {
      // Get route from OSRM
      const routeResponse = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startCoords[1]},${startCoords[0]};${endCoords[1]},${endCoords[0]}?overview=full&geometries=geojson`
      );
      const routeData = await routeResponse.json();

      if (routeData.routes && routeData.routes.length > 0) {
        const coordinates = routeData.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setRouteCoordinates(coordinates);
        setShowCreateGroupRoute(true);

        // Fetch buddies along route
        const token = getToken();
        const response = await fetch(`${API_URL}/api/buddies/along-route`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
          body: JSON.stringify({
            start_lat: startCoords[0],
            start_lon: startCoords[1],
            end_lat: endCoords[0],
            end_lon: endCoords[1],
            radius: 5000
          })
        });
        const data = await response.json();
        if (data.success) {
          setRouteBuddies(data.data?.buddies || []);
        }
      } else {
        setToast({ message: '⚠️ Could not find a route', type: 'warning' });
      }
    } catch (err) {
      console.error('Error finding route:', err);
      setToast({ message: 'Failed to find route', type: 'error' });
    } finally {
      setIsSearchingRoute(false);
    }
  };

  const createGroupRoute = async () => {
    if (!startCoords || !endCoords) {
      setToast({ message: '⚠️ Please find a route first', type: 'warning' });
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/buddies/group-routes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          name: routeName || 'My Route',
          start_location: routeStart,
          end_location: routeEnd,
          start_lat: startCoords[0],
          start_lon: startCoords[1],
          end_lat: endCoords[0],
          end_lon: endCoords[1],
          invited_buddies: selectedBuddiesForRoute
        })
      });
      const data = await response.json();
      if (data.success) {
        setToast({ message: '✅ Group route created and invites sent!', type: 'success' });
        setRouteName('');
        setSelectedBuddiesForRoute([]);
        setShowCreateGroupRoute(false);
        fetchGroupRoutes();
      } else {
        setToast({ message: data.message || 'Failed to create group route', type: 'error' });
      }
    } catch (err) {
      console.error('Error creating group route:', err);
      setToast({ message: 'Failed to create group route', type: 'error' });
    }
  };

  const joinRoute = async (routeId) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/buddies/group-routes/${routeId}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setToast({ message: '✅ Successfully joined the route!', type: 'success' });
        fetchGroupRoutes();
      } else {
        setToast({ message: data.message || 'Failed to join route', type: 'error' });
      }
    } catch (err) {
      console.error('Error joining route:', err);
      setToast({ message: 'Failed to join route', type: 'error' });
    }
  };

  const viewRouteOnMap = async (route) => {
    if (route.start_lat && route.start_lon && route.end_lat && route.end_lon) {
      try {
        const routeResponse = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${route.start_lon},${route.start_lat};${route.end_lon},${route.end_lat}?overview=full&geometries=geojson`
        );
        const routeData = await routeResponse.json();

        if (routeData.routes && routeData.routes.length > 0) {
          const coordinates = routeData.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
          setRouteCoordinates(coordinates);
          setRouteStart(route.start_location);
          setRouteEnd(route.end_location);
          setStartCoords([route.start_lat, route.start_lon]);
          setEndCoords([route.end_lat, route.end_lon]);
        }
      } catch (err) {
        console.error('Error loading route:', err);
      }
    }
  };

  const toggleBuddySelection = (buddyId) => {
    setSelectedBuddiesForRoute(prev =>
      prev.includes(buddyId)
        ? prev.filter(id => id !== buddyId)
        : [...prev, buddyId]
    );
  };

  // Load data on mount
  useEffect(() => {
    if (userLocation) {
      fetchNearbyBuddies();
      fetchPendingRequests();
      fetchAcceptedBuddies();
      fetchGroupRoutes();
      fetchHazards();
    }
  }, [userLocation, radius, transportMode]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setShowStartSuggestions(false);
      setShowEndSuggestions(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // ==========================================
  // BUDDY CARD COMPONENT
  // ==========================================
  const BuddyCard = ({ buddy, isRequest = false, isAccepted = false }) => (
    <div
      className="rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border"
      style={{
        backgroundColor: isLightMode ? '#ffffff' : '#1e293b',
        borderColor: isLightMode ? '#e5e7eb' : '#374151'
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
            {(buddy.name || buddy.sender_name || buddy.buddy_name || 'UN').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: isLightMode ? '#0f172a' : '#ffffff' }}>
              {buddy.name || buddy.sender_name || buddy.buddy_name || 'Unknown'}
            </h3>
            <div className="flex items-center gap-1 text-sm" style={{ color: isLightMode ? '#64748b' : '#9ca3af' }}>
              <span>📍</span>
              <span>{buddy.distance_km || '0.00'} km away</span>
            </div>
          </div>
        </div>
        {isAccepted && (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
            ✓ Connected
          </span>
        )}
        {isRequest && !buddy.is_sender && (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Respond</span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span
          className="px-3 py-1 rounded-full text-sm capitalize"
          style={{
            backgroundColor: isLightMode ? '#f3f4f6' : '#374151',
            color: isLightMode ? '#374151' : '#d1d5db'
          }}
        >
          {buddy.transport_mode || buddy.sender_transport_mode || buddy.buddy_transport_mode || 'walking'}
        </span>
        <span
          className="px-3 py-1 rounded-full text-sm"
          style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
        >
          Safety: {((buddy.safety_priority || 0.5) * 100).toFixed(0)}%
        </span>
      </div>

      <div className="flex gap-2">
        {/* Request response buttons */}
        {isRequest && !buddy.is_sender && (
          <>
            <button
              onClick={() => respondToRequest(buddy.id || buddy.request_id, 'accept')}
              className="flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
              style={{ backgroundColor: '#10b981', color: '#ffffff' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
            >
              Accept
            </button>
            <button
              onClick={() => respondToRequest(buddy.id || buddy.request_id, 'reject')}
              className="flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
              style={{ backgroundColor: '#ef4444', color: '#ffffff' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
            >
              Reject
            </button>
          </>
        )}

        {/* Plan Route button for accepted buddies */}
        {isAccepted && (
          <button
            onClick={() => {
              setActiveTab('routes');
              if (!selectedBuddiesForRoute.includes(buddy.buddy_id)) {
                setSelectedBuddiesForRoute([...selectedBuddiesForRoute, buddy.buddy_id]);
              }
            }}
            className="flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
            style={{ backgroundColor: '#8b5cf6', color: '#ffffff' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#7c3aed'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#8b5cf6'}
          >
            🗺️ Plan Route
          </button>
        )}

        {/* Send Request button for nearby buddies */}
        {!isRequest && !isAccepted && !buddy.request_status && (
          <button
            onClick={() => sendBuddyRequest(buddy.id)}
            className="flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
            style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            Send Request
          </button>
        )}

        {/* Pending indicator */}
        {buddy.request_status === 'pending' && buddy.is_sender && (
          <span className="flex-1 px-4 py-2 rounded-lg font-medium text-sm text-center bg-yellow-100 text-yellow-800">
            Pending
          </span>
        )}

        {/* Profile button */}
        <button
          onClick={() => setSelectedBuddy(buddy)}
          className="px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          style={{
            backgroundColor: isLightMode ? '#f3f4f6' : '#374151',
            color: isLightMode ? '#374151' : '#d1d5db'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = isLightMode ? '#e5e7eb' : '#4b5563'}
          onMouseLeave={(e) => e.target.style.backgroundColor = isLightMode ? '#f3f4f6' : '#374151'}
        >
          Profile
        </button>
      </div>
    </div>
  );

  // ==========================================
  // GROUP ROUTE CARD COMPONENT
  // ==========================================
  const GroupRouteCard = ({ route }) => (
    <div
      className="rounded-lg p-4 border"
      style={{
        backgroundColor: isLightMode ? '#ffffff' : '#1e293b',
        borderColor: isLightMode ? '#e5e7eb' : '#374151'
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold" style={{ color: isLightMode ? '#0f172a' : '#ffffff' }}>
          {route.name || 'Unnamed Route'}
        </h4>
        <span
          className="px-2 py-1 text-xs rounded-full"
          style={{
            backgroundColor: route.status === 'active' ? '#dcfce7' : '#fef3c7',
            color: route.status === 'active' ? '#166534' : '#92400e'
          }}
        >
          {route.status || 'active'}
        </span>
      </div>

      <div className="space-y-1 mb-3 text-sm" style={{ color: isLightMode ? '#64748b' : '#9ca3af' }}>
        <div className="flex items-center gap-2">
          <span className="text-green-500">●</span>
          <span className="truncate">{route.start_location}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-red-500">●</span>
          <span className="truncate">{route.end_location}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3 text-sm" style={{ color: isLightMode ? '#64748b' : '#9ca3af' }}>
        <span>👥 {route.member_count || 2} members</span>
        <span>•</span>
        <span>{route.transport_mode || 'Walking'}</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => joinRoute(route.id)}
          className="flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
        >
          Join Route
        </button>
        <button
          onClick={() => viewRouteOnMap(route)}
          className="px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          style={{
            backgroundColor: isLightMode ? '#f3f4f6' : '#374151',
            color: isLightMode ? '#374151' : '#d1d5db'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = isLightMode ? '#e5e7eb' : '#4b5563'}
          onMouseLeave={(e) => e.target.style.backgroundColor = isLightMode ? '#f3f4f6' : '#374151'}
        >
          View on Map
        </button>
      </div>
    </div>
  );

  // ==========================================
  // MAIN RENDER
  // ==========================================
  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {/* Hero Section - Compact */}
        <section
          className="relative overflow-hidden py-3"
          style={{
            background: isLightMode ? '#ffffff' : 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)'
          }}
        >
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl md:text-3xl font-bold mb-1">
              <span style={{ color: isLightMode ? '#0f172a' : '#ffffff' }}>Find a </span>
              <span style={{ color: '#06d6a0' }}>Buddy</span>
            </h1>
            <p
              className="text-base md:text-lg"
              style={{ color: isLightMode ? '#475569' : 'rgba(255, 255, 255, 0.8)' }}
            >
              Connect with nearby travelers and plan safe journeys together
            </p>
          </div>
        </section>

        {/* Main Content Section */}
        <section
          className="relative min-h-[calc(100vh-80px)]"
          style={{ backgroundColor: isLightMode ? '#ffffff' : '#0f172a' }}
        >
          {/* Custom Scrollbar Styles */}
          <style jsx global>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: ${isLightMode ? '#cbd5e1' : '#475569'};
              border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: ${isLightMode ? '#94a3b8' : '#64748b'};
            }
            .custom-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: ${isLightMode ? '#cbd5e1' : '#475569'} transparent;
            }
          `}</style>

         {/* Side Panel - Wider and properly positioned */}
          <div
            className="fixed left-0 top-23 bottom-0 z-50 w-[90vw] md:w-[450px] lg:w-[500px] transition-transform duration-300 shadow-2xl"
            style={{
              transform: showBuddyPanel ? 'translateX(0)' : 'translateX(-100%)',
              backgroundColor: isLightMode ? '#ffffff' : '#0f172a',
            }}
          >
            <div className="h-full overflow-y-auto custom-scrollbar">

              <div className="p-4 pb-24">
                <div
                  className="border-2 rounded-2xl p-4"
                  style={{
                    backgroundColor: isLightMode ? '#ffffff' : '#1e293b',
                    borderColor: isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'
                  }}
                >

                  {/* Filters */}
                  <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={radius}
                        onChange={(e) => setRadius(Number(e.target.value))}
                        className="px-3 py-2 border rounded-lg text-sm"
                        style={{
                          backgroundColor: isLightMode ? '#ffffff' : '#374151',
                          color: isLightMode ? '#0f172a' : '#ffffff',
                          borderColor: isLightMode ? '#d1d5db' : '#4b5563'
                        }}
                      >
                        <option value={1000}>1 km</option>
                        <option value={2000}>2 km</option>
                        <option value={5000}>5 km</option>
                      </select>
                      <select
                        value={transportMode}
                        onChange={(e) => setTransportMode(e.target.value)}
                        className="px-3 py-2 border rounded-lg text-sm"
                        style={{
                          backgroundColor: isLightMode ? '#ffffff' : '#374151',
                          color: isLightMode ? '#0f172a' : '#ffffff',
                          borderColor: isLightMode ? '#d1d5db' : '#4b5563'
                        }}
                      >
                        <option value="all">All Modes</option>
                        <option value="walking">Walking</option>
                        <option value="cycling">Cycling</option>
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        fetchNearbyBuddies();
                        fetchPendingRequests();
                        fetchAcceptedBuddies();
                        fetchGroupRoutes();
                      }}
                      className="w-full px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                      style={{ backgroundColor: '#06d6a0', color: '#0f172a' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#06d6a0'}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Searching...' : 'Refresh'}
                    </button>
                  </div>

                  {/* Tabs */}
                  <div
                    className="flex border-b mb-4"
                    style={{ borderColor: isLightMode ? '#e5e7eb' : '#374151' }}
                  >
                    {[
                      { id: 'nearby', label: `Nearby (${buddies.length})` },
                      { id: 'pending', label: `Requests (${pendingRequests.filter(r => r.is_receiver).length})` },
                      { id: 'accepted', label: `My Buddies (${acceptedBuddies.length})` },
                      { id: 'routes', label: '🗺️ Routes', hasIcon: true }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 px-2 py-3 text-xs font-medium ${activeTab === tab.id ? 'border-b-2' : ''}`}
                        style={{
                          color: activeTab === tab.id ? '#06d6a0' : (isLightMode ? '#6b7280' : '#9ca3af'),
                          borderColor: activeTab === tab.id ? '#06d6a0' : 'transparent'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  <div className="space-y-3">
                    {error && (
                      <div
                        className="rounded-lg p-3 border"
                        style={{
                          backgroundColor: isLightMode ? '#fef2f2' : 'rgba(239, 68, 68, 0.1)',
                          borderColor: isLightMode ? '#fecaca' : 'rgba(239, 68, 68, 0.3)',
                          color: isLightMode ? '#991b1b' : '#fca5a5'
                        }}
                      >
                        <p className="text-sm">{error}</p>
                      </div>
                    )}

                    {/* NEARBY TAB */}
                    {activeTab === 'nearby' && (
                      <>
                        {isLoading ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: '#06d6a0' }}></div>
                          </div>
                        ) : buddies.length === 0 ? (
                          <div className="text-center py-8">
                            <div className="text-4xl mb-2">👥</div>
                            <p style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}>No buddies found nearby</p>
                            <p className="text-sm mt-1" style={{ color: isLightMode ? '#9ca3af' : '#6b7280' }}>
                              Try increasing the search radius
                            </p>
                          </div>
                        ) : (
                          buddies.map((buddy) => (
                            <BuddyCard key={buddy.id} buddy={buddy} />
                          ))
                        )}
                      </>
                    )}

                    {/* PENDING REQUESTS TAB */}
                    {activeTab === 'pending' && (
                      <>
                        {pendingRequests.filter(r => r.is_receiver).length === 0 ? (
                          <div className="text-center py-8">
                            <div className="text-4xl mb-2">⏳</div>
                            <p style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}>No pending requests</p>
                          </div>
                        ) : (
                          pendingRequests
                            .filter(r => r.is_receiver)
                            .map((request) => (
                              <BuddyCard
                                key={request.id}
                                buddy={{
                                  ...request,
                                  name: request.sender_name,
                                  transport_mode: request.sender_transport_mode,
                                  request_id: request.id,
                                  is_sender: false
                                }}
                                isRequest={true}
                              />
                            ))
                        )}
                      </>
                    )}

                    {/* ACCEPTED BUDDIES TAB */}
                    {activeTab === 'accepted' && (
                      <>
                        {acceptedBuddies.length === 0 ? (
                          <div className="text-center py-8">
                            <div className="text-4xl mb-2">✓</div>
                            <p style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}>No connected buddies yet</p>
                            <p className="text-sm mt-1" style={{ color: isLightMode ? '#9ca3af' : '#6b7280' }}>
                              Send requests to nearby buddies to connect!
                            </p>
                          </div>
                        ) : (
                          acceptedBuddies.map((buddy) => (
                            <BuddyCard key={buddy.buddy_id} buddy={buddy} isAccepted={true} />
                          ))
                        )}
                      </>
                    )}

                    {/* ROUTES TAB */}
                    {activeTab === 'routes' && (
                      <div className="space-y-4">
                        {/* Plan Your Route */}
                        <div
                          className="rounded-lg p-4 border"
                          style={{
                            backgroundColor: isLightMode ? '#f9fafb' : 'rgba(59, 130, 246, 0.1)',
                            borderColor: isLightMode ? '#e5e7eb' : 'rgba(59, 130, 246, 0.3)'
                          }}
                        >
                          <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: isLightMode ? '#0f172a' : '#ffffff' }}>
                            🧭 Plan Your Route
                          </h4>

                          {/* Start Location */}
                          <div className="relative mb-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <span className="text-green-500">●</span>
                              <input
                                type="text"
                                value={routeStart}
                                onChange={(e) => {
                                  setRouteStart(e.target.value);
                                  searchLocation(e.target.value, 'start');
                                }}
                                onFocus={() => startSuggestions.length > 0 && setShowStartSuggestions(true)}
                                placeholder="Start location..."
                                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                                style={{
                                  backgroundColor: isLightMode ? '#ffffff' : '#374151',
                                  color: isLightMode ? '#0f172a' : '#ffffff',
                                  borderColor: isLightMode ? '#d1d5db' : '#4b5563'
                                }}
                              />
                              {routeStart && (
                                <button onClick={() => clearRoute('start')} className="p-1">
                                  ✕
                                </button>
                              )}
                            </div>
                            {showStartSuggestions && startSuggestions.length > 0 && (
                              <div
                                className="absolute left-6 right-0 mt-1 border rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto"
                                style={{
                                  backgroundColor: isLightMode ? '#ffffff' : '#374151',
                                  borderColor: isLightMode ? '#d1d5db' : '#4b5563'
                                }}
                              >
                                {startSuggestions.map((s, i) => (
                                  <button
                                    key={i}
                                    onClick={() => selectLocation(s, 'start')}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 truncate"
                                    style={{ color: isLightMode ? '#0f172a' : '#ffffff' }}
                                  >
                                    {s.display_name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* End Location */}
                          <div className="relative mb-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <span className="text-red-500">●</span>
                              <input
                                type="text"
                                value={routeEnd}
                                onChange={(e) => {
                                  setRouteEnd(e.target.value);
                                  searchLocation(e.target.value, 'end');
                                }}
                                onFocus={() => endSuggestions.length > 0 && setShowEndSuggestions(true)}
                                placeholder="End location..."
                                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                                style={{
                                  backgroundColor: isLightMode ? '#ffffff' : '#374151',
                                  color: isLightMode ? '#0f172a' : '#ffffff',
                                  borderColor: isLightMode ? '#d1d5db' : '#4b5563'
                                }}
                              />
                              {routeEnd && (
                                <button onClick={() => clearRoute('end')} className="p-1">
                                  ✕
                                </button>
                              )}
                            </div>
                            {showEndSuggestions && endSuggestions.length > 0 && (
                              <div
                                className="absolute left-6 right-0 mt-1 border rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto"
                                style={{
                                  backgroundColor: isLightMode ? '#ffffff' : '#374151',
                                  borderColor: isLightMode ? '#d1d5db' : '#4b5563'
                                }}
                              >
                                {endSuggestions.map((s, i) => (
                                  <button
                                    key={i}
                                    onClick={() => selectLocation(s, 'end')}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 truncate"
                                    style={{ color: isLightMode ? '#0f172a' : '#ffffff' }}
                                  >
                                    {s.display_name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={findRouteAndBuddies}
                            disabled={!startCoords || !endCoords || isSearchingRoute}
                            className="w-full px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                            style={{
                              backgroundColor: startCoords && endCoords ? '#3b82f6' : '#9ca3af',
                              color: '#ffffff'
                            }}
                          >
                            🔍 {isSearchingRoute ? 'Searching...' : 'Find Route & Buddies'}
                          </button>
                        </div>

                        {/* Create Group Route Section */}
                        {showCreateGroupRoute && (
                          <div
                            className="rounded-lg p-4 border"
                            style={{
                              backgroundColor: isLightMode ? '#f9fafb' : 'rgba(139, 92, 246, 0.1)',
                              borderColor: isLightMode ? '#e5e7eb' : 'rgba(139, 92, 246, 0.3)'
                            }}
                          >
                            <h4 className="font-semibold mb-3" style={{ color: isLightMode ? '#0f172a' : '#ffffff' }}>
                              Create Group Route & Invite Buddies
                            </h4>

                            <input
                              type="text"
                              value={routeName}
                              onChange={(e) => setRouteName(e.target.value)}
                              placeholder="Route name (optional)"
                              className="w-full px-3 py-2 border rounded-lg text-sm mb-3"
                              style={{
                                backgroundColor: isLightMode ? '#ffffff' : '#374151',
                                color: isLightMode ? '#0f172a' : '#ffffff',
                                borderColor: isLightMode ? '#d1d5db' : '#4b5563'
                              }}
                            />

                            <p className="text-sm mb-2" style={{ color: isLightMode ? '#64748b' : '#9ca3af' }}>
                              Select buddies to invite:
                            </p>

                            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                              {acceptedBuddies.length === 0 ? (
                                <p className="text-sm" style={{ color: isLightMode ? '#9ca3af' : '#6b7280' }}>
                                  No connected buddies yet. Connect with buddies first!
                                </p>
                              ) : (
                                acceptedBuddies.map((buddy) => (
                                  <label
                                    key={buddy.buddy_id}
                                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer"
                                    style={{ backgroundColor: isLightMode ? '#ffffff' : '#374151' }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedBuddiesForRoute.includes(buddy.buddy_id)}
                                      onChange={() => toggleBuddySelection(buddy.buddy_id)}
                                      className="w-4 h-4 rounded"
                                    />
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                      {(buddy.buddy_name || 'UN').substring(0, 2).toUpperCase()}
                                    </div>
                                    <span style={{ color: isLightMode ? '#0f172a' : '#ffffff' }}>
                                      {buddy.buddy_name}
                                    </span>
                                  </label>
                                ))
                              )}
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={createGroupRoute}
                                className="flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                                style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
                              >
                                Create & Send Invites ({selectedBuddiesForRoute.length})
                              </button>
                              <button
                                onClick={() => {
                                  setShowCreateGroupRoute(false);
                                  setSelectedBuddiesForRoute([]);
                                  setRouteName('');
                                }}
                                className="px-4 py-2 rounded-lg font-medium text-sm"
                                style={{
                                  backgroundColor: isLightMode ? '#f3f4f6' : '#374151',
                                  color: isLightMode ? '#374151' : '#d1d5db'
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* My Group Routes */}
                        <div>
                          <h4 className="font-semibold mb-3" style={{ color: isLightMode ? '#0f172a' : '#ffffff' }}>
                            My Group Routes ({groupRoutes.length})
                          </h4>

                          {groupRoutes.length === 0 ? (
                            <div
                              className="text-center py-8 rounded-lg"
                              style={{ backgroundColor: isLightMode ? '#f9fafb' : 'rgba(30, 41, 59, 0.5)' }}
                            >
                              <div className="text-4xl mb-2">🗺️</div>
                              <p style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}>No group routes yet</p>
                              <p className="text-sm mt-1" style={{ color: isLightMode ? '#9ca3af' : '#6b7280' }}>
                                Plan a route and invite buddies to get started!
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {groupRoutes.map((route) => (
                                <GroupRouteCard key={route.id} route={route} />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Buddies on Route */}
                        {routeBuddies.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-3" style={{ color: isLightMode ? '#0f172a' : '#ffffff' }}>
                              Buddies on Your Route ({routeBuddies.length})
                            </h4>
                            <div className="space-y-3">
                              {routeBuddies.map((buddy) => (
                                <BuddyCard key={buddy.id} buddy={buddy} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Toggle Button - Always visible, higher z-index, positioned lower */}
            <button
              onClick={() => setShowBuddyPanel(!showBuddyPanel)}
              className="fixed z-[70] top-28 transition-all duration-300 shadow-2xl"
              style={{
                left: showBuddyPanel 
                  ? (isLgScreen ? '500px' : isMdScreen ? '450px' : '90vw') 
                  : '0px',
              }}
            >
            <div
              className="flex items-center gap-2 px-4 py-4"
              style={{
                backgroundColor: isLightMode ? '#0f172a' : '#06d6a0',
                borderRadius: '0 16px 16px 0',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke={isLightMode ? '#ffffff' : '#0f172a'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6 transition-transform duration-200"
                style={{ transform: showBuddyPanel ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              {!showBuddyPanel && (
                <span 
                  className="font-semibold text-base pr-1 whitespace-nowrap" 
                  style={{ color: isLightMode ? '#ffffff' : '#0f172a' }}
                >
                  Find Buddy
                </span>
              )}
            </div>
          </button>

          {/* Map Area */}
          <div
            className="transition-all duration-300"
            style={{ marginLeft: showBuddyPanel && isMdScreen ? (isLgScreen ? '500px' : '450px') : '0' }}
          >
            <div className="space-y-2 p-2">
              <div
                className="border-2 rounded-2xl p-2"
                style={{
                  backgroundColor: isLightMode ? '#ffffff' : '#1e293b',
                  borderColor: isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'
                }}
              >
                {/* Map Header */}
                <div className="flex items-center justify-end mb-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      const londonCenter = [51.5074, -0.1278];
                      setUserLocation(londonCenter);
                      fetchNearbyBuddies();
                      fetchHazards();
                      const span = e.currentTarget.querySelector('.london-text');
                      if (span) {
                        span.textContent = '✓ Set to London';
                        setTimeout(() => {
                          span.textContent = 'Set to London';
                        }, 1500);
                      }
                    }}
                    className="text-sm transition-all duration-200 flex items-center gap-1.5 focus:outline-none"
                    style={{
                      backgroundColor: 'transparent',
                      color: isLightMode ? '#1e293b' : '#06d6a0',
                      border: 'none',
                      padding: 0,
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = isLightMode ? '#06d6a0' : '#ffffff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = isLightMode ? '#1e293b' : '#06d6a0'}
                    title="Set current location to London for testing"
                  >
                    <span className="text-base">🇬🇧</span>
                    <span className="font-medium london-text hover:underline">Set to London</span>
                  </button>
                </div>

                <Map
                  center={userLocation || [51.5074, -0.1278]}
                  zoom={13}
                  hazards={hazards.filter(h => h.latitude && h.longitude)}
                  height={isMdScreen ? "calc(100vh - 200px)" : "550px"}
                  routeCoordinates={routeCoordinates}
                  markers={[
                    // User location
                    ...(userLocation && userLocation[0] && userLocation[1] ? [{
                      position: userLocation,
                      color: '#10b981',
                      type: 'marker',
                      popup: <div className="text-sm"><strong>You</strong><br/>Your current location</div>
                    }] : []),
                    // Buddy markers
                    ...(buddies.map(buddy => ({
                      position: [
                        buddy.lat || userLocation[0] + (Math.random() - 0.5) * 0.02,
                        buddy.lon || userLocation[1] + (Math.random() - 0.5) * 0.02
                      ],
                      color: '#3b82f6',
                      type: 'buddy',
                      popup: <div className="text-sm"><strong>{buddy.name || buddy.buddy_name}</strong><br/>{buddy.distance_km} km away</div>
                    }))),
                    // Start marker
                    ...(startCoords ? [{
                      position: startCoords,
                      color: '#22c55e',
                      type: 'start',
                      popup: <div className="text-sm"><strong>Start</strong></div>
                    }] : []),
                    // End marker
                    ...(endCoords ? [{
                      position: endCoords,
                      color: '#ef4444',
                      type: 'end',
                      popup: <div className="text-sm"><strong>End</strong></div>
                    }] : [])
                  ]}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Profile Modal */}
        {selectedBuddy && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedBuddy(null)}
          >
            <div
              className="rounded-lg shadow-xl max-w-md w-full p-6"
              style={{ backgroundColor: isLightMode ? '#ffffff' : '#1e293b' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                    {(selectedBuddy.name || selectedBuddy.buddy_name || 'UN').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold" style={{ color: isLightMode ? '#0f172a' : '#ffffff' }}>
                      {selectedBuddy.name || selectedBuddy.buddy_name}
                    </h3>
                    <p className="text-sm" style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}>
                      {selectedBuddy.email || selectedBuddy.buddy_email}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedBuddy(null)} style={{ color: isLightMode ? '#9ca3af' : '#6b7280' }}>
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2" style={{ color: isLightMode ? '#374151' : '#d1d5db' }}>
                  <span>📍</span>
                  <span>{selectedBuddy.distance_km || '0.00'} km away</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="px-3 py-1 rounded-full text-sm capitalize"
                    style={{
                      backgroundColor: isLightMode ? '#f3f4f6' : '#374151',
                      color: isLightMode ? '#374151' : '#d1d5db'
                    }}
                  >
                    {selectedBuddy.transport_mode || selectedBuddy.buddy_transport_mode || 'walking'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                    Safety: {((selectedBuddy.safety_priority || 0.5) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                {!selectedBuddy.request_id && !selectedBuddy.buddy_id && (
                  <button
                    onClick={() => {
                      sendBuddyRequest(selectedBuddy.id);
                      setSelectedBuddy(null);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
                    style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
                  >
                    Send Request
                  </button>
                )}
                <button
                  onClick={() => setSelectedBuddy(null)}
                  className="flex-1 px-4 py-2 border rounded-lg font-medium"
                  style={{
                    borderColor: isLightMode ? '#d1d5db' : '#4b5563',
                    color: isLightMode ? '#374151' : '#d1d5db'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
