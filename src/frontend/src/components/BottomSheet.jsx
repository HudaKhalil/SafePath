'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function BottomSheet({
  children,
  buddyCount = 12,
  sortText = "Sorted by best route match",
  initialExpanded = false,
  minHeight = 180,
  maxHeight = 500,
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
      className="fixed bottom-0 left-0 right-0 backdrop-blur-md border-t rounded-t-3xl shadow-2xl transition-all duration-300 ease-out z-[999]"
      style={{
        height: `${currentHeight}px`,
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)'
      }}
    >
     
      <div
        className="w-full py-3 cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {/* Handle bar */}
        <div className="w-12 h-1 rounded-full mx-auto mb-2" style={{
          backgroundColor: 'var(--border-color)',
          opacity: 0.5
        }}></div>
        
        {/* Header row */}
        <div className="px-4 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSheet}
                className="p-1 rounded transition-all hover:opacity-70"
                style={{ backgroundColor: 'var(--bg-icon)' }}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
                ) : (
                  <ChevronUp className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
                )}
              </button>
              <h2 className="text-base md:text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Buddies nearby ({buddyCount})
              </h2>
            </div>
            <p className="text-xs ml-8" style={{ color: 'var(--color-text-secondary)' }}>{sortText}</p>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div 
        className="px-4 overflow-y-auto"
        style={{
          height: `calc(${currentHeight}px - 80px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}