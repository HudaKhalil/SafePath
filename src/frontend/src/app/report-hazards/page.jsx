'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { hazardsService } from '../../lib/services'
import ProtectedRoute from '../../components/auth/ProtectedRoute'
import HazardAlert from '../../components/HazardAlert'
import Toast from '../../components/Toast'

const Map = dynamic(() => import('../../components/Map'), { ssr: false })

export default function HazardReporting() {
  const [hazards, setHazards] = useState([])
  const [loading, setLoading] = useState(false) // Start false, only set true when fetching hazards
  const [userLocation, setUserLocation] = useState([51.5074, -0.1278]) // Default location immediately
  const [showReportForm, setShowReportForm] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [realTimeAlerts, setRealTimeAlerts] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [toast, setToast] = useState(null)
  const eventSourceRef = useRef(null)
  
 
  const [isLightMode, setIsLightMode] = useState(false)
  
  useEffect(() => {
   
    setIsLightMode(!document.documentElement.classList.contains('dark'))
    
  
    const observer = new MutationObserver(() => {
      setIsLightMode(!document.documentElement.classList.contains('dark'))
    })
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => observer.disconnect()
  }, [])
  
  const [formData, setFormData] = useState({
    type: '',
    severity: 'medium',
    description: '',
    latitude: '',
    longitude: '',
    affectsTraffic: false,
    weatherRelated: false
  })

  // Define all callbacks first before useEffect
  const getUserLocation = () => {
    const startTime = performance.now()
    console.log('⏱️ Getting user location in background...')
    
    if (navigator.geolocation) {
      // Get location in background without blocking UI
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = [position.coords.latitude, position.coords.longitude]
          console.log(`✓ Real location obtained in ${(performance.now() - startTime).toFixed(0)}ms:`, location)
          setUserLocation(location) // This will trigger reload of hazards with real location
        },
        (error) => {
          console.log(`ℹ️ Using default location (geolocation ${error.message.toLowerCase()})`)
          // Keep default location, no need to set again
        },
        {
          timeout: 3000, // Reduced to 3 seconds
          enableHighAccuracy: false,
          maximumAge: 300000
        }
      )
    }
  }

  const loadRecentHazards = useCallback(async () => {
    if (!userLocation) return
    
    const startTime = performance.now()
    console.log('⏱️ Loading hazards...')
    
    try {
      setLoading(true)
      const response = await hazardsService.getNearbyHazards(
        userLocation[0], 
        userLocation[1], 
        { radius: 10000, limit: 20 }
      )
      console.log(`✓ Hazards loaded in ${(performance.now() - startTime).toFixed(0)}ms:`, response.data?.hazards?.length || 0, 'hazards')
      
      if (response.success) {
        setHazards(response.data?.hazards || [])
      } else {
        setError('Failed to load hazards')
        setHazards([])
      }
    } catch (error) {
      console.error('Error loading recent hazards:', error)
      setError('Failed to load hazards')
      setHazards([])
    } finally {
      setLoading(false)
    }
  }, [userLocation])

  const handleRealTimeMessage = useCallback((data) => {
    console.log('Real-time hazard update:', data)
    
    if (data.type === 'connected') {
      setIsConnected(true)
    } else if (data.type === 'new_hazard') {
      const alertId = Date.now()
      setRealTimeAlerts(prev => [...prev, { ...data, id: alertId }])
      
      if (data.hazard) {
        setHazards(prev => [data.hazard, ...prev.slice(0, 19)])
      }
    }
  }, [])

  const handleRealTimeError = useCallback((error) => {
    console.error('Real-time connection error:', error)
    setIsConnected(false)
  }, [])

  const connectToRealTimeUpdates = useCallback(() => {
    if (userLocation && !eventSourceRef.current) {
      const startTime = performance.now()
      console.log('⏱️ Connecting to real-time stream...')
      
      try {
        eventSourceRef.current = hazardsService.connectToHazardStream(
          userLocation[0],
          userLocation[1],
          handleRealTimeMessage,
          handleRealTimeError
        )
        console.log(`✓ Real-time stream connected in ${(performance.now() - startTime).toFixed(0)}ms`)
        setIsConnected(true)
      } catch (error) {
        console.error('Failed to connect to real-time updates:', error)
        setIsConnected(false)
      }
    }
  }, [userLocation, handleRealTimeMessage, handleRealTimeError])

  const disconnectFromRealTimeUpdates = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setIsConnected(false)
    }
  }, [])

  // useEffect hooks after all callbacks are defined
  useEffect(() => {
    console.log('🚀 Report Hazards page mounted')
    const mountTime = performance.now()
    getUserLocation()
    
    // Log when page is fully interactive
    const timer = setTimeout(() => {
      console.log(`📊 Page fully loaded in ${(performance.now() - mountTime).toFixed(0)}ms`)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (userLocation) {
      // Load hazards first
      loadRecentHazards()
      
      // Connect to real-time updates after a short delay to not block initial render
      const timer = setTimeout(() => {
        connectToRealTimeUpdates()
      }, 500) // Increased delay to 500ms
      
      return () => {
        clearTimeout(timer)
        disconnectFromRealTimeUpdates()
      }
    }
  }, [userLocation?.[0], userLocation?.[1], loadRecentHazards, connectToRealTimeUpdates, disconnectFromRealTimeUpdates])

  const removeAlert = (alertId) => {
    setRealTimeAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }

  const handleMapClick = (latlng) => {
    setSelectedLocation([latlng.lat, latlng.lng])
    setFormData({
      ...formData,
      latitude: latlng.lat,
      longitude: latlng.lng
    })
    setShowReportForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const lat = selectedLocation ? selectedLocation[0] : formData.latitude
    const lng = selectedLocation ? selectedLocation[1] : formData.longitude
    
    if (!formData.type || !formData.description || !lat || !lng) {
      setToast({
        message: '⚠️ Please fill in all required fields and select a location on the map',
        type: 'error'
      })
      return
    }

    const submitData = {
      ...formData,
      latitude: lat,
      longitude: lng
    }

    try {
      console.log('Submitting hazard data:', submitData)
      const response = await hazardsService.reportHazard(submitData)
      console.log('Hazard submission response:', response)
      if (response.success) {
        setToast({
          message: '✅ Hazard report submitted successfully! Other users will be notified.',
          type: 'success'
        })
        setFormData({
          type: '',
          severity: 'medium',
          description: '',
          latitude: '',
          longitude: '',
          affectsTraffic: false,
          weatherRelated: false
        })
        setSelectedLocation(null)
        setShowReportForm(false)
        loadRecentHazards()
      } else {
        setToast({
          message: 'Failed to report hazard. Please try again.',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error reporting hazard:', error)
      setToast({
        message: 'Network error. Please check your connection and try again.',
        type: 'error'
      })
    }
  }

  const getSeverityBadgeColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen pt-20" style={{ background: 'var(--bg-body)' }}>
          <div className="container mx-auto px-6 py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 mx-auto" style={{ borderColor: '#06d6a0' }}></div>
              <p className="mt-4" style={{ color: 'var(--color-text-primary)' }}>Loading hazard reports...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen pt-5">
        {/*WHITE IN LIGHT MODE, DARK IN DARK MODE */}
        <section className="relative overflow-hidden py-4 md:py-3" style={{ 
  background: isLightMode ? '#ffffff' : 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)'
}}>
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h1 className="text-3xl md:text-3xl font-bold mb-2">
              <span style={{ color: isLightMode ? '#0f172a' : '#ffffff' }}>Report a </span>
              <span style={{ color: '#06d6a0' }}>Hazard</span>
            </h1>
            <p className="text-lg md:text-xl mb-1" style={{ 
              color: isLightMode ? '#475569' : 'rgba(255, 255, 255, 0.8)' 
            }}>
              Help keep community safe by reporting hazards and incidents in your area
            </p>

            <div className="flex justify-center gap-6 md:gap-12">
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: '#06d6a0' }}>{Array.isArray(hazards) ? hazards.length : 0}+</div>
                <div className="text-base" style={{ 
                  color: isLightMode ? '#475569' : 'rgba(255, 255, 255, 0.8)' 
                }}>Reports Filed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: '#06d6a0' }}>95%</div>
                <div className="text-base" style={{ 
                  color: isLightMode ? '#475569' : 'rgba(255, 255, 255, 0.8)' 
                }}>Response Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: '#06d6a0' }}>24h</div>
                <div className="text-base" style={{ 
                  color: isLightMode ? '#475569' : 'rgba(255, 255, 255, 0.8)' 
                }}>Avg Response</div>
              </div>
            </div>
          </div>
        </section>

     
        {realTimeAlerts.map((alert) => (
          <HazardAlert 
            key={alert.id} 
            alert={alert} 
            onClose={() => removeAlert(alert.id)} 
          />
        ))}

        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}

