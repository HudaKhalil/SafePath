'use client'

import { useState, useEffect } from 'react'

const HazardAlert = ({ alert, onClose }) => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Auto-hide after 10 seconds
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Allow fade out animation
    }, 10000)

    return () => clearTimeout(timer)
  }, [onClose])

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 border-red-600'
      case 'high': return 'bg-orange-500 border-orange-600'
      case 'medium': return 'bg-yellow-500 border-yellow-600'
      case 'low': return 'bg-green-500 border-green-600'
      default: return 'bg-gray-500 border-gray-600'
    }
  }

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return '🆘'
      case 'high': return '🔴'
      case 'medium': return '🟡'
      case 'low': return '🟢'
      default: return '⚠️'
    }
  }

  const getHazardIcon = (type) => {
    const icons = {
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
    return icons[type] || '⚠️'
  }

  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m away`
    }
    return `${(meters / 1000).toFixed(1)}km away`
  }

  if (!isVisible) return null

  return (
    <div className={`fixed top-20 right-4 z-50 transform transition-all duration-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
      <div className={`min-w-80 max-w-md ${getSeverityColor(alert.hazard.severity)} text-white rounded-lg shadow-lg border-l-4 p-4`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 text-2xl">
              {getHazardIcon(alert.hazard.hazardType)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-lg">
                  {getSeverityIcon(alert.hazard.severity)}
                </span>
                <p className="text-sm font-bold uppercase">
                  {alert.hazard.severity} Risk Alert
                </p>
              </div>
              <p className="text-sm font-medium capitalize mb-1">
                {alert.hazard.hazardType.replace('_', ' ')} Reported
              </p>
              <p className="text-xs opacity-90 line-clamp-2">
                {alert.hazard.description}
              </p>
              {alert.distanceMeters && (
                <p className="text-xs opacity-80 mt-1">
                  📍 {formatDistance(alert.distanceMeters)}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              setIsVisible(false)
              setTimeout(onClose, 300)
            }}
            className="flex-shrink-0 text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs opacity-80">
            Just reported
          </span>
          <div className="flex space-x-2">
            <button className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-2 py-1 rounded transition-colors">
              View on Map
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HazardAlert