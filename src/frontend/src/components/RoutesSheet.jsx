'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, Maximize2, Minimize2, X } from 'lucide-react';

export default function RoutesSheet({
  children,
  title = "Plan Your Route",
  subtitle = "Find the safest path",
  initialExpanded = false,
  minHeight = 180, // collapsed height in px
  maxHeight: propMaxHeight = null, // allow override, defaults to 90% of screen
  settingsButton = null, // Optional settings button component
}) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentHeight, setCurrentHeight] = useState(minHeight);
  const [isDark, setIsDark] = useState(false);
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  const sheetRef = useRef(null);
  const contentRef = useRef(null);

  // Calculate maxHeight based on screen size (90% of viewport)
  const maxHeight = propMaxHeight || Math.min(windowHeight * 0.9, 800);
  // Leave space for navbar (approximately 70px) when in fullscreen
  const navbarHeight = 70;
  const fullScreenHeight = windowHeight - navbarHeight;

  // Update window height on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-expand when user scrolls down in content area
  const handleContentScroll = useCallback((e) => {
    const element = e.target;
    const scrollTop = element.scrollTop;
    
    // If user scrolls down and sheet is collapsed, expand it
    if (scrollTop > 10 && !isExpanded && !isFullScreen) {
      setIsExpanded(true);
    }
    
    // If user scrolls more and is at expanded state, go full screen
    if (scrollTop > 50 && isExpanded && !isFullScreen) {
      // Check if content needs more space (scrollHeight > visible height)
      const needsMoreSpace = element.scrollHeight > element.clientHeight + 100;
      if (needsMoreSpace) {
        setIsFullScreen(true);
      }
    }
  }, [isExpanded, isFullScreen]);

  // Auto-expand when user touches/clicks on content area while collapsed
  const handleContentInteraction = useCallback(() => {
    if (!isExpanded && !isFullScreen) {
      setIsExpanded(true);
    }
  }, [isExpanded, isFullScreen]);

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
    if (isFullScreen) {
      setCurrentHeight(fullScreenHeight);
    } else {
      setCurrentHeight(isExpanded ? maxHeight : minHeight);
    }
  }, [isExpanded, isFullScreen, minHeight, maxHeight, fullScreenHeight]);

  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const deltaY = startY - currentY;
    const effectiveMaxHeight = isFullScreen ? fullScreenHeight : maxHeight;
    const newHeight = Math.min(Math.max(currentHeight + deltaY, minHeight), fullScreenHeight);
    setCurrentHeight(newHeight);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    // Three-state snapping: collapsed, expanded, full screen
    const expandThreshold = (minHeight + maxHeight) / 2;
    const fullThreshold = (maxHeight + fullScreenHeight) / 2;
    
    if (currentHeight > fullThreshold) {
      setIsFullScreen(true);
      setIsExpanded(true);
      setCurrentHeight(fullScreenHeight);
    } else if (currentHeight > expandThreshold) {
      setIsFullScreen(false);
      setIsExpanded(true);
      setCurrentHeight(maxHeight);
    } else {
      setIsFullScreen(false);
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
    const newHeight = Math.min(Math.max(currentHeight + deltaY, minHeight), fullScreenHeight);
    setCurrentHeight(newHeight);
    setStartY(currentY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Three-state snapping: collapsed, expanded, full screen
    const expandThreshold = (minHeight + maxHeight) / 2;
    const fullThreshold = (maxHeight + fullScreenHeight) / 2;
    
    if (currentHeight > fullThreshold) {
      setIsFullScreen(true);
      setIsExpanded(true);
      setCurrentHeight(fullScreenHeight);
    } else if (currentHeight > expandThreshold) {
      setIsFullScreen(false);
      setIsExpanded(true);
      setCurrentHeight(maxHeight);
    } else {
      setIsFullScreen(false);
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
    if (isFullScreen) {
      // From fullscreen -> expanded
      setIsFullScreen(false);
      setIsExpanded(true);
    } else if (isExpanded) {
      // From expanded -> collapsed
      setIsExpanded(false);
    } else {
      // From collapsed -> expanded
      setIsExpanded(true);
    }
  };

  const toggleFullScreen = () => {
    if (isFullScreen) {
      setIsFullScreen(false);
      setIsExpanded(true);
    } else {
      setIsFullScreen(true);
      setIsExpanded(true);
    }
  };

  return (
    <div
      ref={sheetRef}
      className="fixed bottom-0 right-0 shadow-2xl transition-all duration-300 ease-out z-999"
      style={{
        height: `${currentHeight}px`,
        width: '100%',
        maxWidth: '480px',
        borderRadius: isFullScreen ? '0' : '24px 24px 0 0',
        background: isDark 
          ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' 
          : '#ffffff',
        borderTop: isFullScreen ? 'none' : (isDark ? '1px solid #334155' : '1px solid #e2e8f0'),
        borderLeft: isFullScreen ? 'none' : (isDark ? '1px solid #334155' : '1px solid #e2e8f0'),
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
                {isFullScreen ? (
                  <ChevronDown className="w-5 h-5" />
                ) : isExpanded ? (
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
          
          {/* Settings button (if provided) */}
          {settingsButton && (
            <div className="mr-2">
              {settingsButton}
            </div>
          )}
          
          {/* Full screen toggle button */}
          <button
            onClick={toggleFullScreen}
            className="p-2 rounded-lg transition-colors ml-2"
            style={{ 
              color: isDark ? '#94a3b8' : '#64748b',
              backgroundColor: isFullScreen ? (isDark ? '#334155' : '#e2e8f0') : 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#f1f5f9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isFullScreen ? (isDark ? '#334155' : '#e2e8f0') : 'transparent'}
            aria-label={isFullScreen ? 'Exit full screen' : 'Full screen'}
          >
            {isFullScreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>
          
          {/* Close/Collapse button - visible when expanded or fullscreen */}
          {(isExpanded || isFullScreen) && (
            <button
              onClick={() => {
                setIsFullScreen(false);
                setIsExpanded(false);
              }}
              className="p-2 rounded-lg transition-colors ml-1"
              style={{ 
                color: isDark ? '#94a3b8' : '#64748b',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              aria-label="Collapse panel"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div 
        ref={contentRef}
        className="px-4 pb-4 overflow-y-auto overflow-x-hidden"
        style={{
          height: `calc(${currentHeight}px - 80px)`, // Subtract header height
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
        }}
        onScroll={handleContentScroll}
        onTouchStart={handleContentInteraction}
        onMouseDown={handleContentInteraction}
      >
        {children}
      </div>
    </div>
  );
}
