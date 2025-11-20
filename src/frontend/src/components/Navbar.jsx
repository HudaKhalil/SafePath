'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '../lib/services'
import ThemeToggle from './ThemeToggle';



export default function Navbar() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    checkAuthStatus()
  }, [])

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
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="SafePath Logo" 
              className="w-10 h-10 object-contain"
            />
          </div>
 <div style={{ color: '#f8fafc' }} className="font-bold text-lg">SafePath</div>        </Link>

        <nav className="hidden md:flex gap-8 items-center font-bold">
          <Link href="/" className="nav-link">Home</Link>
          <Link href="/suggested-routes" className="nav-link">Suggested Routes</Link>
          <Link href="/report-hazards" className="nav-link">Report Hazards</Link>
          <Link href="/findBuddy" className="nav-link">Find Buddy</Link>
          
          
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <span style={{ color: '#94a3b8' }}>Welcome, {user?.name || 'User'}</span>
              <Link href="/profile" className="nav-link">Profile</Link>
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
              <Link href="/auth/login" className="nav-link">Login</Link>
            
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
              <ThemeToggle />
</div>
          )}
        </nav>


        <div className="md:hidden">
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
            <Link href="/" onClick={() => setOpen(false)} className="nav-link">Home</Link>
            <Link href="/suggested-routes" onClick={() => setOpen(false)} className="nav-link">Suggested Routes</Link>
            <Link href="/report-hazards" onClick={() => setOpen(false)} className="nav-link">Report Hazards</Link>
            <Link href="/findBuddy" onClick={() => setOpen(false)} className="nav-link">Find Buddy</Link>
            
            {isLoggedIn ? (
              <div 
                className="pt-4 space-y-2"
                style={{ borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}
              >
                <div style={{ color: '#94a3b8' }}>Welcome, {user?.name || 'User'}</div>
                <Link href="/profile" onClick={() => setOpen(false)} className="block nav-link">Profile</Link>
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
                <Link href="/auth/login" onClick={() => setOpen(false)} className="block nav-link">Login</Link>
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