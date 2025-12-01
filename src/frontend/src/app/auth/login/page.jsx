'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService } from '../../../lib/services';

export default function Login() {
  console.log('🔄 Login component rendering/re-rendering');
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Mark component as mounted - DISABLED to prevent redirects
  useEffect(() => {
    setMounted(true);
    // Temporarily disable auto-redirect to debug
    // if (authService.isLoggedIn()) {
    //   router.push('/');
    // }
  }, []);

  // Track dark mode changes
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log('📝 Field changed:', name, '=', value);
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear all errors when user starts typing
    if (errors[name] || errors.general) {
      console.log('🗑️ Clearing errors because user is typing');
      setErrors({});
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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('🔵 handleSubmit called');
    console.log('Current formData:', formData);
    console.log('Current errors:', errors);
    
    if (!validateForm()) {
      console.log('❌ Validation failed');
      return;
    }

    console.log('✅ Validation passed, starting login...');
    setIsLoading(true);
    // Don't clear errors here - let them persist until we get a new result

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
        console.log('✅ Login successful, redirecting...');
        // Keep loading state while redirecting
        setTimeout(() => {
          console.log('🔄 Executing redirect now');
          window.location.href = '/';
        }, 100);
      } else {
        console.log('❌ Login failed:', result.message);
        const errorMsg = result.message || 'Login failed';
        console.log('Setting errors to:', errorMsg);
        setErrors({ general: errorMsg });
        setIsLoading(false);
        console.log('Should show error now');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Determine error message
      let errorMessage = 'Login failed. Please try again.';
      
      if (!error.response) {
        // Network error or backend not running
        errorMessage = error.message || 'Cannot connect to server. Please ensure the backend is running on port 5001.';
      } else if (error.response?.status === 401 || error.response?.status === 400) {
        // Invalid credentials
        errorMessage = error.response.data?.message || 'Invalid email or password';
      } else if (error.response?.data?.message) {
        // Other API errors
        errorMessage = error.response.data.message;
      } else if (error.message) {
        // Generic error with message
        errorMessage = error.message;
      }
      
      console.log('Setting error message:', errorMessage);
      
      // Handle field-specific validation errors
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const fieldErrors = {};
        error.response.data.errors.forEach(err => {
          fieldErrors[err.path || err.param] = err.msg || err.message;
        });
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
        } else {
          setErrors({ general: errorMessage });
        }
      } else {
        const errorState = { general: errorMessage };
        console.log('❌ Setting error state:', errorState);
        setErrors(errorState);
        console.log('🔴 DO NOT CLEAR FORM - KEEP FORM DATA');
      }
      
      // Keep loading state false and errors visible
      setIsLoading(false);
      
      // Log after state update attempt
      setTimeout(() => {
        console.log('📊 After 100ms - errors:', errors, 'formData:', formData);
      }, 100);
    }
    
    console.log('🔵 handleSubmit completed');
  };

  return (
    <div className="flex-1 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: isDark ? 'transparent' : '#f1f5f9' }}>
      <div className="max-w-md w-full space-y-6 rounded-2xl p-8 shadow-2xl dark:border dark:border-white/20" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div>
          <div className="flex justify-center">
            <div className="w-16 h-16 flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="SafePath Logo" 
                className="w-16 h-16 object-contain"
              />
            </div>
          </div>
          <h2 className="mt-4 text-center text-2xl font-extrabold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
            Log in
          </h2>
          <p className="mt-1 text-center text-base" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
            Welcome back to SafePath!
          </p>
        </div>

        <div className="mt-4 space-y-4">
          <div className="space-y-3">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-lg font-medium" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
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
                className="mt-1 appearance-none relative block w-full px-3 py-2 dark:px-4 dark:py-3 border border-gray-300 dark:border-[#06d6a0]/30 rounded-md dark:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06d6a0] focus:border-[#06d6a0] sm:text-sm text-gray-900 dark:text-[#06d6a0] placeholder-gray-500 dark:placeholder-[#06d6a0]/60 transition-all"
                style={{ backgroundColor: 'var(--bg-card)' }}
                placeholder="Enter your email address"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-lg font-medium" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
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
                className="mt-1 appearance-none relative block w-full px-3 py-2 dark:px-4 dark:py-3 border border-gray-300 dark:border-[#06d6a0]/30 rounded-md dark:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06d6a0] focus:border-[#06d6a0] sm:text-sm text-gray-900 dark:text-[#06d6a0] placeholder-gray-500 dark:placeholder-[#06d6a0]/60 transition-all"
                style={{ backgroundColor: 'var(--bg-card)' }}
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password}</p>
              )}
            </div>
          </div>

          {errors.general && (
            <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded relative">
              {errors.general}
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔵 Button clicked');
                handleSubmit(e);
              }}
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-lg font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:opacity-90"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-text-on-accent)'
              }}
            >
              {isLoading ? 'Logging In...' : 'Log In'}
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-sm" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
              Don't have an account?{' '}
              <Link 
                href="/auth/signup" 
                className="font-medium underline transition-colors"
                style={{ color: isDark ? '#06d6a0' : '#0f172a' }}
                onMouseEnter={(e) => e.target.style.color = isDark ? '#ffffff' : '#059669'}
                onMouseLeave={(e) => e.target.style.color = isDark ? '#06d6a0' : '#0f172a'}
              >
                Sign up here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}






















