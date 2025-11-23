'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';

export default function ShareLocationToggle({
  initialState = false,
  buddyCount = 12,
  distance = 5,
  onChange = () => {}
}) {
  const [isSharing, setIsSharing] = useState(initialState);

  const handleToggle = () => {
    const newState = !isSharing;
    setIsSharing(newState);
    onChange(newState);
  };

  return (
    <div className="px-4 py-4 border-b" style={{
      backgroundColor: 'var(--bg-card)',
      borderColor: 'var(--border-color)'
    }}>
      <div className="flex items-center justify-between">
        {/* Left side - Label and status */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <MapPin 
              className="w-4 h-4" 
              style={{ color: isSharing ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}
            />
            <span className="text-sm md:text-base font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Share my live location
            </span>
          </div>
          <div 
            className="text-xs md:text-sm" 
            style={{ color: isSharing ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}
          >
            {isSharing ? (
              <>Active: {buddyCount} buddies within {distance} km</>
            ) : (
              <>Turn on to see nearby buddies</>
            )}
          </div>
        </div>

        {/* Right side - Toggle switch */}
        <button
          onClick={handleToggle}
          className="relative w-14 h-8 rounded-full transition-colors duration-300 ease-in-out"
          style={{
            backgroundColor: isSharing ? 'var(--color-accent)' : 'var(--bg-icon)'
          }}
          aria-label={isSharing ? 'Turn off location sharing' : 'Turn on location sharing'}
          aria-checked={isSharing}
          role="switch"
        >
          {/* Toggle knob */}
          <span
            className={`
              absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-lg
              transition-transform duration-300 ease-in-out
              ${isSharing ? 'translate-x-6' : 'translate-x-0'}
            `}
          />
        </button>
      </div>
    </div>
  );
}