<section className="relative min-h-[calc(100vh-80px)] mt-4 pb-8" style={{ backgroundColor: isLightMode ? '#ffffff' : '#0f172a' }}>
          {/* Side Panel */}
          <div 
            className="fixed left-0 top-20 bottom-0 z-50 w-full md:w-96 transition-transform duration-300 shadow-2xl"
            style={{
              transform: showReportForm ? 'translateX(0)' : 'translateX(-100%)',
            }}
          >
            <div className="h-full overflow-y-auto">
              <div className="p-4">
                <div className="border-2 rounded-2xl p-4 md:p-6" style={{ 
                  backgroundColor: isLightMode ? '#ffffff' : '#1e293b',
                  borderColor: isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'
                }}>
                  <div className="mb-4">
                    <h3 className="text-2xl font-bold" style={{ 
                      color: isLightMode ? '#0f172a' : '#06d6a0' 
                    }}>Report a Hazard</h3>
                    <p className="text-sm mt-1" style={{ 
                      color: isLightMode ? '#64748b' : '#06d6a0' 
                    }}>Help keep community safe</p>
                  </div>
                
                {showReportForm ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="flex items-center gap-2 text-base font-medium mb-2" style={{ 
                        color: isLightMode ? '#0f172a' : '#ffffff' 
                      }}>
                        <span className="font-bold">Hazard Type</span> *
                      </label>
                      <select 
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 text-lg"
                        style={{ 
                          backgroundColor: '#ffffff',
                          color: '#0f172a',
                          borderColor: isLightMode ? '#d1d5db' : '#374151'
                        }}
                        required
                      >
                        <option value="">Select hazard type...</option>
                        <option value="construction">🚧 Construction Work</option>
                        <option value="accident">🚗💥 Traffic Accident</option>
                        <option value="crime">🚔 Crime/Security Issue</option>
                        <option value="flooding">🌊 Flooding</option>
                        <option value="poor_lighting">💡 Poor Lighting</option>
                        <option value="road_damage">🕳️ Road Damage</option>
                        <option value="pothole">🕳️ Pothole</option>
                        <option value="unsafe_crossing">⚠️ Unsafe Crossing</option>
                        <option value="broken_glass">🔍 Broken Glass</option>
                        <option value="suspicious_activity">👁️ Suspicious Activity</option>
                        <option value="vandalism">🎯 Vandalism</option>
                        <option value="other">⚠️ Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-base font-medium mb-2" style={{ 
                        color: isLightMode ? '#0f172a' : '#ffffff' 
                      }}>
                        <span className="font-bold">Severity Level</span> *
                      </label>
                      <div className="flex gap-4 flex-wrap">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="severity" 
                            value="low" 
                            checked={formData.severity === 'low'}
                            onChange={(e) => setFormData({...formData, severity: e.target.value})}
                            className="text-accent" 
                          />
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block w-4 h-4 rounded-full bg-yellow-300"></span>
                            <span className="text-lg" style={{ 
                              color: isLightMode ? '#475569' : '#06d6a0' 
                            }}>Low Risk</span>
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="severity" 
                            value="medium" 
                            checked={formData.severity === 'medium'}
                            onChange={(e) => setFormData({...formData, severity: e.target.value})}
                            className="text-accent" 
                          />
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block w-4 h-4 rounded-full bg-amber-500"></span>
                            <span className="text-lg" style={{ 
                              color: isLightMode ? '#475569' : '#06d6a0' 
                            }}>Medium Risk</span>
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="severity" 
                            value="high" 
                            checked={formData.severity === 'high'}
                            onChange={(e) => setFormData({...formData, severity: e.target.value})}
                            className="text-accent" 
                          />
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block w-4 h-4 rounded-full bg-red-500"></span>
                            <span className="text-lg" style={{ 
                              color: isLightMode ? '#475569' : '#06d6a0' 
                            }}>High Risk</span>
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="severity" 
                            value="critical" 
                            checked={formData.severity === 'critical'}
                            onChange={(e) => setFormData({...formData, severity: e.target.value})}
                            className="text-accent" 
                          />
                          <span className="text-lg" style={{ 
                            color: isLightMode ? '#475569' : '#06d6a0' 
                          }}>🆘 Critical</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-base font-medium mb-2" style={{ 
                        color: isLightMode ? '#0f172a' : '#ffffff' 
                      }}>
                        <span className="font-bold">Additional Information</span>
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.affectsTraffic}
                            onChange={(e) => setFormData({...formData, affectsTraffic: e.target.checked})}
                            className="text-accent rounded" 
                          />
                          <span className="text-lg" style={{ 
                            color: isLightMode ? '#475569' : '#06d6a0' 
                          }}>🚦 Affects Traffic Flow</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.weatherRelated}
                            onChange={(e) => setFormData({...formData, weatherRelated: e.target.checked})}
                            className="text-accent rounded" 
                          />
                          <span className="text-lg" style={{ 
                            color: isLightMode ? '#475569' : '#06d6a0' 
                          }}>🌦️ Weather Related</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-base font-medium mb-2" style={{ 
                        color: isLightMode ? '#0f172a' : '#ffffff' 
                      }}>
                        <span className="font-bold">Report Details</span> *
                      </label>
                      <textarea 
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="Describe the hazard in detail. Include when you noticed it, any immediate dangers, and any other relevant information..."
                        className="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 text-lg" 
                        style={{ 
                          backgroundColor: '#ffffff',
                          color: '#0f172a',
                          borderColor: isLightMode ? '#d1d5db' : '#374151'
                        }}
                        rows={4}
                        required
                      />
                      <div className="text-sm mt-1" style={{ color: '#9ca3af' }}>Minimum 20 characters</div>
                    </div>

                    {selectedLocation && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-800 text-lg">
                          📍 Location selected: {selectedLocation[0].toFixed(6)}, {selectedLocation[1].toFixed(6)}
                        </p>
                      </div>
                    )}

                    {!selectedLocation && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800 text-lg">
                          ⚠️ Please click on the map to select the hazard location first
                        </p>
                      </div>
                    )}

                    <div className="flex gap-4">
                      <button
                        type="submit"
                        className={`font-bold py-3 px-8 rounded-lg transition-all duration-200 ${
                          selectedLocation || (formData.latitude && formData.longitude)
                            ? '' 
                            : 'cursor-not-allowed'
                        }`}
                        style={{
                          backgroundColor: selectedLocation || (formData.latitude && formData.longitude) ? '#06d6a0' : '#9ca3af',
                          color: '#0f172a'
                        }}
                        onMouseEnter={(e) => {
                          if (selectedLocation || (formData.latitude && formData.longitude)) {
                            e.target.style.backgroundColor = '#059669'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedLocation || (formData.latitude && formData.longitude)) {
                            e.target.style.backgroundColor = '#06d6a0'
                          }
                        }}
                        disabled={!selectedLocation && !(formData.latitude && formData.longitude)}
                      >
                        Submit Report
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowReportForm(false)
                          setSelectedLocation(null)
                          setFormData({
                            type: '',
                            severity: 'medium',
                            description: '',
                            latitude: '',
                            longitude: '',
                            affectsTraffic: false,
                            weatherRelated: false
                          })
                        }}
                        className="font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                        style={{
                          backgroundColor: '#06d6a0',
                          color: '#0f172a'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#06d6a0'}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🗺️</div>
                    <h3 className="text-xl font-bold mb-2" style={{ 
                      color: isLightMode ? '#0f172a' : '#ffffff' 
                    }}>Click "Report" to start</h3>
                    <p style={{ 
                      color: isLightMode ? '#475569' : '#9ca3af' 
                    }}>Select a location on the map and fill out the hazard details</p>
                  </div>
                )}
                </div>
              </div>
            </div>
          </div>

          {/* Toggle Button */}
          <button
            onClick={() => setShowReportForm(!showReportForm)}
            className="absolute left-4 top-4 z-20 transition-all duration-200"
            style={{
              backgroundColor: 'transparent',
            }}
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg" style={{
              backgroundColor: isLightMode ? '#0f172a' : '#06d6a0',
              border: `2px solid ${isLightMode ? '#0f172a' : '#06d6a0'}`
            }}>
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke={isLightMode ? '#ffffff' : '#0f172a'} 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="w-5 h-5 transition-transform duration-200"
                style={{
                  transform: showReportForm ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              <span className="font-medium text-base" style={{ 
                color: isLightMode ? '#ffffff' : '#0f172a' 
              }}>
                {showReportForm ? 'Close' : 'Report Hazard'}
              </span>
            </div>
          </button>

          {/* Main Map Area */}
          <div className="min-h-screen">
            <div className="space-y-4 p-4">
              
                <div className="border-2 rounded-2xl p-2 md:p-3" style={{ 
                  backgroundColor: isLightMode ? '#ffffff' : '#1e293b',
                  borderColor: isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'
                }}>
                  <div className="flex items-center justify-end mb-3">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        const londonCenter = [51.5074, -0.1278];
                        setUserLocation(londonCenter);
                        loadRecentHazards();
                        const span = e.currentTarget.querySelector('.london-text');
                        if (span) {
                          span.textContent = '✓ Set to London';
                          setTimeout(() => {
                            span.textContent = 'Set to London';
                          }, 1500);
                        }
                      }}
                      className="text-sm transition-all duration-200 flex items-center gap-1.5 focus:outline-none"
                      style={{
                        backgroundColor: 'transparent',
                        color: isLightMode ? '#1e293b' : '#06d6a0',
                        border: 'none',
                        padding: 0,
                        outline: 'none'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = isLightMode ? '#06d6a0' : '#ffffff'}
                      onMouseLeave={(e) => e.currentTarget.style.color = isLightMode ? '#1e293b' : '#06d6a0'}
                      title="Set current location to London for testing"
                    >
                      <span className="text-base">🇬🇧</span>
                      <span className="font-medium london-text hover:underline">Set to London</span>
                    </button>
                  </div>
                  
                  {showReportForm && (
                    <div className="mb-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-800 text-sm">
                        📍 Click on the map to select the hazard location
                      </p>
                    </div>
                  )}
                  
                  <Map
                    center={userLocation || [51.5074, -0.1278]}
                    zoom={13}
                    hazards={hazards.filter(h => h.latitude && h.longitude)}
                    height="650px"
                    onMapClick={showReportForm ? handleMapClick : null}
                    markers={[
                      ...(userLocation && userLocation[0] && userLocation[1] ? [{
                        position: userLocation,
                        color: '#10b981',
                        type: 'marker',
                        popup: <div className="text-sm"><strong>Your Location</strong></div>
                      }] : []),
                      ...(selectedLocation && selectedLocation[0] && selectedLocation[1] ? [{
                        position: selectedLocation,
                        color: '#ef4444',
                        type: 'hazard',
                        popup: <div className="text-sm"><strong>Selected Location</strong><br/>Report hazard here</div>
                      }] : [])
                    ]}
                  />
                </div>

             
                <div className="border-2 border-gray-200 rounded-2xl p-4 md:p-5" style={{ backgroundColor: '#ffffff' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-green-600">📊</span>
                    <h3 className="text-xl font-bold" style={{ color: '#0f172a' }}>Recent Reports in Your Area</h3>
                  </div>

                  {!Array.isArray(hazards) || hazards.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600">No hazards reported in your area.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-96 overflow-y-auto">
                      {hazards.slice(0, 8).map((hazard) => {
                        const hazardEmojis = {
                          construction: '🚧',
                          accident: '🚗💥',
                          crime: '🚔',
                          flooding: '🌊',
                          poor_lighting: '💡',
                          road_damage: '🕳️',
                          pothole: '🕳️',
                          unsafe_crossing: '⚠️',
                          broken_glass: '🔍',
                          suspicious_activity: '👁️',
                          vandalism: '🎯',
                          other: '⚠️'
                        }
                        
                        const timeAgo = hazard.hoursAgo 
                          ? hazard.hoursAgo < 1 
                            ? 'Just now' 
                            : hazard.hoursAgo < 24 
                              ? `${Math.round(hazard.hoursAgo)}h ago`
                              : `${Math.round(hazard.hoursAgo / 24)}d ago`
                          : new Date(hazard.createdAt).toLocaleDateString()
                          
                        return (
                          <div key={hazard.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all duration-200 hover:border-accent/30">
                            <div className="flex justify-between items-start">
                              <div className="flex items-start gap-3 flex-1">
                                <span className="text-xl flex-shrink-0">
                                  {hazardEmojis[hazard.hazardType] || '⚠️'}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="font-semibold capitalize text-sm" style={{ color: '#0f172a' }}>
                                      {hazard.hazardType.replace('_', ' ')}
                                    </div>
                                    {hazard.priorityLevel > 3 && (
                                      <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-medium">
                                        Priority
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-600 line-clamp-2 mb-2">
                                    {hazard.description}
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span>🕐 {timeAgo}</span>
                                    {hazard.distanceMeters && (
                                      <span>📍 {hazard.distanceMeters < 1000 
                                        ? `${Math.round(hazard.distanceMeters)}m` 
                                        : `${(hazard.distanceMeters/1000).toFixed(1)}km`} away</span>
                                    )}
                                    {hazard.affectsTraffic && (
                                      <span className="text-orange-600">🚦 Traffic</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityBadgeColor(hazard.severity)}`}>
                                  {hazard.severity}
                                </span>
                                {hazard.isResolved && (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded-full">
                                    ✅ Resolved
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
            </div>
          </div>
        </section>

        {/* EMERGENCY SITUATIONS */}
        <section className="py-8 md:py-10" style={{ backgroundColor: '#ffffff' }}>
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-5xl mx-auto bg-red-50 border-2 border-red-200 rounded-2xl p-4 md:p-6">
              <div className="text-center mb-6">
                <div className="text-3xl md:text-4xl mb-3">⚠️</div>
                <h3 className="text-xl md:text-2xl font-bold text-red-800 mb-2">Emergency Situations</h3>
                <p className="text-red-700">
                  If you're witnessing an immediate danger or emergency situation, please contact emergency services directly instead of using this form.
                </p>
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-2xl mb-2">📞</div>
                  <div className="font-bold text-red-800 mb-1 text-sm">Emergency Services</div>
                  <div className="text-xl font-bold text-red-600">999</div>
                  <div className="text-xs text-gray-600 mt-1">Fire, Police, Ambulance</div>
                </div>

                <div className="bg-white rounded-lg p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-2xl mb-2">🚔</div>
                  <div className="font-bold text-red-800 mb-1 text-sm">Police Non-Emergency</div>
                  <div className="text-xl font-bold text-red-600">101</div>
                  <div className="text-xs text-gray-600 mt-1">Crime reporting</div>
                </div>

                <div className="bg-white rounded-lg p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-2xl mb-2">🏛️</div>
                  <div className="font-bold text-red-800 mb-1 text-sm">City Council</div>
                  <div className="text-lg font-bold text-red-600">020 7XXX XXXX</div>
                  <div className="text-xs text-gray-600 mt-1">Infrastructure issues</div>
                </div>

                <div className="bg-white rounded-lg p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-2xl mb-2">🚨</div>
                  <div className="font-bold text-red-800 mb-1 text-sm">NHS Direct</div>
                  <div className="text-xl font-bold text-red-600">111</div>
                  <div className="text-xs text-gray-600 mt-1">Medical advice</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </ProtectedRoute>
  )
}