'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDark, setIsDark] = useState(false);

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
    setEmail(e.target.value);
    if (errors.email || errors.general) {
      setErrors({});
    }
  };

  const validateEmail = () => {
    const newErrors = {};
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateEmail();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      
      const response = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
      } else {
        setErrors({ general: data.message || 'Failed to send reset email' });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setErrors({ general: 'An error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="max-w-md w-full space-y-6 p-8 rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
              <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
              Check Your Email
            </h2>
            <p className="mt-4 text-base" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
              If an account exists with <strong>{email}</strong>, you will receive password reset instructions shortly.
            </p>
            <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }}>
              <p className="text-sm" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                <strong>📧 Didn't receive the email?</strong>
              </p>
              <ul className="mt-2 text-sm text-left space-y-1" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                <li>• Check your spam/junk folder</li>
                <li>• Make sure you entered the correct email</li>
                <li>• Wait a few minutes for the email to arrive</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="w-full flex justify-center py-2 px-4 border border-transparent text-lg font-medium rounded-md transition-colors"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-text-on-accent)'
              }}
            >
              Back to Login
            </Link>
            <button
              onClick={() => {
                setIsSuccess(false);
                setEmail('');
              }}
              className="w-full py-2 px-4 text-lg font-medium rounded-md transition-colors"
              style={{
                color: isDark ? '#06d6a0' : '#0f172a',
                backgroundColor: isDark ? '#1e293b' : '#f1f5f9'
              }}
            >
              Try Another Email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-md w-full space-y-6 p-8 rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div>
          <Link href="/auth/login" className="flex items-center text-sm mb-4 transition-colors" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Login
          </Link>
          <h2 className="text-center text-3xl font-bold" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-base" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
            Enter your email address and we'll send you instructions to reset your password.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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
              value={email}
              onChange={handleChange}
              className="mt-1 appearance-none relative block w-full px-3 py-2 dark:px-4 dark:py-3 border border-gray-300 dark:border-[#06d6a0]/30 rounded-md dark:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06d6a0] focus:border-[#06d6a0] sm:text-sm text-gray-900 dark:text-[#06d6a0] placeholder-gray-500 dark:placeholder-[#06d6a0]/60 transition-all"
              style={{ backgroundColor: 'var(--bg-card)' }}
              placeholder="Enter your email address"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-400">{errors.email}</p>
            )}
          </div>

          {errors.general && (
            <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded relative">
              {errors.general}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent text-lg font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:opacity-90"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-text-on-accent)'
              }}
            >
              {isLoading ? 'Sending...' : 'Send Reset Instructions'}
            </button>

            <p className="text-center text-sm" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
              Remember your password?{' '}
              <Link 
                href="/auth/login"
                className="font-medium underline transition-colors"
                style={{ color: isDark ? '#06d6a0' : '#0f172a' }}
              >
                Log in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
