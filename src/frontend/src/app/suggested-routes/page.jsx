'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { routesService } from '../../lib/services'
import ProtectedRoute from '../../components/auth/ProtectedRoute'
import AddressAutocomplete from '../../components/AddressAutocomplete'


const Map = dynamic(() => import('../../components/Map'), { ssr: false })

export default function SuggestedRoutes() {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [error, setError] = useState('')
  const [fromLocation, setFromLocation] = useState('')
  const [toLocation, setToLocation] = useState('')
  const [fromCoords, setFromCoords] = useState(null)
  const [toCoords, setToCoords] = useState(null)
  const [fromLocationData, setFromLocationData] = useState(null)
  const [toLocationData, setToLocationData] = useState(null)
  const [transportMode, setTransportMode] = useState('walking')
  const [showRouting, setShowRouting] = useState(false)
  const [foundRoute, setFoundRoute] = useState(null)

  useEffect(() => {
    getUserLocation()
  }, [])

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = [position.coords.latitude, position.coords.longitude]
          setUserLocation(location)
          loadNearbyRoutes(location)
        },
        (error) => {
          console.error('Error getting location:', error)
          // Default to center if location access denied
          setUserLocation([51.5074, -0.1278])
        }
      )
    } else {
      setUserLocation([51.5074, -0.1278])
    }
  }

  const loadRoutes = async () => {
    try {
      setLoading(true)
      const response = await routesService.getRoutes()
      if (response.success && Array.isArray(response.data)) {
        setRoutes(response.data)
      } else {
        setRoutes([])
        setError('Failed to load routes')
      }
    } catch (error) {
      console.error('Error loading routes:', error)
      setRoutes([])
      setError('Failed to load routes')
    } finally {
      setLoading(false)
    }
  }

  const loadNearbyRoutes = async (location) => {
    try {
      const response = await routesService.getNearbyRoutes(location[0], location[1])
      if (response.success && Array.isArray(response.data)) {
        setRoutes(response.data)
      } else {
        setRoutes([])
      }
    } catch (error) {
      console.error('Error loading nearby routes:', error)
      setRoutes([])
    }
  }

  const getSafetyColor = (rating) => {
    if (rating >= 8) return 'text-green-600'
    if (rating >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getSafetyBadgeColor = (rating) => {
    if (rating >= 8) return 'bg-green-100 text-green-800'
    if (rating >= 6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const handleFromLocationChange = (value, locationData) => {
    setFromLocation(value)
    if (locationData) {
      setFromLocationData(locationData)
      setFromCoords([locationData.lat, locationData.lon])
    }
  }

  const handleToLocationChange = (value, locationData) => {
    setToLocation(value)
    if (locationData) {
      setToLocationData(locationData)
      setToCoords([locationData.lat, locationData.lon])
    }
  }

  const handleFindRoutes = async (e) => {
    e.preventDefault()
    
    if (!fromLocationData || !toLocationData) {
      setError('Please select both starting point and destination from the suggestions')
      return
    }

    setLoading(true)
    setError('')
    setShowRouting(true)
    
    try {
      const response = await routesService.findRoutes(
        fromLocationData.lat,
        fromLocationData.lon,
        toLocationData.lat,
        toLocationData.lon,
        transportMode
      )

      if (response.success) {
        setRoutes(response.data)
        setSelectedRoute(null)
      } else {
        setError(response.message || 'Failed to find routes')
        setRoutes([])
      }
    } catch (error) {
      console.error('Error finding routes:', error)
      setError('Failed to find routes. Please try again.')
      setRoutes([])
    } finally {
      setLoading(false)
    }
  }

  const handleRouteFound = (route) => {
    setFoundRoute(route)
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-primary-dark via-primary-light to-secondary pt-20">
          <div className="container mx-auto px-6 py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent mx-auto"></div>
              <p className="text-white mt-4">Loading suggested routes...</p>
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
        <section className="relative overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-slate-700 py-24">
          <div className="container mx-auto px-6 text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-2">
              Find the <span className="text-accent">Safest Route</span>
            </h1>
           

            <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-2xl">
              <form onSubmit={handleFindRoutes} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <AddressAutocomplete
                    value={fromLocation}
                    onChange={handleFromLocationChange}
                    placeholder="Enter starting location"
                    icon="from"
                  />
                  <AddressAutocomplete
                    value={toLocation}
                    onChange={handleToLocationChange}
                    placeholder="Enter destination"
                    icon="to"
                  />
                </div>

                <div className="flex justify-center gap-8 py-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="mode" 
                      value="walking" 
                      className="text-accent" 
                      checked={transportMode === 'walking'}
                      onChange={(e) => setTransportMode(e.target.value)}
                    />
                    <span className="text-blue-600">🚶</span>
                    <span className="text-gray-700 font-medium">Walking</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="mode" 
                      value="cycling" 
                      className="text-accent"
                      checked={transportMode === 'cycling'}
                      onChange={(e) => setTransportMode(e.target.value)}
                    />
                    <span className="text-blue-600">�</span>
                    <span className="text-gray-700 font-medium">Cycling</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="mode" 
                      value="driving" 
                      className="text-accent"
                      checked={transportMode === 'driving'}
                      onChange={(e) => setTransportMode(e.target.value)}
                    />
                    <span className="text-blue-600">�</span>
                    <span className="text-gray-700 font-medium">Driving</span>
                  </label>
                </div>

                <button 
                  type="submit"
                  disabled={loading || !fromLocation || !toLocation}
                  className="w-full bg-accent hover:bg-accent/90 text-primary-dark font-bold py-4 px-8 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-dark"></div>
                      Finding Routes...
                    </>
                  ) : (
                    <>
                      🔍 Find Routes
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Error Display */}
        {error && (
          <div className="container mx-auto px-6 py-4">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          </div>
        )}

        {/* Route Results Section */}
        {(routes.length > 0 || showRouting) && (
          <section className="bg-white py-16">
            <div className="container mx-auto px-6">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-primary-dark mb-4">
                  {routes.length > 0 ? 'Available Routes' : 'Finding Your Route'}
                </h2>
                <p className="text-xl text-gray-600">
                  {routes.length > 0 
                    ? 'Choose the route that best fits your safety preferences' 
                    : 'Please wait while we calculate the best routes for you'
                  }
                </p>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                {/* Map Section */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-2xl font-bold text-primary-dark mb-4">Route Map</h3>
                  <Map
                    center={fromCoords || userLocation || [51.5074, -0.1278]}
                    zoom={fromCoords && toCoords ? 12 : 13}
                    routes={routes}
                    height="500px"
                    fromCoords={fromCoords}
                    toCoords={toCoords}
                    showRouting={showRouting && routes.length === 0}
                    onRouteFound={handleRouteFound}
                    markers={userLocation && !fromCoords ? [{
                      position: userLocation,
                      color: '#10b981',
                      type: 'marker',
                      popup: <div className="text-sm"><strong>Your Location</strong></div>
                    }] : []}
                  />
                </div>

              {/* Routes List */}
              <div className="space-y-6">
                {loading ? (
                  <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
                    <p className="text-gray-600">Calculating routes...</p>
                  </div>
                ) : !Array.isArray(routes) || routes.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
                    <div className="text-6xl mb-4">🗺️</div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Ready to find your route?</h3>
                    <p className="text-gray-600">Enter your starting point and destination above to see personalized route suggestions with safety ratings.</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-6 mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Found {routes.length} route{routes.length > 1 ? 's' : ''} for you!
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Routes are ranked by safety score based on lighting, crime data, and foot traffic patterns.
                      </p>
                    </div>
                    
                    {routes.map((route, index) => (
                      <div
                        key={route.id}
                        className={`bg-white rounded-2xl shadow-lg p-6 cursor-pointer transition-all duration-300 ${
                          selectedRoute?.id === route.id ? 'ring-2 ring-accent' : 'hover:shadow-xl'
                        }`}
                        onClick={() => setSelectedRoute(selectedRoute?.id === route.id ? null : route)}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-2xl ${
                              route.type === 'safest' ? '🛡️' : 
                              route.type === 'fastest' ? '⚡' : '⚖️'
                            }`}></span>
                            <div>
                              <h3 className="text-xl font-bold text-primary-dark">{route.name}</h3>
                              <p className="text-sm text-gray-500">
                                {route.type === 'safest' ? 'Recommended for safety' : 
                                 route.type === 'fastest' ? 'Quickest route' : 'Good balance'}
                              </p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSafetyBadgeColor(route.safetyRating)}`}>
                            Safety: {route.safetyRating}/10
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-4">{route.description}</p>
                        
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{route.distance} km</div>
                            <div className="text-sm text-gray-600">Distance</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{route.estimatedTime} min</div>
                            <div className="text-sm text-gray-600">Duration</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${getSafetyColor(route.safetyRating)}`}>
                              {route.safetyRating}
                            </div>
                            <div className="text-sm text-gray-600">Safety</div>
                          </div>
                        </div>

                      {selectedRoute?.id === route.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="font-semibold text-primary-dark mb-3">Route Highlights:</h4>
                          <ul className="space-y-2 text-sm mb-4">
                            <li className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                              <span className="text-gray-700">Well-lit paths and streets</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                              <span className="text-gray-700">CCTV monitored areas</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                              <span className="text-gray-700">Low crime density</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                              <span className="text-gray-700">Regular foot traffic</span>
                            </li>
                          </ul>
                          
                          <div className="flex gap-3">
                            <button className="flex-1 bg-accent hover:bg-accent/90 text-primary-dark font-bold py-3 px-6 rounded-lg transition-all duration-200">
                              📍 Get Directions
                            </button>
                            <button className="flex-1 bg-primary-dark hover:bg-primary text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200">
                              💾 Save Route
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
        )}

        {/* Safety Tips Section */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="bg-gradient-to-r from-primary-dark to-primary rounded-3xl p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-accent text-2xl">🛡️</span>
                    <h3 className="text-2xl font-bold text-white">Safety Tips</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-white/90">
                      <span className="text-accent">✓</span>
                      <span>Stay on well-lit paths, especially during evening hours</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/90">
                      <span className="text-accent">✓</span>
                      <span>Keep your phone charged and share your route with friends</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/90">
                      <span className="text-accent">✓</span>
                      <span>Trust your instincts and report any suspicious activity</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/90">
                      <span className="text-accent">✓</span>
                      <span>Consider traveling with a buddy for added safety</span>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl text-accent">🛡️</span>
                  </div>
                  <h4 className="text-2xl font-bold text-white mb-2">Stay Safe!</h4>
                  <p className="text-white/80">Your safety is our priority</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </ProtectedRoute>
  )
}
