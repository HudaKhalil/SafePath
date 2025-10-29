'use client';

import { useState } from 'react';

export default function BuddyFilters() {
  const [transportMode, setTransportMode] = useState('all');
  const [area, setArea] = useState('all');
  const [timePreference, setTimePreference] = useState('any');

  const handleSearch = () => {
    console.log('Searching with filters:', { transportMode, area, timePreference });
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 md:p-8 mb-6 md:mb-8">
      <div className="flex items-center gap-3 mb-6">
        <svg className="w-6 h-6 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
        </svg>
        <h2 className="text-xl md:text-2xl font-bold text-sp-title">Find Your Perfect Travel Buddy</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        {/* Transport Mode */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-sp-ink mb-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
            </svg>
            Transport Mode
          </label>
          <select 
            value={transportMode}
            onChange={(e) => setTransportMode(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-sp-ink"
          >
            <option value="all">All Modes</option>
            <option value="cyclist">Cyclist</option>
            <option value="pedestrian">Pedestrian</option>
            <option value="public-transport">Public Transport</option>
          </select>
        </div>

        {/* Area/Borough */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-sp-ink mb-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            Area/Borough
          </label>
          <select 
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-sp-ink"
          >
            <option value="all">All Areas</option>
            <option value="central">Central London</option>
            <option value="east">East London</option>
            <option value="west">West London</option>
            <option value="north">North London</option>
            <option value="south">South London</option>
          </select>
        </div>

        {/* Time Preference */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-sp-ink mb-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Time Preference
          </label>
          <select 
            value={timePreference}
            onChange={(e) => setTimePreference(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-sp-ink"
          >
            <option value="any">Any Time</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
            <option value="night">Night</option>
            <option value="weekend">Weekend</option>
          </select>
        </div>

        {/* Search Button */}
        <button 
          onClick={handleSearch}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          Find Buddies
        </button>
      </div>
    </div>
  );
}