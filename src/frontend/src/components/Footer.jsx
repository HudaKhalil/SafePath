'use client'

import Link from "next/link";
import { Github, Mail } from "lucide-react";
import { useState, useEffect } from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    return () => observer.disconnect();
  }, []);

  return (
    <footer 
      className="hidden md:block py-3"
      style={{ 
        backgroundColor: '#0f172a'
      }}
    >
      <div className="container mx-auto px-4 md:px-6 max-w-4xl">
        {/* Centered Layout */}
        <div className="flex flex-col items-center text-center space-y-2">
          
          {/* Social Links - Centered at top */}
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://github.com/KaranJoseph12/SafePath.git"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub Repository"
              className="inline-flex items-center justify-center h-10 w-10 rounded-full transition-all"
              style={{ 
                backgroundColor: isDark ? '#334155' : '#ffffff',
                color: isDark ? '#94a3b8' : '#0f172a'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#06d6a0';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#ffffff';
                e.currentTarget.style.color = isDark ? '#94a3b8' : '#0f172a';
              }}
            >
              <Github className="h-5 w-5" />
            </a>
            
            <a
              href="mailto:support@safepath.app"
              aria-label="Email Support"
              className="inline-flex items-center justify-center h-10 w-10 rounded-full transition-all"
              style={{ 
                backgroundColor: isDark ? '#334155' : '#ffffff',
                color: isDark ? '#94a3b8' : '#0f172a'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#06d6a0';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#ffffff';
                e.currentTarget.style.color = isDark ? '#94a3b8' : '#0f172a';
              }}
            >
              <Mail className="h-5 w-5" />
            </a>
          </div>

          {/* Navigation Links - Horizontal centered */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/privacy"
              className="text-sm transition-colors px-2"
              style={{ color: isDark ? '#06d6a0' : '#94a3b8' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#06d6a0'}
              onMouseLeave={(e) => e.currentTarget.style.color = isDark ? '#06d6a0' : '#94a3b8'}
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-sm transition-colors px-2"
              style={{ color: isDark ? '#06d6a0' : '#94a3b8' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#06d6a0'}
              onMouseLeave={(e) => e.currentTarget.style.color = isDark ? '#06d6a0' : '#94a3b8'}
            >
              Terms of Use
            </Link>
            <a
              href="mailto:support@safepath.app"
              className="text-sm transition-colors px-2"
              style={{ color: isDark ? '#06d6a0' : '#94a3b8' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#06d6a0'}
              onMouseLeave={(e) => e.currentTarget.style.color = isDark ? '#06d6a0' : '#94a3b8'}
            >
              Support
            </a>
            <Link
              href="/about"
              className="text-sm transition-colors px-2"
              style={{ color: isDark ? '#06d6a0' : '#94a3b8' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#06d6a0'}
              onMouseLeave={(e) => e.currentTarget.style.color = isDark ? '#06d6a0' : '#94a3b8'}
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