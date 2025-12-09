'use client'

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      setIsVerifying(false);
      setErrors({ general: 'Invalid reset link. Please request a new password reset.' });
      return;
    }

    setToken(tokenParam);
    verifyToken(tokenParam);
  }, [searchParams]);

  const verifyToken = async (resetToken) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      
      const response = await fetch(`${apiUrl}/auth/verify-reset-token?token=${resetToken}`);
      const data = await response.json();

      if (data.success) {
        setIsValidToken(true);
      } else {
        setErrors({ general: data.message || 'Invalid or expired reset token' });
      }
    } catch (error) {
      console.error('Token verification error:', error);
      setErrors({ general: 'Failed to verify reset token. Please try again.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name] || errors.general) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        delete newErrors.general;
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

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

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      
      const response = await fetch(`${apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
      } else {
        setErrors({ general: data.message || 'Failed to reset password' });
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setErrors({ general: 'An error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06d6a0] mx-auto mb-4"></div>
          <p className="text-lg" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
            Verifying reset link...
          </p>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="max-w-md w-full space-y-6 p-8 rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
              <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
              Invalid Reset Link
            </h2>
            <p className="mt-4 text-base" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
              {errors.general || 'This password reset link is invalid or has expired.'}
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/auth/forgot-password"
              className="w-full flex justify-center py-2 px-4 border border-transparent text-lg font-medium rounded-md transition-colors"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-text-on-accent)'
              }}
            >
              Request New Reset Link
            </Link>
            <Link
              href="/auth/login"
              className="w-full flex justify-center py-2 px-4 text-lg font-medium rounded-md transition-colors"
              style={{
                color: isDark ? '#06d6a0' : '#0f172a',
                backgroundColor: isDark ? '#1e293b' : '#f1f5f9'
              }}
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="max-w-md w-full space-y-6 p-8 rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
              <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
              Password Reset Successful!
            </h2>
            <p className="mt-4 text-base" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
              Your password has been successfully reset. You can now log in with your new password.
            </p>
          </div>

          <Link
            href="/auth/login"
            className="w-full flex justify-center py-2 px-4 border border-transparent text-lg font-medium rounded-md transition-colors"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-text-on-accent)'
            }}
          >
            Continue to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-md w-full space-y-6 p-8 rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div>
          <h2 className="text-center text-3xl font-bold" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
            Create New Password
          </h2>
          <p className="mt-2 text-center text-base" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
            Enter your new password below
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="block text-lg font-medium" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
              New Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={formData.password}
              onChange={handleChange}
              className="mt-1 appearance-none relative block w-full px-3 py-2 dark:px-4 dark:py-3 border border-gray-300 dark:border-[#06d6a0]/30 rounded-md dark:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06d6a0] focus:border-[#06d6a0] sm:text-sm text-gray-900 dark:text-[#06d6a0] placeholder-gray-500 dark:placeholder-[#06d6a0]/60 transition-all"
              style={{ backgroundColor: 'var(--bg-card)' }}
              placeholder="Enter new password (min 6 characters)"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-400">{errors.password}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-lg font-medium" style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className="mt-1 appearance-none relative block w-full px-3 py-2 dark:px-4 dark:py-3 border border-gray-300 dark:border-[#06d6a0]/30 rounded-md dark:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06d6a0] focus:border-[#06d6a0] sm:text-sm text-gray-900 dark:text-[#06d6a0] placeholder-gray-500 dark:placeholder-[#06d6a0]/60 transition-all"
              style={{ backgroundColor: 'var(--bg-card)' }}
              placeholder="Confirm new password"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
            )}
          </div>

          {errors.general && (
            <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded relative">
              {errors.general}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent text-lg font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:opacity-90"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-text-on-accent)'
            }}
          >
            {isLoading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06d6a0]"></div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
