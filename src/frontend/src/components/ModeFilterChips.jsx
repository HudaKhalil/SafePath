'use client';

import { useState } from 'react';
import { User, Bike } from 'lucide-react';

export default function ModeFilterChips({ 
  onFilterChange = () => {},
  initialFilters = {
    modes: ['walk'],
    time: 'now',
    context: null
  }
}) {
  const [selectedModes, setSelectedModes] = useState(initialFilters.modes);
  const [selectedTime, setSelectedTime] = useState(initialFilters.time);
  const [selectedContext, setSelectedContext] = useState(initialFilters.context);

  const toggleMode = (mode) => {
    let newModes;
    if (selectedModes.includes(mode)) {
      newModes = selectedModes.filter(m => m !== mode);
      // Ensure at least one mode is selected
      if (newModes.length === 0) return;
    } else {
      newModes = [...selectedModes, mode];
    }
    setSelectedModes(newModes);
    onFilterChange({ modes: newModes, time: selectedTime, context: selectedContext });
  };

  const selectTime = (time) => {
    setSelectedTime(time);
    onFilterChange({ modes: selectedModes, time, context: selectedContext });
  };

  const selectContext = (context) => {
    const newContext = selectedContext === context ? null : context;
    setSelectedContext(newContext);
    onFilterChange({ modes: selectedModes, time: selectedTime, context: newContext });
  };

  const chipBaseClass = "px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5";

  return (
    <div className="px-4 py-3 border-b" style={{
      backgroundColor: 'var(--bg-card)',
      borderColor: 'var(--border-color)'
    }}>
      {/* Mode chips */}
      <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => toggleMode('walk')}
          className={chipBaseClass}
          style={selectedModes.includes('walk') ? {
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-text-on-accent)'
          } : {
            backgroundColor: 'var(--bg-icon)',
            color: 'var(--color-text-primary)'
          }}
        >
          <User className="w-4 h-4" />
          <span>Walk</span>
        </button>
        <button
          onClick={() => toggleMode('cycle')}
          className={chipBaseClass}
          style={selectedModes.includes('cycle') ? {
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-text-on-accent)'
          } : {
            backgroundColor: 'var(--bg-icon)',
            color: 'var(--color-text-primary)'
          }}
        >
          <Bike className="w-4 h-4" />
          <span>Cycle</span>
        </button>
      </div>

      {/* Time and Context chips */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {/* Time */}
        <button
          onClick={() => selectTime('now')}
          className={chipBaseClass}
          style={selectedTime === 'now' ? {
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-text-on-accent)'
          } : {
            backgroundColor: 'var(--bg-icon)',
            color: 'var(--color-text-primary)'
          }}
        >
          Now
        </button>
        <button
          onClick={() => selectTime('later')}
          className={chipBaseClass}
          style={selectedTime === 'later' ? {
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-text-on-accent)'
          } : {
            backgroundColor: 'var(--bg-icon)',
            color: 'var(--color-text-primary)'
          }}
        >
          Later
        </button>

        {/* Divider */}
        <div className="w-px h-6 mx-1" style={{ backgroundColor: 'var(--border-color)' }}></div>

        {/* Context */}
        <button
          onClick={() => selectContext('home-work')}
          className={chipBaseClass}
          style={selectedContext === 'home-work' ? {
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-text-on-accent)'
          } : {
            backgroundColor: 'var(--bg-icon)',
            color: 'var(--color-text-primary)'
          }}
        >
          Home ↔ Work
        </button>
        <button
          onClick={() => selectContext('custom')}
          className={chipBaseClass}
          style={selectedContext === 'custom' ? {
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-text-on-accent)'
          } : {
            backgroundColor: 'var(--bg-icon)',
            color: 'var(--color-text-primary)'
          }}
        >
          Custom route
        </button>
      </div>

      {/* Hide scrollbar CSS */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}