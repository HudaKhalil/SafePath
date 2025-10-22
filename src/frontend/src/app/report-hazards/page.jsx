'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { hazardsService } from '../../lib/services'
import ProtectedRoute from '../../components/auth/ProtectedRoute'

// Dynamically import Map component to avoid SSR issues with Leaflet
const Map = dynamic(() => import('../../components/Map'), { ssr: false })

export default function HazardReporting() {
  const [hazards, setHazards] = useState([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState(null)
  const [showReportForm, setShowReportForm] = useState(true) 
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [formData, setFormData] = useState({
    type: '',
    severity: 'medium',
    description: '',
    latitude: '',
    longitude: ''
  })

  useEffect(() => {
    loadHazards()
    getUserLocation()
  }, [])

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = [position.coords.latitude, position.coords.longitude]
          setUserLocation(location)
          loadNearbyHazards(location)
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

  const loadHazards = async () => {
    try {
      setLoading(true)
      const response = await hazardsService.getHazards()
      if (response.success) {
        setHazards(Array.isArray(response.data) ? response.data : [])
      } else {
        console.error('Failed to load hazards:', response.message)
        setError('Failed to load hazards')
        setHazards([])
      }
    } catch (error) {
      console.error('Error loading hazards:', error)
      // Set mock data for development if backend is not available
      if (error.message.includes('Network Error') || error.code === 'ECONNREFUSED') {
        console.log('Backend not available, using mock data')
        setHazards([])
        setError('') // Clear error for development mode
      } else {
        setError('Failed to load hazards')
        setHazards([])
      }
    } finally {
      setLoading(false)
    }
  }

  const loadNearbyHazards = async (location) => {
    try {
      const response = await hazardsService.getNearbyHazards(location[0], location[1])
      if (response.success) {
        setHazards(Array.isArray(response.data) ? response.data : [])
      } else {
        console.error('Failed to load nearby hazards:', response.message)
        setHazards([])
      }
    } catch (error) {
      console.error('Error loading nearby hazards:', error)
      // Don't show error for nearby hazards - just use empty array
      setHazards([])
    }
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
    if (!formData.type || !formData.description || !formData.latitude || !formData.longitude) {
      setError('Please fill in all required fields and select a location on the map')
      return
    }

    if (formData.description.length < 20) {
      setError('Description must be at least 20 characters long')
      return
    }

    try {
      setError('')
      const response = await hazardsService.reportHazard(formData)
      if (response.success) {
        setSuccess('Hazard reported successfully!')
        setFormData({
          type: '',
          severity: 'medium',
          description: '',
          latitude: '',
          longitude: ''
        })
        setSelectedLocation(null)
        setShowReportForm(false)
        loadHazards() // Reload hazards to show the new one
      } else {
        setError(response.message || 'Failed to report hazard')
      }
    } catch (error) {
      console.error('Error reporting hazard:', error)
      if (error.message.includes('Network Error') || error.code === 'ECONNREFUSED') {
        setError('Backend service is not available. Please try again later.')
      } else {
        setError(error.message || 'Failed to report hazard')
      }
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
              Report <span className="text-accent">Hazard</span>
            </h1>
            <p className="text-xl text-text-secondary mb-12">
              Help keep the community safe by reporting hazards and incidents in your area
            </p>

            {/* Quick Start Guide */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mb-8 max-w-4xl mx-auto">
              <h3 className="text-lg font-semibold text-white mb-3">🚀 Quick Start Guide</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">1️⃣</span>
                  <span className="text-text-secondary">Fill out the hazard type and description below</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">2️⃣</span>
                  <span className="text-text-secondary">Click on the map to mark the exact location</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">3️⃣</span>
                  <span className="text-text-secondary">Submit your report to help others stay safe</span>
                </div>
              </div>
            </div>

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

        {/* Status Messages */}
        {error && (
          <div className="container mx-auto px-6 py-4">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
              <button onClick={() => setError('')} className="float-right text-red-700 hover:text-red-900">×</button>
            </div>
          </div>
        )}
        
        {success && (
          <div className="container mx-auto px-6 py-4">
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {success}
              <button onClick={() => setSuccess('')} className="float-right text-green-700 hover:text-green-900">×</button>
            </div>
          </div>
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
                    {showReportForm ? 'Hide Form' : 'Show Form'}
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
                        <option value="poor_lighting">Poor Lighting</option>
                        <option value="road_damage">Road damage</option>
                        <option value="construction">Construction Hazard</option>
                        <option value="pothole">Pothole</option>
                        <option value="unsafe_crossing">Unsafe crossing</option>
                        <option value="broken_glass">Broken Glass</option>
                        <option value="suspicious_activity">Suspicious Activity</option>
                        <option value="vandalism">Vandalism</option>
                        <option value="flooding">Flooding</option>
                        <option value="other">Other</option>
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
                          <span className="text-sm text-gray-700">High Risk</span>
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

                    {selectedLocation ? (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-800 text-sm">
                          📍 Location selected: {selectedLocation[0].toFixed(6)}, {selectedLocation[1].toFixed(6)}
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-orange-800 text-sm">
                          📍 Please click on the map (right side) to select the hazard location
                        </p>
                      </div>
                    )}

                    <div className="flex gap-4">
                      <button
                        type="submit"
                        className={`flex-1 font-bold py-3 px-6 rounded-lg transition-all duration-200 ${
                          selectedLocation 
                            ? 'bg-accent hover:bg-accent/90 text-primary-dark' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                        disabled={!selectedLocation}
                      >
                        {selectedLocation ? '✅ Submit Report' : '📍 Select Location First'}
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
                            longitude: ''
                          })
                        }}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">🗺️</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Ready to Report a Hazard?</h3>
                    <p className="text-gray-600 mb-4">Click "Show Form" above to start reporting a hazard in your area</p>
                    <button
                      onClick={() => setShowReportForm(true)}
                      className="bg-accent hover:bg-accent/90 text-primary-dark px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Start Reporting
                    </button>
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
                    <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg border-dashed">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600 text-lg">🗺️</span>
                        <p className="text-blue-800 text-sm font-medium">
                          Click anywhere on the map below to pinpoint the hazard location
                        </p>
                      </div>
                      {!selectedLocation && (
                        <p className="text-blue-600 text-xs mt-1 ml-6">
                          💡 Tip: Zoom in for more precise location marking
                        </p>
                      )}
                    </div>
                  )}
                  
                  <Map
                    center={userLocation || [51.5074, -0.1278]}
                    zoom={13}
                    hazards={hazards}
                    height="400px"
                    onMapClick={showReportForm ? handleMapClick : null}
                    markers={[
                      ...(userLocation ? [{
                        position: userLocation,
                        color: '#10b981',
                        type: 'marker',
                        popup: <div className="text-sm"><strong>Your Location</strong></div>
                      }] : []),
                      ...(selectedLocation ? [{
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
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {hazards.slice(0, 5).map((hazard) => (
                        <div key={hazard.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start gap-3">
                              <span className="text-red-500">⚠️</span>
                              <div>
                                <div className="font-semibold text-primary-dark capitalize">
                                  {hazard.type?.replace('_', ' ') || 'Unknown hazard type'}
                                </div>
                                <div className="text-sm text-gray-600">{hazard.description}</div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                  <span>📅 Reported {new Date(hazard.created_at || hazard.createdAt).toLocaleDateString()}</span>
                                  {hazard.distance && (
                                    <span>📍 {hazard.distance.toFixed(1)}km away</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityBadgeColor(hazard.severity)}`}>
                              {hazard.severity} Risk
                            </span>
                          </div>
                        </div>
                      ))}
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

              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg p-6 text-center shadow-sm">
                  <div className="text-3xl mb-2">📞</div>
                  <div className="font-bold text-red-800 mb-1">Emergency</div>
                  <div className="text-2xl font-bold text-red-600">999</div>
                </div>

                <div className="bg-white rounded-lg p-6 text-center shadow-sm">
                  <div className="text-3xl mb-2">🚔</div>
                  <div className="font-bold text-red-800 mb-1">Police Non-Emergency</div>
                  <div className="text-2xl font-bold text-red-600">101</div>
                </div>

                <div className="bg-white rounded-lg p-6 text-center shadow-sm">
                  <div className="text-3xl mb-2">🏛️</div>
                  <div className="font-bold text-red-800 mb-1">City Council</div>
                  <div className="text-xl font-bold text-red-600">0207 XXX XXXX</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </ProtectedRoute>
  )
}