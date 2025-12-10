'use client'

import { useEffect, useState } from 'react'

export default function TermsOfUsePage() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkDarkMode()
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const lastUpdated = "December 7, 2025"

  return (
    <div 
      className="min-h-screen py-6 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 
            className="text-3xl sm:text-4xl font-bold mb-3"
            style={{ color: isDark ? '#06d6a0' : '#0f172a' }}
          >
            Terms of Use
          </h1>
          <p 
            className="text-sm"
            style={{ color: isDark ? '#94a3b8' : '#64748b' }}
          >
            Last updated: {lastUpdated}
          </p>
        </div>

        {/* Content */}
        <div 
          className="rounded-lg p-6 sm:p-8 space-y-6"
          style={{
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.9)',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
          }}
        >
          {/* Introduction */}
          <section>
            <p style={{ color: isDark ? '#cbd5e1' : '#475569', lineHeight: '1.7' }}>
              Welcome to <strong style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>SafePath</strong>. 
              By using our service, you agree to these terms. Please read them carefully.
            </p>
          </section>

          {/* 1. Service Description */}
          <section>
            <h2 
              className="text-xl font-semibold mb-3"
              style={{ color: isDark ? '#06d6a0' : '#0f172a' }}
            >
              1. Service Description
            </h2>
            <p style={{ color: isDark ? '#cbd5e1' : '#475569', lineHeight: '1.7', marginBottom: '12px' }}>
              SafePath provides route planning, hazard reporting, and safety features to help you navigate safely. 
              Our service includes real-time location sharing, community-reported hazards, and buddy finding features.
            </p>
            <div 
              className="p-4 rounded-lg"
              style={{ 
                backgroundColor: isDark ? 'rgba(6, 214, 160, 0.1)' : 'rgba(6, 214, 160, 0.15)',
                border: `1px solid ${isDark ? 'rgba(6, 214, 160, 0.3)' : 'rgba(6, 214, 160, 0.4)'}`
              }}
            >
              <p style={{ color: isDark ? '#cbd5e1' : '#475569', lineHeight: '1.7' }}>
                <strong style={{ color: isDark ? '#06d6a0' : '#0f172a' }}>Guest Users:</strong> Without registration, 
                you can view nearby buddy counts and hazards within 5km of your current location on the homepage only. 
                Full features (route planning, hazard reporting, buddy finding, location sharing) require a registered account.
              </p>
            </div>
          </section>

          {/* 2. Location Services */}
          <section>
            <h2 
              className="text-xl font-semibold mb-3"
              style={{ color: isDark ? '#06d6a0' : '#0f172a' }}
            >
              2. Location Services
            </h2>
            <ul className="space-y-2 ml-4" style={{ color: isDark ? '#cbd5e1' : '#475569', lineHeight: '1.7' }}>
              <li className="flex gap-2">
                <span>•</span>
                <span>You control when to share your location. Location data is stored temporarily during your session.</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Location sharing with buddies requires mutual consent.</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>We use your location only to provide routing and safety features.</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Location data is automatically cleared when you log out.</span>
              </li>
            </ul>
          </section>

          {/* 3. User Responsibilities */}
          <section>
            <h2 
              className="text-xl font-semibold mb-3"
              style={{ color: isDark ? '#06d6a0' : '#0f172a' }}
            >
              3. Your Responsibilities
            </h2>
            <ul className="space-y-2 ml-4" style={{ color: isDark ? '#cbd5e1' : '#475569', lineHeight: '1.7' }}>
              <li className="flex gap-2">
                <span>•</span>
                <span><strong>Accurate Reporting:</strong> Only report real hazards. False reports harm the community and may result in account suspension.</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span><strong>Safe Use:</strong> Don't use the app while driving. Pull over safely to interact with the app.</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span><strong>Respectful Behavior:</strong> Treat other users with respect. Harassment or abuse is not tolerated.</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span><strong>Account Security:</strong> Keep your login credentials secure and don't share your account.</span>
              </li>
            </ul>
          </section>

          {/* 4. Hazard Reporting */}
          <section>
            <h2 
              className="text-xl font-semibold mb-3"
              style={{ color: isDark ? '#06d6a0' : '#0f172a' }}
            >
              4. Hazard Reporting
            </h2>
            <ul className="space-y-2 ml-4" style={{ color: isDark ? '#cbd5e1' : '#475569', lineHeight: '1.7' }}>
              <li className="flex gap-2">
                <span>•</span>
                <span>Reports must be truthful and accurate.</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Do not submit spam, fake, or malicious reports.</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Uploaded photos must be relevant and appropriate.</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>We reserve the right to remove inappropriate or false reports.</span>
              </li>
            </ul>
          </section>

          {/* 5. Find Buddy Feature */}
          <section>
            <h2 
              className="text-xl font-semibold mb-3"
              style={{ color: isDark ? '#06d6a0' : '#0f172a' }}
            >
              5. Find Buddy Feature
            </h2>
            <ul className="space-y-2 ml-4" style={{ color: isDark ? '#cbd5e1' : '#475569', lineHeight: '1.7' }}>
              <li className="flex gap-2">
                <span>•</span>
                <span>Share location with trusted people only.</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>You can stop sharing your location at any time.</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Information shared with buddies (name, location) is visible to them during active sessions.</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Use this feature responsibly and respect others' privacy.</span>
              </li>
            </ul>
          </section>

          {/* 6. Disclaimer */}
          <section>
            <h2 
              className="text-xl font-semibold mb-3"
              style={{ color: isDark ? '#06d6a0' : '#0f172a' }}
            >
              6. Service Disclaimer
            </h2>
            <ul className="space-y-2 ml-4" style={{ color: isDark ? '#cbd5e1' : '#475569', lineHeight: '1.7' }}>
              <li className="flex gap-2">
                <span>•</span>
                <span>Routes and hazard data are provided "as is" without warranties.</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Always use your own judgment. SafePath is a tool to assist, not replace, your decision-making.</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>We are not responsible for accidents, injuries, or damages resulting from use of the service.</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Community-reported hazards may be outdated or inaccurate.</span>
              </li>
            </ul>
          </section>

          {/* 7. Data & Privacy */}
          <section>
            <h2 
              className="text-xl font-semibold mb-3"
              style={{ color: isDark ? '#06d6a0' : '#0f172a' }}
            >
              7. Data & Privacy
            </h2>
            <p style={{ color: isDark ? '#cbd5e1' : '#475569', lineHeight: '1.7' }}>
              Your privacy matters. We collect and use data as described in our{' '}
              <a 
                href="/privacy" 
                className="underline font-medium"
                style={{ color: '#06d6a0' }}
              >
                Privacy Policy
              </a>
              . By using SafePath, you consent to our data practices.
            </p>
          </section>

          {/* 8. Changes to Service */}
          <section>
            <h2 
              className="text-xl font-semibold mb-3"
              style={{ color: isDark ? '#06d6a0' : '#0f172a' }}
            >
              8. Changes to Service
            </h2>
            <p style={{ color: isDark ? '#cbd5e1' : '#475569', lineHeight: '1.7' }}>
              We may modify, suspend, or discontinue any part of SafePath at any time. 
              We'll notify you of significant changes when possible.
            </p>
          </section>

          {/* 9. Termination */}
          <section>
            <h2 
              className="text-xl font-semibold mb-3"
              style={{ color: isDark ? '#06d6a0' : '#0f172a' }}
            >
              9. Account Termination
            </h2>
            <p style={{ color: isDark ? '#cbd5e1' : '#475569', lineHeight: '1.7' }}>
              We may suspend or terminate accounts that violate these terms, including accounts that 
              submit false reports, harass others, or misuse the service. You can delete your account anytime 
              from your profile settings.
            </p>
          </section>

          {/* 10. Contact */}
          <section>
            <h2 
              className="text-xl font-semibold mb-3"
              style={{ color: isDark ? '#06d6a0' : '#0f172a' }}
            >
              10. Contact Us
            </h2>
            <p style={{ color: isDark ? '#cbd5e1' : '#475569', lineHeight: '1.7' }}>
              Questions about these terms? Contact us at{' '}
              <a 
                href="mailto:support@safepath.com" 
                className="underline"
                style={{ color: '#06d6a0' }}
              >
                support@safepath.com
              </a>
            </p>
          </section>

          {/* Agreement */}
          <section 
            className="mt-8 pt-6"
            style={{ borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}
          >
            <p 
              className="text-center font-medium"
              style={{ color: isDark ? '#06d6a0' : '#0f172a' }}
            >
              By using SafePath, you agree to these Terms of Use.
            </p>
          </section>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <a
            href="/"
            className="inline-block px-6 py-3 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: '#06d6a0',
              color: '#0f172a'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#06d6a0'}
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}
