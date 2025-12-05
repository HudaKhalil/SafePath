'use client'

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authService } from '../../../lib/services';
import Cookies from 'js-cookie';

export default function VerifyEmail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error, expired
  const [message, setMessage] = useState('Verifying your email...');
  const [isDark, setIsDark] = useState(false);
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);

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
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/auth/verify-email?token=${token}`
      );
      
      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Email verified successfully!');
        
        // If token is provided, set it and redirect to home
        if (data.data?.token) {
          Cookies.set('auth_token', data.data.token, { expires: 1 });
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        }
      } else {
        if (data.expired) {
          setStatus('expired');
          setMessage(data.message || 'Verification link has expired');
        } else if (data.alreadyVerified) {
          setStatus('success');
          setMessage(data.message || 'Email already verified');
          setTimeout(() => {
            router.push('/auth/login');
          }, 2000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed');
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
      setMessage('An error occurred during verification. Please try again.');
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      alert('Please enter your email address');
      return;
    }

    setResending(true);
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/auth/resend-verification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email })
        }
      );

      const data = await response.json();

      if (data.success) {
        alert('Verification email sent! Please check your inbox.');
      } else {
        alert(data.message || 'Failed to resend verification email');
      }
    } catch (error) {
      console.error('Resend error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div 
      className="flex-1 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8" 
      style={{ backgroundColor: isDark ? 'transparent' : '#f1f5f9' }}
    >
      <div 
        className="max-w-md w-full space-y-6 rounded-2xl p-8 shadow-2xl dark:border dark:border-white/20" 
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
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
          
          <h2 
            className="mt-4 text-center text-2xl font-extrabold" 
            style={{ color: isDark ? '#ffffff' : '#0f172a' }}
          >
            Email Verification
          </h2>
        </div>

        <div className="text-center space-y-4">
          {/* Status Icon */}
          <div className="flex justify-center">
            {status === 'verifying' && (
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-300 border-t-[#06d6a0]"></div>
            )}
            
            {status === 'success' && (
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
                <svg 
                  className="h-16 w-16 text-green-600 dark:text-green-400" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              </div>
            )}
            
            {status === 'error' && (
              <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4">
                <svg 
                  className="h-16 w-16 text-red-600 dark:text-red-400" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                </svg>
              </div>
            )}
            
            {status === 'expired' && (
              <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/30 p-4">
                <svg 
                  className="h-16 w-16 text-yellow-600 dark:text-yellow-400" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Message */}
          <p 
            className="text-lg"
            style={{ color: isDark ? '#06d6a0' : '#0f172a' }}
          >
            {message}
          </p>

          {/* Expired - Resend Form */}
          {status === 'expired' && (
            <div className="mt-6 space-y-4">
              <p className="text-sm" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                Request a new verification link
              </p>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#06d6a0]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06d6a0]"
                style={{ 
                  backgroundColor: 'var(--bg-card)',
                  color: isDark ? '#06d6a0' : '#0f172a'
                }}
              />
              <button
                onClick={handleResendVerification}
                disabled={resending}
                className="w-full py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-text-on-accent)'
                }}
              >
                {resending ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>
          )}

          {/* Success - Redirect info */}
          {status === 'success' && (
            <p className="text-sm" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
              Redirecting you to the app...
            </p>
          )}

          {/* Action Buttons */}
          <div className="mt-6 space-y-3">
            {status === 'success' && (
              <Link 
                href="/auth/login"
                className="block w-full py-2 px-4 rounded-lg font-medium text-center transition-colors"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-text-on-accent)'
                }}
              >
                Go to Login
              </Link>
            )}
            
            {status === 'error' && (
              <>
                <Link 
                  href="/auth/signup"
                  className="block w-full py-2 px-4 rounded-lg font-medium text-center transition-colors"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: 'var(--color-text-on-accent)'
                  }}
                >
                  Back to Sign Up
                </Link>
                <Link 
                  href="/auth/login"
                  className="block w-full py-2 px-4 rounded-lg font-medium text-center border transition-colors"
                  style={{
                    borderColor: isDark ? '#06d6a0' : '#0f172a',
                    color: isDark ? '#06d6a0' : '#0f172a'
                  }}
                >
                  Try to Login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}