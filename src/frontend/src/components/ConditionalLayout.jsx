'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Navbar from './Navbar'
import BottomNav from './BottomNav'
import Footer from './Footer'
import LocationPrivacyNotice from './LocationPrivacyNotice'

export default function ConditionalLayout({ children }) {
  const pathname = usePathname()
  
  // Always show navbar and footer, only hide BottomNav on auth pages
  const isAuthPage = pathname.startsWith('/auth/')

  // Global escape key handler to close any stuck overlays
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        // Remove any stuck overlays
        const overlays = document.querySelectorAll('[class*="fixed"][class*="inset-0"]')
        overlays.forEach(overlay => {
          if (overlay.style.zIndex > 1000) {
            overlay.style.display = 'none'
          }
        })
      }
    }
    
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      {/* Always show Navbar */}
      <Navbar />
      
      {/* Main content - takes remaining space, add bottom padding on mobile so content scrolls under fixed bottom nav */}
      <main className={`flex-1 flex flex-col ${!isAuthPage ? 'pb-24 lg:pb-0' : ''}`}>
        {children}
      </main>
      
      {/* Show BottomNav only if NOT on auth pages - Fixed at bottom on mobile */}
      {!isAuthPage && <BottomNav />}
      
      {/* Always show Footer */}
      <Footer />
      
      {/* Location Privacy Notice - shows once to new users */}
      <LocationPrivacyNotice />
    </div>
  )
}