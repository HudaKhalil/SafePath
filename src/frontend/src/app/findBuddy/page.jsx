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
