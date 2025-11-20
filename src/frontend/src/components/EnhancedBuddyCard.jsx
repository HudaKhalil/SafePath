'use client';

import { User, Bike, Star, CheckCircle, Clock } from 'lucide-react';

export default function EnhancedBuddyCard({ 
  buddy = {
    id: 1,
    name: 'Sarah K.',
    initials: 'SK',
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

  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${meters} m away`;
    }
    return `${(meters / 1000).toFixed(1)} km away`;
  };

  const cardOpacity = status === 'offline' || status === 'out-of-range' ? 'opacity-60' : 'opacity-100';
  
  const ModeIcon = mode === 'cycling' ? Bike : User;
  const modeColor = mode === 'cycling' ? 'text-green-400' : 'text-blue-400';

  return (
    <div className={`backdrop-blur-sm border rounded-2xl p-4 hover:opacity-90 transition-all ${cardOpacity}`} style={{
      backgroundColor: 'var(--bg-card)',
      borderColor: 'var(--border-color)'
    }}>
      {/* Top Row - Avatar and Info */}
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar */}
        <div className={`w-12 h-12 ${avatarColor} rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0`}>
          {initials}
        </div>

        {/* Name, Distance, and Status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
              {name}
            </h3>
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>·</span>
            <span className="text-xs whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
              {formatDistance(distance)}
            </span>
          </div>

          {/* Mode and Pace */}
          <div className="flex items-center gap-2 text-sm mb-1">
            <ModeIcon className={`w-4 h-4 ${modeColor}`} />
            <span className="capitalize" style={{ color: 'var(--color-text-secondary)' }}>{mode}</span>
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>·</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>{pace}</span>
          </div>

          {/* Route Overlap */}
          {routeOverlap && (
            <div className="text-sm mb-1" style={{ color: 'var(--color-accent)' }}>
              On your route for {routeOverlap.distance} {routeOverlap.unit}
            </div>
          )}

          {/* Rating, Rides, Verified */}
          <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: 'var(--color-text-secondary)' }}>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span>{rating}</span>
            </div>
            <span>·</span>
            <span>{ridesCount} rides</span>
            {verified && (
              <>
                <span>·</span>
                <div className="flex items-center gap-1" style={{ color: 'var(--color-accent)' }}>
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
        <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          <Clock className="w-3.5 h-3.5" />
          <span>{availability}</span>
        </div>
      )}

      {/* Status Messages */}
      {status === 'offline' && (
        <div className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          Currently offline
        </div>
      )}
      {status === 'out-of-range' && (
        <div className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          Out of range · Request still valid
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onAskToJoin(buddy)}
          disabled={status === 'offline'}
          className="flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all active:scale-95"
          style={status === 'offline' ? {
            backgroundColor: 'var(--bg-icon)',
            color: 'var(--color-text-secondary)',
            cursor: 'not-allowed'
          } : {
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-text-on-accent)'
          }}
        >
          Ask to join
        </button>
        <button
          onClick={() => onViewProfile(buddy)}
          className="px-4 py-2.5 text-sm font-medium rounded-lg transition-all hover:opacity-80"
          style={{
            backgroundColor: 'var(--bg-icon)',
            color: 'var(--color-text-primary)'
          }}
        >
          View profile
        </button>
      </div>
    </div>
  );
}