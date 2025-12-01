'use client'

import { useState, useEffect, useRef } from 'react'
import { hazardsService, authService } from '../lib/services'
import HazardAlert from './HazardAlert'

const GlobalHazardAlerts = () => {
  const [userLocation, setUserLocation] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const eventSourceRef = useRef(null)

  useEffect(() => {
    // Set client-side rendering flag
    setIsClient(true)
  }, [])

  useEffect(() => {
    // Get user location and connect to alerts if logged in (only on client)
    if (isClient && authService.isLoggedIn()) {
      getUserLocation()
      requestNotificationPermission()
    }

    return () => {
      disconnectFromAlerts()
    }
  }, [isClient])

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission)
      })
    }
  }

  useEffect(() => {
    // Connect to real-time alerts when location is available (only on client)
    if (isClient && userLocation && authService.isLoggedIn()) {
      connectToAlerts()
    }
  }, [isClient, userLocation])

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = [position.coords.latitude, position.coords.longitude]
          setUserLocation(location)
        },
        (error) => {
          console.error('Error getting location for alerts:', error)
          // Use default London location for demo
          setUserLocation([51.5074, -0.1278])
        }
      )
    } else {
      setUserLocation([51.5074, -0.1278])
    }
  }

  const connectToAlerts = () => {
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
        console.error('Failed to connect to global hazard alerts:', error)
        setIsConnected(false)
      }
    }
  }

  const disconnectFromAlerts = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setIsConnected(false)
    }
  }

  const handleRealTimeMessage = (data) => {
    if (data.type === 'connected') {
      setIsConnected(true)
    } else if (data.type === 'new_hazard') {
      // Add new alert with unique ID
      const alertId = Date.now()
      const newAlert = { ...data, id: alertId }
      setAlerts(prev => [...prev, newAlert])
      
      // Show browser notification if supported
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`🚨 ${data.hazard.severity.toUpperCase()} Risk Alert`, {
          body: `${data.hazard.hazardType.replace('_', ' ')} reported ${data.distanceMeters ? `${Math.round(data.distanceMeters/1000*10)/10}km away` : 'nearby'}`,
          icon: '/img/logo.png',
          tag: `hazard-${data.hazard.id}`
        })
      }
      
      // Auto-remove alert after 15 seconds
      setTimeout(() => {
        removeAlert(alertId)
      }, 15000)
    }
  }

  const handleRealTimeError = (error) => {
    console.error('Global hazard alerts connection error:', error)
    setIsConnected(false)
    
    // Attempt to reconnect after 10 seconds
    setTimeout(() => {
      if (userLocation && authService.isLoggedIn()) {
        connectToAlerts()
      }
    }, 10000)
  }

  const removeAlert = (alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }

  // Only render on client side and if user is logged in
  if (!isClient) {
    return null
  }

  if (!authService.isLoggedIn()) {
    return null
  }

  return (
    <>
      {/* Connection Status Indicator (positioned below navbar) */}
      {userLocation && (
        <div className="fixed top-20 left-4 z-40">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium shadow-lg backdrop-blur-sm ${
            isConnected 
              ? 'bg-green-100/90 text-green-800 border border-green-200' 
              : 'bg-gray-100/90 text-gray-600 border border-gray-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span>{isConnected ? 'Live Alerts Active' : 'Connecting...'}</span>
          </div>
        </div>
      )}

      {/* Alert Notifications */}
      <div className="fixed top-24 right-4 z-50 space-y-3 pointer-events-none">
        {alerts.map((alert) => (
          <div key={alert.id} className="pointer-events-auto">
            <HazardAlert 
              alert={alert} 
              onClose={() => removeAlert(alert.id)} 
            />
          </div>
        ))}
      </div>
    </>
  )
}

export default GlobalHazardAlerts