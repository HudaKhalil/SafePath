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
    <button
      onClick={handleToggle}
      className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
      style={isSharing ? {
        backgroundColor: '#10b981',
        color: '#ffffff'
      } : {
        backgroundColor: '#1e293b',
        color: '#ffffff'
      }}
      title={isSharing ? 'Location sharing on' : 'Location sharing off'}
      aria-label={isSharing ? 'Turn off location sharing' : 'Turn on location sharing'}
      aria-checked={isSharing}
      role="switch"
    >
      <MapPin className="w-6 h-6 pointer-events-none" />
    </button>
  );
}
