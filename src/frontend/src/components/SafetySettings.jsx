'use client';

import { useState, useEffect } from 'react';
import { Settings, ChevronLeft, RotateCcw, Shield, AlertTriangle, Moon, Bike } from 'lucide-react';

// Preset Icon Components matching app theme
const PresetIcon = ({ type, isSelected, isDark }) => {
  const activeColor = '#0f172a';
  const inactiveColor = isDark ? '#cbd5e1' : '#64748b';
  const color = isSelected ? activeColor : inactiveColor;
  
  const icons = {
    balanced: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M12 3v18M3 12h18M7.5 7.5l9 9M16.5 7.5l-9 9"/>
      </svg>
    ),
    crime: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="M12 8v4M12 16h.01"/>
      </svg>
    ),
    night: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    ),
    cyclist: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="18.5" cy="17.5" r="3.5"/>
        <circle cx="5.5" cy="17.5" r="3.5"/>
        <circle cx="15" cy="5" r="1"/>
        <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
      </svg>
    ),
    custom: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    )
  };
  
  return icons[type] || icons.balanced;
};

// Safety presets with factor weights
const SAFETY_PRESETS = {
  balanced: {
    id: 'balanced',
    name: 'Balanced',
    iconType: 'balanced',
    description: 'Equal consideration of all safety factors',
    weights: { crime: 0.40, lighting: 0.20, collision: 0.25, hazard: 0.15 }
  },
  crime: {
    id: 'crime',
    name: 'Crime Aware',
    iconType: 'crime',
    description: 'Prioritize avoiding high-crime areas',
    weights: { crime: 0.60, lighting: 0.15, collision: 0.15, hazard: 0.10 }
  },
  night: {
    id: 'night',
    name: 'Night Walker',
    iconType: 'night',
    description: 'Focus on well-lit streets',
    weights: { crime: 0.30, lighting: 0.40, collision: 0.20, hazard: 0.10 }
  },
  cyclist: {
    id: 'cyclist',
    name: 'Cyclist Safety',
    iconType: 'cyclist',
    description: 'Avoid traffic collision hotspots',
    weights: { crime: 0.25, lighting: 0.15, collision: 0.45, hazard: 0.15 }
  }
};

const STORAGE_KEY = 'safepath_safety_preferences';

// Load preferences from localStorage
const loadPreferences = () => {
  if (typeof window === 'undefined') return { preset: 'balanced', customWeights: null };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { preset: 'balanced', customWeights: null };
  } catch {
    return { preset: 'balanced', customWeights: null };
  }
};

// Save preferences to localStorage
const savePreferences = (prefs) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn('Failed to save safety preferences:', e);
  }
};

// Get current factor weights based on preferences
export const getSafetyWeights = () => {
  const prefs = loadPreferences();
  if (prefs.customWeights) {
    return prefs.customWeights;
  }
  return SAFETY_PRESETS[prefs.preset]?.weights || SAFETY_PRESETS.balanced.weights;
};

// Get current preset ID
export const getCurrentPreset = () => {
  const prefs = loadPreferences();
  return prefs.preset;
};

// Get current preset display name
export const getPresetName = (presetId) => {
  if (presetId === 'custom') return 'Custom';
  return SAFETY_PRESETS[presetId]?.name || 'Balanced';
};

