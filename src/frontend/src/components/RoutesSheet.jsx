'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function RoutesSheet({
  children,
  title = "Plan Your Route",
  subtitle = "Find the safest path",
  initialExpanded = false,
  minHeight = 200, // collapsed height in px
  maxHeight = 550, // expanded height in px
}) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentHeight, setCurrentHeight] = useState(minHeight);
  const [isDark, setIsDark] = useState(false);
  const sheetRef = useRef(null);

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

  useEffect(() => {
    setCurrentHeight(isExpanded ? maxHeight : minHeight);
  }, [isExpanded, minHeight, maxHeight]);

  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const deltaY = startY - currentY;
    const newHeight = Math.min(Math.max(currentHeight + deltaY, minHeight), maxHeight);
    setCurrentHeight(newHeight);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    // Snap to closest state
    const midPoint = (minHeight + maxHeight) / 2;
    if (currentHeight > midPoint) {
      setIsExpanded(true);
      setCurrentHeight(maxHeight);
    } else {
      setIsExpanded(false);
      setCurrentHeight(minHeight);
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartY(e.clientY);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const currentY = e.clientY;
    const deltaY = startY - currentY;
    const newHeight = Math.min(Math.max(currentHeight + deltaY, minHeight), maxHeight);
    setCurrentHeight(newHeight);
    setStartY(currentY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Snap to closest state
    const midPoint = (minHeight + maxHeight) / 2;
    if (currentHeight > midPoint) {
      setIsExpanded(true);
      setCurrentHeight(maxHeight);
    } else {
      setIsExpanded(false);
      setCurrentHeight(minHeight);
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, currentHeight]);

  const toggleSheet = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      ref={sheetRef}
      className="fixed bottom-0 right-0 rounded-t-3xl shadow-2xl transition-all duration-300 ease-out z-999"
      style={{
        height: `${currentHeight}px`,
        width: '100%',
        maxWidth: '480px',
        background: isDark 
          ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' 
          : '#ffffff',
        borderTop: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
        borderLeft: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
      }}
    >
      {/* Drag Handle */}
      <div
        className="w-full py-3 cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {/* Handle bar */}
        <div className="w-12 h-1 rounded-full mx-auto mb-2" style={{ 
          backgroundColor: isDark ? '#475569' : '#cbd5e1' 
        }}></div>
        
        {/* Header row */}
        <div className="px-4 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSheet}
                className="p-1 rounded transition-colors"
                style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#f1f5f9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronUp className="w-5 h-5" />
                )}
              </button>
              <h2 
                className="text-base md:text-lg font-bold transition-colors cursor-pointer" 
                style={{ color: isDark ? '#f8fafc' : '#1e293b' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#06d6a0'}
                onMouseLeave={(e) => e.currentTarget.style.color = isDark ? '#f8fafc' : '#1e293b'}
              >
                {title}
              </h2>
            </div>
            <p className="text-xs ml-8" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div 
        className="px-4 pb-4 overflow-y-auto overflow-x-hidden"
        style={{
          height: `calc(${currentHeight}px - 80px)`, // Subtract header height
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {children}
      </div>
    </div>
  );
}
