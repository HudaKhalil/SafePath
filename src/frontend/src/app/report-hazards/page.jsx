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

  const [formData, setFormData] = useState({
    type: '',
    severity: 'medium',
   description: '',
    latitude: '',
    longitude: ''
  })

  return (
    <ProtectedRoute>
      <div className="min-h-screen grid place-items-center p-10 text-gray-600">
      create new hazards layout…
      </div>
   </ProtectedRoute>
  )
}
