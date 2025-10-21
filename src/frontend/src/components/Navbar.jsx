'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'


export default function Navbar() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)



  const handleLogout = () => {
    authService.logout()
    setIsLoggedIn(false)
    setUser(null)
    router.push('/')
  }

  return (
    <header className="bg-primary-dark/95 backdrop-blur-md text-white sticky top-0 shadow-lg z-40 border-b border-white/10">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="SafePath Logo" 
              className="w-10 h-10 object-contain"
            />
          </div>
          <div className="text-white font-bold text-lg">SafePath</div>
        </Link>

        <nav className="hidden md:flex gap-8 items-center font-bold">
          <Link href="/" className="text-text-secondary hover:text-accent transition-colors duration-200">Home</Link>
          <Link href="/suggested-routes" className="text-text-secondary hover:text-accent transition-colors duration-200">Suggested Routes</Link>
          <Link href="/report-hazards" className="text-text-secondary hover:text-accent transition-colors duration-200">Report Hazards</Link>
          <Link href="/findBuddy" className="text-text-secondary hover:text-accent transition-colors duration-200">Find Buddy</Link>
          
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <span className="text-text-secondary">Welcome, {user?.name || 'User'}</span>
              <Link href="/profile" className="text-text-secondary hover:text-accent transition-colors duration-200">Profile</Link>
              <button 
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/auth/login" className="text-text-secondary hover:text-accent transition-colors duration-200">Login</Link>
              <Link href="/auth/signup" className="bg-accent hover:bg-accent/90 text-black px-4 py-2 rounded font-medium transition-colors">Sign Up</Link>
            </div>
          )}
        </nav>

        <div className="md:hidden">
          <button 
            onClick={() => setOpen(!open)} 
            className="p-2 rounded-lg glass-effect text-accent hover:bg-white/20 transition-colors"
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden glass-effect mx-4 mb-4 rounded-lg">
          <nav className="flex flex-col gap-4 p-4">
            <Link href="/" className="text-text-secondary hover:text-accent transition-colors">Home</Link>
            <Link href="/suggested-routes" className="text-text-secondary hover:text-accent transition-colors">Suggested Routes</Link>
            <Link href="/hazard-reporting" className="text-text-secondary hover:text-accent transition-colors">Hazard Reporting</Link>
            <Link href="/find-buddy" className="text-text-secondary hover:text-accent transition-colors">Find Buddy</Link>
            
            {isLoggedIn ? (
              <div className="border-t border-white/20 pt-4 space-y-2">
                <div className="text-text-secondary">Welcome, {user?.name || 'User'}</div>
                <Link href="/profile" className="block text-text-secondary hover:text-accent transition-colors">Profile</Link>
                <button 
                  onClick={handleLogout}
                  className="block w-full text-left bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="border-t border-white/20 pt-4 space-y-2">
                <Link href="/auth/login" className="block text-text-secondary hover:text-accent transition-colors">Login</Link>
                <Link href="/auth/signup" className="block bg-accent hover:bg-accent/90 text-black px-4 py-2 rounded font-medium transition-colors text-center">Sign Up</Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}