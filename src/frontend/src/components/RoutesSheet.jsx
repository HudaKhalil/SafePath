'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, Maximize2, Minimize2, X } from 'lucide-react';

export default function RoutesSheet({
  children,
  title = "Plan Your Route",
  subtitle = "Find the safest path",
  initialExpanded = false,
  minHeight = 180,
  collapsedHeight: propCollapsedHeight = undefined,
  maxHeight: propMaxHeight = null,
  settingsButton = null,
  enableFullHeight = true,
  contentMinHeight = 260,
}) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const collapsedHeight = propCollapsedHeight ?? minHeight;
  const [currentHeight, setCurrentHeight] = useState(collapsedHeight);
  const [isDark, setIsDark] = useState(false);
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  const sheetRef = useRef(null);
  const headerRef = useRef(null);
  const contentRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(96);

  // Calculate maxHeight based on screen size (95% of viewport, no hard cap for better mobile scroll)
  // Account for bottom navbar (~70px) when calculating max heights
  const bottomNavbarHeight = 70;
  const topNavbarHeight = 220; // Main navbar + Navigation progress bar (104px + full bar height ~110px)
  const topPadding = 10; // Small gap from top navbar
  const maxHeight = propMaxHeight || Math.max(windowHeight - bottomNavbarHeight - topNavbarHeight - topPadding, minHeight);
  // Leave space for top navbar when in fullscreen
  const fullScreenHeight = enableFullHeight
    ? Math.max(windowHeight - topNavbarHeight - bottomNavbarHeight - topPadding, contentMinHeight)
    : maxHeight;

  const effectiveCollapsedHeight = Math.max(collapsedHeight, headerHeight + 8);

  const clampHeight = useCallback(
    (height) => {
      const upperBound = enableFullHeight ? fullScreenHeight : maxHeight;
      return Math.min(Math.max(height, effectiveCollapsedHeight), upperBound);
    },
    [enableFullHeight, fullScreenHeight, maxHeight, effectiveCollapsedHeight]
  );

  // Update window height on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Track header height to keep collapsed state tight
  useEffect(() => {
    if (!headerRef.current) return;

    const updateHeaderHeight = () => {
      const headerEl = headerRef.current;
      setHeaderHeight((headerEl && headerEl.offsetHeight) ? headerEl.offsetHeight : 96);
    };

    updateHeaderHeight();
    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(updateHeaderHeight);
    resizeObserver.observe(headerRef.current);

    return () => resizeObserver.disconnect();
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
    const nextHeight = isFullScreen
      ? fullScreenHeight
      : (isExpanded ? maxHeight : effectiveCollapsedHeight);
    setCurrentHeight(clampHeight(nextHeight));
  }, [isExpanded, isFullScreen, effectiveCollapsedHeight, maxHeight, fullScreenHeight, clampHeight]);

  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const deltaY = startY - currentY;
    const effectiveMaxHeight = isFullScreen && enableFullHeight ? fullScreenHeight : maxHeight;
    const unclamped = currentHeight + deltaY;
    const clamped = Math.min(Math.max(unclamped, minHeight), effectiveMaxHeight);
    setCurrentHeight(clamped);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    // Three-state snapping: collapsed, expanded, full screen
    const expandThreshold = (effectiveCollapsedHeight + maxHeight) / 2;
    const fullThreshold = enableFullHeight ? (maxHeight + fullScreenHeight) / 2 : Number.POSITIVE_INFINITY;
    
    if (enableFullHeight && currentHeight > fullThreshold) {
      setIsFullScreen(true);
      setIsExpanded(true);
      setCurrentHeight(clampHeight(fullScreenHeight));
    } else if (currentHeight > expandThreshold) {
      setIsFullScreen(false);
      setIsExpanded(true);
      setCurrentHeight(clampHeight(maxHeight));
    } else {
      setIsFullScreen(false);
      setIsExpanded(false);
      setCurrentHeight(clampHeight(effectiveCollapsedHeight));
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
    const effectiveMaxHeight = isFullScreen && enableFullHeight ? fullScreenHeight : maxHeight;
    const unclamped = currentHeight + deltaY;
    const clamped = Math.min(Math.max(unclamped, minHeight), effectiveMaxHeight);
    setCurrentHeight(clamped);
    setStartY(currentY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Three-state snapping: collapsed, expanded, full screen
    const expandThreshold = (effectiveCollapsedHeight + maxHeight) / 2;
    const fullThreshold = enableFullHeight ? (maxHeight + fullScreenHeight) / 2 : Number.POSITIVE_INFINITY;
    
    if (enableFullHeight && currentHeight > fullThreshold) {
      setIsFullScreen(true);
      setIsExpanded(true);
      setCurrentHeight(clampHeight(fullScreenHeight));
    } else if (currentHeight > expandThreshold) {
      setIsFullScreen(false);
      setIsExpanded(true);
      setCurrentHeight(clampHeight(maxHeight));
    } else {
      setIsFullScreen(false);
      setIsExpanded(false);
      setCurrentHeight(clampHeight(effectiveCollapsedHeight));
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

  useEffect(() => {
    if (!enableFullHeight && isFullScreen) {
      setIsFullScreen(false);
      setCurrentHeight(clampHeight(isExpanded ? maxHeight : effectiveCollapsedHeight));
    }
  }, [enableFullHeight, isFullScreen, clampHeight, maxHeight, effectiveCollapsedHeight, isExpanded]);

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
    if (!enableFullHeight) {
      setIsExpanded(true);
      setCurrentHeight(clampHeight(maxHeight));
      return;
    }

    if (isFullScreen) {
      setIsFullScreen(false);
      setIsExpanded(true);
      setCurrentHeight(clampHeight(maxHeight));
    } else {
      setIsFullScreen(true);
      setIsExpanded(true);
      setCurrentHeight(clampHeight(fullScreenHeight));
    }
  };

  return (
    <div
      ref={sheetRef}
      className="fixed shadow-2xl transition-all duration-300 ease-out z-999"
      style={{
        height: `${currentHeight}px`,
        width: '100%',
        maxWidth: '480px',
        // When fullscreen, position from top (below navbar). Otherwise, position from bottom (above bottom navbar)
        ...(isFullScreen ? {
          top: `${topNavbarHeight}px`,
          bottom: `${bottomNavbarHeight}px`,
          right: 0,
        } : {
          bottom: `${bottomNavbarHeight}px`,
          right: 0,
        }),
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
        ref={headerRef}
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
        <div className="px-4 pt-2 md:pt-0 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSheet}
                className="p-1 rounded transition-colors"
                style={{ color: isDark ? '#06d6a0' : '#64748b' }}
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
                className="text-2xl md:text-3xl font-bold transition-colors cursor-pointer" 
                style={typeof title === 'string' ? { color: isDark ? '#06d6a0' : '#1e293b' } : {}}
                onMouseEnter={(e) => {
                  if (typeof title === 'string') {
                    e.currentTarget.style.color = '#06d6a0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (typeof title === 'string') {
                    e.currentTarget.style.color = isDark ? '#06d6a0' : '#1e293b';
                  }
                }}
              >
                {title}
              </h2>
            </div>
            <p className="text-lg ml-8" style={{ color: isDark ? '#06d6a0' : '#64748b' }}>{subtitle}</p>
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
              color: isDark ? '#06d6a0' : '#64748b',
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
                color: isDark ? '#06d6a0' : '#64748b',
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
        className="px-4 pb-6 overflow-y-auto overflow-x-hidden"
        style={{
          display: (isExpanded || isFullScreen) ? 'block' : 'none',
          height: `${Math.max(currentHeight - headerHeight, 0)}px`,
          minHeight: `${Math.max(contentMinHeight - headerHeight, 160)}px`,
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          paddingTop: (isExpanded || isFullScreen) ? undefined : 0,
          paddingBottom: (isExpanded || isFullScreen) ? undefined : 0,
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
