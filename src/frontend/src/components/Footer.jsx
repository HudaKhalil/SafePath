'use client'

import Link from "next/link";
import { Github } from "lucide-react";

export default function Footer() {
  return (
    // footer bg- fixed color for both modes
    <footer 
      className="py-12"
      style={{ 
        backgroundColor: '#0f172a', // FIXED: Dark blue background
        color: '#f8fafc' // FIXED: White text
      }}
    >
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="SafePath Logo"
                  className="w-10 h-10 object-contain"
                />
              </div>
              {/* LOGO TEXT - FIXED WHITE */}
              <div 
                className="font-bold text-lg"
                style={{ color: '#f8fafc' }}
              >
                SafePath
              </div>
            </div>
            {/* DESCRIPTION - FIXED GRAY */}
            <p 
              className="text-sm leading-relaxed max-w-md"
              style={{ color: '#94a3b8' }}
            >
              Empowering safer journeys through intelligent routing, community
              insights, and real-time hazard awareness.
            </p>
            <div className="flex items-center gap-4 mt-6">
              {/* GITHUB ICON - FIXED COLORS WITH HOVER */}
              <a
                href="https://github.com/KaranJoseph12/SafePath.git"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="inline-flex items-center justify-center h-10 w-10 rounded-full
                focus:outline-none focus:ring-2 transition"
                style={{ 
                  color: '#94a3b8',
                  focusRingColor: 'rgba(6, 214, 160, 0.4)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#06d6a0'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            {/* SECTION HEADING - FIXED WHITE */}
            <h4 
              className="font-semibold mb-4"
              style={{ color: '#f8fafc' }}
            >
              Quick Links
            </h4>
            <div className="space-y-3">
              {/* FOOTER LINKS - FIXED GRAY WITH ACCENT HOVER */}
              <Link
                href="/suggested-routes"
                className="block text-sm transition-colors footer-link"
              >
                Suggested Routes
              </Link>
              <Link
                href="/hazard-reporting"
                className="block text-sm transition-colors footer-link"
              >
                Report Hazard
              </Link>
              <Link
                href="/find-buddy"
                className="block text-sm transition-colors footer-link"
              >
                Find Buddy
              </Link>
              <Link
                href="#"
                className="block text-sm transition-colors footer-link"
              >
                Safety Tips
              </Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            {/* SECTION HEADING - FIXED WHITE */}
            <h4 
              className="font-semibold mb-4"
              style={{ color: '#f8fafc' }}
            >
              Legal
            </h4>
            <div className="space-y-3">
              {/* FOOTER LINKS - FIXED GRAY WITH ACCENT HOVER */}
              <Link
                href="#"
                className="block text-sm transition-colors footer-link"
              >
                Privacy Policy
              </Link>
              <Link
                href="#"
                className="block text-sm transition-colors footer-link"
              >
                Terms of Service
              </Link>
              <Link
                href="#"
                className="block text-sm transition-colors footer-link"
              >
                Contact Us
              </Link>
              <Link
                href="#"
                className="block text-sm transition-colors footer-link"
              >
                Support
              </Link>
            </div>
          </div>
        </div>
      </div>

    </footer>
  );
}