const csvDataLoader = require('./csvDataLoader');

class RouteCalculator {
  constructor() {
    this.walkingSpeed = 5; // km/h
    this.cyclingSpeed = 15; // km/h
    this.drivingSpeed = 30; // km/h (urban)
    
    // OSRM routing endpoints - prioritize OSM.de infrastructure
    this.osrmEndpoints = {
      walking: [
        'https://routing.openstreetmap.de/routed-foot/route/v1/foot',
        'https://router.project-osrm.org/route/v1/foot'
      ],
      cycling: [
        'https://routing.openstreetmap.de/routed-bike/route/v1/bike',
        'https://router.project-osrm.org/route/v1/bike'
      ],
      driving: [
        'https://routing.openstreetmap.de/routed-car/route/v1/driving',
        'https://router.project-osrm.org/route/v1/driving'
      ]
    };
  }

  async calculateRoutes(fromLat, fromLon, toLat, toLon, mode = 'walking', userPreferences = null) {
    // Ensure crime data is loaded for safety scoring
    if (!csvDataLoader.isLoaded()) {
      await csvDataLoader.loadCrimeData();
    }

    // Get the pure OSRM route (fastest route - unchanged from OSM)
    const osrmRoute = await this.getOSRMRoute(fromLat, fromLon, toLat, toLon, mode);
    
    if (!osrmRoute.success) {
      // Fallback to straight line if OSRM fails
      return this.calculateStraightLineRoutes(fromLat, fromLon, toLat, toLon, mode);
    }

    // Fastest route = pure OSRM route with safety score added (no modification to path)
    const fastestRoute = this.createFastestRoute(osrmRoute, mode);
    
    // Safest route = try to find alternative route or modify path to avoid dangerous areas
    const safestRoute = await this.calculateSafestRoute(
      fromLat, fromLon, toLat, toLon, mode, osrmRoute
    );

    return {
      success: true,
      fastest: fastestRoute,
      safest: safestRoute,
      provider: 'osrm'
    };
  }

  /**
   * Creates the fastest route - pure OSRM route with safety score added
   * This is exactly the same as OSM/OSRM routing, just with safety metrics
   */
  createFastestRoute(osrmRoute, mode) {
    const coordinates = osrmRoute.coordinates;
    const distance = osrmRoute.distance / 1000; // Convert meters to km
    const duration = osrmRoute.duration / 60; // Convert seconds to minutes
    
    // Calculate safety score along the route (rule-based, from crime data)
    const safetyScore = this.calculateRouteSafetyScore(coordinates);
    
    // Convert safety score (0-1 where 0 is safest) to rating (0-10 where 10 is safest)
    const safetyRating = Math.max(0, Math.min(10, (1 - safetyScore) * 10));

    return {
      coordinates,
      distance: parseFloat(distance.toFixed(2)),
      time: parseFloat(duration.toFixed(1)),
      safetyScore: parseFloat(safetyScore.toFixed(3)),
      safetyRating: parseFloat(safetyRating.toFixed(1)),
      instructions: osrmRoute.instructions || [],
      type: 'fastest',
      mode: mode,
      provider: 'osrm',
      // This is the pure OSRM route - no path modifications
      isPureOSRM: true
    };
  }

  /**
   * Calculate safety score for a route based on crime data along the path
   * Returns a score from 0 (safest) to 1 (most dangerous)
   */
  calculateRouteSafetyScore(coordinates) {
    if (!coordinates || coordinates.length === 0) {
      return 0.5; // Default moderate safety
    }

    // Sample points along the route (every ~100m for performance)
    const samplePoints = this.sampleRoutePoints(coordinates, 0.1); // 0.1 km = 100m
    
    if (samplePoints.length === 0) {
      return 0.5;
    }

    // Get safety scores for each sampled point
    const safetyScores = samplePoints.map(coord => 
      csvDataLoader.getSafetyScoreForLocation(coord[0], coord[1])
    );
    
    // Calculate weighted average (give more weight to dangerous areas)
    const avgScore = safetyScores.reduce((a, b) => a + b, 0) / safetyScores.length;
    const maxScore = Math.max(...safetyScores);
    
    // Combined score: 70% average + 30% worst point (penalize routes through dangerous areas)
    const combinedScore = (avgScore * 0.7) + (maxScore * 0.3);
    
    return Math.min(1.0, combinedScore);
  }

  /**
   * Sample points along a route at regular intervals
   */
  sampleRoutePoints(coordinates, intervalKm) {
    if (coordinates.length <= 2) {
      return coordinates;
    }

    const sampled = [coordinates[0]];
    let accumulatedDistance = 0;

    for (let i = 1; i < coordinates.length; i++) {
      const dist = csvDataLoader.calculateDistance(
        coordinates[i-1][0], coordinates[i-1][1],
        coordinates[i][0], coordinates[i][1]
      );
      accumulatedDistance += dist;

      if (accumulatedDistance >= intervalKm) {
        sampled.push(coordinates[i]);
        accumulatedDistance = 0;
      }
    }

    // Always include the last point
    if (sampled[sampled.length - 1] !== coordinates[coordinates.length - 1]) {
      sampled.push(coordinates[coordinates.length - 1]);
    }

    return sampled;
  }

