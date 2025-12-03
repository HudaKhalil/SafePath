'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import AddressAutocompleteInput from '../../components/AddressAutocompleteInput';
import { Users, MapPin, MessageCircle, CheckCircle, Clock, X, Route, Search, Filter, Navigation } from 'lucide-react';

const Map = dynamic(() => import('../../components/Map'), { ssr: false });

const API_URL = 'http://localhost:5001';

export default function FindBuddy() {
  const [showBuddyPanel, setShowBuddyPanel] = useState(false);
  const [userLocation, setUserLocation] = useState([51.5074, -0.1278]);
  const [isLightMode, setIsLightMode] = useState(false);
  const [isMdScreen, setIsMdScreen] = useState(false);

  // Buddy state
  const [activeTab, setActiveTab] = useState('nearby');
  const [buddies, setBuddies] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [acceptedBuddies, setAcceptedBuddies] = useState([]);
  const [radius, setRadius] = useState(5000);
  const [transportMode, setTransportMode] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedBuddy, setSelectedBuddy] = useState(null);

  // Route planning state
  const [showRoutePlanner, setShowRoutePlanner] = useState(false);
  const [routeStart, setRouteStart] = useState('');
  const [routeEnd, setRouteEnd] = useState('');
  const [routeBuddies, setRouteBuddies] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState(null);
  const [selectedBuddiesForRoute, setSelectedBuddiesForRoute] = useState([]);
  const [groupRoutes, setGroupRoutes] = useState([]);
  const [routeName, setRouteName] = useState('');
  const [showCreateGroupRoute, setShowCreateGroupRoute] = useState(false);

  const getToken = () => {
    if (typeof window !== 'undefined') {
      return document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
    }
    return null;
  };

  // Track light/dark mode
  useEffect(() => {
    setIsLightMode(!document.documentElement.classList.contains('dark'));
    
    const observer = new MutationObserver(() => {
      setIsLightMode(!document.documentElement.classList.contains('dark'));
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  // Track screen size for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMdScreen(window.innerWidth >= 768);
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
          updateUserLocation(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.log(`ℹ️ Using default location (geolocation ${error.message.toLowerCase()})`);
        },
        {
          timeout: 3000,
          enableHighAccuracy: false,
          maximumAge: 300000
        }
      );
    }
  }, []);

  const updateUserLocation = async (lat, lon) => {
    try {
      const token = getToken();
      await fetch(`${API_URL}/api/buddies/my-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ lat, lon, transport_mode: transportMode !== 'all' ? transportMode : 'walking' })
      });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const fetchNearbyBuddies = async () => {
    if (!userLocation) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const token = getToken();
      const params = new URLSearchParams({
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
        setBuddies(data.data.buddies);
      } else {
        setError(data.message || 'Failed to fetch buddies');
      }
    } catch (error) {
      console.error('Error fetching buddies:', error);
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
        setPendingRequests(data.data.requests);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
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
        setAcceptedBuddies(data.data.buddies);
      }
    } catch (error) {
      console.error('Error fetching accepted buddies:', error);
    }
  };

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
        alert('Buddy request sent!');
        fetchNearbyBuddies();
        fetchPendingRequests();
      } else {
        alert(data.message || 'Failed to send request');
      }
    } catch (error) {
      console.error('Error sending request:', error);
      alert('Failed to send request');
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
        fetchPendingRequests();
        fetchAcceptedBuddies();
        fetchNearbyBuddies();
        if (action === 'accept') {
          alert('Buddy request accepted! You can now plan routes together.');
        }
      } else {
        alert(data.message || `Failed to ${action} request`);
      }
    } catch (error) {
      console.error('Error responding to request:', error);
      alert(`Failed to ${action} request`);
    }
  };

  const searchRoute = async () => {
    if (!routeStart || !routeEnd) {
      alert('Please enter both start and end locations');
      return;
    }

    setIsLoading(true);
    try {
      const startGeo = await geocodeAddress(routeStart);
      const endGeo = await geocodeAddress(routeEnd);

      if (!startGeo || !endGeo) {
        alert('Could not find one or more locations');
        return;
      }

      const route = await getRoute(startGeo, endGeo, transportMode !== 'all' ? transportMode : 'walking');
      setSelectedRoute(route);
      setRouteCoordinates({ start: startGeo, end: endGeo });

      await findRouteBuddies(startGeo, endGeo);
      setShowCreateGroupRoute(true);
    } catch (error) {
      console.error('Error planning route:', error);
      alert('Failed to plan route');
    } finally {
      setIsLoading(false);
    }
  };

  const geocodeAddress = async (address) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return { 
          lat: parseFloat(data[0].lat), 
          lon: parseFloat(data[0].lon),
          display_name: data[0].display_name 
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  const getRoute = async (start, end, mode) => {
    try {
      const response = await fetch(`${API_URL}/api/routes/find`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        credentials: 'include',
        body: JSON.stringify({
          fromLat: start.lat,
          fromLon: start.lon,
          toLat: end.lat,
          toLon: end.lon,
          mode: mode
        })
      });
      const data = await response.json();
      if (data.success) {
        return data.data.safest || data.data.fastest;
      }
      return null;
    } catch (error) {
      console.error('Error getting route:', error);
      return null;
    }
  };

  const findRouteBuddies = async (start, end) => {
    try {
      const token = getToken();
      const params = new URLSearchParams({
        start_lat: start.lat.toString(),
        start_lon: start.lon.toString(),
        end_lat: end.lat.toString(),
        end_lon: end.lon.toString(),
        radius: '2000'
      });

      const response = await fetch(`${API_URL}/api/buddies/route-buddies?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        setRouteBuddies(data.data.buddies);
      }
    } catch (error) {
      console.error('Error finding route buddies:', error);
    }
  };

  useEffect(() => {
    if (userLocation) {
      fetchNearbyBuddies();
      fetchPendingRequests();
      fetchAcceptedBuddies();
      fetchGroupRoutes();
    }
  }, [userLocation, radius, transportMode]);

  const fetchGroupRoutes = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/buddies/group-routes`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setGroupRoutes(data.data.routes);
      }
    } catch (error) {
      console.error('Error fetching group routes:', error);
    }
  };

  const createGroupRoute = async () => {
    if (!routeCoordinates || selectedBuddiesForRoute.length === 0) {
      setError('Please select at least one buddy to invite');
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
          route_name: routeName || `Route to ${routeEnd}`,
          start_lat: routeCoordinates.start.lat,
          start_lon: routeCoordinates.start.lon,
          end_lat: routeCoordinates.end.lat,
          end_lon: routeCoordinates.end.lon,
          start_address: routeStart,
          end_address: routeEnd,
          transport_mode: transportMode !== 'all' ? transportMode : 'walking',
          buddy_ids: selectedBuddiesForRoute
        })
      });

      const data = await response.json();
      if (data.success) {
        setError(null);
        setShowCreateGroupRoute(false);
        setSelectedBuddiesForRoute([]);
        setRouteName('');
        await fetchGroupRoutes();
        alert('Group route created and invitations sent!');
      } else {
        setError(data.message || 'Failed to create group route');
      }
    } catch (error) {
      console.error('Error creating group route:', error);
      setError('Failed to create group route');
    }
  };

  const joinGroupRoute = async (routeId) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/buddies/group-routes/${routeId}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        await fetchGroupRoutes();
        alert('Successfully joined the route!');
      } else {
        setError(data.message || 'Failed to join route');
      }
    } catch (error) {
      console.error('Error joining route:', error);
      setError('Failed to join route');
    }
  };

  const leaveGroupRoute = async (routeId) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/buddies/group-routes/${routeId}/leave`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        await fetchGroupRoutes();
        alert(data.message || 'Left the route successfully');
      } else {
        setError(data.message || 'Failed to leave route');
      }
    } catch (error) {
      console.error('Error leaving route:', error);
      setError('Failed to leave route');
    }
  };

  const getStatusBadge = (buddy) => {
    if (buddy.request_id) {
      if (buddy.request_status === 'pending') {
        return buddy.is_sender ? (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Pending</span>
        ) : (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Respond</span>
        );
      } else if (buddy.request_status === 'accepted') {
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1"><CheckCircle size={12} /> Connected</span>;
      }
    }
    return null;
  };

  const BuddyCard = ({ buddy, showActions = true }) => (
    <div className="rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border" style={{
      backgroundColor: isLightMode ? '#ffffff' : '#1e293b',
      borderColor: isLightMode ? '#e5e7eb' : '#374151'
    }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
            {buddy.name ? buddy.name.substring(0, 2).toUpperCase() : buddy.buddy_name?.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: isLightMode ? '#0f172a' : '#ffffff' }}>
              {buddy.name || buddy.buddy_name || buddy.sender_name || buddy.receiver_name}
            </h3>
            <div className="flex items-center gap-1 text-sm" style={{ color: isLightMode ? '#64748b' : '#9ca3af' }}>
              <MapPin size={14} />
              <span>{buddy.distance_km || '0'} km away</span>
            </div>
          </div>
        </div>
        {getStatusBadge(buddy)}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="px-3 py-1 rounded-full text-sm capitalize" style={{
          backgroundColor: isLightMode ? '#f3f4f6' : '#374151',
          color: isLightMode ? '#374151' : '#d1d5db'
        }}>
          {buddy.transport_mode || buddy.buddy_transport_mode || 'walking'}
        </span>
        {buddy.safety_priority !== undefined && (
          <span className="px-3 py-1 rounded-full text-sm" style={{
            backgroundColor: isLightMode ? '#dcfce7' : 'rgba(34, 197, 94, 0.2)',
            color: isLightMode ? '#166534' : '#86efac'
          }}>
            Safety: {(buddy.safety_priority * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {showActions && (
        <div className="flex gap-2 mt-4">
          {!buddy.request_id && (
            <button
              onClick={() => sendBuddyRequest(buddy.id || buddy.buddy_id)}
              className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              style={{
                backgroundColor: '#3b82f6',
                color: '#ffffff'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
            >
              Send Request
            </button>
          )}
          {buddy.request_id && buddy.request_status === 'pending' && !buddy.is_sender && (
            <>
              <button
                onClick={() => respondToRequest(buddy.request_id, 'accept')}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                style={{
                  backgroundColor: '#10b981',
                  color: '#ffffff'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
              >
                Accept
              </button>
              <button
                onClick={() => respondToRequest(buddy.request_id, 'reject')}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
              >
                Reject
              </button>
            </>
          )}
          {(buddy.request_status === 'accepted' || buddy.buddy_id) && (
            <button
              onClick={() => {
                setShowRoutePlanner(true);
                setActiveTab('routes');
              }}
              className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2"
              style={{
                backgroundColor: '#8b5cf6',
                color: '#ffffff'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#7c3aed'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#8b5cf6'}
            >
              <Route size={16} />
              Plan Route
            </button>
          )}
          <button
            onClick={() => setSelectedBuddy(buddy)}
            className="px-4 py-2 border rounded-lg font-medium transition-colors text-sm"
            style={{
              borderColor: isLightMode ? '#d1d5db' : '#4b5563',
              color: isLightMode ? '#374151' : '#d1d5db',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = isLightMode ? '#f9fafb' : '#374151'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            Profile
          </button>
        </div>
      )}
    </div>
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen pt-5">
        {/* Main Content Section */}
        <section className="relative min-h-screen pb-8" style={{ 
          backgroundColor: isLightMode ? '#ffffff' : '#0f172a' 
        }}>
          {/* Side Panel */}
         <div 
  className="fixed left-0 top-0 bottom-0 z-50 w-full md:w-96 lg:w-[600px] transition-transform duration-300 shadow-2xl overflow-hidden"
  style={{
    transform: showBuddyPanel ? 'translateX(0)' : 'translateX(-100%)',
  }}
>

            <div className="h-full overflow-y-auto" style={{
              backgroundColor: isLightMode ? '#ffffff' : '#1e293b'
            }}>
              <div className="p-4 pb-24">
                <div className="border-2 rounded-2xl p-4 md:p-6" style={{ 
                  backgroundColor: isLightMode ? '#ffffff' : '#1e293b',
                  borderColor: isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'
                }}>
                  {/* Header */}
                  <div className="border-b pb-4 mb-4" style={{
                    borderColor: isLightMode ? '#e5e7eb' : '#374151'
                  }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div>
                        <h1 className="text-2xl font-bold" style={{ color: isLightMode ? '#0f172a' : '#06d6a0' }}>
                          Find Buddies
                        </h1>
                        <p className="text-sm mt-1" style={{ color: isLightMode ? '#64748b' : '#9ca3af' }}>
                          Connect & travel together
                        </p>
                      </div>
                    </div>

                    {/* Filters */}
                    <div className="space-y-3">
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
                        }}
                        className="w-full px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                        style={{
                          backgroundColor: '#06d6a0',
                          color: '#0f172a'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#06d6a0'}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Searching...' : 'Refresh'}
                      </button>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b mb-4" style={{
                    borderColor: isLightMode ? '#e5e7eb' : '#374151'
                  }}>
                    <button
                      onClick={() => setActiveTab('nearby')}
                      className={`flex-1 px-4 py-3 text-sm font-medium ${
                        activeTab === 'nearby'
                          ? 'border-b-2'
                          : ''
                      }`}
                      style={{
                        color: activeTab === 'nearby' ? '#06d6a0' : (isLightMode ? '#6b7280' : '#9ca3af'),
                        borderColor: activeTab === 'nearby' ? '#06d6a0' : 'transparent'
                      }}
                    >
                      Nearby ({buddies.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('pending')}
                      className={`flex-1 px-4 py-3 text-sm font-medium ${
                        activeTab === 'pending'
                          ? 'border-b-2'
                          : ''
                      }`}
                      style={{
                        color: activeTab === 'pending' ? '#06d6a0' : (isLightMode ? '#6b7280' : '#9ca3af'),
                        borderColor: activeTab === 'pending' ? '#06d6a0' : 'transparent'
                      }}
                    >
                      Requests ({pendingRequests.filter(r => r.is_receiver).length})
                    </button>
                    <button
                      onClick={() => setActiveTab('accepted')}
                      className={`flex-1 px-4 py-3 text-sm font-medium ${
                        activeTab === 'accepted'
                          ? 'border-b-2'
                          : ''
                      }`}
                      style={{
                        color: activeTab === 'accepted' ? '#06d6a0' : (isLightMode ? '#6b7280' : '#9ca3af'),
                        borderColor: activeTab === 'accepted' ? '#06d6a0' : 'transparent'
                      }}
                    >
                      My Buddies ({acceptedBuddies.length})
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('routes');
                        setShowRoutePlanner(true);
                      }}
                      className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-1 ${
                        activeTab === 'routes'
                          ? 'border-b-2'
                          : ''
                      }`}
                      style={{
                        color: activeTab === 'routes' ? '#06d6a0' : (isLightMode ? '#6b7280' : '#9ca3af'),
                        borderColor: activeTab === 'routes' ? '#06d6a0' : 'transparent'
                      }}
                    >
                      <Route size={16} />
                      Routes
                    </button>
                  </div>

                  {/* Content */}
                  <div className="space-y-3">
                    {error && (
                      <div className="rounded-lg p-3 border" style={{
                        backgroundColor: isLightMode ? '#fef2f2' : 'rgba(239, 68, 68, 0.1)',
                        borderColor: isLightMode ? '#fecaca' : 'rgba(239, 68, 68, 0.3)',
                        color: isLightMode ? '#991b1b' : '#fca5a5'
                      }}>
                        <p className="text-sm">{error}</p>
                      </div>
                    )}

                    {/* Nearby Tab */}
                    {activeTab === 'nearby' && (
                      <>
                        {isLoading ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: '#06d6a0' }}></div>
                          </div>
                        ) : buddies.length === 0 ? (
                          <div className="text-center py-8">
                            <Users className="mx-auto mb-2" size={48} style={{ color: isLightMode ? '#9ca3af' : '#6b7280' }} />
                            <p style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}>No buddies found</p>
                          </div>
                        ) : (
                          buddies.map((buddy) => <BuddyCard key={buddy.id} buddy={buddy} />)
                        )}
                      </>
                    )}

                    {/* Pending Tab */}
                    {activeTab === 'pending' && (
                      <>
                        {pendingRequests.filter(r => r.is_receiver).length === 0 ? (
                          <div className="text-center py-8">
                            <Clock className="mx-auto mb-2" size={48} style={{ color: isLightMode ? '#9ca3af' : '#6b7280' }} />
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
                                  email: request.sender_email,
                                  transport_mode: request.sender_transport_mode,
                                  request_id: request.id,
                                  request_status: 'pending',
                                  is_sender: false
                                }}
                              />
                            ))
                        )}
                      </>
                    )}

                    {/* Accepted Tab */}
                    {activeTab === 'accepted' && (
                      <>
                        {acceptedBuddies.length === 0 ? (
                          <div className="text-center py-8">
                            <CheckCircle className="mx-auto mb-2" size={48} style={{ color: isLightMode ? '#9ca3af' : '#6b7280' }} />
                            <p style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}>No connected buddies yet</p>
                          </div>
                        ) : (
                          acceptedBuddies.map((buddy) => <BuddyCard key={buddy.buddy_id} buddy={buddy} />)
                        )}
                      </>
                    )}

                    {/* Routes Tab */}
                    {activeTab === 'routes' && (
                      <div className="space-y-4">
                        <div className="rounded-lg p-4 border" style={{
                          backgroundColor: isLightMode ? '#eff6ff' : 'rgba(59, 130, 246, 0.1)',
                          borderColor: isLightMode ? '#bfdbfe' : 'rgba(59, 130, 246, 0.3)'
                        }}>
                          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{
                            color: isLightMode ? '#1e3a8a' : '#93c5fd'
                          }}>
                            <Navigation size={20} />
                            Plan Your Route
                          </h3>
                          <div className="space-y-3">
                            <AddressAutocompleteInput
                              value={routeStart}
                              onChange={setRouteStart}
                              placeholder="Start location..."
                            />
                            <AddressAutocompleteInput
                              value={routeEnd}
                              onChange={setRouteEnd}
                              placeholder="End location..."
                            />
                            <button
                              onClick={searchRoute}
                              disabled={isLoading || !routeStart || !routeEnd}
                              className="w-full px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                              style={{
                                backgroundColor: (!isLoading && routeStart && routeEnd) ? '#06d6a0' : '#9ca3af',
                                color: '#0f172a'
                              }}
                              onMouseEnter={(e) => {
                                if (!isLoading && routeStart && routeEnd) {
                                  e.target.style.backgroundColor = '#059669';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isLoading && routeStart && routeEnd) {
                                  e.target.style.backgroundColor = '#06d6a0';
                                }
                              }}
                            >
                              <Search size={16} />
                              Find Route & Buddies
                            </button>
                          </div>
                        </div>

                        {/* Create Group Route Section */}
                        {showCreateGroupRoute && acceptedBuddies.length > 0 && (
                          <div className="rounded-lg p-4 border" style={{
                            backgroundColor: isLightMode ? '#f0fdf4' : 'rgba(34, 197, 94, 0.1)',
                            borderColor: isLightMode ? '#bbf7d0' : 'rgba(34, 197, 94, 0.3)'
                          }}>
                            <h3 className="font-semibold mb-3" style={{
                              color: isLightMode ? '#0f172a' : '#ffffff'
                            }}>
                              Create Group Route & Invite Buddies
                            </h3>
                            <input
                              type="text"
                              placeholder="Route name (optional)"
                              value={routeName}
                              onChange={(e) => setRouteName(e.target.value)}
                              className="w-full px-3 py-2 mb-3 border rounded-lg"
                              style={{
                                backgroundColor: isLightMode ? '#ffffff' : '#374151',
                                color: isLightMode ? '#0f172a' : '#ffffff',
                                borderColor: isLightMode ? '#d1d5db' : '#4b5563'
                              }}
                            />
                            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                              <p className="text-sm mb-2" style={{
                                color: isLightMode ? '#6b7280' : '#9ca3af'
                              }}>
                                Select buddies to invite:
                              </p>
                              {acceptedBuddies.map((buddy) => (
                                <label key={buddy.buddy_id} className="flex items-center gap-2 p-2 rounded cursor-pointer" style={{
                                  backgroundColor: 'transparent'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isLightMode ? '#f9fafb' : '#1e293b'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedBuddiesForRoute.includes(buddy.buddy_id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedBuddiesForRoute([...selectedBuddiesForRoute, buddy.buddy_id]);
                                      } else {
                                        setSelectedBuddiesForRoute(selectedBuddiesForRoute.filter(id => id !== buddy.buddy_id));
                                      }
                                    }}
                                    className="w-4 h-4 text-blue-600 rounded"
                                  />
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                      {buddy.buddy_name?.substring(0, 2).toUpperCase()}
                                    </div>
                                    <span className="text-sm" style={{
                                      color: isLightMode ? '#0f172a' : '#ffffff'
                                    }}>
                                      {buddy.buddy_name}
                                    </span>
                                  </div>
                                </label>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={createGroupRoute}
                                disabled={selectedBuddiesForRoute.length === 0}
                                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
                                style={{
                                  backgroundColor: selectedBuddiesForRoute.length > 0 ? '#10b981' : '#9ca3af',
                                  color: '#ffffff'
                                }}
                                onMouseEnter={(e) => {
                                  if (selectedBuddiesForRoute.length > 0) {
                                    e.target.style.backgroundColor = '#059669';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (selectedBuddiesForRoute.length > 0) {
                                    e.target.style.backgroundColor = '#10b981';
                                  }
                                }}
                              >
                                Create & Send Invites ({selectedBuddiesForRoute.length})
                              </button>
                              <button
                                onClick={() => {
                                  setShowCreateGroupRoute(false);
                                  setSelectedBuddiesForRoute([]);
                                }}
                                className="px-4 py-2 border rounded-lg font-medium transition-colors"
                                style={{
                                  borderColor: isLightMode ? '#d1d5db' : '#4b5563',
                                  color: isLightMode ? '#374151' : '#d1d5db',
                                  backgroundColor: 'transparent'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = isLightMode ? '#f9fafb' : '#374151'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* My Group Routes */}
                        <div>
                          <h3 className="font-semibold mb-3" style={{
                            color: isLightMode ? '#0f172a' : '#ffffff'
                          }}>
                            My Group Routes ({groupRoutes.length})
                          </h3>
                          {groupRoutes.length === 0 ? (
                            <div className="text-center py-8 rounded-lg" style={{
                              backgroundColor: isLightMode ? '#f9fafb' : '#1e293b'
                            }}>
                              <Route className="mx-auto mb-2" size={48} style={{ color: isLightMode ? '#9ca3af' : '#6b7280' }} />
                              <p style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}>No group routes yet</p>
                              <p className="text-sm mt-1" style={{ color: isLightMode ? '#9ca3af' : '#6b7280' }}>
                                Plan a route and invite buddies to get started!
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {groupRoutes.map((route) => (
                                <div key={route.id} className="rounded-lg shadow-sm p-4 border" style={{
                                  backgroundColor: isLightMode ? '#ffffff' : '#1e293b',
                                  borderColor: isLightMode ? '#e5e7eb' : '#374151'
                                }}>
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <h4 className="font-semibold" style={{
                                        color: isLightMode ? '#0f172a' : '#ffffff'
                                      }}>
                                        {route.route_name}
                                      </h4>
                                      <div className="text-sm mt-1" style={{
                                        color: isLightMode ? '#6b7280' : '#9ca3af'
                                      }}>
                                        <div className="flex items-center gap-1 mb-1">
                                          <MapPin size={14} className="text-green-600" />
                                          <span>{route.start_address}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <MapPin size={14} className="text-red-600" />
                                          <span>{route.end_address}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      route.status === 'active' ? 'bg-green-100 text-green-800' :
                                      route.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {route.status}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs mb-3" style={{
                                    color: isLightMode ? '#9ca3af' : '#6b7280'
                                  }}>
                                    <span className="flex items-center gap-1">
                                      <Users size={14} />
                                      {route.member_count} member{route.member_count !== 1 ? 's' : ''}
                                    </span>
                                    <span className="capitalize">{route.transport_mode}</span>
                                    {route.is_creator && (
                                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">Creator</span>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    {!route.is_member && (
                                      <button
                                        onClick={() => joinGroupRoute(route.id)}
                                        className="flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors"
                                        style={{
                                          backgroundColor: '#3b82f6',
                                          color: '#ffffff'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
                                      >
                                        Join Route
                                      </button>
                                    )}
                                    {route.is_member && (
                                      <button
                                        onClick={() => {
                                          if (confirm(route.is_creator ? 'Cancel this route? All members will be removed.' : 'Leave this route?')) {
                                            leaveGroupRoute(route.id);
                                          }
                                        }}
                                        className="flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors"
                                        style={{
                                          backgroundColor: '#ef4444',
                                          color: '#ffffff'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
                                      >
                                        {route.is_creator ? 'Cancel Route' : 'Leave Route'}
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        setRouteCoordinates({
                                          start: { lat: route.start_lat, lon: route.start_lon },
                                          end: { lat: route.end_lat, lon: route.end_lon }
                                        });
                                      }}
                                      className="px-3 py-1.5 border rounded text-sm font-medium transition-colors"
                                      style={{
                                        borderColor: isLightMode ? '#d1d5db' : '#4b5563',
                                        color: isLightMode ? '#374151' : '#d1d5db',
                                        backgroundColor: 'transparent'
                                      }}
                                      onMouseEnter={(e) => e.target.style.backgroundColor = isLightMode ? '#f9fafb' : '#374151'}
                                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    >
                                      View on Map
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {routeBuddies.length > 0 && (
                          <div>
                            <h3 className="font-semibold mb-3" style={{
                              color: isLightMode ? '#0f172a' : '#ffffff'
                            }}>
                              Buddies on Your Route ({routeBuddies.length})
                            </h3>
                            {routeBuddies.map((buddy) => <BuddyCard key={buddy.id} buddy={buddy} />)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Toggle Button */}
          <button
            onClick={() => setShowBuddyPanel(!showBuddyPanel)}
            className="absolute z-40 transition-all duration-300"
            style={{
              backgroundColor: 'transparent',
              top: '16px',
              left: showBuddyPanel && isMdScreen ? '484px' : '16px',
            }}
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg" style={{
              backgroundColor: isLightMode ? '#0f172a' : '#06d6a0',
              border: `2px solid ${isLightMode ? '#0f172a' : '#06d6a0'}`
            }}>
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke={isLightMode ? '#ffffff' : '#0f172a'} 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="w-5 h-5 transition-transform duration-200"
                style={{
                  transform: showBuddyPanel ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              <span className="font-medium text-base" style={{ 
                color: isLightMode ? '#ffffff' : '#0f172a' 
              }}>
                {showBuddyPanel ? 'Close' : 'Find Buddy'}
              </span>
            </div>
          </button>

          {/* Main Map Area - Full Screen */}
          <div 
            className="transition-all duration-300"
            style={{
              marginLeft: showBuddyPanel && isMdScreen ? '484px' : '0',
              height: '100vh'
            }}
          >
            <Map
              center={userLocation || [51.5074, -0.1278]}
              zoom={13}
              hazards={[]}
              height="100vh"
              markers={[
                ...(userLocation && userLocation[0] && userLocation[1] ? [{
                  position: userLocation,
                  color: '#10b981',
                  type: 'marker',
                  popup: <div className="text-sm"><strong>Your Location</strong></div>
                }] : []),
                ...(buddies.map(buddy => ({
                  position: [buddy.lat || userLocation[0] + (Math.random() - 0.5) * 0.01, buddy.lon || userLocation[1] + (Math.random() - 0.5) * 0.01],
                  color: '#3b82f6',
                  type: 'buddy',
                  popup: <div className="text-sm"><strong>{buddy.name || buddy.buddy_name}</strong><br/>{buddy.distance_km} km away</div>
                })))
              ]}
            />
          </div>
        </section>

        {/* Profile Modal */}
        {selectedBuddy && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedBuddy(null)}>
            <div className="rounded-lg shadow-xl max-w-md w-full p-6" style={{
              backgroundColor: isLightMode ? '#ffffff' : '#1e293b'
            }} onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                    {selectedBuddy.name?.substring(0, 2).toUpperCase() || 'UN'}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold" style={{
                      color: isLightMode ? '#0f172a' : '#ffffff'
                    }}>
                      {selectedBuddy.name || selectedBuddy.buddy_name}
                    </h3>
                    <p className="text-sm" style={{
                      color: isLightMode ? '#6b7280' : '#9ca3af'
                    }}>
                      {selectedBuddy.email || selectedBuddy.buddy_email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBuddy(null)}
                  style={{
                    color: isLightMode ? '#9ca3af' : '#6b7280'
                  }}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2" style={{
                  color: isLightMode ? '#374151' : '#d1d5db'
                }}>
                  <MapPin size={18} />
                  <span>{selectedBuddy.distance_km} km away</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-sm capitalize" style={{
                    backgroundColor: isLightMode ? '#f3f4f6' : '#374151',
                    color: isLightMode ? '#374151' : '#d1d5db'
                  }}>
                    {selectedBuddy.transport_mode || selectedBuddy.buddy_transport_mode || 'walking'}
                  </span>
                  {selectedBuddy.safety_priority !== undefined && (
                    <span className="px-3 py-1 rounded-full text-sm" style={{
                      backgroundColor: isLightMode ? '#dcfce7' : 'rgba(34, 197, 94, 0.2)',
                      color: isLightMode ? '#166534' : '#86efac'
                    }}>
                      Safety Priority: {(selectedBuddy.safety_priority * 100).toFixed(0)}%
                    </span>
                  )}
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
                    style={{
                      backgroundColor: '#3b82f6',
                      color: '#ffffff'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
                  >
                    Send Request
                  </button>
                )}
                <button
                  onClick={() => setSelectedBuddy(null)}
                  className="px-4 py-2 border rounded-lg font-medium transition-colors"
                  style={{
                    borderColor: isLightMode ? '#d1d5db' : '#4b5563',
                    color: isLightMode ? '#374151' : '#d1d5db',
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = isLightMode ? '#f9fafb' : '#374151'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
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