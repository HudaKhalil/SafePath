'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Settings } from 'lucide-react';

export default function BuddyHeader({ 
  buddyCount = 12, 
  notificationCount = 2,
  onNotificationClick = () => {},
  onSettingsClick = () => {}
}) {
  const router = useRouter();

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-[1001] shadow-sm">
      {/* Top row with centered title and action buttons */}
      <div className="flex items-center justify-center mb-2 relative">
        {/* Title - centered */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Find <span style={{ color: '#06d6a0' }}>Buddy</span>
        </h1>

        {/* Action buttons - absolute positioned to right */}
        <div className="absolute right-0 flex items-center gap-2">
          {/* Notifications */}
          <button
            onClick={onNotificationClick}
            className="relative w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label={`${notificationCount} notifications`}
          >
            <Bell className="w-5 h-5 text-gray-700" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                {notificationCount}
              </span>
            )}
          </button>

          {/* Settings */}
          <button
            onClick={onSettingsClick}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Subtitle */}
      <p className="text-sm md:text-base text-gray-600 text-center">
        Walk or cycle with someone nearby
      </p>
    </div>
  );
}
