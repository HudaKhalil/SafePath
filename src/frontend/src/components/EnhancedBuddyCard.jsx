'use client';

import { User, Bike, Star, CheckCircle, Clock } from 'lucide-react';

export default function EnhancedBuddyCard({ 
  buddy = {
    id: 1,
    name: 'Sarah K.',
    initials: 'SK',
    distance: 234, // meters
    mode: 'cycling', // 'walking' or 'cycling'
    pace: 'Medium pace',
    routeOverlap: { distance: 1.3, unit: 'km' },
    rating: 4.8,
    ridesCount: 23,
    verified: true,
    availability: 'Usually 17:00–19:00',
    status: 'online', // 'online', 'offline', 'out-of-range'
    avatarColor: 'bg-teal-500'
  },
  onAskToJoin = () => {},
  onViewProfile = () => {}
}) {
  const {
    name,
    initials,
    distance,
    mode,
    pace,
    routeOverlap,
    rating,
    ridesCount,
    verified,
    availability,
    status,
    avatarColor
  } = buddy;

  // Format distance
  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${meters} m away`;
    }
    return `${(meters / 1000).toFixed(1)} km away`;
  };

  // Determine card opacity based on status
  const cardOpacity = status === 'offline' || status === 'out-of-range' ? 'opacity-60' : 'opacity-100';
  
  // Mode icon and color
  const ModeIcon = mode === 'cycling' ? Bike : User;
  const modeColor = mode === 'cycling' ? 'text-green-400' : 'text-blue-400';

  return (
    <div className={`bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-md transition-all ${cardOpacity}`}>
      {/* Top Row - Avatar and Info */}
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar */}
        <div className={`w-12 h-12 ${avatarColor} rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0`}>
          {initials}
        </div>

        {/* Name, Distance, and Status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-gray-900 truncate">
              {name}
            </h3>
            <span className="text-xs text-gray-500">·</span>
            <span className="text-xs text-gray-600 whitespace-nowrap">
              {formatDistance(distance)}
            </span>
          </div>

          {/* Mode and Pace */}
          <div className="flex items-center gap-2 text-sm mb-1">
            <ModeIcon className={`w-4 h-4 ${modeColor}`} />
            <span className="text-gray-600 capitalize">{mode}</span>
            <span className="text-xs text-gray-500">·</span>
            <span className="text-gray-600">{pace}</span>
          </div>

          {/* Route Overlap */}
          {routeOverlap && (
            <div className="text-sm text-accent mb-1">
              On your route for {routeOverlap.distance} {routeOverlap.unit}
            </div>
          )}

          {/* Rating, Rides, Verified */}
          <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span>{rating}</span>
            </div>
            <span>·</span>
            <span>{ridesCount} rides</span>
            {verified && (
              <>
                <span>·</span>
                <div className="flex items-center gap-1 text-accent">
                  <CheckCircle className="w-3 h-3" />
                  <span>Verified</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Availability */}
      {availability && status === 'online' && (
        <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-3">
          <Clock className="w-3.5 h-3.5" />
          <span>{availability}</span>
        </div>
      )}

      {/* Status Messages */}
      {status === 'offline' && (
        <div className="text-xs text-gray-600 mb-3">
          Currently offline
        </div>
      )}
      {status === 'out-of-range' && (
        <div className="text-xs text-gray-600 mb-3">
          Out of range · Request still valid
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onAskToJoin(buddy)}
          disabled={status === 'offline'}
          className="flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all"
          style={status === 'offline' 
            ? { backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed' }
            : { backgroundColor: '#06d6a0', color: '#0f172a' }}
          onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#059669')}
          onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#06d6a0')}
        >
          Ask to join
        </button>
        <button
          onClick={() => onViewProfile(buddy)}
          className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
        >
          View profile
        </button>
      </div>
    </div>
  );
}
