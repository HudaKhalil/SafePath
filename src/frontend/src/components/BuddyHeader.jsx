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
    <div className="bg-primary-dark/95 backdrop-blur-md border-b border-white/10 px-4 py-3 sticky top-0 z-[1001]">
      {/* Top row with back button, title, and actions */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 flex-1">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-text-primary" />
          </button>
          
          {/* Title */}
          <h1 className="text-lg md:text-xl font-bold text-white">
            Find Buddy
          </h1>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button
            onClick={onNotificationClick}
            className="relative w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label={`${notificationCount} notifications`}
          >
            <Bell className="w-5 h-5 text-text-primary" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                {notificationCount}
              </span>
            )}
          </button>

          {/* Settings */}
          <button
            onClick={onSettingsClick}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 text-text-primary" />
          </button>
        </div>
      </div>

      {/* Subtitle */}
      <p className="text-xs md:text-sm text-text-secondary mb-2 pl-12">
        Walk or cycle with someone nearby
      </p>

      {/* Status pill */}
      <div className="pl-12">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
          <span className="text-[#AFFF00] text-sm">✓</span>
          <span className="text-xs md:text-sm text-text-primary font-medium">
            {buddyCount} buddies available now
          </span>
        </div>
      </div>
    </div>
  );
}
