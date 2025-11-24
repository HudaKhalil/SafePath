'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import BottomNav from './BottomNav'
import Footer from './Footer'

export default function ConditionalLayout({ children }) {
  const pathname = usePathname()
  
  // Always show navbar and footer, only hide BottomNav on auth pages
  const isAuthPage = pathname.startsWith('/auth/')

  return (
    <div className="flex flex-col min-h-screen">
      {/* Always show Navbar */}
      <Navbar />
      
      {/* Main content - takes remaining space */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      
      {/* Show BottomNav only if NOT on auth pages */}
      {!isAuthPage && <BottomNav />}
      
      {/* Always show Footer */}
      <Footer />
    </div>
  )
}