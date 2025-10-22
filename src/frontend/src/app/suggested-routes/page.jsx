'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { routesService } from '../../lib/services'
import ProtectedRoute from '../../components/auth/ProtectedRoute'
import AddressAutocomplete from '../../components/AddressAutocomplete'

// Dynamically import Map component to avoid SSR issues
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
          const defaultLocation = [51.5074, -0.1278]
          setUserLocation(defaultLocation)
          loadNearbyRoutes(defaultLocation)
        }
      )
    } else {
      const defaultLocation = [51.5074, -0.1278]
      setUserLocation(defaultLocation)
      loadNearbyRoutes(defaultLocation)
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
      setLoading(true)
      setError('')

      const response = await routesService.getNearbyRoutes(location[0], location[1])

      if (response.success) {
        if (Array.isArray(response.data) && response.data.length > 0) {
          setRoutes(response.data)
        } else {
          setRoutes([])
          console.log('No nearby routes found for location:', location)
        }
      } else {
        setRoutes([])
        console.warn('Failed to get nearby routes:', response.message)
        if (response.message && !response.message.includes('No routes found')) {
          setError('Unable to load nearby routes. Please try searching for a specific route.')
        }
      }
    } catch (error) {
      console.error('Error loading nearby routes:', error)
      setRoutes([])
    } finally {
      setLoading(false)
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

  // Disabled Find Routes handler
  const handleFindRoutes = (e) => {
    e.preventDefault()
    console.log('Find Routes button clicked, but routing is disabled.')
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
      <div className="min-h-screen bg-gradient-to-br from-primary-dark via-primary to-slate-700">
        <div className="container mx-auto px-6 pt-12 pb-24">
          {/* Top heading */}
          <div className="text-center mb-6">
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Find the <span className="text-accent">Safest Route</span>
            </h1>
            <p className="text-lg text-text-secondary mt-2">Quickly preview the map and search routes</p>
          </div>

          {/* Mini Map Card (same width as form card) */}
          <div className="max-w-4xl mx-auto mb-6">
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/5">
              <div className="bg-gradient-to-br from-primary-dark via-primary to-slate-700 p-4">
                <div className="rounded-xl overflow-hidden shadow-inner">
                  <Map
                    center={fromCoords || userLocation || [51.5074, -0.1278]}
                    zoom={fromCoords && toCoords ? 12 : 13}
                    routes={routes}
                    height="300px" // Increased mini map height
                    fromCoords={fromCoords}
                    toCoords={toCoords}
                    showRouting={showRouting && routes.length === 0}
                    onRouteFound={handleRouteFound}
                    markers={userLocation ? [{
                      position: userLocation,
                      color: '#10b981',
                      type: 'marker',
                      popup: <div className="text-sm"><strong>Your Location</strong></div>
                    }] : []}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* From/To — Search Card */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="bg-white p-8 rounded-2xl shadow-2xl">
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
                    <span className="text-blue-600">🚴</span>
                    <span className="text-gray-700 font-medium">Cycling</span>
                  </label>

                  
                </div>

 <button 
  type="submit"
  disabled={!fromLocation || !toLocation || loading}
  className={`w-full bg-accent hover:bg-accent/90 text-primary-dark font-bold py-4 px-8 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 ${(!fromLocation || !toLocation || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
>
  {loading ? (
    <>
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-dark"></div>
      Finding Routes...
    </>
  ) : (
    <>🔍 Find Routes</>
  )}
</button>

              </form>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="max-w-4xl mx-auto mb-6">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            </div>
          )}

          {/* Route Results Section */}
          {(routes.length > 0 || showRouting) && (
            <section className="max-w-6xl mx-auto bg-white py-12 rounded-2xl shadow-lg">
              <div className="container px-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-primary-dark mb-2">
                    {routes.length > 0 ? 'Available Routes' : 'Finding Your Route'}
                  </h2>
                  <p className="text-lg text-gray-600">
                    {routes.length > 0 
                      ? 'Choose the route that best fits your safety preferences' 
                      : 'Please wait while we calculate the best routes for you'
                    }
                  </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8 px-6 pb-8">
                  {/* Large Map (secondary) */}
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
                    {routes.map((route) => (
                      <div
                        key={route.id}
                        className={`bg-white rounded-2xl shadow-lg p-6 cursor-pointer transition-all duration-300 ${selectedRoute?.id === route.id ? 'ring-2 ring-accent' : 'hover:shadow-xl'}`}
                        onClick={() => setSelectedRoute(selectedRoute?.id === route.id ? null : route)}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">
                              {route.type === 'safest' ? '🛡️' : route.type === 'fastest' ? '⚡' : '⚖️'}
                            </span>
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
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
