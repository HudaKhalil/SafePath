'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import BottomNav from './BottomNav'
import Footer from './Footer'

export default function ConditionalLayout({ children }) {
  const pathname = usePathname()
  
  // Pages where we don't want to show navigation
  const authPages = ['/login', '/signup', '/register']
  const isAuthPage = authPages.includes(pathname)

  return (
    <>
      {/* Show Navbar only if NOT on auth pages */}
      {!isAuthPage && <Navbar />}
      
      {/* Main content */}
      <main>
        {children}
      </main>
      
      {/* Show BottomNav only if NOT on auth pages */}
      {!isAuthPage && <BottomNav />}
      
      {/* Always show Footer */}
      <Footer />
    </>
  )
}