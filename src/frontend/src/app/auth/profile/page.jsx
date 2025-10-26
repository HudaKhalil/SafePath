'use client'

import { useState, useEffect } from 'react'
import { authService, routesService } from '../../../lib/services' 
import ProtectedRoute from '../../../components/auth/ProtectedRoute'
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
        setError('Failed to load profile')
      }
    } catch (error) {
      console.error('Profile load error:', error)
      setError('Failed to load profile')
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
      console.error('Profile update error:', error)
      setError('Failed to update profile')
    }
  }

  const handleLogout = () => {
    authService.logout()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-primary-dark via-primary-light to-secondary pt-20">
          <div className="container mx-auto px-6 py-12">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent"></div>
            </div>
            <p className="text-white text-center mt-4">Loading profile...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-primary-dark via-primary-light to-secondary pt-20">
        <div className="container mx-auto px-6 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">
              User <span className="text-accent">Profile</span>
            </h1>
            <p className="text-xl text-text-secondary">
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
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Profile Header */}
              <div className="bg-gradient-to-r from-primary-dark to-primary p-8 text-center">
                <div className="w-24 h-24 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl text-primary-dark">👤</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{user?.name || 'User'}</h2>
                <p className="text-text-secondary">{user?.email}</p>
                <p className="text-sm text-gray-300 mt-2">
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
                        <label className="text-sm font-medium text-gray-600">Full Name</label>
                        <p className="text-lg text-gray-900">{user?.name || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Email</label>
                        <p className="text-lg text-gray-900">{user?.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Phone</label>
                        <p className="text-lg text-gray-900">{user?.phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Emergency Contact</label>
                        <p className="text-lg text-gray-900">{user?.emergency_contact || 'Not provided'}</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600">Address</label>
                      <p className="text-lg text-gray-900">{user?.address || 'Not provided'}</p>
                    </div>

                    {/* Safety Preferences */}
                    <div className="border-t pt-6">
                      <h3 className="text-xl font-semibold text-gray-800 mb-4">Safety Preferences</h3>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Preferred Transport</label>
                          <p className="text-lg text-gray-900 capitalize">
                            {user?.preferred_transport || 'Walking'} 
                            {user?.preferred_transport === 'walking' && ' 🚶'}
                            {user?.preferred_transport === 'cycling' && ' 🚴'}
                            {user?.preferred_transport === 'driving' && ' 🚗'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Safety Priority</label>
                          <p className="text-lg text-gray-900 capitalize">
                            {user?.safety_priority || 'High'} 
                            {user?.safety_priority === 'high' && ' 🛡️'}
                            {user?.safety_priority === 'medium' && ' ⚖️'}
                            {user?.safety_priority === 'low' && ' ⚡'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="text-sm font-medium text-gray-600">Notifications</label>
                        <p className="text-lg text-gray-900">
                          {user?.notifications ? '✅ Enabled' : '❌ Disabled'}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-6">
                      <button
                        onClick={() => setEditing(true)}
                        className="flex-1 bg-accent hover:bg-accent/90 text-primary-dark font-bold py-3 px-6 rounded-lg transition-all duration-200"
                      >
                        ✏️ Edit Profile
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
                      >
                        🚪 Logout
                      </button>
                    </div>
                  </div>
                ) : (
                  // Edit Mode
                  <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-accent text-gray-900"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input
                          type="email"
                          value={formData.email}
                          className="w-full p-3 border-2 border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                          disabled
                        />
                        <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-accent text-gray-900"
                          placeholder="+44 7123 456789"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact</label>
                        <input
                          type="tel"
                          name="emergencyContact"
                          value={formData.emergencyContact}
                          onChange={handleInputChange}
                          className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-accent text-gray-900"
                          placeholder="+44 7123 456789"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-accent text-gray-900"
                        placeholder="Your home address in London"
                      />
                    </div>

                    {/* Preferences */}
                    <div className="border-t pt-6">
                      <h3 className="text-xl font-semibold text-gray-800 mb-4">Safety Preferences</h3>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Transport</label>
                          <select
                            name="preferences.preferredTransport"
                            value={formData.preferences.preferredTransport}
                            onChange={handleInputChange}
                            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-accent text-gray-900"
                          >
                            <option value="walking">🚶 Walking</option>
                            <option value="cycling">🚴 Cycling</option>
                            <option value="driving">🚗 Driving</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Safety Priority</label>
                          <select
                            name="preferences.safetyPriority"
                            value={formData.preferences.safetyPriority}
                            onChange={handleInputChange}
                            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-accent text-gray-900"
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
                          <span className="ml-2 text-sm text-gray-700">Enable safety notifications and alerts</span>
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