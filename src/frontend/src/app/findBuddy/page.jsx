"use client";

import { useState } from 'react';
import { MapPin, Clock, CheckCircle, User } from 'lucide-react';

export default function FindBuddy() {
  const [companions] = useState([
    {
      id: 1,
      name: "Alex Murphy",
      initials: "AM",
      status: "Active Now",
      verified: true,
      type: "TU Dublin Student",
      departure: "6:30 PM",
      from: "Grangegorman",
      to: "Parnell Luas",
      distance: "1.2 km from you",
      color: "bg-indigo-500"
    },
    {
      id: 2,
      name: "Sarah Kelly",
      initials: "SK",
      status: "Active Now",
      verified: true,
      type: "Regular Commuter",
      departure: "6:25 PM",
      from: "Stoneybatter",
      to: "O'Connell St",
      distance: "0.8 km from you",
      color: "bg-pink-500"
    },
    {
      id: 3,
      name: "James Lynch",
      initials: "JL",
      status: "Active Now",
      verified: true,
      type: "Experienced Cyclist",
      departure: "6:35 PM",
      from: "Phibsborough",
      to: "Parnell Square",
      distance: "1.5 km from you",
      color: "bg-cyan-500"
    },
    {
      id: 4,
      name: "Emma Walsh",
      initials: "EW",
      status: "Active Now",
      verified: true,
      type: "DCU Student",
      departure: "6:40 PM",
      from: "Drumcondra",
      to: "City Centre",
      distance: "2.1 km from you",
      color: "bg-purple-500"
    },
    {
      id: 5,
      name: "Michael O'Brien",
      initials: "MO",
      status: "Active Now",
      verified: true,
      type: "Daily Commuter",
      departure: "6:20 PM",
      from: "Cabra",
      to: "Trinity College",
      distance: "1.8 km from you",
      color: "bg-green-500"
    },
    {
      id: 6,
      name: "Rachel Quinn",
      initials: "RQ",
      status: "Active Now",
      verified: true,
      type: "Weekend Cyclist",
      departure: "6:45 PM",
      from: "Smithfield",
      to: "Grand Canal",
      distance: "1.3 km from you",
      color: "bg-yellow-500"
    },
    {
      id: 7,
      name: "David Chen",
      initials: "DC",
      status: "Active Now",
      verified: true,
      type: "Tech Worker",
      departure: "6:15 PM",
      from: "North Circular Rd",
      to: "Silicon Docks",
      distance: "2.5 km from you",
      color: "bg-blue-500"
    },
    {
      id: 8,
      name: "Sophie Martin",
      initials: "SM",
      status: "Active Now",
      verified: true,
      type: "University Student",
      departure: "6:50 PM",
      from: "Glasnevin",
      to: "Rathmines",
      distance: "3.0 km from you",
      color: "bg-red-500"
    }
  ]);

  const handleConnect = (name) => {
    alert(`Connecting with ${name}...`);
  };

  const handleMessage = (name) => {
    alert(`Opening chat with ${name}...`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50">
      {/* Header */}
      <div className="text-white p-4 sm:p-6 shadow-lg" style={{ backgroundColor: '#51a664' }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <button 
              onClick={() => window.history.back()}
              className="p-2 rounded-lg transition cursor-pointer"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)'}
              type="button"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl sm:text-2xl font-bold">Find Buddy</h1>
          </div>

          {/* Journey Info Card */}
          <div className="bg-white text-gray-800 rounded-xl p-4 sm:p-5 shadow-md">
            <h2 className="font-semibold text-base sm:text-lg mb-3" style={{ color: '#51a664' }}>Your Journey</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2 sm:gap-3 text-gray-700">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#51a664' }} />
                <span className="font-medium text-sm sm:text-base">To: Abbey Street</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-gray-700">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#51a664' }} />
                <span className="font-medium text-sm sm:text-base">Departure: 9:50 AM</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-gray-700">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#51a664' }} />
                <span className="font-medium text-sm sm:text-base">Safest Route: 14min</span>
              </div>
            </div>
          </div>

          {/* Cyclists Nearby Badge */}
          <div className="mt-4 rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3" style={{ backgroundColor: '#458a57' }}>
            <User className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="font-semibold text-base sm:text-lg">{companions.length} cyclists found nearby</span>
          </div>
        </div>
      </div>

      {/* Available Companions */}
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Available Companions</h2>
        
        <div className="space-y-4">
          {companions.map((companion) => (
            <div 
              key={companion.id} 
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 mx-2 sm:mx-0"
            >
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                  {/* Avatar */}
                  <div className={`${companion.color} w-16 h-16 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0 mx-auto sm:mx-0`}>
                    {companion.initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 w-full min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 text-center sm:text-left">{companion.name}</h3>
                      <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                        <span className="bg-emerald-100 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium" style={{ color: '#51a664' }}>
                          {companion.status}
                        </span>
                        {companion.verified && (
                          <span className="bg-blue-100 text-blue-700 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                            Verified
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-gray-600 mb-2 sm:mb-3 text-sm sm:text-base text-center sm:text-left">
                      {companion.type} • Leaves at {companion.departure}
                    </p>

                    <div className="flex items-start gap-2 text-gray-700 mb-3 sm:mb-4 justify-center sm:justify-start">
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" style={{ color: '#51a664' }} />
                      <span className="text-xs sm:text-sm text-center sm:text-left">
                        {companion.from} → {companion.to} ({companion.distance})
                      </span>
                    </div>

                    {/* Action Buttons  */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
                      <button 
                        onClick={() => handleConnect(companion.name)}
                        className="w-full text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg text-sm sm:text-base"
                        style={{ backgroundColor: '#51a664' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#458a57'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#51a664'}
                      >
                        Connect
                      </button>
                      <button 
                        onClick={() => handleMessage(companion.name)}
                        className="w-full text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg text-sm sm:text-base"
                        style={{ backgroundColor: '#2C2E48' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1f2137'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2C2E48'}
                      >
                        Message
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Safety Notice */}
        <div className="mt-6 sm:mt-8 bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 sm:p-6">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Safety First:</h3>
              <p className="text-blue-800 text-sm leading-relaxed">
                All users are verified through university email or phone verification. Report any concerns to our support team.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}