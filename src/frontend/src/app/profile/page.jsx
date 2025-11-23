'use client'

import { useState, useEffect } from 'react'
import { authService } from '../../lib/services'
import ProtectedRoute from '../../components/auth/ProtectedRoute'
import { useRouter } from 'next/navigation'

export default function Profile() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
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

  useEffect(() => {
    loadProfile()
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    
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
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

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
        <div className="min-h-screen pt-20" style={{ background: 'var(--bg-body)' }}>
          <div className="container mx-auto px-6 py-12">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent"></div>
            </div>
            <p className="text-center mt-4" style={{ color: 'var(--color-text-primary)' }}>Loading profile...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen pt-20" style={{ background: 'var(--bg-body)' }}>
        <div className="container mx-auto px-6 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              User <span className="text-accent">Profile</span>
            </h1>
            <p className="text-xl" style={{ color: 'var(--color-text-secondary)' }}>
              Manage your account settings and safety preferences
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="max-w-2xl mx-auto mb-6">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            </div>
          )}

          {success && (
            <div className="max-w-2xl mx-auto mb-6">
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            </div>
          )}

          {/* Profile Card */}
          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
              {/* Profile Header */}
              <div className="bg-gradient-to-r from-primary-dark to-primary p-8 text-center">
                <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--color-accent)' }}>
  <span className="text-4xl" style={{ color: 'var(--color-text-on-accent)' }}>👤</span>
</div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>{user?.name || 'User'}</h2>
<p style={{ color: 'var(--color-text-secondary)' }}>{user?.email}</p>
<p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
  Member since: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
</p>
              </div>

              {/* Profile Content */}
              <div className="p-8">
                {!editing ? (
                  // View Mode
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Full Name</label>
                        <p className="text-lg" style={{ color: 'var(--color-text-primary)' }}>{user?.name || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Email</label>
                        <p className="text-lg" style={{ color: 'var(--color-text-primary)' }}>{user?.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Phone</label>
                        <p className="text-lg" style={{ color: 'var(--color-text-primary)' }}>{user?.phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Emergency Contact</label>
                        <p className="text-lg" style={{ color: 'var(--color-text-primary)' }}>{user?.emergency_contact || 'Not provided'}</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Address</label>
                      <p className="text-lg" style={{ color: 'var(--color-text-primary)' }}>{user?.address || 'Not provided'}</p>
                    </div>

                    {/* Safety Preferences */}
                    <div className="pt-6" style={{ borderTop: '1px solid var(--border-color)' }}>
                      <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Safety Preferences</h3>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Preferred Transport</label>
                          <p className="text-lg capitalize" style={{ color: 'var(--color-text-primary)' }}>
                            {user?.preferred_transport || 'Walking'} 
                            {user?.preferred_transport === 'walking' && ' 🚶'}
                            {user?.preferred_transport === 'cycling' && ' 🚴'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Safety Priority</label>
                          <p className="text-lg capitalize" style={{ color: 'var(--color-text-primary)' }}>
                            {user?.safety_priority || 'High'} 
                            {user?.safety_priority === 'high' && ' 🛡️'}
                            {user?.safety_priority === 'medium' && ' ⚖️'}
                            {user?.safety_priority === 'low' && ' ⚡'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Notifications</label>
                        <p className="text-lg" style={{ color: 'var(--color-text-primary)' }}>
                          {user?.notifications ? '✅ Enabled' : '❌ Disabled'}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-6">
                      <button
                        onClick={() => setEditing(true)}
                        className="flex-1 font-bold py-3 px-6 rounded-lg transition-all duration-200 hover:opacity-90"
                        style={{
                          backgroundColor: 'var(--color-accent)',
                          color: 'var(--color-text-on-accent)'
                        }}
                      >
                        ✏️ Edit Profile
                      </button>
                    </div>
                  </div>
                ) : (
                  // Edit Mode
                  <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Full Name</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full p-3 border-2 rounded-lg focus:outline-none focus:border-accent"
                          style={{
                            borderColor: 'var(--color-text-secondary)',
                            backgroundColor: 'var(--bg-card)',
                            color: 'var(--color-text-primary)'
                          }}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Email</label>
                        <input
                          type="email"
                          value={formData.email}
                          className="w-full p-3 border-2 rounded-lg cursor-not-allowed"
                          style={{
                            borderColor: 'var(--border-color)',
                            backgroundColor: 'var(--bg-icon)',
                            color: 'var(--color-text-secondary)'
                          }}
                          disabled
                        />
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Email cannot be changed</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Phone</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full p-3 border-2 rounded-lg focus:outline-none focus:border-accent"
                          style={{
                            borderColor: 'var(--color-text-secondary)',
                            backgroundColor: 'var(--bg-card)',
                            color: 'var(--color-text-primary)'
                          }}
                          placeholder="+44 71xxxxx"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Emergency Contact</label>
                        <input
                          type="tel"
                          name="emergencyContact"
                          value={formData.emergencyContact}
                          onChange={handleInputChange}
                          className="w-full p-3 border-2 rounded-lg focus:outline-none focus:border-accent"
                          style={{
                            borderColor: 'var(--color-text-secondary)',
                            backgroundColor: 'var(--bg-card)',
                            color: 'var(--color-text-primary)'
                          }}
                          placeholder="+44 712xxxxxxx"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Address</label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full p-3 border-2 rounded-lg focus:outline-none focus:border-accent"
                        style={{
                          borderColor: 'var(--color-text-secondary)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--color-text-primary)'
                        }}
                        placeholder="Your home address"
                      />
                    </div>

                    {/* Preferences */}
                    <div className="pt-6" style={{ borderTop: '1px solid var(--border-color)' }}>
                      <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Safety Preferences</h3>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Preferred Transport</label>
                          <select
                            name="preferences.preferredTransport"
                            value={formData.preferences.preferredTransport}
                            onChange={handleInputChange}
                            className="w-full p-3 border-2 rounded-lg focus:outline-none focus:border-accent"
                            style={{
                              borderColor: 'var(--color-text-secondary)',
                              backgroundColor: 'var(--bg-card)',
                              color: 'var(--color-text-primary)'
                            }}
                          >
                            <option value="walking">🚶 Walking</option>
                            <option value="cycling">🚴 Cycling</option>
                            <option value="driving">🚗 Driving</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Safety Priority</label>
                          <select
                            name="preferences.safetyPriority"
                            value={formData.preferences.safetyPriority}
                            onChange={handleInputChange}
                            className="w-full p-3 border-2 rounded-lg focus:outline-none focus:border-accent"
                            style={{
                              borderColor: 'var(--color-text-secondary)',
                              backgroundColor: 'var(--bg-card)',
                              color: 'var(--color-text-primary)'
                            }}
                          >
                            <option value="high">🛡️ High - Prioritize safety over speed</option>
                            <option value="medium">⚖️ Medium - Balance safety and efficiency</option>
                            <option value="low">⚡ Low - Prioritize speed over safety</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            name="preferences.notifications"
                            checked={formData.preferences.notifications}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-accent bg-gray-100 border-gray-300 rounded focus:ring-accent focus:ring-2"
                          />
                          <span className="ml-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Enable safety notifications and alerts</span>
                        </label>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-6">
                      <button
                        type="submit"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
                      >
                        💾 Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(false)
                          setError('')
                          setSuccess('')
                        }}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
                      >
                        ❌ Cancel
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


























