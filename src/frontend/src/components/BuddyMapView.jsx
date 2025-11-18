'use client';

import { useEffect, useState } from 'react';
import { Plus, Minus, Filter } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import Map component (client-side only) - same as report-hazards & suggested-routes
const Map = dynamic(() => import('./Map'), { ssr: false });

export default function BuddyMapView({
  userLocation = [51.5074, -0.1278], // London default
  buddies = [],
  selectedRoute = null,
  isLocationSharing = false,
  onBuddyClick = () => {},
  onFilterClick = () => {},
  zoom = 14
}) {
  const [mapZoom, setMapZoom] = useState(zoom);
  const [mapCenter, setMapCenter] = useState(userLocation);

  useEffect(() => {
    setMapCenter(userLocation);
  }, [userLocation]);

  // Create buddy markers for the map (only if location sharing is on)
  const buddyMarkers = isLocationSharing ? buddies.map((buddy) => ({
    position: [buddy.latitude, buddy.longitude],
    color: buddy.mode === 'cycling' ? '#10b981' : '#3b82f6',
    type: 'buddy',
    popup: (
      <div className="text-sm">
        <h3 className="font-semibold">{buddy.name}</h3>
        <p className="text-xs">{buddy.mode === 'cycling' ? '🚴 Cycling' : '🚶 Walking'}</p>
        <p className="text-xs">{(buddy.distance / 1000).toFixed(1)} km away</p>
      </div>
    )
  })) : [];

  // Handle map click
  const handleMapClick = (latlng) => {
    // Check if click is near any buddy
    buddies.forEach(buddy => {
      const distance = Math.sqrt(
        Math.pow(buddy.latitude - latlng.lat, 2) + 
        Math.pow(buddy.longitude - latlng.lng, 2)
      );
      if (distance < 0.001) { // Approximately 100m
        onBuddyClick(buddy);
      }
    });
  };

  return (
    <div className="absolute inset-0 w-full h-full px-6">
      {/* Map Container */}
      <div className="w-full h-full rounded-2xl overflow-hidden">
        <Map
          center={mapCenter}
          zoom={mapZoom}
          height="100%"
          markers={buddyMarkers}
          buddies={isLocationSharing ? buddies : []}
          fromCoords={userLocation}
          routes={selectedRoute ? [selectedRoute] : []}
          onMapClick={handleMapClick}
        />
      </div>

      {/* Map Controls - Right Side */}
      <div className="absolute right-4 top-4 flex flex-col gap-2 z-[998]">
        {/* Zoom In */}
        <button
          onClick={() => setMapZoom(Math.min(mapZoom + 1, 18))}
          className="w-10 h-10 bg-white/90 backdrop-blur-sm hover:bg-white rounded-lg shadow-lg flex items-center justify-center transition-all active:scale-95"
          aria-label="Zoom in"
        >
          <Plus className="w-5 h-5 text-primary-dark" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={() => setMapZoom(Math.max(mapZoom - 1, 1))}
          className="w-10 h-10 bg-white/90 backdrop-blur-sm hover:bg-white rounded-lg shadow-lg flex items-center justify-center transition-all active:scale-95"
          aria-label="Zoom out"
        >
          <Minus className="w-5 h-5 text-primary-dark" />
        </button>

        {/* Advanced Filters */}
        <button
          onClick={onFilterClick}
          className="w-10 h-10 bg-white/90 backdrop-blur-sm hover:bg-white rounded-lg shadow-lg flex items-center justify-center transition-all active:scale-95"
          aria-label="Advanced filters"
        >
          <Filter className="w-5 h-5 text-primary-dark" />
        </button>
      </div>

      {/* Location Sharing Off Overlay */}
      {!isLocationSharing && (
        <div className="absolute inset-0 bg-primary-dark/70 backdrop-blur-sm flex items-center justify-center z-[997] rounded-b-2xl">
          <div className="text-center px-6">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-text-primary font-medium mb-2">Location Sharing Off</p>
            <p className="text-sm text-text-secondary">
              Turn on location sharing to see nearby buddies
            </p>
          </div>
        </div>
      )}

      {/* No Buddies Overlay (when sharing but no buddies) */}
      {isLocationSharing && buddies.length === 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[997] bg-white/10 backdrop-blur-sm px-6 py-4 rounded-2xl">
          <p className="text-sm text-text-primary text-center">
            No buddies nearby at the moment
          </p>
        </div>
      )}
    </div>
  );
}
