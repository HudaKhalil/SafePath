'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import BuddyHeader from '../../components/BuddyHeader';
import ModeFilterChips from '../../components/ModeFilterChips';
import ShareLocationToggle from '../../components/ShareLocationToggle';
import BuddyMapView from '../../components/BuddyMapView';
import BottomSheet from '../../components/BottomSheet';
import EnhancedBuddyCard from '../../components/EnhancedBuddyCard';
import { buddyService } from '../../lib/services';

// Mock buddy data
const mockBuddies = [
  {
    id: 1,
    name: 'Sarah K.',
    initials: 'SK',
    latitude: 51.5074,
    longitude: -0.1278,
    distance: 234, // meters
    mode: 'cycling',
    pace: 'Medium pace',
    routeOverlap: { distance: 1.3, unit: 'km' },
    rating: 4.8,
    ridesCount: 23,
    verified: true,
    availability: 'Usually 17:00–19:00',
    status: 'online',
    avatarColor: 'bg-teal-500'
  },
  {
    id: 2,
    name: 'Alex M.',
    initials: 'AM',
    latitude: 51.5094,
    longitude: -0.1298,
    distance: 456,
    mode: 'walking',
    pace: 'Fast pace',
    routeOverlap: { distance: 0.8, unit: 'km' },
    rating: 4.9,
    ridesCount: 45,
    verified: true,
    availability: 'Usually 08:00–09:00',
    status: 'online',
    avatarColor: 'bg-cyan-500'
  },
  {
    id: 3,
    name: 'Mike R.',
    initials: 'MR',
    latitude: 51.5064,
    longitude: -0.1258,
    distance: 678,
    mode: 'cycling',
    pace: 'Fast pace',
    routeOverlap: { distance: 2.1, unit: 'km' },
    rating: 4.7,
    ridesCount: 34,
    verified: false,
    availability: 'Usually 18:00–20:00',
    status: 'online',
    avatarColor: 'bg-green-500'
  },
  {
    id: 4,
    name: 'Lisa T.',
    initials: 'LT',
    latitude: 51.5084,
    longitude: -0.1288,
    distance: 890,
    mode: 'walking',
    pace: 'Slow pace',
    routeOverlap: { distance: 0.5, unit: 'km' },
    rating: 5.0,
    ridesCount: 67,
    verified: true,
    availability: 'Usually 07:00–08:00',
    status: 'online',
    avatarColor: 'bg-blue-500'
  },
  {
    id: 5,
    name: 'James K.',
    initials: 'JK',
    latitude: 51.5100,
    longitude: -0.1250,
    distance: 1200,
    mode: 'cycling',
    pace: 'Medium pace',
    routeOverlap: { distance: 1.8, unit: 'km' },
    rating: 4.6,
    ridesCount: 12,
    verified: true,
    availability: 'Usually 22:00–23:00',
    status: 'offline',
    avatarColor: 'bg-purple-500'
  },
  {
    id: 6,
    name: 'Emma M.',
    initials: 'EM',
    latitude: 51.5050,
    longitude: -0.1300,
    distance: 1500,
    mode: 'walking',
    pace: 'Medium pace',
    routeOverlap: { distance: 0.9, unit: 'km' },
    rating: 4.9,
    ridesCount: 56,
    verified: true,
    availability: 'Usually 15:00–17:00',
    status: 'online',
    avatarColor: 'bg-pink-500'
  }
];

