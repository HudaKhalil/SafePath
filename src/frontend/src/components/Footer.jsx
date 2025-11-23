'use client'

import Link from "next/link";
import { Github, Mail } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer 
      className="hidden md:block py-16"
      style={{ 
        backgroundColor: '#0f172a'
      }}
    >
      <div className="container mx-auto px-4 md:px-6 max-w-4xl">
        {/* Centered Layout */}
        <div className="flex flex-col items-center text-center space-y-8">
          
          {/* Social Links - Centered at top */}
          <div className="flex items-center justify-center gap-6">
            <a
              href="https://github.com/KaranJoseph12/SafePath.git"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub Repository"
              className="inline-flex items-center justify-center h-14 w-14 rounded-full transition-all"
              style={{ 
                backgroundColor: '#ffffff',
                color: '#0f172a'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#06d6a0';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.color = '#0f172a';
              }}
            >
              <Github className="h-7 w-7" />
            </a>
            
            <a
              href="mailto:support@safepath.app"
              aria-label="Email Support"
              className="inline-flex items-center justify-center h-14 w-14 rounded-full transition-all"
              style={{ 
                backgroundColor: '#ffffff',
                color: '#0f172a'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#06d6a0';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.color = '#0f172a';
              }}
            >
              <Mail className="h-7 w-7" />
            </a>
          </div>

          {/* Navigation Links - Horizontal centered */}
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link
              href="/privacy"
              className="text-lg transition-colors px-2"
              style={{ color: '#94a3b8' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#06d6a0'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-lg transition-colors px-2"
              style={{ color: '#94a3b8' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#06d6a0'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              Terms of Use
            </Link>
            <a
              href="mailto:support@safepath.app"
              className="text-lg transition-colors px-2"
              style={{ color: '#94a3b8' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#06d6a0'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              Support
            </a>
            <Link
              href="/about"
              className="text-lg transition-colors px-2"
              style={{ color: '#94a3b8' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#06d6a0'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              About
            </Link>
          </div>

          {/* Copyright - Centered at bottom */}
          <p className="text-sm" style={{ color: '#64748b' }}>
            © {currentYear} SafePath
          </p>
        </div>
      </div>
    </footer>
  );
}