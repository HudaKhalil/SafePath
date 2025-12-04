'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Users, MapPin, CheckCircle, Clock, X, Route, Search, Navigation } from 'lucide-react';

const Map = dynamic(() => import('../../components/Map'), { ssr: false });

const API_URL = 'http://localhost:5001';

export default function FindBuddy() {
  const [showBuddyPanel, setShowBuddyPanel] = useState(false);
  const [userLocation, setUserLocation] = useState([51.5074, -0.1278]);
  const [isLightMode, setIsLightMode] = useState(false);
  const [isMdScreen, setIsMdScreen] = useState(false);
  const [activeTab, setActiveTab] = useState('nearby');
  const [buddies, setBuddies] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [acceptedBuddies, setAcceptedBuddies] = useState([]);
  const [radius, setRadius] = useState(5000);
  const [transportMode, setTransportMode] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedBuddy, setSelectedBuddy] = useState(null);
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

  useEffect(() => {
    setIsLightMode(!document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(() => {
      setIsLightMode(!document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMdScreen(window.innerWidth >= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  useEffect(() => {
    if (userLocation) {
      fetchNearbyBuddies();
      fetchPendingRequests();
      fetchAcceptedBuddies();
      fetchGroupRoutes();
    }
  }, [userLocation, radius, transportMode]);

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
  };const BuddyCard = ({ buddy, showActions = true }) => (

    <div className="rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border" style={{
      backgroundColor: isLightMode ? '#ffffff' : '#1e293b',
      borderColor: isLightMode ? '#e5e7eb' : '#374151'
    }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
            {buddy.name ? buddy.name.substring(0, 2).toUpperCase() : 'UN'}
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: isLightMode ? '#0f172a' : '#ffffff' }}>
              {buddy.name || 'Unknown'}
            </h3>
            <div className="flex items-center gap-1 text-sm" style={{ color: isLightMode ? '#64748b' : '#9ca3af' }}>
              <MapPin size={14} />
              <span>{buddy.distance_km || '0'} km away</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span className="px-3 py-1 rounded-full text-sm capitalize" style={{
          backgroundColor: isLightMode ? '#f3f4f6' : '#374151',
          color: isLightMode ? '#374151' : '#d1d5db'
        }}>
          {buddy.transport_mode || 'walking'}
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-5">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-4 md:py-3" style={{ 
        background: isLightMode ? '#ffffff' : 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)'
      }}>
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h1 className="text-3xl md:text-3xl font-bold mb-2">
            <span style={{ color: isLightMode ? '#0f172a' : '#ffffff' }}>Find a </span>
            <span style={{ color: '#06d6a0' }}>Buddy</span>
          </h1>
          <p className="text-lg md:text-xl mb-1" style={{ 
            color: isLightMode ? '#475569' : 'rgba(255, 255, 255, 0.8)' 
          }}>
            Connect with nearby travelers and plan safe journeys together
          </p>
         
        </div>
      </section>

      {/* Main Content */}
      <section className="relative min-h-[calc(100vh-80px)] mt-4 pb-8" style={{ 
        backgroundColor: isLightMode ? '#ffffff' : '#0f172a' 
      }}>
        {/* Side Panel */}
        <div 
 className="absolute inset-0 z-50 w-full md:w-96 lg:w-[600px] transition-transform duration-300 shadow-2xl overflow-hidden"          style={{
            transform: showBuddyPanel ? 'translateX(0)' : 'translateX(-100%)',
          }}
        >
          <div className="h-full overflow-y-auto">
            <div className="p-4 pb-24">
              <div className="border-2 rounded-2xl p-4 md:p-6" style={{ 
                backgroundColor: isLightMode ? '#ffffff' : '#1e293b',
                borderColor: isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'
              }}>
               <div className="mb-4">
  <h3 className="text-2xl font-bold" style={{ color: isLightMode ? '#0f172a' : '#06d6a0' }}>
    Find Buddies
  </h3>
  <p className="text-sm mt-1" style={{ color: isLightMode ? '#64748b' : '#06d6a0' }}>
    Connect & travel together
  </p>
</div>

{/* Filters */}
<div className="space-y-3 mb-4">

                  Filters
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
                      style={{ backgroundColor: '#06d6a0', color: '#0f172a' }}
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
                    className={`flex-1 px-4 py-3 text-sm font-medium ${activeTab === 'nearby' ? 'border-b-2' : ''}`}
                    style={{
                      color: activeTab === 'nearby' ? '#06d6a0' : (isLightMode ? '#6b7280' : '#9ca3af'),
                      borderColor: activeTab === 'nearby' ? '#06d6a0' : 'transparent'
                    }}
                  >
                    Nearby ({buddies.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex-1 px-4 py-3 text-sm font-medium ${activeTab === 'pending' ? 'border-b-2' : ''}`}
                    style={{
                      color: activeTab === 'pending' ? '#06d6a0' : (isLightMode ? '#6b7280' : '#9ca3af'),
                      borderColor: activeTab === 'pending' ? '#06d6a0' : 'transparent'
                    }}
                  >
                    Requests ({pendingRequests.filter(r => r.is_receiver).length})
                  </button>
                  <button
                    onClick={() => setActiveTab('accepted')}
                    className={`flex-1 px-4 py-3 text-sm font-medium ${activeTab === 'accepted' ? 'border-b-2' : ''}`}
                    style={{
                      color: activeTab === 'accepted' ? '#06d6a0' : (isLightMode ? '#6b7280' : '#9ca3af'),
                      borderColor: activeTab === 'accepted' ? '#06d6a0' : 'transparent'
                    }}
                  >
                    My Buddies ({acceptedBuddies.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('routes')}
                    className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-1 ${activeTab === 'routes' ? 'border-b-2' : ''}`}
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
                      <div className="text-center py-8 rounded-lg" style={{
                        backgroundColor: isLightMode ? '#f9fafb' : '#1e293b'
                      }}>
                        <Route className="mx-auto mb-2" size={48} style={{ color: isLightMode ? '#9ca3af' : '#6b7280' }} />
                        <p style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}>No group routes yet</p>
                        <p className="text-sm mt-1" style={{ color: isLightMode ? '#9ca3af' : '#6b7280' }}>
                          Plan a route and invite buddies to get started!
                        </p>
                      </div>
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
            left: showBuddyPanel && isMdScreen ? '584px' : '16px',
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
              style={{ transform: showBuddyPanel ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
            <span className="font-medium text-base" style={{ color: isLightMode ? '#ffffff' : '#0f172a' }}>
              {showBuddyPanel ? 'Close' : 'Find Buddy'}
            </span>
          </div>
        </button>

        {/* Map Area */}
        <div 
          className="transition-all duration-300"
          style={{
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
                  <h3 className="text-xl font-bold" style={{ color: isLightMode ? '#0f172a' : '#ffffff' }}>
                    {selectedBuddy.name || selectedBuddy.buddy_name}
                  </h3>
                  <p className="text-sm" style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}>
                    {selectedBuddy.email || selectedBuddy.buddy_email}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedBuddy(null)} style={{ color: isLightMode ? '#9ca3af' : '#6b7280' }}>
                <X size={24} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2" style={{ color: isLightMode ? '#374151' : '#d1d5db' }}>
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
                  style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
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
  );
}