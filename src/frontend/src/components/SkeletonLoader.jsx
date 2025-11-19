'use client'

/**
 * SkeletonLoader Component
 * 
 * Displays placeholder skeletons while content is loading
 * Mimics the layout of actual content with shimmer animation
 */

export function RouteCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 animate-fadeIn">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="shimmer h-6 w-32 rounded"></div>
        <div className="shimmer h-8 w-20 rounded-full"></div>
      </div>
      
      {/* Stats skeleton */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between">
          <div className="shimmer h-4 w-24 rounded"></div>
          <div className="shimmer h-4 w-16 rounded"></div>
        </div>
        <div className="flex justify-between">
          <div className="shimmer h-4 w-28 rounded"></div>
          <div className="shimmer h-4 w-20 rounded"></div>
        </div>
        <div className="flex justify-between">
          <div className="shimmer h-4 w-20 rounded"></div>
          <div className="shimmer h-4 w-24 rounded"></div>
        </div>
      </div>
      
      {/* Button skeleton */}
      <div className="shimmer h-12 w-full rounded-lg"></div>
    </div>
  )
}

export function HazardListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white/90 rounded-lg p-4 shadow-md animate-fadeIn" style={{ animationDelay: `${i * 0.1}s` }}>
          <div className="flex items-start gap-3">
            {/* Icon skeleton */}
            <div className="shimmer h-10 w-10 rounded-full flex-shrink-0"></div>
            
            <div className="flex-1 space-y-2">
              {/* Title skeleton */}
              <div className="shimmer h-5 w-3/4 rounded"></div>
              {/* Description skeleton */}
              <div className="shimmer h-4 w-full rounded"></div>
              <div className="shimmer h-4 w-2/3 rounded"></div>
              {/* Meta info skeleton */}
              <div className="flex gap-3 mt-2">
                <div className="shimmer h-3 w-20 rounded"></div>
                <div className="shimmer h-3 w-24 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function MapSkeleton() {
  return (
    <div className="w-full h-full bg-gray-100 rounded-lg relative overflow-hidden">
      <div className="shimmer absolute inset-0"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-gray-400 flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-accent"></div>
          <p className="text-sm">Loading map...</p>
        </div>
      </div>
    </div>
  )
}

export function ProfileStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white/90 rounded-lg p-4 shadow-md">
          <div className="shimmer h-4 w-20 rounded mb-2"></div>
          <div className="shimmer h-8 w-16 rounded"></div>
        </div>
      ))}
    </div>
  )
}

export default function SkeletonLoader({ type = 'route', count = 1 }) {
  const skeletonTypes = {
    route: RouteCardSkeleton,
    hazard: () => <HazardListSkeleton count={count} />,
    map: MapSkeleton,
    stats: ProfileStatsSkeleton
  }
  
  const SkeletonComponent = skeletonTypes[type] || RouteCardSkeleton
  
  if (type === 'route') {
    return (
      <div className="grid md:grid-cols-2 gap-6">
        {[...Array(count)].map((_, i) => (
          <SkeletonComponent key={i} />
        ))}
      </div>
    )
  }
  
  return <SkeletonComponent />
}
