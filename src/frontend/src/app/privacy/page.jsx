'use client'

import { useState, useEffect } from 'react'

export default function Privacy() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    
    checkDarkMode()
    
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => observer.disconnect()
  }, [])

  return (
    <div
      style={{
        backgroundColor: isDark ? "#0f172a" : "#ffffff",
        minHeight: "100vh",
        paddingTop: "70px",
        paddingBottom: "80px",
      }}
    >
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl">
        <h1
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6"
          style={{ color: isDark ? "#f8fafc" : "#1e293b" }}
        >
          Privacy <span style={{ color: "#06d6a0" }}>Policy</span>
        </h1>

        <div
          className="space-y-6"
          style={{ color: isDark ? "#cbd5e1" : "#475569" }}
        >
          <section>
            <h2
              className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3"
              style={{ color: isDark ? "#f8fafc" : "#1e293b" }}
            >
              1. Who We Are
            </h2>
            <p className="mb-2 sm:mb-3 text-sm sm:text-base leading-relaxed">
              SafePath is a university research and graduation project developed
              as part of the MSc in Advanced Software Development at
              Technological University Dublin (TUD).
            </p>
            <p className="mb-3">
              For the purposes of data protection law (including the GDPR), the
              Data Controller responsible for the processing of your personal
              data through the SafePath application is:
            </p>
            
            <a 
              href="https://www.tudublin.ie/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block mb-4 rounded-lg overflow-hidden transition-transform duration-200 hover:scale-[1.02]"
              style={{
                border: `2px solid ${isDark ? '#06d6a0' : '#06d6a0'}`,
                boxShadow: isDark ? '0 4px 12px rgba(6, 214, 160, 0.2)' : '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}
            >
              <img 
                src="/Grangegorman.jpg" 
                alt="Technological University Dublin - Grangegorman Campus"
                className="w-full h-auto"
                style={{ display: 'block' }}
              />
            </a>
            
            <div
              className="mb-3 sm:mb-4 pl-3 sm:pl-4 py-2 sm:py-0"
              style={{
                borderLeft: `4px solid ${isDark ? "#06d6a0" : "#06d6a0"}`,
              }}
            >
              <p className="mb-1 text-sm sm:text-base">
                <strong>Technological University Dublin (TUD)</strong>
              </p>
              <p>Central Quad, Grangegorman Campus</p>
              <p>Grangegorman Lower</p>
              <p>Dublin 7, D07 ADY7</p>
              <p>Ireland</p>
              <p className="mt-2">
                <strong>Email:</strong> safepath.project@safepath.app
              </p>
            </div>

            <h3
              className="text-lg sm:text-xl font-bold mb-2 mt-3 sm:mt-4"
              style={{ color: isDark ? "#06d6a0" : "#059669" }}
            >
              Supervising Mentors
            </h3>
            <p className="mb-2">
              The project is supervised by the following academic mentors at
              Technological University Dublin:
            </p>
            <ul className="list-disc pl-5 sm:pl-6 space-y-1 mb-3 sm:mb-4 text-sm sm:text-base">
              <li>Andrea Curley</li>
              <li>Brendan Tierney</li>
              <li>Damian Gordon</li>
            </ul>
            <p className="mb-4">
              They oversee the project and provide academic guidance but are not
              the commercial operators of the app.
            </p>

            <h3
              className="text-xl font-bold mb-2 mt-4"
              style={{ color: isDark ? "#06d6a0" : "#059669" }}
            >
              Development Team
            </h3>
            <p className="mb-2">
              The SafePath application has been designed and implemented by the
              student development team (Group 2 - Class 2024-2026):
            </p>
            <ul className="list-disc pl-6 space-y-1 mb-3">
              <li>Huda Ibrahim</li>
              <li>Hina Kausar</li>
              <li>Shalini Kuruguntla</li>
              <li>Sai Priyanka Basa Shanker</li>
              <li>Karan Joseph</li>
            </ul>
            <p>
              The team develops and maintains the SafePath codebase as part of
              their MSc graduation project under the supervision of the mentors
              named above.
            </p>
          </section>

          <section>
            <h2
              className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3"
              style={{ color: isDark ? "#f8fafc" : "#1e293b" }}
            >
              2. Information We Collect
            </h2>
            <p className="mb-2 sm:mb-3 text-sm sm:text-base leading-relaxed">
              SafePath collects the following types of information:
            </p>
            <ul className="list-disc pl-5 sm:pl-6 space-y-1.5 sm:space-y-2 text-sm sm:text-base">
              <li>
                <strong>Account Information:</strong> Name, email address, phone
                number, and emergency contact details
              </li>
              <li>
                <strong>Location Data:</strong> Your current location and route
                information when using navigation features
              </li>
              <li>
                <strong>Safety Preferences:</strong> Your preferred transport
                mode and safety settings
              </li>
              <li>
                <strong>Usage Data:</strong> Information about how you use the
                app, including routes taken and hazards reported
              </li>
            </ul>
          </section>

          <section>
            <h2
              className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3"
              style={{ color: isDark ? "#f8fafc" : "#1e293b" }}
            >
              3. How We Use Your Information
            </h2>
            <p className="mb-2 sm:mb-3 text-sm sm:text-base leading-relaxed">We use your information to:</p>
            <ul className="list-disc pl-5 sm:pl-6 space-y-1.5 sm:space-y-2 text-sm sm:text-base">
              <li>
                Provide safe route recommendations based on your location and
                preferences
              </li>
              <li>
                Display hazards and safety information relevant to your routes
              </li>
              <li>Connect you with nearby travel buddies for safer journeys</li>
              <li>Send notifications about route updates and safety alerts</li>
              <li>Improve our service and develop new features</li>
            </ul>
          </section>

          <section>
            <h2
              className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3"
              style={{ color: isDark ? "#f8fafc" : "#1e293b" }}
            >
              4. Data Sharing and Disclosure
            </h2>
            <p className="mb-2 sm:mb-3 text-sm sm:text-base leading-relaxed">
              We do not sell your personal information. We may share your data:
            </p>
            <ul className="list-disc pl-5 sm:pl-6 space-y-1.5 sm:space-y-2 text-sm sm:text-base">
              <li>
                <strong>With Your Consent:</strong> When you choose to share
                your location with buddy features
              </li>
              <li>
                <strong>For Safety:</strong> Aggregated, anonymized hazard data
                to improve route safety for all users
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law or to
                protect our rights and users' safety
              </li>
            </ul>
          </section>

          <section>
            <h2
              className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3"
              style={{ color: isDark ? "#f8fafc" : "#1e293b" }}
            >
              5. Location Data
            </h2>
            <p className="text-sm sm:text-base leading-relaxed">
              SafePath requires location access to provide route guidance and
              safety features. You can control location permissions through your
              device settings. Location data is only collected when actively
              using navigation features and is used solely to provide the
              service you requested.
            </p>
          </section>

          <section>
            <h2
              className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3"
              style={{ color: isDark ? "#f8fafc" : "#1e293b" }}
            >
              6. Data Security
            </h2>
            <p className="text-sm sm:text-base leading-relaxed">
              We implement industry-standard security measures to protect your
              data, including encryption of sensitive information and secure
              server infrastructure. However, no method of transmission over the
              internet is 100% secure, and we cannot guarantee absolute
              security.
            </p>
          </section>

          <section>
            <h2
              className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3"
              style={{ color: isDark ? "#f8fafc" : "#1e293b" }}
            >
              7. Your Rights
            </h2>
            <p className="mb-2 sm:mb-3 text-sm sm:text-base leading-relaxed">You have the right to:</p>
            <ul className="list-disc pl-5 sm:pl-6 space-y-1.5 sm:space-y-2 text-sm sm:text-base">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Opt-out of non-essential notifications</li>
              <li>Export your data in a portable format</li>
            </ul>
          </section>

          <section>
            <h2
              className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3"
              style={{ color: isDark ? "#f8fafc" : "#1e293b" }}
            >
              8. Cookies and Tracking
            </h2>
            <p className="text-sm sm:text-base leading-relaxed">
              We use essential cookies to maintain your session and preferences.
              We do not use third-party tracking cookies or advertising
              networks.
            </p>
          </section>

          <section>
            <h2
              className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3"
              style={{ color: isDark ? "#f8fafc" : "#1e293b" }}
            >
              9. Children's Privacy
            </h2>
            <p className="text-sm sm:text-base leading-relaxed">
              SafePath is not intended for children under 13. We do not
              knowingly collect information from children under 13. If you
              believe we have collected such information, please contact us
              immediately.
            </p>
          </section>

          <section>
            <h2
              className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3"
              style={{ color: isDark ? "#f8fafc" : "#1e293b" }}
            >
              10. Changes to This Policy
            </h2>
            <p className="text-sm sm:text-base leading-relaxed">
              We may update this privacy policy from time to time. We will
              notify you of any material changes by posting the new policy on
              this page and updating the "Last Updated" date below.
            </p>
          </section>

          <section>
            <h2
              className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3"
              style={{ color: isDark ? "#f8fafc" : "#1e293b" }}
            >
              11. Contact Us
            </h2>
            <p className="mb-2 sm:mb-3 text-sm sm:text-base leading-relaxed">
              If you have questions about this privacy policy or your data,
              please contact us at:
            </p>
            <p className="text-sm sm:text-base leading-relaxed">
              <strong>Email:</strong> privacy@safepath.app
              <br />
              <strong>Address:</strong> TUD Grangegorman, Central Quad, Dublin, Ireland
            </p>
          </section>

          <div
            className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t"
            style={{ borderColor: isDark ? "#334155" : "#e5e7eb" }}
          >
            <p
              className="text-xs sm:text-sm"
              style={{ color: isDark ? "#94a3b8" : "#64748b" }}
            >
              Last Updated: November 30, 2025
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
