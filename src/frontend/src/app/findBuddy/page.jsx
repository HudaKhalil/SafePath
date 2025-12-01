'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import AddressAutocompleteInput from '../../components/AddressAutocompleteInput';
import { Users, MapPin, MessageCircle, CheckCircle, Clock, X, Route, Search, Filter, Navigation } from 'lucide-react';

// Dynamic import for map to avoid SSR issues
const MapComponent = dynamic(() => import('../../components/BuddyMap'), { ssr: false });

const API_URL = 'http://localhost:5001';

export default function FindBuddy() {
  // State management
  const [activeTab, setActiveTab] = useState('nearby'); // nearby, pending, accepted, routes
  const [buddies, setBuddies] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [acceptedBuddies, setAcceptedBuddies] = useState([]);
  const [radius, setRadius] = useState(5000);
  const [transportMode, setTransportMode] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedBuddy, setSelectedBuddy] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  
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

  // Get user location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lon: longitude });
        updateUserLocation(latitude, longitude);
      },
      (error) => {
        console.error('Error getting location:', error);
        setUserLocation({ lat: 51.5074, lon: -0.1276 });
      }
    );
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

  // Route planning functions
  const searchRoute = async () => {
    if (!routeStart || !routeEnd) {
      alert('Please enter both start and end locations');
      return;
    }

    setIsLoading(true);
    try {
      // Geocode addresses
      const startGeo = await geocodeAddress(routeStart);
      const endGeo = await geocodeAddress(routeEnd);

      if (!startGeo || !endGeo) {
        alert('Could not find one or more locations');
        return;
      }

      // Get route
      const route = await getRoute(startGeo, endGeo, transportMode !== 'all' ? transportMode : 'walking');
      setSelectedRoute(route);
      setRouteCoordinates({ start: startGeo, end: endGeo });

      // Find buddies on similar routes
      await findRouteBuddies(startGeo, endGeo);
      
      // Show option to create group route
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
        // Return the safest route for display
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
        radius: '2000' // 2km radius around start/end points
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

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
            {buddy.name ? buddy.name.substring(0, 2).toUpperCase() : buddy.buddy_name?.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {buddy.name || buddy.buddy_name || buddy.sender_name || buddy.receiver_name}
            </h3>
            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <MapPin size={14} />
              <span>{buddy.distance_km || '0'} km away</span>
            </div>
          </div>
        </div>
        {getStatusBadge(buddy)}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm capitalize">
          {buddy.transport_mode || buddy.buddy_transport_mode || 'walking'}
        </span>
        {buddy.safety_priority !== undefined && (
          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm">
            Safety: {(buddy.safety_priority * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {showActions && (
        <div className="flex gap-2 mt-4">
          {!buddy.request_id && (
            <button
              onClick={() => sendBuddyRequest(buddy.id || buddy.buddy_id)}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
            >
              Send Request
            </button>
          )}
          {buddy.request_id && buddy.request_status === 'pending' && !buddy.is_sender && (
            <>
              <button
                onClick={() => respondToRequest(buddy.request_id, 'accept')}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Accept
              </button>
              <button
                onClick={() => respondToRequest(buddy.request_id, 'reject')}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm"
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
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2"
            >
              <Route size={16} />
              Plan Route
            </button>
          )}
          <button
            onClick={() => setSelectedBuddy(buddy)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors text-sm"
          >
            Profile
          </button>
        </div>
      )}
    </div>
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
        {/* Left Panel - Buddy List */}
        <div className="w-full lg:w-1/3 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3 mb-4">
              <Users className="text-blue-600" size={32} />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Find Buddies</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Connect & travel together</p>
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value={1000}>1 km</option>
                  <option value={2000}>2 km</option>
                  <option value={5000}>5 km</option>
                  <option value={10000}>10 km</option>
                </select>

                <select
                  value={transportMode}
                  onChange={(e) => setTransportMode(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="all">All Modes</option>
                  <option value="walking">Walking</option>
                  <option value="cycling">Cycling</option>
                  <option value="running">Running</option>
                </select>
              </div>

              <button
                onClick={() => {
                  fetchNearbyBuddies();
                  fetchPendingRequests();
                  fetchAcceptedBuddies();
                }}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
                disabled={isLoading}
              >
                {isLoading ? 'Searching...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('nearby')}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activeTab === 'nearby'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Nearby ({buddies.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activeTab === 'pending'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Requests ({pendingRequests.filter(r => r.is_receiver).length})
            </button>
            <button
              onClick={() => setActiveTab('accepted')}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activeTab === 'accepted'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              My Buddies ({acceptedBuddies.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('routes');
                setShowRoutePlanner(true);
              }}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activeTab === 'routes'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Route size={16} className="inline mr-1" />
              Routes
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
              </div>
            )}

            {/* Nearby Tab */}
            {activeTab === 'nearby' && (
              <>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : buddies.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="mx-auto text-gray-400 mb-2" size={48} />
                    <p className="text-gray-600 dark:text-gray-400">No buddies found</p>
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
                    <Clock className="mx-auto text-gray-400 mb-2" size={48} />
                    <p className="text-gray-600 dark:text-gray-400">No pending requests</p>
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
                    <CheckCircle className="mx-auto text-gray-400 mb-2" size={48} />
                    <p className="text-gray-600 dark:text-gray-400">No connected buddies yet</p>
                  </div>
                ) : (
                  acceptedBuddies.map((buddy) => <BuddyCard key={buddy.buddy_id} buddy={buddy} />)
                )}
              </>
            )}

            {/* Routes Tab */}
            {activeTab === 'routes' && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
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
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Search size={16} />
                      Find Route & Buddies
                    </button>
                  </div>
                </div>

                {/* Create Group Route Section */}
                {showCreateGroupRoute && acceptedBuddies.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                      Create Group Route & Invite Buddies
                    </h3>
                    <input
                      type="text"
                      placeholder="Route name (optional)"
                      value={routeName}
                      onChange={(e) => setRouteName(e.target.value)}
                      className="w-full px-3 py-2 mb-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Select buddies to invite:</p>
                      {acceptedBuddies.map((buddy) => (
                        <label key={buddy.buddy_id} className="flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-gray-800 rounded cursor-pointer">
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
                            <span className="text-sm text-gray-900 dark:text-white">{buddy.buddy_name}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={createGroupRoute}
                        disabled={selectedBuddiesForRoute.length === 0}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                      >
                        Create & Send Invites ({selectedBuddiesForRoute.length})
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateGroupRoute(false);
                          setSelectedBuddiesForRoute([]);
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* My Group Routes */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    My Group Routes ({groupRoutes.length})
                  </h3>
                  {groupRoutes.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Route className="mx-auto text-gray-400 mb-2" size={48} />
                      <p className="text-gray-600 dark:text-gray-400">No group routes yet</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Plan a route and invite buddies to get started!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {groupRoutes.map((route) => (
                        <div key={route.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 dark:text-white">{route.route_name}</h4>
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
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
                              route.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                              route.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {route.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                            <span className="flex items-center gap-1">
                              <Users size={14} />
                              {route.member_count} member{route.member_count !== 1 ? 's' : ''}
                            </span>
                            <span className="capitalize">{route.transport_mode}</span>
                            {route.is_creator && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">Creator</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {!route.is_member && (
                              <button
                                onClick={() => joinGroupRoute(route.id)}
                                className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
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
                                className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
                              >
                                {route.is_creator ? 'Cancel Route' : 'Leave Route'}
                              </button>
                            )}
                            <button
                              onClick={() => {
                                // View route details on map
                                setRouteCoordinates({
                                  start: { lat: route.start_lat, lon: route.start_lon },
                                  end: { lat: route.end_lat, lon: route.end_lon }
                                });
                              }}
                              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm font-medium transition-colors"
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
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                      Buddies on Your Route ({routeBuddies.length})
                    </h3>
                    {routeBuddies.map((buddy) => <BuddyCard key={buddy.id} buddy={buddy} />)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Map */}
        <div className="hidden lg:block lg:w-2/3 relative">
          {userLocation && (
            <MapComponent
              userLocation={userLocation}
              buddies={activeTab === 'routes' ? routeBuddies : buddies}
              route={selectedRoute}
              routeCoordinates={routeCoordinates}
            />
          )}
        </div>

        {/* Profile Modal */}
        {selectedBuddy && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedBuddy(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                    {selectedBuddy.name?.substring(0, 2).toUpperCase() || 'UN'}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedBuddy.name || selectedBuddy.buddy_name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedBuddy.email || selectedBuddy.buddy_email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBuddy(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <MapPin size={18} />
                  <span>{selectedBuddy.distance_km} km away</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm capitalize">
                    {selectedBuddy.transport_mode || selectedBuddy.buddy_transport_mode || 'walking'}
                  </span>
                  {selectedBuddy.safety_priority !== undefined && (
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm">
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
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Send Request
                  </button>
                )}
                <button
                  onClick={() => setSelectedBuddy(null)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
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
