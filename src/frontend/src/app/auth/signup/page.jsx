'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService } from '../../../lib/services';

export default function SignUp() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    latitude: '',
    longitude: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (authService.isLoggedIn()) {
      router.push('/');
    }
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const getCurrentLocation = () => {
    setLocationLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString()
          }));
          setLocationLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Could not get your location. Please enter coordinates manually or skip this step.');
          setLocationLoading(false);
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
      setLocationLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.latitude && (isNaN(formData.latitude) || formData.latitude < -90 || formData.latitude > 90)) {
      newErrors.latitude = 'Invalid latitude (-90 to 90)';
    }

    if (formData.longitude && (isNaN(formData.longitude) || formData.longitude < -180 || formData.longitude > 180)) {
      newErrors.longitude = 'Invalid longitude (-180 to 180)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const signupData = {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password
      };

      // Add location if provided
      if (formData.latitude && formData.longitude) {
        signupData.latitude = parseFloat(formData.latitude);
        signupData.longitude = parseFloat(formData.longitude);
      }

      const result = await authService.signup(signupData);

      if (result.success) {
        alert('Account created successfully! You are now logged in.');
        // Force page refresh to update navbar state
        window.location.href = '/';
      } else {
        setErrors({ general: result.message || 'Sign up failed' });
      }
    } catch (error) {
      console.error('Signup error:', error);
      if (error.errors) {
        const fieldErrors = {};
        error.errors.forEach(err => {
          fieldErrors[err.path] = err.msg;
        });
        setErrors(fieldErrors);
      } else {
        setErrors({ general: error.message || 'Sign up failed. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#ffffff', fontSize: '20px' }}>
      <div className="max-w-md w-full space-y-6">
        <div>
          <div className="flex justify-center">
            <div className="w-16 h-16 flex items-center justify-center">
              <img 
               src="/logo.png" 
                alt="London Safety Routing Logo" 
                className="w-16 h-16 object-contain"
              />
            </div>
          </div>
          <h2 className="mt-4 text-center text-2xl font-extrabold" style={{ color: '#1e293b' }}>
            Create your account
          </h2>
          <p className="mt-1 text-center text-sm" style={{ color: '#1e293b' }}>
          </p>
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-3">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-lg font-medium" style={{ color: '#1e293b' }}>
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent focus:z-10 sm:text-sm"
                style={{
                  borderColor: '#1e293b', 
                  backgroundColor: '#ffffff',
                  color: '#1e293b'
                }}
                placeholder="Enter your full name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-lg font-medium" style={{ color: '#1e293b' }}>
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent focus:z-10 sm:text-sm"
                style={{
                  borderColor: '#1e293b',
                  backgroundColor: '#ffffff',
                  color: '#1e293b'
                }}
                placeholder="Enter your email address"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-lg font-medium" style={{ color: '#1e293b' }}>
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent focus:z-10 sm:text-sm"
                  style={{
                    borderColor: '#1e293b',
                    backgroundColor: '#ffffff',
                    color: '#1e293b'
                  }}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                  style={{ color: '#94a3b8' }}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-lg font-medium" style={{ color: '#1e293b' }}>
                Confirm Password
              </label>
              <div className="relative mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent focus:z-10 sm:text-sm"
                  style={{
                    borderColor: '#1e293b', 
                    backgroundColor: '#ffffff',
                    color: '#1e293b'
                  }}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                  style={{ color: '#94a3b8' }}
                >
                  {showConfirmPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Location Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-lg font-medium" style={{ color: '#1e293b' }}>
                  Location (Optional)
                </label>
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={locationLoading}
                  className="text-sm underline transition-colors disabled:opacity-50"
                  style={{ color: '#1e293b' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#06d6a0'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#1e293b'}
                >
                  {locationLoading ? 'Getting location...' : 'Use my location'}
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    id="latitude"
                    name="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={handleChange}
                    className="appearance-none relative block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent focus:z-10 sm:text-sm"
                    style={{
                      borderColor: '#1e293b', 
                      backgroundColor: '#ffffff',
                      color: '#1e293b'
                    }}
                    placeholder="Latitude"
                  />
                  {errors.latitude && (
                    <p className="mt-1 text-xs text-red-400">{errors.latitude}</p>
                  )}
                </div>
                <div>
                  <input
                    id="longitude"
                    name="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={handleChange}
                    className="appearance-none relative block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent focus:z-10 sm:text-sm"
                    style={{
                      borderColor: '#1e293b', 
                      backgroundColor: '#ffffff',
                      color: '#1e293b'
                    }}
                    placeholder="Longitude"
                  />
                  {errors.longitude && (
                    <p className="mt-1 text-xs text-red-400">{errors.longitude}</p>
                  )}
                </div>
              </div>
              <p className="text-xs" style={{ color: '#1e293b' }}>
                Adding your location helps find nearby routes and buddies
              </p>
            </div>
          </div>

          {/* General Error */}
          {errors.general && (
            <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded relative">
              {errors.general}
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-lg font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:opacity-90"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-text-on-accent)'
              }}
            >
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm" style={{ color: '#1e293b' }}>
              Already have an account?{' '}
              <Link 
                href="/auth/login" 
                className="font-medium underline transition-colors"
                style={{ color: '#1e293b' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#06d6a0'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#1e293b'}
              >
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}






