export default function SafetySettings({ isOpen, onClose, isDark, onSettingsChange }) {
  const [selectedPreset, setSelectedPreset] = useState('balanced');
  const [showCustom, setShowCustom] = useState(false);
  const [customWeights, setCustomWeights] = useState({
    crime: 40,
    lighting: 20,
    collision: 25,
    hazard: 15
  });

  // Load saved preferences on mount
  useEffect(() => {
    const prefs = loadPreferences();
    setSelectedPreset(prefs.preset);
    if (prefs.customWeights) {
      setCustomWeights({
        crime: Math.round(prefs.customWeights.crime * 100),
        lighting: Math.round(prefs.customWeights.lighting * 100),
        collision: Math.round(prefs.customWeights.collision * 100),
        hazard: Math.round(prefs.customWeights.hazard * 100)
      });
      setShowCustom(true);
    }
  }, [isOpen]);

  const handlePresetSelect = (presetId) => {
    setSelectedPreset(presetId);
    setShowCustom(false);
    const prefs = { preset: presetId, customWeights: null };
    savePreferences(prefs);
    onSettingsChange?.(SAFETY_PRESETS[presetId].weights, presetId);
  };

  const handleCustomWeightChange = (factor, value) => {
    const newWeights = { ...customWeights, [factor]: parseInt(value) };
    setCustomWeights(newWeights);
  };

  const applyCustomWeights = () => {
    // Normalize to sum to 100
    const total = customWeights.crime + customWeights.lighting + customWeights.collision + customWeights.hazard;
    const normalized = {
      crime: customWeights.crime / total,
      lighting: customWeights.lighting / total,
      collision: customWeights.collision / total,
      hazard: customWeights.hazard / total
    };
    
    const prefs = { preset: 'custom', customWeights: normalized };
    savePreferences(prefs);
    setSelectedPreset('custom');
    onSettingsChange?.(normalized, 'custom');
    onClose?.();
  };

  const resetToDefault = () => {
    setSelectedPreset('balanced');
    setShowCustom(false);
    setCustomWeights({ crime: 40, lighting: 20, collision: 25, hazard: 15 });
    const prefs = { preset: 'balanced', customWeights: null };
    savePreferences(prefs);
    onSettingsChange?.(SAFETY_PRESETS.balanced.weights, 'balanced');
  };

  if (!isOpen) return null;

  const currentTotal = customWeights.crime + customWeights.lighting + customWeights.collision + customWeights.hazard;

  return (
    <div 
      className="absolute inset-0 z-50 flex flex-col"
      style={{ 
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center gap-3 p-4 border-b shrink-0"
        style={{ borderColor: isDark ? '#334155' : '#e5e7eb' }}
      >
        <button
          onClick={onClose}
          className="p-2 rounded-lg transition-colors"
          style={{ 
            backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
            color: isDark ? '#f8fafc' : '#0f172a'
          }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h3 className="font-bold text-lg" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
            Safety Settings
          </h3>
          <p className="text-xs" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
            Customize how routes are scored
          </p>
        </div>
        <button
          onClick={resetToDefault}
          className="p-2 rounded-lg transition-colors"
          style={{ 
            backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
            color: isDark ? '#94a3b8' : '#64748b'
          }}
          title="Reset to default"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Preset Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
            Quick Presets
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(SAFETY_PRESETS).map((preset) => {
              const isSelected = selectedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)}
                  className="p-3 rounded-xl text-left transition-all duration-200 border-2"
                  style={{
                    backgroundColor: isSelected 
                      ? (isDark ? 'rgba(6, 214, 160, 0.15)' : 'rgba(6, 214, 160, 0.1)')
                      : (isDark ? '#1e293b' : '#f8fafc'),
                    borderColor: isSelected ? '#06d6a0' : (isDark ? '#334155' : '#e5e7eb'),
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
                      style={{
                        backgroundColor: isSelected ? '#06d6a0' : (isDark ? '#475569' : '#e2e8f0'),
                        border: isDark && !isSelected ? '1px solid #64748b' : 'none'
                      }}
                    >
                      <PresetIcon type={preset.iconType} isSelected={isSelected} isDark={isDark} />
                    </div>
                    <span 
                      className="font-semibold text-sm"
                      style={{ color: isDark ? '#f8fafc' : '#0f172a' }}
                    >
                      {preset.name}
                    </span>
                  </div>
                  <p 
                    className="text-xs line-clamp-2 ml-10"
                    style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                  >
                    {preset.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ backgroundColor: isDark ? '#334155' : '#e5e7eb' }}></div>
          <span className="text-xs font-medium" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>or</span>
          <div className="flex-1 h-px" style={{ backgroundColor: isDark ? '#334155' : '#e5e7eb' }}></div>
        </div>

        {/* Custom Weights Toggle */}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className="w-full p-3 rounded-xl text-left transition-all duration-200 border-2 flex items-center justify-between"
          style={{
            backgroundColor: showCustom 
              ? (isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)')
              : (isDark ? '#1e293b' : '#f8fafc'),
            borderColor: showCustom ? '#3b82f6' : (isDark ? '#334155' : '#e5e7eb'),
          }}
        >
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
              style={{
                backgroundColor: showCustom ? '#3b82f6' : (isDark ? '#475569' : '#e2e8f0'),
                border: isDark && !showCustom ? '1px solid #64748b' : 'none'
              }}
            >
              <PresetIcon type="custom" isSelected={showCustom} isDark={isDark} />
            </div>
            <div>
              <span 
                className="font-semibold text-sm block"
                style={{ color: isDark ? '#f8fafc' : '#0f172a' }}
              >
                Custom Weights
              </span>
              <span 
                className="text-xs"
                style={{ color: isDark ? '#94a3b8' : '#64748b' }}
              >
                Fine-tune each safety factor
              </span>
            </div>
          </div>
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke={isDark ? '#94a3b8' : '#64748b'} 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="w-5 h-5 transition-transform duration-200"
            style={{ transform: showCustom ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {/* Custom Sliders */}
        {showCustom && (
          <div 
            className="p-4 rounded-xl space-y-4"
            style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }}
          >
            {/* Crime Weight */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium flex items-center gap-2" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#ef4444' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      <path d="M12 8v4M12 16h.01"/>
                    </svg>
                  </div>
                  Crime Rate
                </span>
                <span 
                  className="text-sm font-bold px-2 py-0.5 rounded"
                  style={{ 
                    backgroundColor: '#ef4444',
                    color: '#ffffff'
                  }}
                >
                  {customWeights.crime}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={customWeights.crime}
                onChange={(e) => handleCustomWeightChange('crime', e.target.value)}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${customWeights.crime}%, ${isDark ? '#475569' : '#cbd5e1'} ${customWeights.crime}%, ${isDark ? '#475569' : '#cbd5e1'} 100%)`
                }}
              />
            </div>

            {/* Lighting Weight */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium flex items-center gap-2" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#eab308' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <path d="M9 18h6M10 22h4M12 2v1M4.22 4.22l.77.77M1 12h1M4.22 19.78l.77-.77M12 21v1M19.78 19.78l-.77-.77M23 12h-1M19.78 4.22l-.77.77"/>
                      <circle cx="12" cy="12" r="5"/>
                    </svg>
                  </div>
                  Street Lighting
                </span>
                <span 
                  className="text-sm font-bold px-2 py-0.5 rounded"
                  style={{ 
                    backgroundColor: '#eab308',
                    color: '#0f172a'
                  }}
                >
                  {customWeights.lighting}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={customWeights.lighting}
                onChange={(e) => handleCustomWeightChange('lighting', e.target.value)}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #eab308 0%, #eab308 ${customWeights.lighting}%, ${isDark ? '#475569' : '#cbd5e1'} ${customWeights.lighting}%, ${isDark ? '#475569' : '#cbd5e1'} 100%)`
                }}
              />
            </div>

            {/* Collision Weight */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium flex items-center gap-2" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#3b82f6' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                      <circle cx="7" cy="17" r="2"/>
                      <circle cx="17" cy="17" r="2"/>
                    </svg>
                  </div>
                  Traffic Collisions
                </span>
                <span 
                  className="text-sm font-bold px-2 py-0.5 rounded"
                  style={{ 
                    backgroundColor: '#3b82f6',
                    color: '#ffffff'
                  }}
                >
                  {customWeights.collision}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={customWeights.collision}
                onChange={(e) => handleCustomWeightChange('collision', e.target.value)}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${customWeights.collision}%, ${isDark ? '#475569' : '#cbd5e1'} ${customWeights.collision}%, ${isDark ? '#475569' : '#cbd5e1'} 100%)`
                }}
              />
            </div>

            {/* Hazard Weight */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium flex items-center gap-2" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#f97316' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                      <path d="M12 9v4M12 17h.01"/>
                    </svg>
                  </div>
                  Reported Hazards
                </span>
                <span 
                  className="text-sm font-bold px-2 py-0.5 rounded"
                  style={{ 
                    backgroundColor: '#f97316',
                    color: '#ffffff'
                  }}
                >
                  {customWeights.hazard}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={customWeights.hazard}
                onChange={(e) => handleCustomWeightChange('hazard', e.target.value)}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #f97316 0%, #f97316 ${customWeights.hazard}%, ${isDark ? '#475569' : '#cbd5e1'} ${customWeights.hazard}%, ${isDark ? '#475569' : '#cbd5e1'} 100%)`
                }}
              />
            </div>

            {/* Total indicator */}
            <div 
              className="p-3 rounded-lg flex items-center justify-between"
              style={{ 
                backgroundColor: currentTotal === 100 
                  ? (isDark ? 'rgba(6, 214, 160, 0.2)' : 'rgba(6, 214, 160, 0.15)')
                  : (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)'),
                border: `1px solid ${currentTotal === 100 ? '#06d6a0' : '#ef4444'}`
              }}
            >
              <span className="text-sm" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                Total Weight
              </span>
              <span 
                className="font-bold"
                style={{ color: currentTotal === 100 ? '#06d6a0' : '#ef4444' }}
              >
                {currentTotal}% {currentTotal !== 100 && '(will be normalized)'}
              </span>
            </div>

            {/* Apply Button */}
            <button
              onClick={applyCustomWeights}
              className="w-full py-3 rounded-xl font-bold transition-all duration-200"
              style={{
                backgroundColor: '#06d6a0',
                color: '#0f172a'
              }}
            >
              Apply Custom Weights
            </button>
          </div>
        )}

        {/* Current Settings Display */}
        <div 
          className="p-3 rounded-xl"
          style={{ 
            backgroundColor: isDark ? 'rgba(6, 214, 160, 0.1)' : 'rgba(6, 214, 160, 0.05)',
            border: `1px solid ${isDark ? '#065f46' : '#a7f3d0'}`
          }}
        >
          <p className="text-xs font-medium mb-2 flex items-center gap-1" style={{ color: '#06d6a0' }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Active Settings
          </p>
          <p className="text-sm" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
            {selectedPreset === 'custom' 
              ? 'Custom weights applied'
              : `Using "${SAFETY_PRESETS[selectedPreset]?.name || 'Balanced'}" preset`
            }
          </p>
        </div>
      </div>
    </div>
  );
}

// Settings Button Component (to use in the route panel)
export function SafetySettingsButton({ onClick, isDark, currentPreset: externalPreset }) {
  const [currentPreset, setCurrentPreset] = useState('balanced');

  useEffect(() => {
    // If external preset is provided, use it; otherwise load from storage
    if (externalPreset) {
      setCurrentPreset(externalPreset);
    } else {
      const prefs = loadPreferences();
      setCurrentPreset(prefs.preset);
    }
  }, [externalPreset]);

  const preset = SAFETY_PRESETS[currentPreset];
  const displayName = currentPreset === 'custom' ? 'Custom' : (preset?.name || 'Balanced');
  const iconType = currentPreset === 'custom' ? 'custom' : (preset?.iconType || 'balanced');

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 border"
      style={{
        backgroundColor: isDark ? '#1e293b' : '#f8fafc',
        borderColor: isDark ? '#334155' : '#e5e7eb',
        color: isDark ? '#f8fafc' : '#0f172a'
      }}
      title="Safety Settings"
    >
      <div 
        className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200"
        style={{
          backgroundColor: isDark ? 'rgba(6, 214, 160, 0.15)' : 'rgba(15, 23, 42, 0.1)',
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke={isDark ? '#06d6a0' : '#0f172a'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </div>
      <span className="text-sm font-medium">
        {displayName}
      </span>
    </button>
  );
}
