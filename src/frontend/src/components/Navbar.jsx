'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { authService } from '../lib/services'
import ThemeToggle from './ThemeToggle'



export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname() 
  const [open, setOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    checkAuthStatus()
    
    // Listen for profile updates
    const handleProfileUpdate = () => {
      checkAuthStatus()
    }
    window.addEventListener('profileUpdated', handleProfileUpdate)
    
    // Track dark mode
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkDarkMode()
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate)
      observer.disconnect()
    }
  }, [])

  // Close hamburger menu when pathname changes (user navigates via bottom nav or any other means)
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const checkAuthStatus = async () => {
    try {
      if (authService.isLoggedIn()) {
        const profileResponse = await authService.getProfile()
        if (profileResponse.success) {
          setIsLoggedIn(true)
          setUser(profileResponse.data.user)
        } else {
          // Token might be invalid
          authService.logout()
          setIsLoggedIn(false)
          setUser(null)
        }
      } else {
        setIsLoggedIn(false)
        setUser(null)
      }
    } catch (error) {
      // Only log unexpected errors, not normal "unauthorized" responses
      if (error.message !== 'Access token required' && !error.message?.includes('401')) {
        console.error('Auth check failed:', error?.message ?? error, error?.data ?? error)
      }
      authService.logout()
      setIsLoggedIn(false)
      setUser(null)
    }
  }



  const handleLogout = () => {
    authService.logout()
    setIsLoggedIn(false)
    setUser(null)
    router.push('/')
  }

  return (
    <header   className="backdrop-blur-md sticky top-0 shadow-lg z-[1001]"
      style={{ 
        backgroundColor: 'rgba(15, 23, 42, 0.95)', // FIXED: #0f172a with 95% opacity
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#f8fafc' // FIXED: White text
      }}
    >
      <div className="container mx-auto px-8 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center" title="SafePath - Navigate Safely">
            <img 
              src="/logo.png" 
              alt="SafePath Logo" 
              className="w-12 h-12 object-contain"
            />
          </div>
 <div style={{ color: '#f8fafc' }} className="font-bold text-2xl hidden sm:block">SafePath</div>        </Link>

        <nav className="hidden md:flex gap-8 items-center font-bold">
          <ThemeToggle />
          <Link 
      href="/" 
      className="transition-colors duration-200"
      style={{
        color: pathname === '/' ? '#06d6a0' : '#94a3b8'
      }}
      onMouseEnter={(e) => e.target.style.color = '#ffffff'}
      onMouseLeave={(e) => e.target.style.color = pathname === '/' ? '#06d6a0' : '#94a3b8'}
    >
      Home
    </Link>
    
    {/* SUGGESTED ROUTES LINK - UPDATED */}
    <Link 
      href="/suggested-routes" 
      className="transition-colors duration-200"
      style={{
        color: pathname === '/suggested-routes' ? '#06d6a0' : '#94a3b8'
      }}
      onMouseEnter={(e) => e.target.style.color = '#ffffff'}
      onMouseLeave={(e) => e.target.style.color = pathname === '/suggested-routes' ? '#06d6a0' : '#94a3b8'}
    >
      Suggested Routes
    </Link>
    
    {/* REPORT HAZARDS LINK - UPDATED */}
    <Link 
      href="/report-hazards" 
      className="transition-colors duration-200"
      style={{
        color: pathname === '/report-hazards' ? '#06d6a0' : '#94a3b8'
      }}
      onMouseEnter={(e) => e.target.style.color = '#ffffff'}
      onMouseLeave={(e) => e.target.style.color = pathname === '/report-hazards' ? '#06d6a0' : '#94a3b8'}
    >
      Report Hazards
    </Link>
    
    {/* FIND BUDDY LINK - UPDATED */}
    <Link 
      href="/findBuddy" 
      className="transition-colors duration-200"
      style={{
        color: pathname === '/findBuddy' ? '#06d6a0' : '#94a3b8'
      }}
      onMouseEnter={(e) => e.target.style.color = '#ffffff'}
      onMouseLeave={(e) => e.target.style.color = pathname === '/findBuddy' ? '#06d6a0' : '#94a3b8'}
    >
      Find Buddy
    </Link>
    
    {/* ABOUT LINK */}
    <Link 
      href="/about" 
      className="transition-colors duration-200"
      style={{
        color: pathname === '/about' ? '#06d6a0' : '#94a3b8'
      }}
      onMouseEnter={(e) => e.target.style.color = '#ffffff'}
      onMouseLeave={(e) => e.target.style.color = pathname === '/about' ? '#06d6a0' : '#94a3b8'}
    >
      About
    </Link>
    

          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <Link 
                href="/profile" 
                className="flex flex-col items-center gap-1"
              >
                <div 
                  className="w-12 h-12 rounded-full overflow-hidden border-2 flex items-center justify-center"
                  style={{ 
                    borderColor: pathname === '/profile' ? '#06d6a0' : '#475569',
                    backgroundColor: '#334155'
                  }}
                >
                  {user?.profile_picture ? (
                    <img 
                      src={user.profile_picture.startsWith('http') ? user.profile_picture : `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001').replace(/\/api$/, '')}${user.profile_picture}`}
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Hide broken image silently
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="currentColor"
                      className="w-7 h-7"
                      style={{ color: '#94a3b8' }}
                    >
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  )}
                </div>
                <span className="text-xs" style={{ color: pathname === '/profile' ? '#06d6a0' : '#94a3b8' }}>
                  {user?.name || 'User'}
                </span>
              </Link>
              <button 
                onClick={handleLogout}
                className="px-3 py-1 rounded text-sm transition-colors"
                style={{ 
                  backgroundColor: '#dc2626',
                  color: '#ffffff'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
 <Link 
      href="/auth/login" 
      className="transition-colors duration-200"
      style={{
        color: pathname === '/auth/login' ? '#06d6a0' : '#94a3b8'
      }}
      onMouseEnter={(e) => e.target.style.color = '#ffffff'}
      onMouseLeave={(e) => e.target.style.color = pathname === '/auth/login' ? '#06d6a0' : '#94a3b8'}
    >
      Login
    </Link>            
              <Link 
                href="/auth/signup" 
                className="px-4 py-2 rounded font-medium transition-colors"
                style={{
                  backgroundColor: '#06d6a0',
                  color: '#0f172a'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#06d6a0'}
              >
                Sign Up
              </Link>
</div>
          )}
        </nav>


        <div className="md:hidden flex items-center gap-3">
          {isLoggedIn && (
            <Link href="/profile">
              <div 
                className="w-12 h-12 rounded-full overflow-hidden border-2 flex items-center justify-center"
                style={{ 
                  borderColor: pathname === '/profile' ? '#06d6a0' : '#475569',
                  backgroundColor: '#334155'
                }}
              >
                {user?.profile_picture ? (
                  <img 
                    src={user.profile_picture.startsWith('http') ? user.profile_picture : `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001').replace(/\/api$/, '')}${user.profile_picture}`}
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="currentColor"
                    className="w-7 h-7"
                    style={{ color: '#94a3b8' }}
                  >
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                )}
              </div>
            </Link>
          )}
          <ThemeToggle />
          <button 
            onClick={() => setOpen(!open)} 
            className="p-2 rounded-lg transition-colors"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#06d6a0'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>

     
      {open && (
        <div 
          className="md:hidden mx-4 mb-4 rounded-lg"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          <nav className="flex flex-col gap-4 p-4">
            <Link 
              href="/" 
              onClick={() => setOpen(false)} 
              className="transition-colors duration-200 text-base font-medium"
              style={{ color: isDark ? '#06d6a0' : '#f8fafc' }}
              onMouseEnter={(e) => e.target.style.color = '#ffffff'}
              onMouseLeave={(e) => e.target.style.color = isDark ? '#06d6a0' : '#f8fafc'}
            >
              Home
            </Link>
            <Link 
              href="/suggested-routes" 
              onClick={() => setOpen(false)} 
              className="transition-colors duration-200 text-base font-medium"
              style={{ color: isDark ? '#06d6a0' : '#f8fafc' }}
              onMouseEnter={(e) => e.target.style.color = '#ffffff'}
              onMouseLeave={(e) => e.target.style.color = isDark ? '#06d6a0' : '#f8fafc'}
            >
              Suggested Routes
            </Link>
            <Link 
              href="/report-hazards" 
              onClick={() => setOpen(false)} 
              className="transition-colors duration-200 text-base font-medium"
              style={{ color: isDark ? '#06d6a0' : '#f8fafc' }}
              onMouseEnter={(e) => e.target.style.color = '#ffffff'}
              onMouseLeave={(e) => e.target.style.color = isDark ? '#06d6a0' : '#f8fafc'}
            >
              Report Hazards
            </Link>
            <Link 
              href="/findBuddy" 
              onClick={() => setOpen(false)} 
              className="transition-colors duration-200 text-base font-medium"
              style={{ color: isDark ? '#06d6a0' : '#f8fafc' }}
              onMouseEnter={(e) => e.target.style.color = '#ffffff'}
              onMouseLeave={(e) => e.target.style.color = isDark ? '#06d6a0' : '#f8fafc'}
            >
              Find Buddy
            </Link>
            <Link 
              href="/about" 
              onClick={() => setOpen(false)} 
              className="transition-colors duration-200 text-base font-medium"
              style={{ color: isDark ? '#06d6a0' : '#f8fafc' }}
              onMouseEnter={(e) => e.target.style.color = '#ffffff'}
              onMouseLeave={(e) => e.target.style.color = isDark ? '#06d6a0' : '#f8fafc'}
            >
              About
            </Link>
            <Link 
              href="/privacy" 
              onClick={() => setOpen(false)} 
              className="transition-colors duration-200 text-base font-medium"
              style={{ color: isDark ? '#06d6a0' : '#f8fafc' }}
              onMouseEnter={(e) => e.target.style.color = '#ffffff'}
              onMouseLeave={(e) => e.target.style.color = isDark ? '#06d6a0' : '#f8fafc'}
            >
              Privacy Policy
            </Link>

            {isLoggedIn ? (
              <div 
                className="pt-4 space-y-2"
                style={{ borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}
              >
                <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 p-2">
                  <div 
                    className="w-12 h-12 rounded-full overflow-hidden border-2 flex items-center justify-center"
                    style={{ 
                      borderColor: '#06d6a0',
                      backgroundColor: '#334155'
                    }}
                  >
                    {user?.profile_picture ? (
                      <img 
                        src={user.profile_picture.startsWith('http') ? user.profile_picture : `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001').replace(/\/api$/, '')}${user.profile_picture}`}
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="currentColor"
                        className="w-7 h-7"
                        style={{ color: '#94a3b8' }}
                      >
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span style={{ color: '#06d6a0' }}>Profile</span>
                    <span className="text-xs" style={{ color: '#94a3b8' }}>{user?.name || 'User'}</span>
                  </div>
                </Link>
                <button 
                  onClick={() => {
                    setOpen(false);
                    handleLogout();
                  }}
                  className="block w-full text-left px-3 py-2 rounded text-sm transition-colors"
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
                >
                  Logout
                </button>
              </div>
            ) : (
              <div 
                className="pt-4 space-y-2"
                style={{ borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}
              >
                <Link 
                  href="/auth/login" 
                  onClick={() => setOpen(false)} 
                  className="block transition-colors duration-200 text-base font-medium"
                  style={{ color: isDark ? '#06d6a0' : '#f8fafc' }}
                  onMouseEnter={(e) => e.target.style.color = '#ffffff'}
                  onMouseLeave={(e) => e.target.style.color = isDark ? '#06d6a0' : '#f8fafc'}
                >
                  Login
                </Link>
                <Link 
                  href="/auth/signup" 
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2 rounded font-medium transition-colors text-center"
                  style={{
                    backgroundColor: '#06d6a0',
                    color: '#0f172a'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#06d6a0'}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}