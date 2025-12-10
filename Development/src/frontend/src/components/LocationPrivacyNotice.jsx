'use client';

import { useState, useEffect } from 'react';

export default function LocationPrivacyNotice() {
  const [showNotice, setShowNotice] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Track dark mode
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    // Check if user has already acknowledged the privacy notice
    const acknowledged = localStorage.getItem('locationPrivacyAcknowledged');
    if (!acknowledged) {
      // Show notice after a short delay
      setTimeout(() => setShowNotice(true), 1000);
    }
    
    return () => observer.disconnect();
  }, []);

  const handleAcknowledge = () => {
    localStorage.setItem('locationPrivacyAcknowledged', 'true');
    setShowNotice(false);
  };

  if (!showNotice) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)'
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl p-6 animate-slide-up"
        style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
        }}
      >
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-full mb-4 mx-auto"
          style={{ backgroundColor: isDark ? '#334155' : '#f1f5f9' }}
        >
          <svg
            className="w-6 h-6"
            style={{ color: '#06d6a0' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>

        {/* Title */}
        <h3
          className="text-xl font-bold text-center mb-3"
          style={{ color: isDark ? '#f8fafc' : '#1e293b' }}
        >
          Location Privacy Notice
        </h3>

        {/* Content */}
        <div
          className="text-sm mb-6 space-y-3"
          style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
        >
          <p>
            SafePath uses your location to provide safety features:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Show your position on the map</li>
            <li>Find nearby hazards and safe routes</li>
            <li>Connect with nearby safety buddies</li>
          </ul>
          
          <div
            className="rounded-lg p-3 mt-4"
            style={{
              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
            }}
          >
            <p className="font-semibold mb-2" style={{ color: isDark ? '#06d6a0' : '#059669' }}>
              🔒 Your Privacy:
            </p>
            <ul className="space-y-1 text-xs">
              <li>• Location stored only during your browser session</li>
              <li>• Automatically deleted when you close the browser</li>
              <li>• Never shared without your permission</li>
              <li>• Cleared when you logout</li>
            </ul>
          </div>

          <p className="text-xs mt-3">
            You can deny location access at any time through your browser settings.
            Map preferences (zoom level, dark mode) are saved for your convenience.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleAcknowledge}
            className="flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200"
            style={{
              backgroundColor: '#06d6a0',
              color: '#ffffff'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#05b889'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#06d6a0'}
          >
            I Understand
          </button>
          <button
            onClick={handleAcknowledge}
            className="py-3 px-4 rounded-lg font-semibold transition-all duration-200"
            style={{
              backgroundColor: isDark ? '#334155' : '#f1f5f9',
              color: isDark ? '#cbd5e1' : '#64748b'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? '#475569' : '#e2e8f0'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#f1f5f9'}
          >
            Close
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
