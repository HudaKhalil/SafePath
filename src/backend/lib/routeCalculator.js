const csvDataLoader = require('./csvDataLoader');

class RouteCalculator {
  constructor() {
    this.walkingSpeed = 5; // km/h
    this.cyclingSpeed = 15; // km/h
    this.drivingSpeed = 30; // km/h (urban)
  }

  async calculateRoutes(fromLat, fromLon, toLat, toLon, mode = 'walking') {
    // Ensure crime data is loaded
    if (!csvDataLoader.isLoaded()) {
      await csvDataLoader.loadCrimeData();
    }

    // Get OSRM route for road network
    const osrmRoute = await this.getOSRMRoute(fromLat, fromLon, toLat, toLon, mode);
    
    if (!osrmRoute.success) {
      // Fallback to straight line
      return this.calculateStraightLineRoutes(fromLat, fromLon, toLat, toLon, mode);
    }

    // Calculate fastest route (minimal modifications to OSRM route)
    const fastestRoute = this.calculateFastestRoute(osrmRoute, mode);
    
    // Calculate safest route (optimize for safety score)
    const safestRoute = await this.calculateSafestRoute(
      fromLat, fromLon, toLat, toLon, mode, osrmRoute
    );

    return {
      success: true,
      fastest: fastestRoute,
      safest: safestRoute,
      provider: 'osrm+safety'
    };
  }

  calculateFastestRoute(osrmRoute, mode) {
    const coordinates = osrmRoute.coordinates;
    const distance = osrmRoute.distance / 1000; // Convert to km
    const duration = osrmRoute.duration / 60; // Convert to minutes
    
    // Calculate average safety score along the route
    const safetyScores = coordinates.map(coord => 
      csvDataLoader.getSafetyScoreForLocation(coord[0], coord[1])
    );
    const avgSafetyScore = safetyScores.reduce((a, b) => a + b, 0) / safetyScores.length;

    return {
      coordinates,
      distance: parseFloat(distance.toFixed(2)),
      time: parseFloat(duration.toFixed(1)),
      safetyScore: parseFloat(avgSafetyScore.toFixed(2)),
      instructions: osrmRoute.instructions || [],
      type: 'fastest'
    };
  }

  async calculateSafestRoute(fromLat, fromLon, toLat, toLon, mode, originalRoute) {
    // Get alternative routes or modify the original route to avoid high-crime areas
    try {
      // Try to get alternative route from OSRM
      const alternativeRoute = await this.getOSRMRoute(
        fromLat, fromLon, toLat, toLon, mode, true
      );

      if (alternativeRoute.success && alternativeRoute.coordinates) {
        const safetyScores = alternativeRoute.coordinates.map(coord =>
          csvDataLoader.getSafetyScoreForLocation(coord[0], coord[1])
        );
        const avgSafetyScore = safetyScores.reduce((a, b) => a + b, 0) / safetyScores.length;

        // Compare with original route
        const originalSafetyScores = originalRoute.coordinates.map(coord =>
          csvDataLoader.getSafetyScoreForLocation(coord[0], coord[1])
        );
        const originalAvgSafety = originalSafetyScores.reduce((a, b) => a + b, 0) / originalSafetyScores.length;

        // Use the safer route
        if (avgSafetyScore < originalAvgSafety) {
          const distance = alternativeRoute.distance / 1000;
          const duration = alternativeRoute.duration / 60;
          
          return {
            coordinates: alternativeRoute.coordinates,
            distance: parseFloat(distance.toFixed(2)),
            time: parseFloat(duration.toFixed(1)),
            safetyScore: parseFloat(avgSafetyScore.toFixed(2)),
            instructions: alternativeRoute.instructions || [],
            type: 'safest'
          };
        }
      }
    } catch (error) {
      console.warn('Could not get alternative route:', error.message);
    }

    // If no better alternative, create a modified route
    // For simplicity, use a route that goes around high-crime areas
    const modifiedRoute = this.createSafestPath(fromLat, fromLon, toLat, toLon, mode);
    return modifiedRoute;
  }

  createSafestPath(fromLat, fromLon, toLat, toLon, mode) {
    // Create a path that avoids high-crime areas
    // This is a simplified A* approach using safety grid
    
    const path = [];
    const gridSize = csvDataLoader.gridSize;
    
    // Create waypoints that navigate around dangerous areas
    const midLat = (fromLat + toLat) / 2;
    const midLon = (fromLon + toLon) / 2;
    
    // Check if middle point is safe
    const midSafety = csvDataLoader.getSafetyScoreForLocation(midLat, midLon);
    
    if (midSafety > 0.7) {
      // Too dangerous, try to route around
      // Offset perpendicular to direct line
      const deltaLat = toLat - fromLat;
      const deltaLon = toLon - fromLon;
      
      // Perpendicular offset
      const offsetLat = -deltaLon * 0.3;
      const offsetLon = deltaLat * 0.3;
      
      const waypoint1Lat = fromLat + deltaLat * 0.3 + offsetLat;
      const waypoint1Lon = fromLon + deltaLon * 0.3 + offsetLon;
      const waypoint2Lat = fromLat + deltaLat * 0.7 + offsetLat;
      const waypoint2Lon = fromLon + deltaLon * 0.7 + offsetLon;
      
      path.push(
        [fromLat, fromLon],
        [waypoint1Lat, waypoint1Lon],
        [midLat + offsetLat, midLon + offsetLon],
        [waypoint2Lat, waypoint2Lon],
        [toLat, toLon]
      );
    } else {
      // Direct path is reasonably safe
      path.push(
        [fromLat, fromLon],
        [midLat, midLon],
        [toLat, toLon]
      );
    }
    
    // Calculate total distance
    let totalDistance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      totalDistance += csvDataLoader.calculateDistance(
        path[i][0], path[i][1],
        path[i + 1][0], path[i + 1][1]
      );
    }
    
    // Calculate safety score
    const safetyScores = path.map(coord =>
      csvDataLoader.getSafetyScoreForLocation(coord[0], coord[1])
    );
    const avgSafetyScore = safetyScores.reduce((a, b) => a + b, 0) / safetyScores.length;
    
    const speed = this.getSpeedForMode(mode);
    const duration = (totalDistance / speed) * 60; // minutes

    return {
      coordinates: path,
      distance: parseFloat(totalDistance.toFixed(2)),
      time: parseFloat(duration.toFixed(1)),
      safetyScore: parseFloat(avgSafetyScore.toFixed(2)),
      instructions: [{
        instruction: `Follow the safest route to destination (${totalDistance.toFixed(1)}km)`,
        distance: totalDistance * 1000,
        duration: duration * 60
      }],
      type: 'safest',
      modified: true
    };
  }
}
 
const routeCalculator = new RouteCalculator();

module.exports = routeCalculator;