  async calculateSafestRoute(fromLat, fromLon, toLat, toLon, mode, originalRoute) {
    // Try to get alternative routes from OSRM
    try {
      const alternativeRoute = await this.getOSRMRoute(
        fromLat, fromLon, toLat, toLon, mode, true // request alternatives
      );

      if (alternativeRoute.success && alternativeRoute.coordinates) {
        const altSafetyScore = this.calculateRouteSafetyScore(alternativeRoute.coordinates);
        const originalSafetyScore = this.calculateRouteSafetyScore(originalRoute.coordinates);

        // Use the alternative if it's safer
        if (altSafetyScore < originalSafetyScore) {
          const distance = alternativeRoute.distance / 1000;
          const duration = alternativeRoute.duration / 60;
          const safetyRating = Math.max(0, Math.min(10, (1 - altSafetyScore) * 10));
          
          return {
            coordinates: alternativeRoute.coordinates,
            distance: parseFloat(distance.toFixed(2)),
            time: parseFloat(duration.toFixed(1)),
            safetyScore: parseFloat(altSafetyScore.toFixed(3)),
            safetyRating: parseFloat(safetyRating.toFixed(1)),
            instructions: alternativeRoute.instructions || [],
            type: 'safest',
            mode: mode,
            provider: 'osrm-alternative',
            isPureOSRM: true
          };
        }
      }
    } catch (error) {
      console.warn('Could not get alternative route:', error.message);
    }

    // If no better alternative found, return the original route as safest too
    // (with indication that no safer route was found)
    const safetyScore = this.calculateRouteSafetyScore(originalRoute.coordinates);
    const safetyRating = Math.max(0, Math.min(10, (1 - safetyScore) * 10));
    const distance = originalRoute.distance / 1000;
    const duration = originalRoute.duration / 60;

    return {
      coordinates: originalRoute.coordinates,
      distance: parseFloat(distance.toFixed(2)),
      time: parseFloat(duration.toFixed(1)),
      safetyScore: parseFloat(safetyScore.toFixed(3)),
      safetyRating: parseFloat(safetyRating.toFixed(1)),
      instructions: originalRoute.instructions || [],
      type: 'safest',
      mode: mode,
      provider: 'osrm',
      isPureOSRM: true,
      sameAsFastest: true // Indicates no safer alternative was found
    };
  }

  async getOSRMRoute(fromLat, fromLon, toLat, toLon, mode, requestAlternatives = false) {
    const endpoints = this.osrmEndpoints[mode] || this.osrmEndpoints.walking;
    const alternativeParam = requestAlternatives ? '&alternatives=true' : '';
    
    for (const baseUrl of endpoints) {
      try {
        const url = `${baseUrl}/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson&steps=true${alternativeParam}`;
        
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'SafePath/1.0'
          }
        });
        
        if (!response.ok) {
          continue; // Try next endpoint
        }
        
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          // If alternatives requested and available, use the second route (usually longer but potentially safer)
          const routeIndex = requestAlternatives && data.routes.length > 1 ? 1 : 0;
          const route = data.routes[routeIndex];
          
          return {
            success: true,
            coordinates: route.geometry.coordinates.map(coord => [coord[1], coord[0]]), // Convert [lon,lat] to [lat,lon]
            distance: route.distance, // in meters
            duration: route.duration, // in seconds
            instructions: route.legs[0]?.steps?.map(step => ({
              instruction: step.maneuver?.instruction || step.name || 'Continue',
              distance: step.distance,
              duration: step.duration,
              type: step.maneuver?.type,
              modifier: step.maneuver?.modifier
            })) || []
          };
        }
      } catch (error) {
        console.warn(`OSRM endpoint ${baseUrl} failed:`, error.message);
        continue; // Try next endpoint
      }
    }
    
    console.error('All OSRM endpoints failed');
    return { success: false };
  }

  calculateStraightLineRoutes(fromLat, fromLon, toLat, toLon, mode) {
    const distance = csvDataLoader.calculateDistance(fromLat, fromLon, toLat, toLon);
    const speed = this.getSpeedForMode(mode);
    const duration = (distance / speed) * 60; // minutes
    
    const coordinates = [[fromLat, fromLon], [toLat, toLon]];
    const safetyScore = this.calculateRouteSafetyScore(coordinates);
    const safetyRating = Math.max(0, Math.min(10, (1 - safetyScore) * 10));
    
    const routeData = {
      coordinates,
      distance: parseFloat(distance.toFixed(2)),
      time: parseFloat(duration.toFixed(1)),
      safetyScore: parseFloat(safetyScore.toFixed(3)),
      safetyRating: parseFloat(safetyRating.toFixed(1)),
      instructions: [{
        instruction: `Head directly to destination (${distance.toFixed(1)}km)`,
        distance: distance * 1000,
        duration: duration * 60
      }],
      mode: mode,
      fallback: true,
      isPureOSRM: false
    };
    
    return {
      success: true,
      fastest: { ...routeData, type: 'fastest' },
      safest: { ...routeData, type: 'safest' },
      provider: 'straight-line'
    };
  }

  getSpeedForMode(mode) {
    const speeds = {
      'walking': this.walkingSpeed,
      'cycling': this.cyclingSpeed,
      'driving': this.drivingSpeed
    };
    return speeds[mode] || this.walkingSpeed;
  }
}

const routeCalculator = new RouteCalculator();

module.exports = routeCalculator;
