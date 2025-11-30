'use client'

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Cookies from 'js-cookie';

const Map = dynamic(() => import('../components/Map'), { ssr: false });

function Section({ className = "", ...props }) {
  return <section className={`relative ${className}`} {...props} />;
}

export default function Home() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [userLocation, setUserLocation] = useState([51.5074, -0.1278]); // Default: London
  const [searchDestination, setSearchDestination] = useState('');

  // Track dark mode changes
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.log('Using default location (London):', error.message);
        },
        {
          timeout: 5000,
          enableHighAccuracy: false,
          maximumAge: 300000
        }
      );
    }
  }, []);

  const handleProtectedAction = (e, path) => {
    e.preventDefault();
    const token = Cookies.get('auth_token');
    
    if (!token) {
      // Not authenticated, redirect to login
      router.push('/auth/login');
    } else {
      // Authenticated, navigate to requested page
      router.push(path);
    }
  };
  return (
    <main style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff' }} className="min-h-screen md:min-h-screen lg:h-screen lg:overflow-hidden w-full flex flex-col">
      <Section className="overflow-visible pb-9 sm:pb-16 md:pb-20 lg:flex-1 lg:flex lg:items-center lg:pb-8">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-15 md:pt-20 lg:pt-0 pb-8 sm:pb-12 lg:pb-0 animate-fadeIn w-full">
          <div className="grid items-start gap-6 sm:gap-8 md:gap-10 lg:gap-4 lg:grid-cols-12">
            {/* Map card */}
            <div className="lg:col-span-7 order-1 lg:order-1">
              {/* Search bar */}
              <div className="mb-4">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (searchDestination.trim()) {
                    router.push(`/suggested-routes?from=current&to=${encodeURIComponent(searchDestination)}`);
                  }
                }} className="relative">
                  <input
                    type="text"
                    value={searchDestination}
                    onChange={(e) => setSearchDestination(e.target.value)}
                    placeholder="Where do you want to go?"
                    className="w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none"
                    style={{
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      borderColor: isDark ? 'rgba(6, 214, 160, 0.3)' : 'rgba(0, 0, 0, 0.1)',
                      color: isDark ? '#f8fafc' : '#1e293b'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#06d6a0'}
                    onBlur={(e) => e.target.style.borderColor = isDark ? 'rgba(6, 214, 160, 0.3)' : 'rgba(0, 0, 0, 0.1)'}
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-md font-semibold text-sm transition-all duration-200"
                    style={{
                      backgroundColor: '#06d6a0',
                      color: '#0f172a'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#06d6a0'}
                  >
                    Search
                  </button>
                </form>
              </div>
              
              <div className="relative w-full h-72 sm:h-80 md:h-96 lg:h-[450px] xl:h-[500px] rounded-2xl overflow-hidden border-2 shadow-lg" style={{ 
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
              }}>
                <Map
                  center={userLocation}
                  zoom={13}
                  height="100%"
                  markers={[
                    {
                      position: userLocation,
                      color: '#06d6a0',
                      type: 'marker',
                      popup: <div className="text-sm"><strong>Your Location</strong></div>
                    }
                  ]}
                />
              </div>
            </div>

            {/* Copy + CTAs */}
            <div className="lg:col-span-5 order-2 lg:order-2 text-center lg:text-left flex flex-col justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl font-bold leading-tight" style={{ color: isDark ? '#f8fafc' : '#1e293b' }}>
                  Find Your <span style={{ color: '#06d6a0' }}>Safer</span> Way
                </h1>
                <h2 className="mt-2 sm:mt-3 lg:mt-2 text-base sm:text-lg md:text-xl lg:text-lg" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
                  Safer journeys for walkers &amp; cyclists
                </h2>

                <div className="mt-6 sm:mt-8 lg:mt-6 flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-3 lg:justify-start justify-center">
                  <button
                    onClick={(e) => handleProtectedAction(e, '/suggested-routes')}
                    className="btn-primary inline-flex items-center gap-2 justify-center text-base lg:text-base px-6 lg:px-6 py-3 lg:py-2.5 rounded-lg min-h-[44px] lg:min-h-0 w-full sm:w-auto"
                    title="Plan a safe journey"
                  >
                    Go Safe
                  </button>
                  <button
                    onClick={(e) => handleProtectedAction(e, '/report-hazards')}
                    className="inline-flex items-center gap-2 justify-center text-base lg:text-base px-6 lg:px-6 py-3 lg:py-2.5 rounded-lg font-semibold transition-all duration-200 min-h-[44px] lg:min-h-0 w-full sm:w-auto"
                    style={{
                      backgroundColor: '#f87171',
                      color: '#ffffff'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#ef4444'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#f87171'}
                    title="Help others: report a hazard here"
                  >
                    Report Hazard
                  </button>
                </div>
              </div>

              {/* Buddy Preview Section - Desktop Only */}
              <div className="hidden lg:block mt-8 animate-fadeIn">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold" style={{ color: isDark ? '#f8fafc' : '#1e293b' }}>
                    Find Buddy Near Me
                  </h2>
                  <button
                    onClick={(e) => handleProtectedAction(e, '/findBuddy')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all duration-200"
                    style={{
                      backgroundColor: isDark ? '#06d6a0' : '#06d6a0',
                      color: '#0f172a'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#06d6a0'}
                  >
                    Find Buddy
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Buddy Cards - Compact Desktop Version */}
                <div className="space-y-2">
                  {/* Mock Buddy 1 */}
                  <div 
                    className="rounded-lg p-2 border shadow-sm transition-transform hover:scale-[1.01]"
                    style={{
                      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                      borderColor: isDark ? 'rgba(6, 214, 160, 0.5)' : 'rgba(6, 214, 160, 0.4)',
                      boxShadow: isDark ? '0 1px 3px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#06d6a0' }}>
                        <svg className="w-4 h-4" style={{ color: '#0f172a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm" style={{ color: isDark ? '#f8fafc' : '#1e293b' }}>Sarah J.</h3>
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                          <span>🚶 0.8 km</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mock Buddy 2 */}
                  <div 
                    className="rounded-lg p-2 border shadow-sm transition-transform hover:scale-[1.01]"
                    style={{
                      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                      borderColor: isDark ? 'rgba(6, 214, 160, 0.5)' : 'rgba(6, 214, 160, 0.4)',
                      boxShadow: isDark ? '0 1px 3px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#06d6a0' }}>
                        <svg className="w-4 h-4" style={{ color: '#0f172a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm" style={{ color: isDark ? '#f8fafc' : '#1e293b' }}>Michael C.</h3>
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                          <span>🚴 1.2 km</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mock Buddy 3 */}
                  <div 
                    className="rounded-lg p-2 border shadow-sm transition-transform hover:scale-[1.01]"
                    style={{
                      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                      borderColor: isDark ? 'rgba(6, 214, 160, 0.5)' : 'rgba(6, 214, 160, 0.4)',
                      boxShadow: isDark ? '0 1px 3px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#06d6a0' }}>
                        <svg className="w-4 h-4" style={{ color: '#0f172a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm" style={{ color: isDark ? '#f8fafc' : '#1e293b' }}>Emma W.</h3>
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                          <span>🚶 2.1 km</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Buddy Preview Section */}
          <div className="lg:hidden mt-12 sm:mt-16 md:mt-20 animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: isDark ? '#f8fafc' : '#1e293b' }}>
                Find Buddy Near Me
              </h2>
              <button
                onClick={(e) => handleProtectedAction(e, '/findBuddy')}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200"
                style={{
                  backgroundColor: isDark ? '#06d6a0' : '#06d6a0',
                  color: '#0f172a'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#06d6a0'}
              >
                Find Buddy
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Buddy Cards - Horizontal Scroll */}
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
              {/* Mock Buddy 1 */}
              <div 
                className="flex-none w-72 sm:w-80 rounded-xl p-4 shadow-lg border-2 snap-start transition-transform hover:scale-[1.02]"
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderColor: isDark ? 'rgba(6, 214, 160, 0.5)' : 'rgba(6, 214, 160, 0.5)',
                  boxShadow: isDark ? '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#06d6a0' }}>
                    <svg className="w-6 h-6" style={{ color: '#0f172a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg" style={{ color: isDark ? '#f8fafc' : '#1e293b' }}>Sarah Johnson</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'rgba(6, 214, 160, 0.2)', color: '#06d6a0' }}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Walking
                      </span>
                      <span className="text-xs" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>0.8 km away</span>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs font-medium" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Available now</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mock Buddy 2 */}
              <div 
                className="flex-none w-72 sm:w-80 rounded-xl p-4 shadow-lg border-2 snap-start transition-transform hover:scale-[1.02]"
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderColor: isDark ? 'rgba(6, 214, 160, 0.5)' : 'rgba(6, 214, 160, 0.5)',
                  boxShadow: isDark ? '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#06d6a0' }}>
                    <svg className="w-6 h-6" style={{ color: '#0f172a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg" style={{ color: isDark ? '#f8fafc' : '#1e293b' }}>Michael Chen</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'rgba(6, 214, 160, 0.2)', color: '#06d6a0' }}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                        Cycling
                      </span>
                      <span className="text-xs" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>1.2 km away</span>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs font-medium" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Available now</span>
                    </div>
                  </div>
                </div>
              </div>


          </div>

          {/* Mobile View All Button */}
          <button
            onClick={(e) => handleProtectedAction(e, '/findBuddy')}
            className="sm:hidden w-full mt-4 inline-flex items-center gap-2 justify-center px-4 py-3 rounded-lg font-semibold text-base transition-all duration-200"
            style={{
              backgroundColor: isDark ? '#06d6a0' : '#06d6a0',
              color: '#0f172a'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#06d6a0'}
          >
            Find Buddy
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        </div>
      </Section>
    </main>
  );
}