export default function FindBuddy() {
  const [isLocationSharing, setIsLocationSharing] = useState(true);
  const [filters, setFilters] = useState({
    modes: ['walk'],
    time: 'now',
    context: null
  });
  const [buddies, setBuddies] = useState([]);
  const [filteredBuddies, setFilteredBuddies] = useState(mockBuddies);
  const [notificationCount, setNotificationCount] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // User location (London default)
  const userLocation = [51.5074, -0.1278];

  // Avatar colors for buddy cards
  const avatarColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#ABEBC6'
  ];

  // Fetch buddies from API
  useEffect(() => {
    if (!isLocationSharing) {
      setBuddies([]);
      setFilteredBuddies([]);
      return;
    }

    const fetchBuddies = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Convert filter modes to API format
        const apiModes = filters.modes.map(mode => {
          if (mode === 'walk') return 'walking';
          if (mode === 'cycle') return 'cycling';
          return mode;
        });

        const response = await buddyService.getNearbyBuddies({
          lat: userLocation[0],
          lon: userLocation[1],
          radius: 5,
          modes: apiModes.join(','),
          status: 'available'
        });

        if (response.success && response.data.buddies) {
          // Transform API data to match UI format
          const transformedBuddies = response.data.buddies.map((buddy, index) => {
            // Get initials from username
            const nameParts = buddy.username.split('_').map(part => part.charAt(0).toUpperCase());
            const initials = nameParts.slice(0, 2).join('');
            
            // Determine mode from preferred_modes
            const hasWalking = buddy.preferred_modes.includes('walking') || buddy.preferred_modes.includes('running');
            const hasCycling = buddy.preferred_modes.includes('cycling');
            const mode = hasCycling ? 'cycling' : 'walking';

            return {
              id: buddy.id,
              name: buddy.username.replace('_', ' '),
              initials: initials,
              latitude: userLocation[0] + (Math.random() - 0.5) * 0.01, // Mock location near user
              longitude: userLocation[1] + (Math.random() - 0.5) * 0.01,
              distance: Math.round(buddy.distance_km * 1000), // Convert to meters
              mode: mode,
              pace: 'Medium pace',
              routeOverlap: { 
                distance: buddy.distance_km < 1 ? (buddy.distance_km * 1000).toFixed(0) : buddy.distance_km.toFixed(1), 
                unit: buddy.distance_km < 1 ? 'm' : 'km' 
              },
              rating: buddy.rating,
              ridesCount: buddy.total_ratings,
              verified: buddy.rating >= 4.5,
              availability: 'Available now',
              status: buddy.availability_status === 'available' ? 'online' : 'offline',
              avatarColor: avatarColors[index % avatarColors.length],
              bio: buddy.bio
            };
          });

          setBuddies(transformedBuddies);
          setFilteredBuddies(transformedBuddies);
        } else {
          // Fallback to mock data
          console.warn('API returned no buddies, using mock data');
          setBuddies(mockBuddies);
          setFilteredBuddies(mockBuddies);
        }
      } catch (error) {
        console.error('Error fetching buddies:', error);
        setError(error.message);
        // Fallback to mock data on error
        setBuddies(mockBuddies);
        setFilteredBuddies(mockBuddies);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBuddies();
  }, [isLocationSharing, filters.modes, userLocation[0], userLocation[1]]);

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    
    // Filter buddies based on selected modes
    const filtered = mockBuddies.filter(buddy => {
      const modeMatch = newFilters.modes.includes(buddy.mode === 'cycling' ? 'cycle' : 'walk');
      const statusMatch = buddy.status === 'online'; // Only show online buddies
      return modeMatch && statusMatch;
    });
    
    setFilteredBuddies(filtered);
  };

  // Handle location sharing toggle
  const handleLocationToggle = (isSharing) => {
    setIsLocationSharing(isSharing);
  };

  // Handle buddy actions
  const handleAskToJoin = (buddy) => {
    console.log('Ask to join:', buddy);
    // TODO: Implement request logic
  };

  const handleViewProfile = (buddy) => {
    console.log('View profile:', buddy);
    // TODO: Implement profile view
  };

  const handleBuddyClick = (buddy) => {
    console.log('Buddy clicked on map:', buddy);
    // TODO: Highlight buddy card or show quick info
  };

  const handleNotificationClick = () => {
    console.log('Notifications clicked');
    // TODO: Show notifications/requests sheet
  };

  const handleSettingsClick = () => {
    console.log('Settings clicked');
    // TODO: Show privacy & buddy settings sheet
  };

  const handleFilterClick = () => {
    console.log('Advanced filters clicked');
    // TODO: Show advanced filters modal
  };

  // Get buddies to display (filtered by location sharing)
  const displayedBuddies = isLocationSharing ? filteredBuddies : [];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white flex flex-col overflow-hidden">
        {/* Header */}
        <BuddyHeader
        buddyCount={displayedBuddies.length}
        notificationCount={notificationCount}
        onNotificationClick={handleNotificationClick}
        onSettingsClick={handleSettingsClick}
      />

      {/* Mode Filter Chips and Share Location Toggle */}
      <div className="px-4 py-3 border-b bg-gray-50 border-gray-200">
        <div className="flex items-center justify-between gap-4">
          {/* Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => {
                const newModes = filters.modes.includes('walk') ? filters.modes.filter(m => m !== 'walk') : [...filters.modes, 'walk'];
                if (newModes.length > 0) handleFilterChange({ ...filters, modes: newModes });
              }}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
              style={filters.modes.includes('walk') ? {
                backgroundColor: '#1e293b',
                color: '#ffffff'
              } : {
                backgroundColor: '#e2e8f0',
                color: '#94a3b8'
              }}
              title="Who Walk"
            >
              <svg className="w-6 h-6 pointer-events-none" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13.5 5.5c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/>
              </svg>
            </button>
            
            <button
              onClick={() => {
                const newModes = filters.modes.includes('cycle') ? filters.modes.filter(m => m !== 'cycle') : [...filters.modes, 'cycle'];
                if (newModes.length > 0) handleFilterChange({ ...filters, modes: newModes });
              }}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
              style={filters.modes.includes('cycle') ? {
                backgroundColor: '#1e293b',
                color: '#ffffff'
              } : {
                backgroundColor: '#e2e8f0',
                color: '#94a3b8'
              }}
              title="Who Cycle"
            >
              <svg className="w-6 h-6 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18.5" cy="17.5" r="3.5"/>
                <circle cx="5.5" cy="17.5" r="3.5"/>
                <circle cx="15" cy="5" r="1"/>
                <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
              </svg>
            </button>
            
            <div className="text-gray-400 text-lg">|</div>
            
            <button
              onClick={() => handleFilterChange({ ...filters, time: 'now' })}
              className="px-4 py-2.5 rounded-full text-base font-medium transition-all whitespace-nowrap flex items-center gap-1.5"
              style={filters.time === 'now' ? {
                backgroundColor: '#1e293b',
                color: '#ffffff'
              } : {
                backgroundColor: '#e2e8f0',
                color: '#94a3b8'
              }}
              title="Available right now"
            >
              Now
            </button>
            
            <button
              onClick={() => handleFilterChange({ ...filters, time: 'later' })}
              className="px-4 py-2.5 rounded-full text-base font-medium transition-all whitespace-nowrap flex items-center gap-1.5"
              style={filters.time === 'later' ? {
                backgroundColor: '#1e293b',
                color: '#ffffff'
              } : {
                backgroundColor: '#e2e8f0',
                color: '#94a3b8'
              }}
              title="Scheduled trips later"
            >
              Later
            </button>
          </div>
          
          {/* Right side - Status and Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Buddies Available Status */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
              <span className="text-green-600 text-sm">✓</span>
              <span className="text-xs md:text-sm text-gray-900 font-medium whitespace-nowrap">
                {displayedBuddies.length} {displayedBuddies.length === 1 ? 'buddy' : 'buddies'} available now
              </span>
            </div>
            
            {/* Share Location Toggle */}
            <ShareLocationToggle
              initialState={isLocationSharing}
              buddyCount={displayedBuddies.length}
              distance={5}
              onChange={handleLocationToggle}
            />
          </div>
        </div>
      </div>

      {/* Map Area - Extends to bottom sheet */}
      <div className="relative px-4 pb-[200px]" style={{ height: 'calc(100vh - 200px)' }}>
        <BuddyMapView
          userLocation={userLocation}
          buddies={displayedBuddies}
          selectedRoute={null}
          isLocationSharing={isLocationSharing}
          onBuddyClick={handleBuddyClick}
          onFilterClick={handleFilterClick}
          zoom={14}
        />
      </div>

      {/* Bottom Sheet with Buddy List - 40-45% */}
      <BottomSheet
        buddyCount={displayedBuddies.length}
        sortText="Sorted by best route match"
        initialExpanded={false}
        minHeight={180}
        maxHeight={500}
      >
        <div className="space-y-3 pb-24">
          {displayedBuddies.length > 0 ? (
            displayedBuddies.map((buddy) => (
              <EnhancedBuddyCard
                key={buddy.id}
                buddy={buddy}
                onAskToJoin={handleAskToJoin}
                onViewProfile={handleViewProfile}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-gray-900 font-medium mb-2">No buddies found</p>
              <p className="text-sm text-gray-600">
                {isLocationSharing 
                  ? 'Try adjusting your filters or check back later'
                  : 'Turn on location sharing to find buddies nearby'}
              </p>
            </div>
          )}
        </div>
      </BottomSheet>
      </div>
    </ProtectedRoute>
  );
}
