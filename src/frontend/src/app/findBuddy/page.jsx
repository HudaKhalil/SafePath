'use client';

import { useState } from 'react';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import BuddyHeader from '../../components/BuddyHeader';
import ModeFilterChips from '../../components/ModeFilterChips';
import ShareLocationToggle from '../../components/ShareLocationToggle';
import BuddyMapView from '../../components/BuddyMapView';
import BottomSheet from '../../components/BottomSheet';
import EnhancedBuddyCard from '../../components/EnhancedBuddyCard';

// Mock buddy data
const mockBuddies = [
  {
    id: 1,
    name: 'Sarah K.',
    initials: 'SK',
    latitude: 51.5074,
    longitude: -0.1278,
    distance: 234,
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
  const [filteredBuddies, setFilteredBuddies] = useState(mockBuddies);
  const [notificationCount, setNotificationCount] = useState(2);

  const userLocation = [51.5074, -0.1278];

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    
    const filtered = mockBuddies.filter(buddy => {
      const modeMatch = newFilters.modes.includes(buddy.mode === 'cycling' ? 'cycle' : 'walk');
      const statusMatch = buddy.status === 'online';
      return modeMatch && statusMatch;
    });
    
    setFilteredBuddies(filtered);
  };

  const handleLocationToggle = (isSharing) => {
    setIsLocationSharing(isSharing);
  };

  const handleAskToJoin = (buddy) => {
    console.log('Ask to join:', buddy);
  };

  const handleViewProfile = (buddy) => {
    console.log('View profile:', buddy);
  };

  const handleBuddyClick = (buddy) => {
    console.log('Buddy clicked on map:', buddy);
  };

  const handleNotificationClick = () => {
    console.log('Notifications clicked');
  };

  const handleSettingsClick = () => {
    console.log('Settings clicked');
  };

  const handleFilterClick = () => {
    console.log('Advanced filters clicked');
  };

  const displayedBuddies = isLocationSharing ? filteredBuddies : [];

  return (
    <ProtectedRoute>
<div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] flex flex-col overflow-hidden">        <BuddyHeader
          buddyCount={displayedBuddies.length}
          notificationCount={notificationCount}
          onNotificationClick={handleNotificationClick}
          onSettingsClick={handleSettingsClick}
        />

        <ModeFilterChips
          onFilterChange={handleFilterChange}
          initialFilters={filters}
        />

        <div className="relative px-4" style={{ height: '55vh' }}>
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

        <ShareLocationToggle
          initialState={isLocationSharing}
          buddyCount={displayedBuddies.length}
          distance={5}
          onChange={handleLocationToggle}
        />

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
                <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-500 dark:text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-gray-900 dark:text-text-primary font-medium mb-2">No buddies found</p>
                <p className="text-sm text-gray-600 dark:text-text-secondary">
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