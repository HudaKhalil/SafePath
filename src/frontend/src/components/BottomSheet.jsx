'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function BottomSheet({
  children,
  buddyCount = 12,
  sortText = "Sorted by best route match",
  initialExpanded = false,
  minHeight = 180, // collapsed height in px
  maxHeight = 500, // expanded height in px
}) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentHeight, setCurrentHeight] = useState(minHeight);
  const sheetRef = useRef(null);

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
      className="fixed bottom-0 right-0 backdrop-blur-md rounded-t-3xl shadow-2xl transition-all duration-300 ease-out z-[999]"
      style={{
        height: `${currentHeight}px`,
        width: '100%',
        maxWidth: '480px',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
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
        <div className="w-12 h-1 rounded-full mx-auto mb-2" style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}></div>
        
        {/* Header row */}
        <div className="px-4 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSheet}
                className="p-1 rounded transition-colors"
                style={{ color: '#94a3b8' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
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
                style={{ color: '#f8fafc' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#06d6a0'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#f8fafc'}
              >
                Buddies nearby ({buddyCount})
              </h2>
            </div>
            <p className="text-xs ml-8" style={{ color: '#94a3b8' }}>{sortText}</p>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div 
        className="px-4 overflow-y-auto"
        style={{
          height: `calc(${currentHeight}px - 80px)`, // Subtract header height
        }}
      >
        {children}
      </div>
    </div>
  );
}
