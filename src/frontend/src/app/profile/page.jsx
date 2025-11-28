'use client'

import { useState, useEffect } from 'react'
import { authService } from '../../lib/services'
import ProtectedRoute from '../../components/auth/ProtectedRoute'
import { useRouter } from 'next/navigation'
import ImageUpload from '../../components/ImageUpload'

export default function Profile() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isDark, setIsDark] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    emergencyContact: '',
    preferences: {
      preferredTransport: 'walking',
      safetyPriority: 'high',
      notifications: true
    }
  })

  const [validationErrors, setValidationErrors] = useState({
    phone: '',
    emergencyContact: ''
  })

  useEffect(() => {
    loadProfile()
    
    // Dark mode detection
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    
    checkDarkMode()
    
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => observer.disconnect()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const response = await authService.getProfile()
      if (response.success) {
        setUser(response.data.user)
        setFormData({
          name: response.data.user.name || '',
          email: response.data.user.email || '',
          phone: response.data.user.phone || '',
          address: response.data.user.address || '',
          emergencyContact: response.data.user.emergency_contact || '',
          preferences: {
            preferredTransport: response.data.user.preferred_transport || 'walking',
            safetyPriority: response.data.user.safety_priority || 'high',
            notifications: response.data.user.notifications || true
          }
        })
      } else {
        const errorMessage = response?.message || 'Failed to load profile'
        console.error('Profile load failed:', {
          success: response?.success,
          message: response?.message,
          response: response
        })
        setError(errorMessage)
      }
    } catch (error) {
      console.error('Profile load error:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status,
        fullError: error
      })
      const errorMessage = error.message || 
                          error.response?.data?.message || 
                          `Failed to load profile${error.response?.status ? ` (${error.response.status})` : ''}`
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const validatePhone = (phone) => {
    if (!phone) return '' // Optional field
    const ukPhoneRegex = /^(\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}$/
    return ukPhoneRegex.test(phone.replace(/\s/g, '')) ? '' : 'Invalid UK phone format (e.g., +44 7xxx xxx xxx or 07xxx xxx xxx)'
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked} = e.target
    
    if (name.startsWith('preferences.')) {
      const prefName = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          [prefName]: type === 'checkbox' ? checked : value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))

      // Real-time validation for phone fields
      if (name === 'phone') {
        setValidationErrors(prev => ({
          ...prev,
          phone: validatePhone(value)
        }))
      }
      if (name === 'emergencyContact') {
        setValidationErrors(prev => ({
          ...prev,
          emergencyContact: validatePhone(value)
        }))
      }
    }
  }

  const handleImageUpload = async (file) => {
    try {
      setError('');
      const response = await authService.uploadProfilePicture(file);
      if (response.success) {
        await loadProfile();
        setSuccess('Profile picture updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
      return response;
    } catch (error) {
      console.error('Image upload error:', error);
      setError(error.message || 'Failed to upload image');
      throw error;
    }
  }

  const handleImageDelete = async () => {
    try {
      setError('');
      const response = await authService.deleteProfilePicture();
      if (response.success) {
        await loadProfile();
        setSuccess('Profile picture deleted successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
      return response;
    } catch (error) {
      console.error('Image delete error:', error);
      setError(error.message || 'Failed to delete image');
      throw error;
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate before submitting
    const phoneError = validatePhone(formData.phone)
    const emergencyError = validatePhone(formData.emergencyContact)
    
    if (phoneError || emergencyError) {
      setValidationErrors({
        phone: phoneError,
        emergencyContact: emergencyError
      })
      setError('Please fix validation errors before saving')
      return
    }

    try {
      const updateData = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        emergency_contact: formData.emergencyContact,
        preferred_transport: formData.preferences.preferredTransport,
        safety_priority: formData.preferences.safetyPriority,
        notifications: formData.preferences.notifications
      }

      const response = await authService.updateProfile(updateData)
      if (response.success) {
        setSuccess('Profile updated successfully!')
        setUser(response.data.user)
        setEditing(false)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(response.message || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Profile update error:', {
        message: error.message || 'Unknown error',
        response: error.response?.data,
        status: error.response?.status,
        error: error
      })
      
      // Extract meaningful error message
      let errorMessage = 'Failed to update profile'
      
      if (error.message && error.message !== 'Network error') {
        errorMessage = error.message
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.status) {
        errorMessage = `Server error (${error.response.status}). Please try again.`
      }
      
      setError(errorMessage)
    }
  }

  const handleLogout = () => {
    authService.logout()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', minHeight: '100vh', paddingTop: '15px', paddingBottom: '70px' }}>
          <div className="container mx-auto px-4 py-1 md:px-6 md:py-1">
            {/* Header Skeleton */}
            <div className="text-center mb-2">
              <div className="h-8 w-48 mx-auto rounded animate-pulse" style={{ backgroundColor: isDark ? '#1e293b' : '#e5e7eb' }}></div>
              <div className="h-4 w-64 mx-auto mt-2 rounded animate-pulse" style={{ backgroundColor: isDark ? '#1e293b' : '#e5e7eb' }}></div>
            </div>

            {/* Card Skeleton */}
            <div className="mx-auto">
              <div className="rounded-2xl shadow-lg border-2 overflow-hidden" style={{ 
                backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                borderColor: isDark ? '#334155' : '#e5e7eb'
              }}>
                {/* Profile Header Skeleton */}
                <div className="p-3 text-center" style={{ backgroundColor: '#0f172a' }}>
                  <div className="w-12 h-12 rounded-full mx-auto mb-1 animate-pulse" style={{ backgroundColor: '#334155' }}></div>
                  <div className="h-5 w-32 mx-auto mb-1 rounded animate-pulse" style={{ backgroundColor: '#334155' }}></div>
                  <div className="h-3 w-40 mx-auto rounded animate-pulse" style={{ backgroundColor: '#334155' }}></div>
                  <div className="h-3 w-36 mx-auto mt-1 rounded animate-pulse" style={{ backgroundColor: '#334155' }}></div>
                </div>

                {/* Content Skeleton */}
                <div className="p-4 md:p-6">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Personal Info Grid Skeleton */}
                    <div className="grid md:grid-cols-4 gap-2.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i}>
                          <div className="h-5 w-24 mb-1 rounded animate-pulse" style={{ backgroundColor: isDark ? '#334155' : '#cbd5e1' }}></div>
                          <div className="h-6 w-full rounded animate-pulse" style={{ backgroundColor: isDark ? '#334155' : '#cbd5e1' }}></div>
                        </div>
                      ))}
                    </div>

                    {/* Safety Preferences Skeleton */}
                    <div className="border-t" style={{ borderColor: isDark ? '#334155' : '#e5e7eb', paddingTop: '10px', marginTop: '10px' }}>
                      <div className="h-6 w-40 mb-2 rounded animate-pulse" style={{ backgroundColor: isDark ? '#334155' : '#cbd5e1' }}></div>
                      <div className="grid md:grid-cols-3 gap-2.5">
                        {[1, 2, 3].map((i) => (
                          <div key={i}>
                            <div className="h-5 w-32 mb-1 rounded animate-pulse" style={{ backgroundColor: isDark ? '#334155' : '#cbd5e1' }}></div>
                            <div className="h-6 w-full rounded animate-pulse" style={{ backgroundColor: isDark ? '#334155' : '#cbd5e1' }}></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Button Skeleton */}
                    <div className="flex gap-2.5" style={{ paddingTop: '10px' }}>
                      <div className="h-12 w-32 rounded-lg animate-pulse" style={{ backgroundColor: isDark ? '#334155' : '#cbd5e1' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', minHeight: 'calc(100vh - 220px)', paddingTop: '15px', paddingBottom: '60px' }}>
        <div className="container mx-auto px-4 py-1 md:px-6 md:py-1">
          {/* Header */}
          <div className="text-center mb-2">
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: isDark ? '#f8fafc' : '#334155' }}>
              User <span style={{ color: '#06d6a0' }}>Profile</span>
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
              Manage your account settings and safety preferences
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="max-w-2xl mx-auto mb-2">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            </div>
          )}

          {success && (
            <div className="max-w-2xl mx-auto mb-2">
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            </div>
          )}

          {/* Profile Card */}
          <div className="mx-auto max-w-4xl">
            <div className="rounded-2xl shadow-lg border-2 overflow-hidden" style={{ 
              backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
              borderColor: isDark ? '#334155' : '#e5e7eb',
              transition: 'all 0.3s ease'
            }}>
              {/* Profile Header */}
              <div className="p-3 flex items-center" style={{ backgroundColor: '#0f172a', gap: editing ? '8px' : '16px' }}>
                <div className="flex-shrink-0">
                  <ImageUpload 
                    currentImage={user?.profile_picture}
                    onUpload={handleImageUpload}
                    onDelete={handleImageDelete}
                    isDark={isDark}
                    editing={editing}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold break-words" style={{ color: '#ffffff', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                    {user?.name || 'User'}
                  </h2>
                  <p className="text-xs sm:text-sm break-words" style={{ color: '#cbd5e1', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                    Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Profile Content */}
              <div className="p-4 md:p-6">
                {!editing ? (
                  // View Mode
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', transition: 'opacity 0.3s ease', opacity: 1 }}>
                    {/* Personal Information Section */}
                    <div className="rounded-lg p-3 sm:p-4" style={{ 
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`
                    }}>
                      <div style={{ 
                        borderBottom: `2px solid ${isDark ? '#06d6a0' : '#06d6a0'}`,
                        paddingBottom: '6px',
                        marginBottom: '10px'
                      }}>
                        <h3 className="text-lg sm:text-xl font-bold" style={{ color: isDark ? '#f8fafc' : '#334155' }}>
                          <span style={{ color: '#06d6a0', marginRight: '6px', fontSize: '1.1em' }}>■</span>
                          Personal Information
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-2.5">
                        <div>
                          <label className="text-lg font-bold" style={{ color: isDark ? '#06d6a0' : '#059669', display: 'block', marginBottom: '4px' }}>
                            <span style={{ opacity: 0.8, marginRight: '6px' }}>◉</span>
                            Full Name
                          </label>
                        <p className="text-lg" style={{ color: isDark ? '#f8fafc' : '#334155', lineHeight: '1.5' }}>{user?.name || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-lg font-bold" style={{ color: isDark ? '#06d6a0' : '#059669', display: 'block', marginBottom: '4px' }}>
                          <span style={{ opacity: 0.8, marginRight: '6px' }}>@</span>
                          Email
                        </label>
                        <p className="text-lg" style={{ color: isDark ? '#f8fafc' : '#334155', lineHeight: '1.5' }}>{user?.email}</p>
                      </div>
                      <div>
                        <label className="text-lg font-bold" style={{ color: isDark ? '#06d6a0' : '#059669', display: 'block', marginBottom: '4px' }}>
                          <span style={{ opacity: 0.8, marginRight: '6px' }}>☎</span>
                          Phone
                        </label>
                        <p className="text-lg" style={{ color: isDark ? '#f8fafc' : '#334155', lineHeight: '1.5' }}>{user?.phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-lg font-bold" style={{ color: isDark ? '#06d6a0' : '#059669', display: 'block', marginBottom: '4px' }}>
                          <span style={{ opacity: 0.8, marginRight: '6px' }}>⚠</span>
                          Emergency Contact
                        </label>
                        <p className="text-lg" style={{ color: isDark ? '#f8fafc' : '#334155', lineHeight: '1.5' }}>{user?.emergency_contact || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-lg font-bold" style={{ color: isDark ? '#06d6a0' : '#059669', display: 'block', marginBottom: '4px' }}>
                          <span style={{ opacity: 0.8, marginRight: '6px' }}>⌖</span>
                          Address
                        </label>
                        <p className="text-lg" style={{ color: isDark ? '#f8fafc' : '#334155', lineHeight: '1.5' }}>{user?.address || 'Not provided'}</p>
                      </div>
                      </div>
                    </div>

                    {/* Safety Preferences Section */}
                    <div className="rounded-lg p-3 sm:p-4" style={{ 
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`
                    }}>
                      <div style={{ 
                        borderBottom: `2px solid ${isDark ? '#06d6a0' : '#06d6a0'}`,
                        paddingBottom: '6px',
                        marginBottom: '10px'
                      }}>
                        <h3 className="text-lg sm:text-xl font-bold" style={{ color: isDark ? '#f8fafc' : '#334155' }}>
                          <span style={{ color: '#06d6a0', marginRight: '6px', fontSize: '1.1em' }}>■</span>
                          Safety Preferences
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2.5">
                        <div>
                          <label className="text-lg font-bold" style={{ color: isDark ? '#06d6a0' : '#059669', display: 'block', marginBottom: '4px' }}>
                            <span style={{ opacity: 0.8, marginRight: '6px' }}>➤</span>
                            Preferred Transport
                          </label>
                          <div className="flex gap-2 mt-1">
                            {user?.preferred_transport === 'walking' && (
                              <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center relative group"
                                style={{
                                  backgroundColor: '#06d6a0',
                                  color: '#0f172a'
                                }}
                                title="Walking"
                              >
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  viewBox="0 0 24 24" 
                                  fill="currentColor"
                                  className="w-5 h-5"
                                >
                                  <path d="M13.5 5.5c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/>
                                </svg>
                                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                                  Walking
                                </span>
                              </div>
                            )}
                            {user?.preferred_transport === 'cycling' && (
                              <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center relative group"
                                style={{
                                  backgroundColor: '#06d6a0',
                                  color: '#0f172a'
                                }}
                                title="Cycling"
                              >
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  viewBox="0 0 24 24" 
                                  fill="currentColor"
                                  className="w-5 h-5"
                                >
                                  <path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4.8.8c1.3 1.3 3 2.1 5.1 2.1V9c-1.5 0-2.7-.6-3.6-1.5l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4c-.4.4-.6.9-.6 1.4 0 .6.2 1.1.6 1.4L11 14v5h2v-6.2l-2.2-2.3zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z"/>
                                </svg>
                                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                                  Cycling
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="text-lg font-bold" style={{ color: isDark ? '#06d6a0' : '#059669', display: 'block', marginBottom: '4px' }}>
                            <span style={{ opacity: 0.8, marginRight: '6px' }}>◈</span>
                            Notifications
                          </label>
                          <p className="text-lg" style={{ color: isDark ? '#f8fafc' : '#334155', lineHeight: '1.5' }}>
                            {user?.notifications ? '✅ Enabled' : '❌ Disabled'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2.5" style={{ paddingTop: '10px' }}>
                      <button
                        onClick={() => setEditing(true)}
                        className="w-full sm:w-auto font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-md"
                        style={{ backgroundColor: '#06d6a0', color: '#0f172a', transition: 'all 0.2s ease' }}
                        onMouseEnter={(e) => { e.target.style.backgroundColor = '#059669'; e.target.style.transform = 'scale(1.05)' }}
                        onMouseLeave={(e) => { e.target.style.backgroundColor = '#06d6a0'; e.target.style.transform = 'scale(1)' }}
                        onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
                        onMouseUp={(e) => e.target.style.transform = 'scale(1.05)'}
                      >
                        Edit Profile
                      </button>
                    </div>
                  </div>
                ) : (
                  // Edit Mode
                  <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="grid md:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-lg font-bold" style={{ color: isDark ? '#06d6a0' : '#059669', marginBottom: '5px' }}>
                          <span style={{ opacity: 0.8, marginRight: '6px' }}>◉</span>
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full p-2 border-2 rounded-lg focus:outline-none focus:border-accent"
                          style={{
                            backgroundColor: isDark ? '#334155' : '#ffffff',
                            borderColor: isDark ? '#475569' : '#e5e7eb',
                            color: isDark ? '#f8fafc' : '#0f172a',
                            transition: 'all 0.2s ease'
                          }}
                          onFocus={(e) => e.target.style.transform = 'scale(1.02)'}
                          onBlur={(e) => e.target.style.transform = 'scale(1)'}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-lg font-bold" style={{ color: isDark ? '#06d6a0' : '#059669', marginBottom: '5px' }}>
                          <span style={{ opacity: 0.8, marginRight: '6px' }}>@</span>
                          Email
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          className="w-full p-2 border-2 rounded-lg cursor-not-allowed"
                          style={{
                            backgroundColor: isDark ? '#1e293b' : '#f3f4f6',
                            borderColor: isDark ? '#334155' : '#d1d5db',
                            color: isDark ? '#64748b' : '#6b7280'
                          }}
                          disabled
                        />
                        <p className="text-xs mt-1" style={{ color: isDark ? '#64748b' : '#6b7280' }}>Email cannot be changed</p>
                      </div>
                      <div>
                        <label className="block text-lg font-bold" style={{ color: isDark ? '#06d6a0' : '#059669', marginBottom: '5px' }}>
                          <span style={{ opacity: 0.8, marginRight: '6px' }}>☎</span>
                          Phone
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full p-2 border-2 rounded-lg focus:outline-none focus:border-accent"
                          style={{
                            backgroundColor: isDark ? '#334155' : '#ffffff',
                            borderColor: validationErrors.phone ? '#ef4444' : (isDark ? '#475569' : '#e5e7eb'),
                            color: isDark ? '#f8fafc' : '#0f172a',
                            transition: 'all 0.2s ease'
                          }}
                          onFocus={(e) => e.target.style.transform = 'scale(1.02)'}
                          onBlur={(e) => e.target.style.transform = 'scale(1)'}
                          placeholder="+44 7xxx xxx xxx"
                        />
                        {validationErrors.phone && (
                          <p className="text-xs mt-1" style={{ color: '#ef4444' }}>
                            {validationErrors.phone}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-lg font-bold" style={{ color: isDark ? '#06d6a0' : '#059669', marginBottom: '5px' }}>
                          <span style={{ opacity: 0.8, marginRight: '6px' }}>⚠</span>
                          Emergency Contact
                        </label>
                        <input
                          type="tel"
                          name="emergencyContact"
                          value={formData.emergencyContact}
                          onChange={handleInputChange}
                          className="w-full p-2 border-2 rounded-lg focus:outline-none focus:border-accent"
                          style={{
                            backgroundColor: isDark ? '#334155' : '#ffffff',
                            borderColor: validationErrors.emergencyContact ? '#ef4444' : (isDark ? '#475569' : '#e5e7eb'),
                            color: isDark ? '#f8fafc' : '#0f172a',
                            transition: 'all 0.2s ease'
                          }}
                          onFocus={(e) => e.target.style.transform = 'scale(1.02)'}
                          onBlur={(e) => e.target.style.transform = 'scale(1)'}
                          placeholder="+44 7xxx xxx xxx"
                        />
                        {validationErrors.emergencyContact && (
                          <p className="text-xs mt-1" style={{ color: '#ef4444' }}>
                            {validationErrors.emergencyContact}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-lg font-bold" style={{ color: isDark ? '#06d6a0' : '#059669', marginBottom: '5px' }}>
                        <span style={{ opacity: 0.8, marginRight: '6px' }}>⌖</span>
                        Address
                      </label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        rows={2}
                        className="w-full p-2 border-2 rounded-lg focus:outline-none focus:border-accent"
                        style={{
                          backgroundColor: isDark ? '#334155' : '#ffffff',
                          borderColor: isDark ? '#475569' : '#e5e7eb',
                          color: isDark ? '#f8fafc' : '#0f172a',
                          transition: 'all 0.2s ease'
                        }}
                        onFocus={(e) => e.target.style.transform = 'scale(1.02)'}
                        onBlur={(e) => e.target.style.transform = 'scale(1)'}
                        placeholder="Your home address"
                      />
                    </div>

                    {/* Preferences */}
                    <div className="border-t" style={{ borderColor: isDark ? '#334155' : '#e5e7eb', paddingTop: '10px', marginTop: '10px' }}>
                      <h3 className="text-xl font-semibold" style={{ color: isDark ? '#f8fafc' : '#0f172a', marginBottom: '10px' }}>Safety Preferences</h3>
                      <div className="grid md:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-lg font-bold" style={{ color: isDark ? '#06d6a0' : '#059669', marginBottom: '5px' }}>
                            <span style={{ opacity: 0.8, marginRight: '6px' }}>➤</span>
                            Preferred Transport
                          </label>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                preferences: { ...prev.preferences, preferredTransport: 'walking' }
                              }))}
                              className="relative group transition-all duration-200"
                              title="Walking"
                            >
                              <div 
                                className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200"
                                style={{
                                  backgroundColor: formData.preferences.preferredTransport === "walking" ? '#06d6a0' : (isDark ? '#475569' : '#e2e8f0'),
                                  color: formData.preferences.preferredTransport === "walking" ? '#0f172a' : (isDark ? '#cbd5e1' : '#94a3b8'),
                                  border: isDark && formData.preferences.preferredTransport !== "walking" ? '1px solid #64748b' : 'none'
                                }}
                              >
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  viewBox="0 0 24 24" 
                                  fill="currentColor"
                                  className="w-7 h-7"
                                >
                                  <path d="M13.5 5.5c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/>
                                </svg>
                              </div>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                preferences: { ...prev.preferences, preferredTransport: 'cycling' }
                              }))}
                              className="relative group transition-all duration-200"
                              title="Cycling"
                            >
                              <div 
                                className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200"
                                style={{
                                  backgroundColor: formData.preferences.preferredTransport === "cycling" ? '#06d6a0' : (isDark ? '#475569' : '#e2e8f0'),
                                  color: formData.preferences.preferredTransport === "cycling" ? '#0f172a' : (isDark ? '#cbd5e1' : '#94a3b8'),
                                  border: isDark && formData.preferences.preferredTransport !== "cycling" ? '1px solid #64748b' : 'none'
                                }}
                              >
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  viewBox="0 0 24 24" 
                                  fill="currentColor"
                                  className="w-7 h-7"
                                >
                                  <path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4.8.8c1.3 1.3 3 2.1 5.1 2.1V9c-1.5 0-2.7-.6-3.6-1.5l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4c-.4.4-.6.9-.6 1.4 0 .6.2 1.1.6 1.4L11 14v5h2v-6.2l-2.2-2.3zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z"/>
                                </svg>
                              </div>
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-lg font-bold" style={{ color: isDark ? '#06d6a0' : '#059669', marginBottom: '5px' }}>
                            <span style={{ opacity: 0.8, marginRight: '6px' }}>◈</span>
                            Notifications
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              name="preferences.notifications"
                              checked={formData.preferences.notifications}
                              onChange={handleInputChange}
                              className="w-4 h-4 text-accent rounded focus:ring-accent focus:ring-2"
                              style={{
                                backgroundColor: isDark ? '#334155' : '#f3f4f6',
                                borderColor: isDark ? '#475569' : '#d1d5db'
                              }}
                            />
                            <span className="ml-2" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>Enable alerts</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2.5" style={{ paddingTop: '10px' }}>
                      <button
                        type="submit"
                        className="w-full sm:w-auto font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-md"
                        style={{ backgroundColor: '#06d6a0', color: '#0f172a', transition: 'all 0.2s ease' }}
                        onMouseEnter={(e) => { e.target.style.backgroundColor = '#059669'; e.target.style.transform = 'scale(1.05)' }}
                        onMouseLeave={(e) => { e.target.style.backgroundColor = '#06d6a0'; e.target.style.transform = 'scale(1)' }}
                        onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
                        onMouseUp={(e) => e.target.style.transform = 'scale(1.05)'}
                      >
                        Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(false)
                          setError('')
                          setSuccess('')
                        }}
                        className="w-full sm:w-auto font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-md"
                        style={{ 
                          backgroundColor: isDark ? '#334155' : '#e5e7eb',
                          color: isDark ? '#cbd5e1' : '#475569',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.target.style.backgroundColor = isDark ? '#475569' : '#d1d5db'; e.target.style.transform = 'scale(1.05)' }}
                        onMouseLeave={(e) => { e.target.style.backgroundColor = isDark ? '#334155' : '#e5e7eb'; e.target.style.transform = 'scale(1)' }}
                        onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
                        onMouseUp={(e) => e.target.style.transform = 'scale(1.05)'}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}