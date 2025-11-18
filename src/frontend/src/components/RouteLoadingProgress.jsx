'use client'

/**
 * RouteLoadingProgress Component
 * 
 * Shows step-by-step progress during route calculation
 * Provides transparency into the multi-step process
 */

export default function RouteLoadingProgress({ step = 1, total = 4, message = 'Processing...' }) {
  const progress = (step / total) * 100
  
  const steps = [
    { id: 1, label: 'Analyzing locations', icon: '📍' },
    { id: 2, label: 'Loading safety data', icon: '🛡️' },
    { id: 3, label: 'Calculating fastest route', icon: '⚡' },
    { id: 4, label: 'Calculating safest route', icon: '🛤️' }
  ]

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8">
        {/* Header with icon */}
        <div className="text-center mb-6">
          <div className="inline-block p-4 bg-accent/10 rounded-full mb-4 pulse-glow">
            <span className="text-4xl">🗺️</span>
          </div>
          <h3 className="text-xl font-bold text-gray-800">Finding Your Routes</h3>
          <p className="text-sm text-gray-600 mt-2">{message}</p>
        </div>
        
        {/* Progress bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-accent to-green-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            >
              <div className="shimmer h-full rounded-full opacity-40"></div>
            </div>
          </div>
          
          {/* Step counter */}
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-500">
              Step {step} of {total}
            </span>
            <span className="text-xs font-semibold text-accent">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
        
        {/* Step indicators */}
        <div className="space-y-2">
          {steps.map((s) => (
            <div 
              key={s.id}
              className={`
                flex items-center gap-3 p-2 rounded-lg transition-all duration-300
                ${s.id === step ? 'bg-accent/10 scale-105' : ''}
                ${s.id < step ? 'opacity-50' : ''}
                ${s.id > step ? 'opacity-30' : ''}
              `}
            >
              <span className="text-2xl">{s.icon}</span>
              <span className={`
                text-sm flex-1
                ${s.id === step ? 'font-semibold text-gray-800' : 'text-gray-600'}
              `}>
                {s.label}
              </span>
              {s.id < step && (
                <span className="text-green-500">✓</span>
              )}
              {s.id === step && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent"></div>
              )}
            </div>
          ))}
        </div>
        
        {/* Loading tip */}
        <div className="mt-6 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
          <p className="text-xs text-blue-800">
            💡 <strong>Tip:</strong> We analyze crime data, lighting, and traffic to find the safest path for you.
          </p>
        </div>
      </div>
    </div>
  )
}
