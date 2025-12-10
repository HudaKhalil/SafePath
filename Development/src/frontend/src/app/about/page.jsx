'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AboutPage() {
  const router = useRouter()
  const [isDark, setIsDark] = useState(false)
  const [visibleSections, setVisibleSections] = useState(new Set())
  const sectionRefs = useRef([])

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkDarkMode()
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = sectionRefs.current.indexOf(entry.target)
            setVisibleSections((prev) => new Set([...prev, index]))
          }
        })
      },
      { threshold: 0.2 }
    )

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen pb-20 md:pb-0" style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff' }}>
      {/* ===== HERO SECTION WITH VIDEO ===== */}
      <section className="relative overflow-hidden min-h-[60vh] flex items-center pt-8 md:pt-16" style={{ 
        background: isDark 
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' 
          : 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
      }}>
        <div className="container mx-auto px-4 md:px-6 lg:px-12 max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-center">
            {/* Left: Hero Copy */}
            <div className="text-center lg:text-left space-y-4 md:space-y-6 animate-fade-in-up">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight">
                <span style={{ color: isDark ? '#ffffff' : '#0f172a' }}>Navigate </span>
                <span style={{ color: '#06d6a0' }}>Safely</span>
                <br />
                <span style={{ color: isDark ? '#ffffff' : '#0f172a' }}>Arrive </span>
                <span style={{ color: '#06d6a0' }}>Confidently</span>
              </h1>
              <p className="text-base md:text-lg lg:text-xl" style={{ 
                color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#64748b' 
              }}>
                SafePath combines real-time hazard detection, crime data analysis, and community intelligence to guide you on the safest routes across London.
              </p>
              <p className="text-sm md:text-base lg:text-lg font-semibold" style={{ 
                color: isDark ? '#06d6a0' : '#0f172a'
              }}>
                MSc Graduation Project • Technological University Dublin • 2025/2026
              </p>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center lg:justify-start pt-2 md:pt-4">
                <button
                  onClick={() => router.push('/suggested-routes')}
                  className="px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-base md:text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                  style={{ backgroundColor: '#06d6a0', color: '#0f172a' }}
                >
                  Start Your Safer Journey
                </button>
                <button
                  onClick={() => {
                    const element = document.getElementById('features')
                    if (element) {
                      const offset = 80 // navbar height
                      const elementPosition = element.getBoundingClientRect().top
                      const offsetPosition = elementPosition + window.pageYOffset - offset
                      window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
                    }
                  }}
                  className="px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-base md:text-lg transition-all duration-300 border-2"
                  style={{ 
                    borderColor: '#06d6a0',
                    color: isDark ? '#06d6a0' : '#0f172a',
                    backgroundColor: 'transparent'
                  }}
                >
                  Learn More
                </button>
              </div>
            </div>

            {/* Right: SafePath Animated Video */}
            <div className="relative animate-fade-in-up animation-delay-300 max-w-md mx-auto lg:max-w-lg">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ 
                backgroundColor: isDark ? '#1e293b' : '#f8fafc'
              }}>
                <video 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  className="w-full h-full object-cover"
                >
                  <source src="/safepath-hero.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full blur-3xl opacity-50" style={{ backgroundColor: '#06d6a0' }}></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full blur-3xl opacity-30" style={{ backgroundColor: '#3b82f6' }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ANIMATED FEATURE SECTIONS ===== */}
      <section id="features" className="py-8 md:py-12 lg:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-12 space-y-12 md:space-y-16 lg:space-y-20 max-w-6xl">
          
          {/* Feature 1: Safer Route Planning */}
          <div 
            ref={(el) => (sectionRefs.current[0] = el)}
            className={`grid lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-center transition-all duration-1000 ${
              visibleSections.has(0) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
            }`}
          >
            <div className="order-2 lg:order-1">
              {/* Animated Video - Safest vs Fastest */}
              <div className="relative aspect-square max-w-md mx-auto">
                <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center" style={{ 
                  backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                  boxShadow: isDark 
                    ? '0 20px 60px rgba(6, 214, 160, 0.3), 0 8px 24px rgba(0, 0, 0, 0.4), inset 0 0 40px rgba(6, 214, 160, 0.1)' 
                    : '0 20px 60px rgba(6, 214, 160, 0.2), 0 8px 24px rgba(0, 0, 0, 0.15), inset 0 0 40px rgba(6, 214, 160, 0.05)'
                }}>
                  <video 
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    className="w-full h-full object-contain"
                    style={{ transform: 'scale(1.2)' }}
                  >
                    <source src="/safest_vs_fastest.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>

                {/* Decorative shadow elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full blur-3xl opacity-50" style={{ backgroundColor: '#06d6a0' }}></div>
                <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full blur-3xl opacity-30" style={{ backgroundColor: '#3b82f6' }}></div>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-3 md:space-y-4 lg:space-y-6">
              <div className="inline-block px-3 py-1.5 md:px-4 md:py-2 rounded-full text-base md:text-lg font-bold" style={{ 
                backgroundColor: isDark ? 'rgba(6, 214, 160, 0.2)' : 'rgba(6, 214, 160, 0.1)',
                color: '#06d6a0'
              }}>
                Feature #1
              </div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                Smarter Route Planning
              </h2>
              <p className="text-base md:text-lg lg:text-xl leading-relaxed" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                Choose between the <strong style={{ color: '#06d6a0' }}>safest</strong> or <strong style={{ color: '#3b82f6' }}>fastest</strong> routes. 
                Our algorithm analyzes crime data, lighting conditions, and real-time hazards to calculate safety scores for every path.
              </p>
              <ul className="space-y-3">
                {['Real-time safety scoring', 'Multiple route options', 'Crime data integration', 'Well-lit path prioritization'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#06d6a0' }}>
                      <span className="text-white text-sm">✓</span>
                    </div>
                    <span style={{ color: isDark ? '#e2e8f0' : '#475569' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Feature 2: Hazard Reporting */}
          <div 
            ref={(el) => (sectionRefs.current[1] = el)}
            className={`grid lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-center transition-all duration-1000 ${
              visibleSections.has(1) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
            }`}
          >
            <div className="space-y-3 md:space-y-4 lg:space-y-6">
              <div className="inline-block px-3 py-1.5 md:px-4 md:py-2 rounded-full text-base md:text-lg font-bold" style={{ 
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
                color: '#f59e0b'
              }}>
                Feature #2
              </div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                Community-Powered Hazards
              </h2>
              <p className="text-base md:text-lg lg:text-xl leading-relaxed" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                Report hazards instantly with photos and descriptions. From broken streetlights to suspicious activity, 
                your reports help <strong style={{ color: '#06d6a0' }}>protect the entire community</strong>.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: '🚧', label: 'Construction' },
                  { icon: '💡', label: 'Poor Lighting' },
                  { icon: '🚨', label: 'Crime Alerts' },
                  { icon: '🕳️', label: 'Road Damage' }
                ].map((hazard, i) => (
                  <div key={i} className="p-4 rounded-xl text-center border-2" style={{ 
                    backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                    borderColor: isDark ? 'rgba(6, 214, 160, 0.3)' : 'rgba(0, 0, 0, 0.1)'
                  }}>
                    <div className="text-3xl mb-2">{hazard.icon}</div>
                    <div className="text-sm font-semibold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                      {hazard.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative aspect-square max-w-md mx-auto">
              <svg viewBox="0 0 400 400" className="w-full h-full">
                <circle cx="200" cy="200" r="180" fill={isDark ? '#1e293b' : '#f1f5f9'} />
                
                {/* Map Grid */}
                <g opacity="0.2">
                  {[...Array(8)].map((_, i) => (
                    <line key={`h${i}`} x1="50" y1={70 + i * 40} x2="350" y2={70 + i * 40} stroke={isDark ? '#06d6a0' : '#0f172a'} strokeWidth="1" />
                  ))}
                  {[...Array(8)].map((_, i) => (
                    <line key={`v${i}`} x1={70 + i * 40} y1="50" x2={70 + i * 40} y2="350" stroke={isDark ? '#06d6a0' : '#0f172a'} strokeWidth="1" />
                  ))}
                </g>

                {/* Animated Hazard Pins */}
                {[
                  { x: 150, y: 120, icon: '🚧', delay: 0 },
                  { x: 280, y: 180, icon: '💡', delay: 300 },
                  { x: 200, y: 280, icon: '🚨', delay: 600 }
                ].map((pin, i) => (
                  <g key={i} className={visibleSections.has(1) ? `animate-drop-in animation-delay-${pin.delay}` : 'opacity-0'}>
                    <circle cx={pin.x} cy={pin.y} r="25" fill="#ef4444" opacity="0.9" />
                    <text x={pin.x} y={pin.y + 8} textAnchor="middle" fontSize="28">{pin.icon}</text>
                    <circle cx={pin.x} cy={pin.y} r="35" fill="none" stroke="#ef4444" strokeWidth="2" className="animate-ping" />
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Feature 3: Find Buddy */}
          <div 
            ref={(el) => (sectionRefs.current[2] = el)}
            className={`grid lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-center transition-all duration-1000 ${
              visibleSections.has(2) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
            }`}
          >
            <div className="order-2 lg:order-1">
              {/* Animated Video - Find Buddy */}
              <div className="relative aspect-square max-w-md mx-auto">
                <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center" style={{ 
                  backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                  boxShadow: isDark 
                    ? '0 20px 60px rgba(168, 85, 247, 0.3), 0 8px 24px rgba(0, 0, 0, 0.4), inset 0 0 40px rgba(168, 85, 247, 0.1)' 
                    : '0 20px 60px rgba(168, 85, 247, 0.2), 0 8px 24px rgba(0, 0, 0, 0.15), inset 0 0 40px rgba(168, 85, 247, 0.05)'
                }}>
                  <video 
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    className="w-full h-full object-contain"
                    style={{ transform: 'scale(1.2)' }}
                  >
                    <source src="/findbuddy.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>

                {/* Decorative shadow elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full blur-3xl opacity-50" style={{ backgroundColor: '#a855f7' }}></div>
                <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full blur-3xl opacity-30" style={{ backgroundColor: '#06d6a0' }}></div>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-3 md:space-y-4 lg:space-y-6">
              <div className="inline-block px-3 py-1.5 md:px-4 md:py-2 rounded-full text-base md:text-lg font-bold" style={{ 
                backgroundColor: isDark ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.1)',
                color: '#a855f7'
              }}>
                Feature #3
              </div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                Find Your Safety Buddy
              </h2>
              <p className="text-base md:text-lg lg:text-xl leading-relaxed" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                Never walk alone. Connect with nearby users heading in the same direction. 
                Share your journey with trusted friends and family for <strong style={{ color: '#06d6a0' }}>peace of mind</strong>.
              </p>
              <div className="space-y-4">
                {[
                  'Real-time location sharing',
                  'Instant buddy matching',
                  'Emergency SOS alerts',
                  'Journey tracking'
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl" style={{ 
                    backgroundColor: isDark ? 'rgba(6, 214, 160, 0.1)' : 'rgba(6, 214, 160, 0.05)'
                  }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#06d6a0' }}>
                      <span className="text-white font-bold">✓</span>
                    </div>
                    <span className="font-semibold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feature 4: Real-Time Awareness */}
          <div 
            ref={(el) => (sectionRefs.current[3] = el)}
            className={`grid lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-center transition-all duration-1000 ${
              visibleSections.has(3) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
            }`}
          >
            <div className="space-y-3 md:space-y-4 lg:space-y-6">
              <div className="inline-block px-3 py-1.5 md:px-4 md:py-2 rounded-full text-base md:text-lg font-bold" style={{ 
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444'
              }}>
                Feature #4
              </div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                Real-Time Alerts
              </h2>
              <p className="text-base md:text-lg lg:text-xl leading-relaxed" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                Stay informed with instant notifications about hazards, incidents, and safety concerns along your route. 
                Our <strong style={{ color: '#06d6a0' }}>WebSocket-powered system</strong> delivers alerts in milliseconds.
              </p>
              <div className="grid gap-4">
                {[
                  { severity: 'Critical', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', icon: '🚨' },
                  { severity: 'High', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', icon: '⚠️' },
                  { severity: 'Medium', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)', icon: '⚡' }
                ].map((alert, i) => (
                  <div key={i} className="p-4 rounded-xl border-2 flex items-center gap-4" style={{ 
                    backgroundColor: alert.bg,
                    borderColor: alert.color
                  }}>
                    <span className="text-3xl">{alert.icon}</span>
                    <div>
                      <div className="font-bold" style={{ color: alert.color }}>{alert.severity} Alert</div>
                      <div className="text-sm" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                        Instant push notifications
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative aspect-square max-w-md mx-auto">
              <svg viewBox="0 0 400 400" className="w-full h-full">
                <circle cx="200" cy="200" r="180" fill={isDark ? '#1e293b' : '#f1f5f9'} />
                
                {/* Pulsing Alert Zones */}
                {[
                  { cx: 150, cy: 150, color: '#ef4444', delay: 0 },
                  { cx: 250, cy: 250, color: '#f97316', delay: 500 },
                  { cx: 280, cy: 150, color: '#eab308', delay: 1000 }
                ].map((zone, i) => (
                  <g key={i} className={visibleSections.has(3) ? `animation-delay-${zone.delay}` : 'opacity-0'}>
                    <circle cx={zone.cx} cy={zone.cy} r="40" fill={zone.color} opacity="0.2" className="animate-pulse-scale" />
                    <circle cx={zone.cx} cy={zone.cy} r="25" fill={zone.color} opacity="0.4" className="animate-pulse-scale" />
                    <circle cx={zone.cx} cy={zone.cy} r="15" fill={zone.color} />
                  </g>
                ))}

                {/* Notification Cards */}
                <g className={visibleSections.has(3) ? 'animate-slide-in-down' : 'opacity-0'}>
                  <rect x="60" y="50" width="180" height="60" rx="10" fill="white" stroke="#ef4444" strokeWidth="2" />
                  <text x="150" y="75" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#ef4444">HAZARD DETECTED</text>
                  <text x="150" y="95" textAnchor="middle" fontSize="10" fill="#64748b">150m ahead</text>
                </g>
              </svg>
            </div>
          </div>

        </div>
      </section>

      {/* Key Features */}
      <section className="py-10 md:py-16 lg:py-20" style={{ backgroundColor: isDark ? '#1e293b' : '#f8fafc' }}>
        <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              What Makes SafePath Different
            </h2>
            <div className="w-24 h-1 mx-auto rounded-full" style={{ backgroundColor: '#06d6a0' }}></div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Feature 1 */}
            <div className="rounded-xl p-6 border-2 transition-transform hover:scale-105" style={{ 
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderColor: isDark ? 'rgba(6, 214, 160, 0.3)' : 'rgba(0, 0, 0, 0.1)'
            }}>
              <div className="mb-4">
                <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#06d6a0' : '#0f172a'} strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
                Smart Safety Scoring
              </h3>
              <p style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                Our algorithm analyzes crime data, lighting conditions, traffic patterns, and community reports to calculate real-time safety scores for every route.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-xl p-6 border-2 transition-transform hover:scale-105" style={{ 
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderColor: isDark ? 'rgba(6, 214, 160, 0.3)' : 'rgba(0, 0, 0, 0.1)'
            }}>
              <div className="mb-4">
                <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#06d6a0' : '#0f172a'} strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
                Community-Powered
              </h3>
              <p style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                Real users report hazards in real-time. From construction zones to suspicious activity, our community keeps everyone informed and protected.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-xl p-6 border-2 transition-transform hover:scale-105" style={{ 
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderColor: isDark ? 'rgba(6, 214, 160, 0.3)' : 'rgba(0, 0, 0, 0.1)'
            }}>
              <div className="mb-4">
                <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#06d6a0' : '#0f172a'} strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
                Multiple Route Options
              </h3>
              <p className="text-sm" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                Choose between the safest or fastest routes. We provide multiple options so you can decide what matters most for your journey.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-xl p-6 border-2 transition-transform hover:scale-105" style={{ 
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderColor: isDark ? 'rgba(6, 214, 160, 0.3)' : 'rgba(0, 0, 0, 0.1)'
            }}>
              <div className="mb-4">
                <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#06d6a0' : '#0f172a'} strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
                Buddy System
              </h3>
              <p style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                Connect with trusted friends and family. Share your location and route in real-time so your loved ones know you're safe.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="rounded-xl p-6 border-2 transition-transform hover:scale-105" style={{ 
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderColor: isDark ? 'rgba(6, 214, 160, 0.3)' : 'rgba(0, 0, 0, 0.1)'
            }}>
              <div className="mb-4">
                <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#06d6a0' : '#0f172a'} strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
                Real-Time Alerts
              </h3>
              <p style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                Get instant notifications about nearby hazards, incidents, or safety concerns as they're reported by other users.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="rounded-xl p-6 border-2 transition-transform hover:scale-105" style={{ 
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderColor: isDark ? 'rgba(6, 214, 160, 0.3)' : 'rgba(0, 0, 0, 0.1)'
            }}>
              <div className="mb-4">
                <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#06d6a0' : '#0f172a'} strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
                Data-Driven Insights
              </h3>
              <p style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                We analyze thousands of crime reports and hazard incidents to provide you with accurate, up-to-date safety information for London.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              How It Works
            </h2>
            <div className="w-24 h-1 mx-auto rounded-full" style={{ backgroundColor: '#06d6a0' }}></div>
          </div>

          <div className="max-w-4xl mx-auto space-y-8">
            {/* Step 1 */}
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold" style={{ 
                backgroundColor: '#06d6a0',
                color: '#0f172a'
              }}>
                1
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  Enter Your Destination
                </h3>
                <p className="text-lg" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                  Simply type where you want to go, and we'll find multiple route options for you.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold" style={{ 
                backgroundColor: '#06d6a0',
                color: '#0f172a'
              }}>
                2
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  View Safety Scores
                </h3>
                <p className="text-lg" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                  Each route is scored based on crime data, hazards, lighting, and community reports. Color-coded for quick understanding.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold" style={{ 
                backgroundColor: '#06d6a0',
                color: '#0f172a'
              }}>
                3
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  Choose Your Route
                </h3>
                <p className="text-lg" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                  Select the safest or fastest route based on your preferences and time constraints.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold" style={{ 
                backgroundColor: '#06d6a0',
                color: '#0f172a'
              }}>
                4
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  Travel Safely
                </h3>
                <p className="text-lg" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                  Follow your chosen route with confidence. Share your journey with buddies and receive real-time alerts if needed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why SafePath Works - Full Width Strip */}
      <section className="py-12 md:py-16" style={{ 
        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
        borderTop: `4px solid #06d6a0`,
        borderBottom: `4px solid #06d6a0`
      }}>
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              Why SafePath Works
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
              Three pillars that make your journey safer
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto">
            {/* Data-Driven */}
            <div className="text-center group">
              <div className="w-32 h-32 mx-auto mb-6 rounded-full flex items-center justify-center transition-transform group-hover:scale-110" style={{ 
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                border: `3px solid #06d6a0`
              }}>
                <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="#06d6a0" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
                Data-Driven
              </h3>
              <p className="text-lg" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                Hazards, lighting conditions, and crime layers analyzed in real-time to calculate the safest routes
              </p>
            </div>

            {/* Community-Powered */}
            <div className="text-center group">
              <div className="w-32 h-32 mx-auto mb-6 rounded-full flex items-center justify-center transition-transform group-hover:scale-110" style={{ 
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                border: `3px solid #06d6a0`
              }}>
                <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="#06d6a0" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
                Community-Powered
              </h3>
              <p className="text-lg" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                Real user reports keep everyone informed about current conditions and emerging hazards
              </p>
            </div>

            {/* Personalized */}
            <div className="text-center group">
              <div className="w-32 h-32 mx-auto mb-6 rounded-full flex items-center justify-center transition-transform group-hover:scale-110" style={{ 
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                border: `3px solid #06d6a0`
              }}>
                <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="#06d6a0" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
                Personalized
              </h3>
              <p className="text-lg" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                Choose your safety preferences: fastest or safest based on your comfort level
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* User Stories - Animated Cases */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              Real Stories, Real Safety
            </h2>
            <p className="text-lg max-w-3xl mx-auto" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
              See how SafePath helps people navigate safely every day
            </p>
          </div>

          <div className="space-y-12 max-w-5xl mx-auto">
            {/* Story 1: Cyclist */}
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
              <div className="flex-1 order-2 md:order-1">
                <div className="rounded-2xl p-6 border-2" style={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: '#06d6a0'
                }}>
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#06d6a0' : '#0f172a'} strokeWidth="2">
                      <circle cx="5.5" cy="17.5" r="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="18.5" cy="17.5" r="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5.5 17.5L8 12L12 13L15.5 8.5L18.5 17.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 13L14.5 17.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="17" cy="5" r="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <h3 className="text-xl font-bold" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
                      Evening Cyclist
                    </h3>
                  </div>
                  <p className="text-base mb-3" style={{ color: isDark ? '#e2e8f0' : '#475569' }}>
                    "I cycle home from work after dark. SafePath shows me well-lit routes and helps me avoid poorly maintained roads. I feel so much safer now."
                  </p>
                  <div className="flex items-center gap-2 text-sm" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                    <span className="font-semibold">Sarah, 28</span>
                    <span>•</span>
                    <span>London, UK</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 order-1 md:order-2 w-full max-w-xs mx-auto">
                <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl" style={{ 
                  backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
                  border: `3px solid ${isDark ? '#06d6a0' : '#06d6a0'}`,
                  boxShadow: '0 10px 40px rgba(6, 214, 160, 0.3)'
                }}>
                  <img 
                    src="/cycling.png" 
                    alt="Evening Cyclist"
                    className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>
            </div>

            {/* Story 2: Pedestrian */}
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
              <div className="flex-1 w-full max-w-xs mx-auto">
                <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl" style={{ 
                  backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
                  border: `3px solid ${isDark ? '#06d6a0' : '#06d6a0'}`,
                  boxShadow: '0 10px 40px rgba(6, 214, 160, 0.3)'
                }}>
                  <img 
                    src="/walking.png" 
                    alt="Daily Walker"
                    className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="rounded-2xl p-6 border-2" style={{ 
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: '#06d6a0'
                }}>
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#06d6a0' : '#0f172a'} strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <h3 className="text-xl font-bold" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
                      Daily Walker
                    </h3>
                  </div>
                  <p className="text-base mb-3" style={{ color: isDark ? '#e2e8f0' : '#475569' }}>
                    "Before heading out, I check for hazards on my route. Construction zones, accidents, everything is there. I can plan ahead and stay safe."
                  </p>
                  <div className="flex items-center gap-2 text-sm" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                    <span className="font-semibold">James, 35</span>
                    <span>•</span>
                    <span>London, UK</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Story 3: Find Buddy */}
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
              <div className="flex-1 order-2 md:order-1 w-full">
                <div className="rounded-2xl p-6 border-2" style={{ 
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: '#06d6a0'
                }}>
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#06d6a0' : '#0f172a'} strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <h3 className="text-xl font-bold" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
                      Buddy Traveler
                    </h3>
                  </div>
                  <p className="text-base mb-3" style={{ color: isDark ? '#e2e8f0' : '#475569' }}>
                    "Walking alone at night used to make me anxious. Now I use the Find Buddy feature to connect with others going the same way. It's a game-changer!"
                  </p>
                  <div className="flex items-center gap-2 text-sm" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                    <span className="font-semibold">Emma, 24</span>
                    <span>•</span>
                    <span>London, UK</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 order-1 md:order-2 w-full max-w-xs mx-auto">
                <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl" style={{ 
                  backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
                  border: `3px solid ${isDark ? '#06d6a0' : '#06d6a0'}`,
                  boxShadow: '0 10px 40px rgba(6, 214, 160, 0.3)'
                }}>
                  <img 
                    src="/finbuddy_img.png" 
                    alt="Buddy Traveler"
                    className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              Meet the Team
            </h2>
            <p className="text-lg max-w-3xl mx-auto" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
              Built by students passionate about creating safer communities
            </p>
          </div>

          <div className="flex overflow-x-auto md:grid md:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-8 lg:gap-12 max-w-7xl mx-auto mb-12 pb-4 snap-x snap-mandatory scrollbar-hide">
            {/* Team Member 1 */}
            <div className="text-center group flex-shrink-0 w-40 md:w-auto snap-center">
              <div className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 mx-auto mb-4 rounded-full overflow-hidden border-4 transition-transform group-hover:scale-105" style={{ borderColor: '#06d6a0' }}>
                <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0' }}>
                  <svg className="w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#06d6a0' : '#0f172a'} strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-1" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
                Huda
              </h3>
              <p className="text-sm md:text-base" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Full Stack Developer</p>
            </div>

            {/* Team Member 2 */}
            <div className="text-center group flex-shrink-0 w-40 md:w-auto snap-center">
              <div className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 mx-auto mb-4 rounded-full overflow-hidden border-4 transition-transform group-hover:scale-105" style={{ borderColor: '#06d6a0' }}>
                <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0' }}>
                  <svg className="w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#06d6a0' : '#0f172a'} strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-1" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
                Shalini
              </h3>
              <p className="text-sm md:text-base" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Full Stack Developer</p>
            </div>

            {/* Team Member 3 */}
            <div className="text-center group flex-shrink-0 w-40 md:w-auto snap-center">
              <div className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 mx-auto mb-4 rounded-full overflow-hidden border-4 transition-transform group-hover:scale-105" style={{ borderColor: '#06d6a0' }}>
                <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0' }}>
                  <svg className="w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#06d6a0' : '#0f172a'} strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-1" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
                Priyanka
              </h3>
              <p className="text-sm md:text-base" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Full Stack Developer</p>
            </div>

            {/* Team Member 4 */}
            <div className="text-center group flex-shrink-0 w-40 md:w-auto snap-center">
              <div className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 mx-auto mb-4 rounded-full overflow-hidden border-4 transition-transform group-hover:scale-105" style={{ borderColor: '#06d6a0' }}>
                <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0' }}>
                  <svg className="w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#06d6a0' : '#0f172a'} strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-1" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
                Karan
              </h3>
              <p className="text-sm md:text-base" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Full Stack Developer</p>
            </div>

            {/* Team Member 5 */}
            <div className="text-center group flex-shrink-0 w-40 md:w-auto snap-center">
              <div className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 mx-auto mb-4 rounded-full overflow-hidden border-4 transition-transform group-hover:scale-105" style={{ borderColor: '#06d6a0' }}>
                <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0' }}>
                  <svg className="w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#06d6a0' : '#0f172a'} strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-1" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
                Hina
              </h3>
              <p className="text-sm md:text-base" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Data Analyst</p>
            </div>
          </div>

          {/* Mentors */}
          <div className="text-center max-w-3xl mx-auto rounded-2xl p-8" style={{ 
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            border: `2px solid ${isDark ? '#334155' : '#e2e8f0'}`
          }}>
            <h3 className="text-2xl font-bold mb-4" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
              With Guidance from Mentors
            </h3>
            <div className="flex flex-wrap justify-center gap-6" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
              <span className="text-xl font-semibold">Andrea Curley</span>
              <span className="text-xl font-semibold">Brendan Tierney</span>
              <span className="text-xl font-semibold">Damian Gordon</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - Big, Simple, Modern */}
      <section className="py-16 md:py-24 relative overflow-hidden" style={{ 
        background: isDark 
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' 
          : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
      }}>
        <div className="container mx-auto px-6 text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-6 md:mb-8" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              Start Your <span style={{ color: '#06d6a0' }}>Safer Journey</span> Today
            </h2>
            <p className="text-base md:text-lg lg:text-xl mb-8 md:mb-12 max-w-2xl mx-auto" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
              Navigate London safely with real-time hazard alerts and intelligent routing
            </p>
            <Link 
              href="/suggested-routes"
              className="inline-flex items-center justify-center gap-2 md:gap-3 px-8 py-4 md:px-12 md:py-6 rounded-2xl font-bold text-lg md:text-xl lg:text-2xl transition-all duration-200 shadow-2xl hover:shadow-3xl transform hover:scale-105"
              style={{ backgroundColor: '#06d6a0', color: '#0f172a' }}
            >
              Try SafePath Beta
              <span className="text-2xl md:text-3xl">→</span>
            </Link>
            
            <div className="mt-8 md:mt-12 flex justify-center gap-6 md:gap-12 text-center">
              <div>
                <div className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1 md:mb-2" style={{ color: '#06d6a0' }}>Coming</div>
                <div className="text-sm md:text-base" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Soon</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1 md:mb-2" style={{ color: '#06d6a0' }}>2025</div>
                <div className="text-sm md:text-base" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Launch</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1 md:mb-2" style={{ color: '#06d6a0' }}>Beta</div>
                <div className="text-sm md:text-base" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Testing</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-20" style={{ backgroundColor: '#06d6a0' }}></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ backgroundColor: '#06d6a0' }}></div>
      </section>
    </div>
  )
}
