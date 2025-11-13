'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { hazardsService } from '../../lib/services'
import ProtectedRoute from '../../components/auth/ProtectedRoute'
import HazardAlert from '../../components/HazardAlert'
import Toast from '../../components/Toast'

// Dynamically import Map component to avoid SSR issues with Leaflet
const Map = dynamic(() => import('../../components/Map'), { ssr: false })

export default function HazardReporting() {
  const [hazards, setHazards] = useState([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState(null)
  const [showReportForm, setShowReportForm] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [realTimeAlerts, setRealTimeAlerts] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [toast, setToast] = useState(null)
  const eventSourceRef = useRef(null)
  
  const [formData, setFormData] = useState({
    type: '',
    severity: 'medium',
    description: '',
    latitude: '',
    longitude: '',
    affectsTraffic: false,
    weatherRelated: false
  })

  useEffect(() => {
    getUserLocation()
  }, [])

  useEffect(() => {
    if (userLocation) {
      loadRecentHazards()
      connectToRealTimeUpdates()
    }
    
    return () => {
      disconnectFromRealTimeUpdates()
    }
  }, [userLocation])

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = [position.coords.latitude, position.coords.longitude]
          setUserLocation(location)
        },
        (error) => {
          console.error('Error getting location:', error)
          setUserLocation([51.5074, -0.1278])
        }
      )
    } else {
      setUserLocation([51.5074, -0.1278])
    }
  }

  const loadRecentHazards = async () => {
    try {
      setLoading(true)
      const response = await hazardsService.getNearbyHazards(
        userLocation[0], 
        userLocation[1], 
        { radius: 10000, limit: 20 }
      )
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
  }

  const connectToRealTimeUpdates = () => {
    if (userLocation && !eventSourceRef.current) {
      try {
        eventSourceRef.current = hazardsService.connectToHazardStream(
          userLocation[0],
          userLocation[1],
          handleRealTimeMessage,
          handleRealTimeError
        )
        setIsConnected(true)
      } catch (error) {
        console.error('Failed to connect to real-time updates:', error)
        setIsConnected(false)
      }
    }
  }

  const disconnectFromRealTimeUpdates = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setIsConnected(false)
    }
  }

  const handleRealTimeMessage = (data) => {
    console.log('Real-time hazard update:', data)
    
    if (data.type === 'connected') {
      setIsConnected(true)
    } else if (data.type === 'new_hazard') {
      // Add alert to queue
      const alertId = Date.now()
      setRealTimeAlerts(prev => [...prev, { ...data, id: alertId }])
      
      // Add hazard to map if within view
      if (data.hazard) {
        setHazards(prev => [data.hazard, ...prev.slice(0, 19)]) // Keep only latest 20
      }
    }
  }

  const handleRealTimeError = (error) => {
    console.error('Real-time connection error:', error)
    setIsConnected(false)
    
    // Attempt to reconnect after 5 seconds
    setTimeout(() => {
      if (userLocation) {
        connectToRealTimeUpdates()
      }
    }, 5000)
  }

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
    
    // Check if coordinates exist (either from map click or manual entry)
    const lat = selectedLocation ? selectedLocation[0] : formData.latitude
    const lng = selectedLocation ? selectedLocation[1] : formData.longitude
    
    if (!formData.type || !formData.description || !lat || !lng) {
      setToast({
        message: '⚠️ Please fill in all required fields and select a location on the map',
        type: 'error'
      })
      return
    }

    // Update formData with the coordinates
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
        loadRecentHazards() // Reload hazards to show the new one
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
        <div className="min-h-screen bg-gradient-to-br from-primary-dark via-primary-light to-secondary pt-20">
          <div className="container mx-auto px-6 py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent mx-auto"></div>
              <p className="text-white mt-4">Loading hazard reports...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-slate-700 py-20">
          <div className="container mx-auto px-6 text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-2">
              Report a <span className="text-accent">Hazard</span>
            </h1>
            <p className="text-xl text-text-secondary mb-12">
              Help keep London safe by reporting hazards and incidents in your area
            </p>

            {/* Stats */}
            <div className="flex justify-center gap-12 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">{Array.isArray(hazards) ? hazards.length : 0}+</div>
                <div className="text-sm text-text-secondary">Reports Filed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">95%</div>
                <div className="text-sm text-text-secondary">Response Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">24h</div>
                <div className="text-sm text-text-secondary">Avg Response</div>
              </div>
            </div>
          </div>
        </section>

        {/* Real-time Hazard Alerts */}
        {realTimeAlerts.map((alert) => (
          <HazardAlert 
            key={alert.id} 
            alert={alert} 
            onClose={() => removeAlert(alert.id)} 
          />
        ))}

        {/* Toast Notifications */}
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}

        {/* Main Content */}
        <section className="bg-white py-16">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {/* Submit Hazard Report Form */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <span className="text-red-500">⚠️</span>
                    <h3 className="text-xl font-bold text-primary-dark">Submit Hazard Report</h3>
                  </div>
                  <button
                    onClick={() => setShowReportForm(!showReportForm)}
                    className="bg-accent hover:bg-accent/90 text-primary-dark px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    {showReportForm ? 'Cancel' : 'Report'}
                  </button>
                </div>
                
                {showReportForm ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <span className="text-gray-500">📋</span>
                        Hazard Type *
                      </label>
                      <select 
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent text-gray-900"
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
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <span className="text-gray-500">⚡</span>
                        Severity Level *
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="severity" 
                            value="low" 
                            checked={formData.severity === 'low'}
                            onChange={(e) => setFormData({...formData, severity: e.target.value})}
                            className="text-accent" 
                          />
                          <span className="text-sm text-gray-700">Low Risk</span>
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
                          <span className="text-sm text-gray-700">Medium Risk</span>
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
                          <span className="text-sm text-gray-700">🔴 High Risk</span>
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
                          <span className="text-sm text-gray-700">🆘 Critical</span>
                        </label>
                      </div>
                    </div>

                    {/* Additional Options */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                        <span className="text-gray-500">⚙️</span>
                        Additional Information
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.affectsTraffic}
                            onChange={(e) => setFormData({...formData, affectsTraffic: e.target.checked})}
                            className="text-accent rounded" 
                          />
                          <span className="text-sm text-gray-700">🚦 Affects Traffic Flow</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.weatherRelated}
                            onChange={(e) => setFormData({...formData, weatherRelated: e.target.checked})}
                            className="text-accent rounded" 
                          />
                          <span className="text-sm text-gray-700">🌦️ Weather Related</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <span className="text-gray-500">📝</span>
                        Description *
                      </label>
                      <textarea 
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="Describe the hazard in detail. Include when you noticed it, any immediate dangers, and any other relevant information..."
                        className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent text-gray-900" 
                        rows={4}
                        required
                      />
                      <div className="text-xs text-gray-500 mt-1">Minimum 20 characters</div>
                    </div>

                    {selectedLocation && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-800 text-sm">
                          📍 Location selected: {selectedLocation[0].toFixed(6)}, {selectedLocation[1].toFixed(6)}
                        </p>
                      </div>
                    )}

                    {!selectedLocation && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800 text-sm">
                          ⚠️ Please click on the map to select the hazard location first
                        </p>
                      </div>
                    )}

                    <div className="flex gap-4">
                      <button
                        type="submit"
                        className={`flex-1 font-bold py-3 px-6 rounded-lg transition-all duration-200 ${
                          selectedLocation || (formData.latitude && formData.longitude)
                            ? 'bg-accent hover:bg-accent/90 text-primary-dark' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                        disabled={!selectedLocation && !(formData.latitude && formData.longitude)}
                      >
                        ✅ Submit Report
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
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🗺️</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Click "Report" to start</h3>
                    <p className="text-gray-600">Select a location on the map and fill out the hazard details</p>
                  </div>
                )}
              </div>

              {/* Location Map & Recent Reports */}
              <div className="space-y-8">
                {/* Location Map */}
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-blue-600">🗺️</span>
                    <h3 className="text-xl font-bold text-primary-dark">Hazard Map</h3>
                  </div>
                  
                  {showReportForm && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-800 text-sm">
                        📍 Click on the map to select the hazard location
                      </p>
                    </div>
                  )}
                  
                  <Map
                    center={userLocation || [51.5074, -0.1278]}
                    zoom={13}
                    hazards={hazards.filter(h => h.latitude && h.longitude)}
                    height="400px"
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

                {/* Recent Reports */}
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-green-600">📊</span>
                    <h3 className="text-xl font-bold text-primary-dark">Recent Reports in Your Area</h3>
                  </div>

                  {!Array.isArray(hazards) || hazards.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600">No hazards reported in your area.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
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
                                    <div className="font-semibold text-primary-dark capitalize text-sm">
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
                                    <span>� {timeAgo}</span>
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
          </div>
        </section>

        {/* Emergency Situations */}
        <section className="py-12">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto bg-red-50 border-2 border-red-200 rounded-2xl p-8">
              <div className="text-center mb-8">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-2xl font-bold text-red-800 mb-2">Emergency Situations</h3>
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