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
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config?.url,
        stack: error.stack
      });
      
      // Temporary debugging alert - remove this after fixing
      alert(`Login Error Debug:\nMessage: ${error.message}\nStatus: ${error.response?.status}\nData: ${JSON.stringify(error.response?.data)}`);
      
      // Show error in UI as well as console
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      if (error.errors) {
        const fieldErrors = {};
        error.errors.forEach(err => {
          fieldErrors[err.path] = err.msg;
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
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
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-300">
            Welcome back to SafePath!
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
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
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent focus:z-10 sm:text-sm"
                placeholder="Enter your email address"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
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
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent focus:z-10 sm:text-sm"
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
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-black bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-sm text-gray-300">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="font-medium text-accent hover:text-accent/80 transition-colors">
                Sign up here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}