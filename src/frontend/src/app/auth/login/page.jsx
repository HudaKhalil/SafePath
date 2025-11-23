'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService } from '../../../lib/services';

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is already logged in
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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
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
      const loginData = {
        email: formData.email.toLowerCase().trim(),
        password: formData.password
      };

      console.log('Attempting login with:', { email: loginData.email });
      console.log('API Base URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api');
      
      const result = await authService.login(loginData);
      console.log('Login result:', result);

      if (result.success) {
        console.log('Login successful, redirecting...');
        // Add a small delay to see any console messages
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      } else {
        console.log('Login failed:', result.message);
        setErrors({ general: result.message || 'Login failed' });
      }
    } catch (error) {
      console.error('Login error caught:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error.constructor.name);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config?.url,
        stack: error.stack,
        code: error.code,
        errno: error.errno
      });
      
      // Show error in UI as well as console
      let errorMessage = 'Login failed. Please try again.';
      
      // Check for network errors
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error') || !error.response) {
        errorMessage = 'Cannot connect to server. Please ensure the backend is running on port 5001.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      if (error.response?.data?.errors) {
        const fieldErrors = {};
        error.response.data.errors.forEach(err => {
          fieldErrors[err.path || err.param] = err.msg || err.message;
        });
        setErrors(fieldErrors);
      } else {
        setErrors({ general: errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" 
      style={{ background: 'var(--bg-body)' }}
    >
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="w-24 h-24 flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="SafePath Logo" 
                className="w-24 h-24 object-contain"
              />
            </div>
          </div>
          
          <h2 
            className="mt-6 text-center text-4xl font-extrabold" 
            style={{ color: 'var(--color-text-primary)' }}
          >
            Sign in
          </h2>
          <p 
            className="mt-2 text-center text-sm" 
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Welcome back to SafePath!
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label 
                htmlFor="email" 
                className="block text-lg font-medium mb-2" 
                style={{ color: 'var(--color-text-primary)' }}
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="appearance-none relative block w-full px-4 py-3 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-base"
                style={{
                  borderWidth: '2px',
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--color-text-primary)'
                }}
                placeholder="Enter your email address"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label 
                htmlFor="password" 
                className="block text-lg font-medium mb-2" 
                style={{ color: 'var(--color-text-primary)' }}
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="appearance-none relative block w-full px-4 py-3 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-base"
                style={{
                  borderWidth: '2px',
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--color-text-primary)'
                }}
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>
          </div>

          {errors.general && (
            <div className="bg-red-50 border-2 border-red-500 text-red-700 px-4 py-3 rounded relative">
              {errors.general}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-lg font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{
                backgroundColor: '#06d6a0',
                color: '#0f172a'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#06d6a0'}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Don't have an account?{' '}
              <Link 
                href="/auth/signup" 
                className="font-medium underline transition-colors"
                style={{ color: 'var(--color-text-primary)' }}
                onMouseEnter={(e) => e.target.style.color = '#06d6a0'}
                onMouseLeave={(e) => e.target.style.color = 'var(--color-text-primary)'}
              >
                Sign up here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}














