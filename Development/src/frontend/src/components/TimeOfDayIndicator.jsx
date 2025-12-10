"use client";

import { useState, useEffect } from 'react';

/**
 * TimeOfDayIndicator - Shows current time context and allows manual override for testing
 * Affects lighting calculations in route planning
 */
export default function TimeOfDayIndicator({ isDark = false, onModeChange }) {
  const [timeMode, setTimeMode] = useState('auto'); // 'auto', 'day', 'night', 'rush'
  const [currentPeriod, setCurrentPeriod] = useState('day');
  const [showDropdown, setShowDropdown] = useState(false);

  // Auto-detect time of day
  useEffect(() => {
    if (timeMode === 'auto') {
      const updatePeriod = () => {
        const now = new Date();
        const hour = now.getHours();
        
        let period;
        if (hour >= 6 && hour < 9) {
          period = 'morning-rush'; // 6 AM - 9 AM
        } else if (hour >= 9 && hour < 17) {
          period = 'day'; // 9 AM - 5 PM
        } else if (hour >= 17 && hour < 20) {
          period = 'evening-rush'; // 5 PM - 8 PM
        } else {
          period = 'night'; // 8 PM - 6 AM
        }
        
        setCurrentPeriod(period);
      };

      updatePeriod();
      const interval = setInterval(updatePeriod, 60000); // Update every minute
      return () => clearInterval(interval);
    } else {
      // Manual override
      const period = timeMode === 'rush' ? 'evening-rush' : timeMode;
      setCurrentPeriod(period);
    }
  }, [timeMode]);

  // Notify parent when period changes (separate effect to avoid setState during render)
  useEffect(() => {
    if (onModeChange) {
      onModeChange(currentPeriod);
    }
  }, [currentPeriod, onModeChange]);

  const periods = [
    { id: 'auto', label: 'Auto', icon: '🔄' },
    { id: 'day', label: 'Day Mode', icon: '☀️' },
    { id: 'night', label: 'Night Mode', icon: '🌙' },
    { id: 'rush', label: 'Rush Hour', icon: '🚗' },
  ];

  const getPeriodInfo = () => {
    switch (currentPeriod) {
      case 'morning-rush':
        return { icon: '🌅', label: 'Morning Rush', desc: '6 AM - 9 AM', color: '#fbbf24' };
      case 'day':
        return { icon: '☀️', label: 'Daytime', desc: '9 AM - 5 PM', color: '#06d6a0' };
      case 'evening-rush':
        return { icon: '🚗', label: 'Evening Rush', desc: '5 PM - 8 PM', color: '#fb923c' };
      case 'night':
        return { icon: '🌙', label: 'Nighttime', desc: '8 PM - 6 AM', color: '#8b5cf6' };
      default:
        return { icon: '☀️', label: 'Daytime', desc: '', color: '#06d6a0' };
    }
  };

  const info = getPeriodInfo();

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105"
        style={{
          backgroundColor: isDark ? 'rgba(6, 214, 160, 0.1)' : 'rgba(15, 23, 42, 0.06)',
          border: `1px solid ${isDark ? 'rgba(6, 214, 160, 0.2)' : 'rgba(15, 23, 42, 0.1)'}`,
        }}
        title="Time of day affects lighting safety scores"
      >
        <span className="text-lg">{info.icon}</span>
        <span className="text-sm font-semibold" style={{ color: isDark ? info.color : '#1e293b' }}>
          {info.label}
        </span>
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          className="w-3 h-3 transition-transform"
          style={{ 
            color: isDark ? '#06d6a0' : '#0f172a',
            transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
          <div 
            className="absolute top-full right-0 mt-2 w-56 rounded-lg shadow-lg z-50 overflow-hidden"
            style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              border: `1px solid ${isDark ? 'rgba(6, 214, 160, 0.2)' : 'rgba(15, 23, 42, 0.1)'}`,
            }}
          >
            <div className="p-2 space-y-1">
              {periods.map((period) => {
                const getTimeDesc = (id) => {
                  if (id === 'auto') {
                    // Show current detected time when in auto mode
                    const now = new Date();
                    const hour = now.getHours();
                    if (hour >= 6 && hour < 9) return '6 AM - 9 AM';
                    if (hour >= 9 && hour < 17) return '9 AM - 5 PM';
                    if (hour >= 17 && hour < 20) return '5 PM - 8 PM';
                    return '8 PM - 6 AM';
                  }
                  if (id === 'night') return '8 PM - 6 AM • Lighting active';
                  if (id === 'day') return '9 AM - 5 PM • Lighting ignored';
                  if (id === 'rush') return '6-9 AM / 5-8 PM • High traffic';
                };
                
                return (
                  <button
                    key={period.id}
                    onClick={() => {
                      setTimeMode(period.id);
                      setShowDropdown(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-left"
                    style={{
                      backgroundColor: timeMode === period.id 
                        ? (isDark ? 'rgba(6, 214, 160, 0.15)' : 'rgba(6, 214, 160, 0.1)')
                        : 'transparent',
                      color: isDark ? '#ffffff' : '#0f172a',
                    }}
                  >
                    <span className="text-lg">{period.icon}</span>
                    <div className="flex flex-col flex-1">
                      <span className="text-sm font-medium">{period.label}</span>
                      <span className="text-xs opacity-60">{getTimeDesc(period.id)}</span>
                    </div>
                    {timeMode === period.id && (
                      <svg className="w-4 h-4 flex-shrink-0" fill="#06d6a0" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
            
            <div 
              className="px-4 py-3 text-xs border-t"
              style={{
                backgroundColor: isDark ? 'rgba(6, 214, 160, 0.05)' : 'rgba(15, 23, 42, 0.03)',
                borderColor: isDark ? 'rgba(6, 214, 160, 0.1)' : 'rgba(15, 23, 42, 0.06)',
                color: isDark ? '#94a3b8' : '#64748b',
              }}
            >
              <p className="leading-relaxed">
                <strong style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>Lighting Impact:</strong><br />
                Night mode uses street lighting data for safer route selection. Day mode ignores lighting since sunlight provides visibility.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
