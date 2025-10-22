'use client';

import React, { useState, useRef } from 'react';
import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { hazardsService } from '../../lib/services'
import ProtectedRoute from '../../components/auth/ProtectedRoute'

const Map = dynamic(() => import('../../components/Map'), { ssr: false })

export default function ReportHazardPage() {
  const [hazards, setHazards] = useState([])
  const [loading, setLoading] = useState(true)
 const [userLocation, setUserLocation] = useState(null)
  const [showReportForm, setShowReportForm] = useState(false)
 const [selectedLocation, setSelectedLocation] = useState(null)
 const [success, setSuccess] = useState('')

  const handleMapClick = (latlng) => {
    setSelectedLocation([latlng.lat, latlng.lng])
    setFormData((p) => ({ ...p, latitude: latlng.lat, longitude: latlng.lng }))
    setShowReportForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.type || !formData.description || !formData.latitude || !formData.longitude) {
      setError('Please fill in all required fields and select a location on the map')
      return
    }
    try {
      const res = await hazardsService.reportHazard(formData)
      if (res?.success) {
        setSuccess('Hazard reported successfully!')
        setFormData({ type: '', severity: 'medium', description: '', latitude: '', longitude: '' })
        setSelectedLocation(null)
        setShowReportForm(false)
        loadHazards()
      } else {
        setError(res?.message || 'Failed to report hazard')
      }
    } catch (e) {
      console.error('Error reporting hazard:', e)
      setError(e?.message || 'Failed to report hazard')
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
   if (typeof navigator !== 'undefined' && navigator.geolocation) {
     navigator.geolocation.getCurrentPosition(
       (pos) => {
         const loc = [pos.coords.latitude, pos.coords.longitude]
         setUserLocation(loc)
         loadNearbyHazards(loc)
       },
       (err) => {
          console.error('Error getting location:', err)
         setUserLocation([51.5074, -0.1278]) // London fallback
       }
     )
   } else {      setUserLocation([51.5074, -0.1278])    }  }
  const loadHazards = async () => {
   try {
      setLoading(true)
      const res = await hazardsService.getHazards()
     if (res?.success) {
        
        const items = Array.isArray(res.data) ? res.data : []
        setHazards(items)
      } else {
        setError(res?.message || 'Failed to load hazards')
        setHazards([])
      }
    } catch (e) {
      console.error('Error loading hazards:', e)
      setError(e?.message || 'Failed to load hazards')
      setHazards([])
   } finally {
      setLoading(false)
    }
  }

  const loadNearbyHazards = async (loc) => {
    try {
      const res = await hazardsService.getNearbyHazards(loc[0], loc[1])
      if (res?.success) {
        setHazards(Array.isArray(res.data) ? res.data : [])
      } else {
        setHazards([])
      }
    } catch (e) {
      console.error('Error loading nearby hazards:', e)
      // do nothing
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen grid place-items-center p-10 text-gray-600">
      create new hazards layout…
      </div>
   </ProtectedRoute>
  )
}
