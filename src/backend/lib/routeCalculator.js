const csvDataLoader = require('./csvDataLoader');

// ============================================================================
// RULE-BASED SAFETY CLASSIFICATION CONSTANTS
// ============================================================================
// These thresholds define the explicit rules for route safety classification.
// All decisions are based on these deterministic IF-THEN rules.

const SAFETY_RULES = {
  // Route Classification Thresholds (Rule Category 3)
  SAFE_THRESHOLD: 0.3,        // Score < 0.3 = SAFE route
  MODERATE_THRESHOLD: 0.6,    // Score 0.3-0.6 = MODERATE, Score > 0.6 = HIGH_RISK
  
  // Dangerous Segment Detection (Rule Category 4)
  DANGER_ZONE_THRESHOLD: 0.15, // Segment score >= 0.15 = DANGER_ZONE (lowered for hazard sensitivity)
  
  // Alternative Selection Rules (Rule Category 5)
  ACCEPT_IMPROVEMENT_LOW: 0.15,   // 15% safety improvement
  ACCEPT_DETOUR_LOW: 1.25,        // 25% longer route
  ACCEPT_IMPROVEMENT_HIGH: 0.25,  // 25% safety improvement
  ACCEPT_DETOUR_HIGH: 1.40,       // 40% longer route
  MAX_DETOUR_FACTOR: 1.50,        // Never accept > 50% detour
  
  // Classification Labels
  CLASSIFICATIONS: {
    SAFE: 'SAFE',
    MODERATE: 'MODERATE', 
    HIGH_RISK: 'HIGH_RISK'
  }
};

// ============================================================================
// USER-CONFIGURABLE FACTOR WEIGHTS (DEFAULT VALUES)
// ============================================================================
// Users can override these weights to personalize their safety priorities.
// All weights should sum to 1.0 (100%)

const DEFAULT_FACTOR_WEIGHTS = {
  crime: 0.40,      // 40% - Crime rate and severity
  collision: 0.25,  // 25% - Traffic collision density
  lighting: 0.20,   // 20% - Street lighting quality
  hazard: 0.15      // 15% - Reported hazards
};

// Default crime type severity weights (can also be user-customized)
const DEFAULT_CRIME_SEVERITY = {
  'Violence and sexual offences': 1.0,
  'Robbery': 0.9,
  'Possession of weapons': 0.9,
  'Burglary': 0.8,
  'Drugs': 0.7,
  'Theft from the person': 0.7,
  'Vehicle crime': 0.6,
  'Criminal damage and arson': 0.6,
  'Public order': 0.5,
  'Other theft': 0.5,
  'Other crime': 0.5,
  'Bicycle theft': 0.4,
  'Shoplifting': 0.3,
  'Anti-social behaviour': 0.3
};

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
    
    // Safety routing parameters (using rule constants)
    this.safetyThreshold = SAFETY_RULES.DANGER_ZONE_THRESHOLD;
    this.maxDetourFactor = SAFETY_RULES.MAX_DETOUR_FACTOR;
    this.criticalHazardMaxDetour = 3.0; // Allow 200% longer routes for accidents/critical hazards
    this.waypointSearchRadius = 0.005; // ~500m for finding safe waypoints
  }

  // ==========================================================================
  // RULE-BASED ROUTE CLASSIFICATION
  // ==========================================================================
  
  /**
   * Classify a route's safety using explicit IF-THEN rules
   * 
   * RULE 1: IF safetyScore < 0.3 THEN classification = "SAFE"
   * RULE 2: IF safetyScore >= 0.3 AND safetyScore < 0.6 THEN classification = "MODERATE"
   * RULE 3: IF safetyScore >= 0.6 THEN classification = "HIGH_RISK"
   * 
   * @param {number} safetyScore - Route safety score (0-1, lower is safer)
   * @returns {Object} - { classification, ruleTriggered, action }
   */
  classifyRouteSafety(safetyScore) {
    // RULE 1: Safe route - no alternatives needed
    if (safetyScore < SAFETY_RULES.SAFE_THRESHOLD) {
      return {
        classification: SAFETY_RULES.CLASSIFICATIONS.SAFE,
        ruleTriggered: `RULE_1: Route classified as SAFE (score: ${safetyScore.toFixed(3)} < ${SAFETY_RULES.SAFE_THRESHOLD})`,
        action: 'USE_DIRECTLY',
        needsAlternatives: false
      };
    }
    
    // RULE 2: Moderate risk - check OSRM alternatives
    if (safetyScore < SAFETY_RULES.MODERATE_THRESHOLD) {
      return {
        classification: SAFETY_RULES.CLASSIFICATIONS.MODERATE,
        ruleTriggered: `RULE_2: Route classified as MODERATE (score: ${safetyScore.toFixed(3)}, range 0.3-0.6)`,
        action: 'CHECK_ALTERNATIVES',
        needsAlternatives: true
      };
    }
    
    // RULE 3: High risk - must find safer route
    return {
      classification: SAFETY_RULES.CLASSIFICATIONS.HIGH_RISK,
      ruleTriggered: `RULE_3: Route classified as HIGH_RISK (score: ${safetyScore.toFixed(3)} >= ${SAFETY_RULES.MODERATE_THRESHOLD})`,
      action: 'FIND_SAFER_ROUTE',
      needsAlternatives: true,
      needsWaypointAvoidance: true
    };
  }

  /**
   * Evaluate an alternative route using explicit IF-THEN rules
   * 
   * RULE 4: IF improvement > 15% AND detour < 25% THEN ACCEPT
   * RULE 5: IF improvement > 25% AND detour < 40% THEN ACCEPT
   * RULE 6: IF detour > 50% THEN REJECT (too long)
   * RULE 7: IF not safer (improvement <= 0) THEN REJECT
   * 
   * @param {Object} candidate - The alternative route to evaluate
   * @param {Object} fastestRoute - The baseline fastest route
   * @returns {Object} - { accepted, ruleTriggered, metrics }
   */
  evaluateAlternative(candidate, fastestRoute) {
    const safetyImprovement = fastestRoute.safetyScore - candidate.safetyScore;
    const distanceRatio = candidate.distance / fastestRoute.distance;
    const improvementPercent = (safetyImprovement * 100).toFixed(1);
    const detourPercent = ((distanceRatio - 1) * 100).toFixed(1);
    
    const metrics = {
      safetyImprovement,
      improvementPercent: `${improvementPercent}%`,
      distanceRatio,
      detourPercent: `${detourPercent}%`
    };
    
    // RULE 7: Reject if not safer
    if (safetyImprovement <= 0) {
      return {
        accepted: false,
        ruleTriggered: `RULE_7: REJECTED - Not safer (improvement: ${improvementPercent}%)`,
        metrics
      };
    }
    
    // RULE 6: Reject if too long (> 50% detour)
    if (distanceRatio > SAFETY_RULES.MAX_DETOUR_FACTOR) {
      return {
        accepted: false,
        ruleTriggered: `RULE_6: REJECTED - Too long (${detourPercent}% detour > 50% max)`,
        metrics
      };
    }
    
    // RULE 4: Accept if good improvement with small detour
    if (safetyImprovement > SAFETY_RULES.ACCEPT_IMPROVEMENT_LOW && 
        distanceRatio < SAFETY_RULES.ACCEPT_DETOUR_LOW) {
      return {
        accepted: true,
        ruleTriggered: `RULE_4: ACCEPTED - ${improvementPercent}% safer with ${detourPercent}% detour (threshold: >15% safer, <25% longer)`,
        metrics
      };
    }
    
    // RULE 5: Accept if significant improvement with moderate detour
    if (safetyImprovement > SAFETY_RULES.ACCEPT_IMPROVEMENT_HIGH && 
        distanceRatio < SAFETY_RULES.ACCEPT_DETOUR_HIGH) {
      return {
        accepted: true,
        ruleTriggered: `RULE_5: ACCEPTED - ${improvementPercent}% safer with ${detourPercent}% detour (threshold: >25% safer, <40% longer)`,
        metrics
      };
    }
    
    // Default: Reject if doesn't meet acceptance criteria
    return {
      accepted: false,
      ruleTriggered: `RULE_7: REJECTED - Doesn't meet acceptance criteria (${improvementPercent}% safer, ${detourPercent}% longer)`,
      metrics
    };
  }

  /**
   * Get user's factor weights or return defaults
   * @param {Object} userPreferences - User preferences object
   * @returns {Object} - Factor weights { crime, collision, lighting, hazard }
   */
  getFactorWeights(userPreferences) {
    if (!userPreferences || !userPreferences.factorWeights) {
      return { ...DEFAULT_FACTOR_WEIGHTS };
    }
    
    // Merge user weights with defaults (user weights override)
    const weights = {
      crime: userPreferences.factorWeights.crime ?? DEFAULT_FACTOR_WEIGHTS.crime,
      collision: userPreferences.factorWeights.collision ?? DEFAULT_FACTOR_WEIGHTS.collision,
      lighting: userPreferences.factorWeights.lighting ?? DEFAULT_FACTOR_WEIGHTS.lighting,
      hazard: userPreferences.factorWeights.hazard ?? DEFAULT_FACTOR_WEIGHTS.hazard
    };
    
    // Normalize weights to sum to 1.0
    const sum = weights.crime + weights.collision + weights.lighting + weights.hazard;
    if (sum !== 1.0 && sum > 0) {
      weights.crime /= sum;
      weights.collision /= sum;
      weights.lighting /= sum;
      weights.hazard /= sum;
    }
    
    return weights;
  }

  /**
   * Get user's crime severity weights or return defaults
   * @param {Object} userPreferences - User preferences object
   * @returns {Object} - Crime severity weights by type
   */
  getCrimeSeverityWeights(userPreferences) {
    if (!userPreferences || !userPreferences.crimeSeverity) {
      return { ...DEFAULT_CRIME_SEVERITY };
    }
    
    // Merge user severity weights with defaults
    return {
      ...DEFAULT_CRIME_SEVERITY,
      ...userPreferences.crimeSeverity
    };
  }

  /**
   * Detect current time of day context
   * @param {number} latitude - For timezone calculation
   * @param {number} longitude - For timezone calculation
   * @returns {string} - 'day', 'night', 'morning-rush', or 'evening-rush'
   */
  detectTimeOfDay(latitude, longitude) {
    const now = new Date();
    const hour = now.getUTCHours();
    
    // Estimate timezone based on longitude
    const timezoneOffset = Math.round(longitude / 15);
    const localHour = (hour + timezoneOffset + 24) % 24;
    
    // Morning rush hour: 7 AM - 9 AM
    if (localHour >= 7 && localHour < 9) {
      return 'morning-rush';
    }
    
    // Evening rush hour: 5 PM - 7 PM
    if (localHour >= 17 && localHour < 19) {
      return 'evening-rush';
    }
    
    // Night time: 8 PM - 6 AM
    if (localHour >= 20 || localHour < 6) {
      return 'night';
    }
    
    // Daytime: 9 AM - 5 PM
    return 'day';
  }

  /**
   * Adjust safety factor weights based on time of day
   * @param {Object} baseWeights - Base factor weights
   * @param {string} timeOfDay - 'day', 'night', 'morning-rush', or 'evening-rush'
   * @returns {Object} - Adjusted weights (still sum to 1.0)
   */
  adjustWeightsForTimeOfDay(baseWeights, timeOfDay) {
    let adjusted = { ...baseWeights };
    
    switch (timeOfDay) {
      case 'night':
        // At night, lighting becomes MUCH more important
        // Increase lighting weight by 50%, redistribute from other factors
        const nightLightingBoost = baseWeights.lighting * 0.5;
        adjusted.lighting = baseWeights.lighting + nightLightingBoost;
        // Reduce crime slightly (less activity at night in some areas)
        adjusted.crime = baseWeights.crime * 0.9;
        // Reduce collision (less traffic at night)
        adjusted.collision = baseWeights.collision * 0.7;
        // Keep hazards same
        adjusted.hazard = baseWeights.hazard;
        break;
        
      case 'morning-rush':
      case 'evening-rush':
        // During rush hours, traffic collisions and hazards are more likely
        // Increase collision weight by 40%, hazard by 30%
        adjusted.collision = baseWeights.collision * 1.4;
        adjusted.hazard = baseWeights.hazard * 1.3;
        // Reduce crime (busy areas are safer)
        adjusted.crime = baseWeights.crime * 0.8;
        // Lighting doesn't matter during daylight rush hours
        adjusted.lighting = baseWeights.lighting * 0.5;
        break;
        
      case 'day':
      default:
        // During normal day, use base weights but reduce lighting importance
        adjusted.lighting = baseWeights.lighting * 0.6;
        // Slight increase to other factors to compensate
        adjusted.crime = baseWeights.crime * 1.1;
        adjusted.collision = baseWeights.collision * 1.1;
        adjusted.hazard = baseWeights.hazard * 1.1;
        break;
    }
    
    // Normalize weights to sum to 1.0
    const sum = adjusted.crime + adjusted.collision + adjusted.lighting + adjusted.hazard;
    adjusted.crime /= sum;
    adjusted.collision /= sum;
    adjusted.lighting /= sum;
    adjusted.hazard /= sum;
    
    return adjusted;
  }

  async calculateRoutes(fromLat, fromLon, toLat, toLon, mode = 'walking', userPreferences = null, timeOfDay = null) {
    // Validate coordinates are different (not same location)
    const distance = csvDataLoader.calculateDistance(fromLat, fromLon, toLat, toLon);
    if (distance < 0.01) { // Less than 10 meters
      return {
        success: false,
        error: 'Start and end locations are the same. Please select different locations.',
        message: 'Start and end locations must be different'
      };
    }
    
    // Extract user-configurable weights
    let factorWeights = this.getFactorWeights(userPreferences);
    const crimeSeverityWeights = this.getCrimeSeverityWeights(userPreferences);
    
    // Detect time of day context if not provided
    if (!timeOfDay) {
      timeOfDay = this.detectTimeOfDay(fromLat, fromLon);
    }
    
    // Adjust weights based on time of day context
    factorWeights = this.adjustWeightsForTimeOfDay(factorWeights, timeOfDay);
    
    console.log('[RouteCalculator] Time context:', timeOfDay);
    console.log('[RouteCalculator] Adjusted factor weights:', factorWeights);
    
    // Ensure crime data is loaded for safety scoring
    if (!csvDataLoader.isLoaded()) {
      await csvDataLoader.loadCrimeData();
    }

    // Get the pure OSRM route (fastest route - unchanged from OSM)
    const osrmRoute = await this.getOSRMRoute(fromLat, fromLon, toLat, toLon, mode);
    
    if (!osrmRoute.success) {
      // Fallback to straight line if OSRM fails
      return await this.calculateStraightLineRoutes(fromLat, fromLon, toLat, toLon, mode, timeOfDay);
    }

    // Fastest route = pure OSRM route with safety score added (no modification to path)
    const fastestRoute = await this.createFastestRoute(osrmRoute, mode, factorWeights, timeOfDay);
    
    // Safest route = intelligently route around dangerous areas using waypoints
    // Pass factorWeights and timeOfDay to ensure consistent scoring
    const safestRoute = await this.calculateSafestRoute(
      fromLat, fromLon, toLat, toLon, mode, osrmRoute, fastestRoute, factorWeights, timeOfDay
    );

    // Check if we should suggest cross-mode alternative (walk ↔ cycle)
    // If the safest route in current mode is HIGH_RISK (>= 0.6), try the other mode
    let crossModeAlternative = null;
    const isHighRisk = safestRoute.safetyScore >= SAFETY_RULES.MODERATE_THRESHOLD; // >= 0.6
    
    if (isHighRisk && (mode === 'walking' || mode === 'cycling')) {
      const alternativeMode = mode === 'walking' ? 'cycling' : 'walking';
      console.log(`[RouteCalculator] Current mode (${mode}) is HIGH_RISK (${safestRoute.safetyScore.toFixed(3)}), checking ${alternativeMode} alternative...`);
      
      try {
        // Get route in alternative mode
        const altOsrmRoute = await this.getOSRMRoute(fromLat, fromLon, toLat, toLon, alternativeMode);
        
        if (altOsrmRoute.success) {
          const altFastestRoute = await this.createFastestRoute(altOsrmRoute, alternativeMode, factorWeights, timeOfDay);
          
          // Only suggest if alternative mode is significantly safer (at least 15% improvement)
          const safetyImprovement = (safestRoute.safetyScore - altFastestRoute.safetyScore) / safestRoute.safetyScore;
          
          if (safetyImprovement >= 0.15) {
            crossModeAlternative = {
              ...altFastestRoute,
              type: 'cross-mode-alternative',
              alternativeMode: alternativeMode,
              safetyImprovement: parseFloat((safetyImprovement * 100).toFixed(1))
            };
            console.log(`[RouteCalculator] ✅ Cross-mode alternative (${alternativeMode}) is ${(safetyImprovement * 100).toFixed(1)}% safer - suggesting to user`);
          } else {
            console.log(`[RouteCalculator] Cross-mode alternative (${alternativeMode}) not significantly safer (${(safetyImprovement * 100).toFixed(1)}% improvement)`);
          }
        }
      } catch (error) {
        console.warn(`[RouteCalculator] Failed to get cross-mode alternative:`, error.message);
      }
    }

    return {
      success: true,
      fastest: fastestRoute,
      safest: safestRoute,
      crossModeAlternative: crossModeAlternative,
      provider: 'osrm'
    };
  }

  /**
   * Creates the fastest route - pure OSRM route with safety score added
   * This is exactly the same as OSM/OSRM routing, just with safety metrics
   * @param {Object} osrmRoute - The OSRM route data
   * @param {string} mode - Transport mode (walking, cycling)
   * @param {Object} factorWeights - User-configurable factor weights
   * @param {string} timeOfDay - Time context for safety calculation
   */
  async createFastestRoute(osrmRoute, mode, factorWeights = null, timeOfDay = 'day') {
    const coordinates = osrmRoute.coordinates;
    const distance = osrmRoute.distance / 1000; // Convert meters to km
    const duration = osrmRoute.duration / 60; // Convert seconds to minutes
    
    // Use provided weights or defaults
    const weights = factorWeights || DEFAULT_FACTOR_WEIGHTS;
    
    // Calculate safety score along the route (rule-based, from crime data + REAL hazards)
    const safetyScore = await this.calculateRouteSafetyScore(coordinates, weights, timeOfDay);
    
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
      isPureOSRM: true,
      // Include the weights used for transparency
      factorWeights: weights
    };
  }

  /**
   * Calculate safety score for a route based on crime data and real hazards along the path
   * Returns a score from 0 (safest) to 1 (most dangerous)
   * 
   * @param {Array} coordinates - Route coordinates [[lat, lon], ...]
   * @param {Object} factorWeights - User-configurable weights { crime, collision, lighting, hazard }
   * @param {string} timeOfDay - Time context: 'day', 'night', 'morning-rush', 'evening-rush'
   * @returns {Promise<number>} - Safety score 0-1 (lower is safer)
   */
  async calculateRouteSafetyScore(coordinates, factorWeights = null, timeOfDay = 'day') {
    if (!coordinates || coordinates.length === 0) {
      return 0.1; // Default to safe if no coordinates
    }

    // Use provided weights or defaults
    const weights = factorWeights || DEFAULT_FACTOR_WEIGHTS;

    // Sample points along the route (every ~100m for performance)
    const samplePoints = this.sampleRoutePoints(coordinates, 0.1); // 0.1 km = 100m
    
    if (samplePoints.length === 0) {
      return 0.1; // Default to safe if no sample points
    }

    // Get detailed safety metrics for each sampled point (with REAL hazard data)
    const lightingService = require('./lightingService');
    const safetyDataPromises = samplePoints.map(async coord => {
      const metrics = csvDataLoader.getSafetyMetrics(coord[0], coord[1]);
      
      // Get REAL hazard density from database (includes both community + TomTom hazards)
      const realHazardDensity = await csvDataLoader.calculateHazardDensity(coord[0], coord[1], 0.5);
      
      // Get REAL collision density from TomTom traffic incidents (accidents, jams, breakdowns)
      const realCollisionDensity = await csvDataLoader.getCollisionDensity(coord[0], coord[1]);
      
      // Get accurate lighting index based on time of day
      let lightingIndex = metrics.lightingIndex;
      if (timeOfDay === 'night') {
        // At night, get real lighting data from OSM
        lightingIndex = await lightingService.getLightingIndex(coord[0], coord[1], 100);
      } else {
        // During day/rush hours, lighting is less critical
        lightingIndex = 0.1; // Well-lit equivalent
      }
      
      // Calculate weighted score using user-configurable weights with ALL REAL DATA
      const weightedScore = (metrics.crimeRate * weights.crime) +
                           (realCollisionDensity * weights.collision) +  // NOW DYNAMIC from TomTom!
                           (lightingIndex * weights.lighting) +
                           (realHazardDensity * weights.hazard); // Includes TomTom + community!
      
      return Math.min(1.0, weightedScore);
    });
    
    const safetyData = await Promise.all(safetyDataPromises);
    
    // Calculate weighted average (give more weight to dangerous areas)
    const avgScore = safetyData.reduce((a, b) => a + b, 0) / safetyData.length;
    const maxScore = Math.max(...safetyData);
    
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

  /**
   * Calculate the safest route by identifying dangerous areas and routing around them
   * Uses a multi-step approach:
   * 1. Identify dangerous segments in the fastest route
   * 2. Generate safe waypoints to avoid dangerous areas
   * 3. Request OSRM routes through safe waypoints
   * 4. Compare candidates and return the safest viable route
   * 
   * @param {Object} factorWeights - User-configurable weights for consistent scoring
   * @param {string} timeOfDay - Time context for safety calculation
   */
  async calculateSafestRoute(fromLat, fromLon, toLat, toLon, mode, originalRoute, fastestRoute, factorWeights = null, timeOfDay = 'day') {
    console.log('[SafestRoute] Calculating safest route...');
    
    // Use provided weights or defaults for consistent scoring
    const weights = factorWeights || DEFAULT_FACTOR_WEIGHTS;
    
    const candidateRoutes = [];
    
    // Add the fastest route as a candidate
    candidateRoutes.push({
      ...fastestRoute,
      type: 'safest',
      routeType: 'fastest-baseline'
    });

    // Strategy 1: Try OSRM's built-in alternatives
    try {
      const altRoutes = await this.getOSRMAlternatives(fromLat, fromLon, toLat, toLon, mode);
      for (const altRoute of altRoutes) {
        const safetyScore = await this.calculateRouteSafetyScore(altRoute.coordinates, weights, timeOfDay);
        const safetyRating = Math.max(0, Math.min(10, (1 - safetyScore) * 10));
        
        candidateRoutes.push({
          coordinates: altRoute.coordinates,
          distance: parseFloat((altRoute.distance / 1000).toFixed(2)),
          time: parseFloat((altRoute.duration / 60).toFixed(1)),
          safetyScore: parseFloat(safetyScore.toFixed(3)),
          safetyRating: parseFloat(safetyRating.toFixed(1)),
          instructions: altRoute.instructions || [],
          type: 'safest',
          mode: mode,
          provider: 'osrm-alternative',
          routeType: 'osrm-alternative'
        });
      }
      console.log(`[SafestRoute] Found ${altRoutes.length} OSRM alternatives`);
    } catch (error) {
      console.warn('[SafestRoute] Failed to get OSRM alternatives:', error.message);
    }

    // Strategy 2: Identify dangerous segments and generate waypoint-based routes
    // Use weighted score for consistency with user preferences
    const dangerousSegmentsResult = await this.identifyDangerousSegments(fastestRoute.coordinates, weights, timeOfDay);
    const dangerousSegments = dangerousSegmentsResult.segments;
    const hasCriticalHazard = dangerousSegmentsResult.hasCriticalHazard;
    console.log(`[SafestRoute] Found ${dangerousSegments.length} dangerous segments${hasCriticalHazard ? ' (CRITICAL hazard detected)' : ''}`);
    
    if (dangerousSegments.length > 0) {
      // Generate safe waypoints to avoid dangerous areas
      const safeWaypoints = this.generateSafeWaypoints(
        fromLat, fromLon, toLat, toLon, dangerousSegments, weights
      );
      console.log(`[SafestRoute] Generated ${safeWaypoints.length} safe waypoint sets`);
      
      // Try routes through each set of safe waypoints
      for (const waypoints of safeWaypoints) {
        try {
          const waypointRoute = await this.getOSRMRouteWithWaypoints(
            fromLat, fromLon, toLat, toLon, waypoints, mode
          );
          
          if (waypointRoute.success) {
            const safetyScore = await this.calculateRouteSafetyScore(waypointRoute.coordinates, weights, timeOfDay);
            const safetyRating = Math.max(0, Math.min(10, (1 - safetyScore) * 10));
            const distance = waypointRoute.distance / 1000;
            
            // Use extended detour limit if critical hazards present
            const maxDetour = hasCriticalHazard ? this.criticalHazardMaxDetour : this.maxDetourFactor;
            
            // Only accept if within acceptable detour factor
            if (distance <= fastestRoute.distance * maxDetour) {
              candidateRoutes.push({
                coordinates: waypointRoute.coordinates,
                distance: parseFloat(distance.toFixed(2)),
                time: parseFloat((waypointRoute.duration / 60).toFixed(1)),
                safetyScore: parseFloat(safetyScore.toFixed(3)),
                safetyRating: parseFloat(safetyRating.toFixed(1)),
                instructions: waypointRoute.instructions || [],
                type: 'safest',
                mode: mode,
                provider: 'osrm-waypoint',
                routeType: 'waypoint-avoidance'
              });
            }
          }
        } catch (error) {
          console.warn('[SafestRoute] Waypoint route failed:', error.message);
        }
      }
    }

    // Strategy 3: Try lateral offset routes (go around the direct path)
    try {
      const offsetRoutes = await this.generateOffsetRoutes(fromLat, fromLon, toLat, toLon, mode);
      console.log(`[SafestRoute] Generated ${offsetRoutes.length} offset routes`);
      for (const offsetRoute of offsetRoutes) {
        if (offsetRoute.success) {
          const safetyScore = await this.calculateRouteSafetyScore(offsetRoute.coordinates, weights, timeOfDay);
          const safetyRating = Math.max(0, Math.min(10, (1 - safetyScore) * 10));
          const distance = offsetRoute.distance / 1000;
          
          // Use extended detour limit if critical hazards present
          const maxDetour = hasCriticalHazard ? this.criticalHazardMaxDetour : this.maxDetourFactor;
          
          if (distance <= fastestRoute.distance * maxDetour) {
            candidateRoutes.push({
              coordinates: offsetRoute.coordinates,
              distance: parseFloat(distance.toFixed(2)),
              time: parseFloat((offsetRoute.duration / 60).toFixed(1)),
              safetyScore: parseFloat(safetyScore.toFixed(3)),
              safetyRating: parseFloat(safetyRating.toFixed(1)),
              instructions: offsetRoute.instructions || [],
              type: 'safest',
              mode: mode,
              provider: 'osrm-offset',
              routeType: 'lateral-offset'
            });
          }
        }
      }
      console.log(`[SafestRoute] Generated ${offsetRoutes.length} offset routes`);
    } catch (error) {
      console.warn('[SafestRoute] Offset routes failed:', error.message);
    }

    // Select the best route based on safety (with slight preference for shorter routes)
    // Pass weights so selection can adjust based on user's safety priority
    console.log(`[SafestRoute] Total candidate routes: ${candidateRoutes.length}`);
    candidateRoutes.forEach((route, i) => {
      console.log(`  Candidate ${i + 1}: ${route.routeType}, safety: ${route.safetyRating}/10 (score: ${route.safetyScore}), distance: ${route.distance}km`);
    });
    
    const bestRoute = this.selectBestSafeRoute(candidateRoutes, fastestRoute, weights);
    
    console.log(`[SafestRoute] Selected route: ${bestRoute.routeType}, safety: ${bestRoute.safetyRating}/10 (score: ${bestRoute.safetyScore}), distance: ${bestRoute.distance}km`);
    
    // Check if the safest route is the same as fastest
    // First check by route type - if it's 'fastest-baseline', it's definitely the same
    const isSameAsFastest = bestRoute.routeType === 'fastest-baseline' || 
                            this.routesAreSimilar(bestRoute.coordinates, fastestRoute.coordinates);
    
    // Additional context logging
    if (isSameAsFastest && dangerousSegments.length > 0) {
      console.log(`[SafestRoute] ⚠️  Note: ${dangerousSegments.length} dangerous segment(s) detected, but no safer alternatives available.`);
      console.log(`[SafestRoute] All ${candidateRoutes.length} candidate routes evaluated - fastest route is also the safest option.`);
    } else if (!isSameAsFastest) {
      const improvement = ((fastestRoute.safetyScore - bestRoute.safetyScore) / fastestRoute.safetyScore * 100).toFixed(1);
      console.log(`[SafestRoute] ✅ Safer alternative found: ${improvement}% safety improvement`);
    }
    
    return {
      ...bestRoute,
      sameAsFastest: isSameAsFastest,
      isPureOSRM: bestRoute.routeType === 'fastest-baseline',
      dangerousSegmentsDetected: dangerousSegments.length,
      alternativesEvaluated: candidateRoutes.length
    };
  }

  /**
   * Get multiple alternative routes from OSRM
   */
  async getOSRMAlternatives(fromLat, fromLon, toLat, toLon, mode) {
    const endpoints = this.osrmEndpoints[mode] || this.osrmEndpoints.walking;
    
    for (const baseUrl of endpoints) {
      try {
        const url = `${baseUrl}/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson&steps=true&alternatives=3`;
        
        const response = await fetch(url, {
          headers: { 'User-Agent': 'SafePath/1.0' }
        });
        
        if (!response.ok) continue;
        
        const data = await response.json();
        
        if (data.code === 'Ok' && data.routes && data.routes.length > 1) {
          // Return all alternative routes (skip the first one which is the fastest)
          return data.routes.slice(1).map(route => ({
            coordinates: route.geometry.coordinates.map(coord => [coord[1], coord[0]]),
            distance: route.distance,
            duration: route.duration,
            instructions: route.legs[0]?.steps?.map(step => ({
              instruction: step.maneuver?.instruction || step.name || 'Continue',
              distance: step.distance,
              duration: step.duration
            })) || []
          }));
        }
      } catch (error) {
        continue;
      }
    }
    
    return [];
  }

  /**
   * Identify dangerous segments along a route using weighted scoring
   * @param {Array} coordinates - Route coordinates
   * @param {Object} factorWeights - User-configurable weights for scoring
   * @param {string} timeOfDay - Time context for lighting calculation
   */
  async identifyDangerousSegments(coordinates, factorWeights = null, timeOfDay = 'day') {
    const segments = [];
    const sampledPoints = this.sampleRoutePoints(coordinates, 0.2); // Every 200m
    const weights = factorWeights || DEFAULT_FACTOR_WEIGHTS;
    
    let inDangerousZone = false;
    let segmentStart = null;
    let hasCriticalHazard = false;
    let hasAccident = false; // Track if we detect any accidents
    
    for (let i = 0; i < sampledPoints.length; i++) {
      const point = sampledPoints[i];
      
      // Get ALL safety factors including real-time hazards
      const crimeScore = csvDataLoader.getSafetyScoreForLocation(point[0], point[1]);
      const collisionDensity = await csvDataLoader.getCollisionDensity(point[0], point[1]);
      
      // Get lighting index based on time of day
      const lightingService = require('./lightingService');
      let lightingIndex;
      if (timeOfDay === 'night') {
        // At night, use real OSM lighting data
        lightingIndex = await lightingService.getLightingIndex(point[0], point[1], 100);
      } else {
        // During day, lighting doesn't matter
        lightingIndex = 0.1;
      }
      
      // Get REAL hazard density (includes TomTom + community hazards)
      const realHazardDensity = await csvDataLoader.calculateHazardDensity(point[0], point[1], 0.5);
      
      // Check specifically for accidents (TomTom data)
      const tomtomHazardsService = require('./tomtomHazardsService');
      const nearbyIncidents = await tomtomHazardsService.getTomTomHazards(point[0], point[1], 500); // 500m radius
      const nearbyAccidents = nearbyIncidents.filter(h => 
        (h.type === 'accident' || h.hazardType === 'accident') && 
        h.distanceMeters <= 500
      );
      
      if (nearbyAccidents.length > 0 && i === 0) {
        console.log(`🚨 [AccidentDetection] Found ${nearbyAccidents.length} accident(s) within 500m:`);
        nearbyAccidents.forEach(a => {
          console.log(`    - ${a.description} (${a.severity}) at ${a.distanceMeters}m`);
        });
        hasCriticalHazard = true; // Any accident = critical
        hasAccident = true;
      }
      
      // Calculate weighted score with ALL factors
      let weightedScore = 
        (crimeScore * weights.crime) +
        (collisionDensity * weights.collision) +
        (lightingIndex * weights.lighting) +
        (realHazardDensity * weights.hazard);
      
      // ADAPTIVE BOOST: Scale hazard impact based on severity
      // For low-to-moderate crime areas, hazards should strongly influence routing
      if (crimeScore < 0.3) {  // Expanded from 0.2 to 0.3 to cover more areas
        let hazardBoost = 0;
        
        // ACCIDENT OVERRIDE: If accidents detected, apply massive boost
        if (hasAccident || nearbyAccidents.length > 0) {
          hazardBoost = 2.0; // Massive boost to guarantee avoidance
          hasCriticalHazard = true;
          if (i === 0) console.log(`🚨 [DangerDetection] ACCIDENT DETECTED - FORCING AVOIDANCE (boost: +${hazardBoost.toFixed(3)})`);
        }
        // Different boost based on hazard density (which reflects severity)
        else if (realHazardDensity >= 0.6) {
          // Critical: Very high density or multiple high-severity hazards
          // Force route avoidance by making score always exceed threshold
          hazardBoost = 1.0; // Guarantee score > 0.15 threshold
          hasCriticalHazard = true; // Flag for extended detour limits
          if (i === 0) console.log(`[DangerDetection] CRITICAL hazard level - forcing avoidance (boost: +${hazardBoost.toFixed(3)})`);
        } else if (realHazardDensity >= 0.4) {
          // High risk: High severity hazards nearby
          // Strong boost to ensure alternative routes are considered
          hazardBoost = realHazardDensity * 4.0; // Increased from 3x to 4x
          if (i === 0) console.log(`[DangerDetection] HIGH RISK hazard - strong avoidance (boost: +${hazardBoost.toFixed(3)})`);
        } else if (realHazardDensity >= 0.2) {
          // Medium risk: Medium severity or distant high severity
          // Moderate boost to prefer alternatives if available
          hazardBoost = realHazardDensity * 2.5; // Increased from 2x to 2.5x
          if (i === 0) console.log(`[DangerDetection] MEDIUM RISK hazard - prefer alternatives (boost: +${hazardBoost.toFixed(3)})`);
        } else if (realHazardDensity >= 0.1) {  // Lowered from 0.15 to 0.1
          // Low risk: Low severity or very distant hazards
          // Minor boost, but enough to trigger alternative search
          hazardBoost = realHazardDensity * 1.5; // Increased from 1x to 1.5x
          if (i === 0) console.log(`[DangerDetection] LOW RISK hazard - minor avoidance (boost: +${hazardBoost.toFixed(3)})`);
        } else if (realHazardDensity >= 0.05) {  // NEW: Very low risk threshold
          // Very low risk: Minor hazards or very distant
          // Small boost to at least consider alternatives
          hazardBoost = realHazardDensity * 1.0;
          if (i === 0) console.log(`[DangerDetection] VERY LOW RISK hazard - slight avoidance (boost: +${hazardBoost.toFixed(3)})`);
        }
        
        weightedScore += hazardBoost;
      } else {
        // Even in higher crime areas, significant hazards should still matter
        if (realHazardDensity >= 0.3) {
          const hazardBoost = realHazardDensity * 1.5; // Boost for significant hazards
          weightedScore += hazardBoost;
          if (i === 0) console.log(`[DangerDetection] HIGH CRIME + HAZARD area - additional boost (boost: +${hazardBoost.toFixed(3)})`);
        }
      }
      
      // Debug logging for first point
      if (i === 0) {
        console.log(`[DangerDetection] Point [${point[0].toFixed(4)}, ${point[1].toFixed(4)}]:`);
        console.log(`  Crime: ${crimeScore.toFixed(3)} * ${weights.crime} = ${(crimeScore * weights.crime).toFixed(3)}`);
        console.log(`  Collision: ${collisionDensity.toFixed(3)} * ${weights.collision} = ${(collisionDensity * weights.collision).toFixed(3)}`);
        console.log(`  Lighting: ${lightingIndex.toFixed(3)} * ${weights.lighting} = ${(lightingIndex * weights.lighting).toFixed(3)}`);
        console.log(`  Hazard: ${realHazardDensity.toFixed(3)} * ${weights.hazard} = ${(realHazardDensity * weights.hazard).toFixed(3)}`);
        console.log(`  Total weighted: ${weightedScore.toFixed(3)} (threshold: ${this.safetyThreshold})`);
      }
      
      if (weightedScore >= this.safetyThreshold) {
        if (!inDangerousZone) {
          segmentStart = i > 0 ? sampledPoints[i - 1] : point;
          inDangerousZone = true;
        }
      } else {
        if (inDangerousZone) {
          segments.push({
            start: segmentStart,
            end: point,
            midpoint: [(segmentStart[0] + point[0]) / 2, (segmentStart[1] + point[1]) / 2]
          });
          inDangerousZone = false;
        }
      }
    }
    
    // Handle if route ends in dangerous zone
    if (inDangerousZone && segmentStart) {
      const lastPoint = sampledPoints[sampledPoints.length - 1];
      segments.push({
        start: segmentStart,
        end: lastPoint,
        midpoint: [(segmentStart[0] + lastPoint[0]) / 2, (segmentStart[1] + lastPoint[1]) / 2]
      });
    }
    
    return { segments, hasCriticalHazard };
  }

  /**
   * Generate safe waypoints to route around dangerous areas
   * @param {Object} factorWeights - User-configurable weights for scoring
   */
  generateSafeWaypoints(fromLat, fromLon, toLat, toLon, dangerousSegments, factorWeights = null) {
    const waypointSets = [];
    const weights = factorWeights || DEFAULT_FACTOR_WEIGHTS;
    
    // Calculate perpendicular direction to the main route
    const routeBearing = this.calculateBearing(fromLat, fromLon, toLat, toLon);
    
    for (const segment of dangerousSegments) {
      // Try both sides of the dangerous segment
      const offsets = [0.003, -0.003, 0.005, -0.005]; // ~300m and ~500m offsets
      
      for (const offset of offsets) {
        // Calculate waypoint perpendicular to the danger zone
        const perpBearing = (routeBearing + 90) % 360;
        const waypoint = this.offsetPoint(
          segment.midpoint[0], 
          segment.midpoint[1], 
          perpBearing, 
          Math.abs(offset)
        );
        
        // Check if waypoint is actually safer using weighted scoring
        const rawScore = csvDataLoader.getSafetyScoreForLocation(waypoint[0], waypoint[1]);
        const weightedScore = rawScore * (weights.crime / DEFAULT_FACTOR_WEIGHTS.crime);
        
        if (weightedScore < this.safetyThreshold) {
          waypointSets.push([waypoint]);
        }
      }
    }
    
    // If multiple dangerous segments, try combining waypoints
    if (dangerousSegments.length > 1 && waypointSets.length > 0) {
      const combinedWaypoints = waypointSets
        .slice(0, 3)
        .flat()
        .filter((wp, index, self) => 
          index === self.findIndex(w => 
            Math.abs(w[0] - wp[0]) < 0.001 && Math.abs(w[1] - wp[1]) < 0.001
          )
        );
      
      if (combinedWaypoints.length > 1) {
        waypointSets.push(combinedWaypoints);
      }
    }
    
    return waypointSets.slice(0, 5); // Limit to 5 waypoint sets
  }

  /**
   * Generate routes with lateral offset from the direct path
   */
  async generateOffsetRoutes(fromLat, fromLon, toLat, toLon, mode) {
    const routes = [];
    const bearing = this.calculateBearing(fromLat, fromLon, toLat, toLon);
    const directDistance = csvDataLoader.calculateDistance(fromLat, fromLon, toLat, toLon);
    
    // Calculate midpoint of direct route
    const midLat = (fromLat + toLat) / 2;
    const midLon = (fromLon + toLon) / 2;
    
    // Generate waypoints offset from the midpoint
    const offsets = [
      { bearing: (bearing + 90) % 360, distance: directDistance * 0.15 },   // Right offset
      { bearing: (bearing - 90 + 360) % 360, distance: directDistance * 0.15 }, // Left offset
      { bearing: (bearing + 90) % 360, distance: directDistance * 0.25 },   // Larger right
      { bearing: (bearing - 90 + 360) % 360, distance: directDistance * 0.25 }  // Larger left
    ];
    
    for (const offset of offsets) {
      const waypoint = this.offsetPoint(midLat, midLon, offset.bearing, offset.distance);
      
      // Check if the offset waypoint is safer (including hazard density)
      const waypointCrime = csvDataLoader.getSafetyScoreForLocation(waypoint[0], waypoint[1]);
      const midpointCrime = csvDataLoader.getSafetyScoreForLocation(midLat, midLon);
      const waypointHazard = await csvDataLoader.calculateHazardDensity(waypoint[0], waypoint[1], 0.5);
      const midpointHazard = await csvDataLoader.calculateHazardDensity(midLat, midLon, 0.5);
      
      // Combined safety check (lower is safer)
      const waypointSafety = waypointCrime + waypointHazard;
      const midpointSafety = midpointCrime + midpointHazard;
      
      // Always try offset routes when hazards are present, even if slightly less safe
      // This gives more alternatives to choose from
      if (waypointSafety < midpointSafety || midpointHazard > 0.15) {
        try {
          const route = await this.getOSRMRouteWithWaypoints(
            fromLat, fromLon, toLat, toLon, [waypoint], mode
          );
          if (route.success) {
            routes.push(route);
          }
        } catch (error) {
          // Skip failed routes
        }
      }
    }
    
    return routes;
  }

  /**
   * Get OSRM route through specified waypoints
   */
  async getOSRMRouteWithWaypoints(fromLat, fromLon, toLat, toLon, waypoints, mode) {
    const endpoints = this.osrmEndpoints[mode] || this.osrmEndpoints.walking;
    
    // Build coordinate string: start -> waypoints -> end
    const coordParts = [`${fromLon},${fromLat}`];
    for (const wp of waypoints) {
      coordParts.push(`${wp[1]},${wp[0]}`); // Note: OSRM uses lon,lat
    }
    coordParts.push(`${toLon},${toLat}`);
    
    const coordString = coordParts.join(';');
    
    for (const baseUrl of endpoints) {
      try {
        const url = `${baseUrl}/${coordString}?overview=full&geometries=geojson&steps=true`;
        
        const response = await fetch(url, {
          headers: { 'User-Agent': 'SafePath/1.0' }
        });
        
        if (!response.ok) continue;
        
        const data = await response.json();
        
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          return {
            success: true,
            coordinates: route.geometry.coordinates.map(coord => [coord[1], coord[0]]),
            distance: route.distance,
            duration: route.duration,
            instructions: route.legs.flatMap(leg => 
              leg.steps?.map(step => ({
                instruction: step.maneuver?.instruction || step.name || 'Continue',
                distance: step.distance,
                duration: step.duration
              })) || []
            )
          };
        }
      } catch (error) {
        continue;
      }
    }
    
    return { success: false };
  }

  /**
   * Select the best safe route from candidates
   */
  /**
   * Select the best safe route from candidates
   * @param {Array} candidates - Array of route candidates
   * @param {Object} fastestRoute - The fastest route as baseline
   * @param {Object} factorWeights - User's factor weights for trade-off tuning
   */
  selectBestSafeRoute(candidates, fastestRoute, factorWeights = null) {
    if (candidates.length === 0) {
      return { ...fastestRoute, type: 'safest', routeType: 'fallback' };
    }
    
    // First, sort by safety rating (highest first)
    candidates.sort((a, b) => b.safetyRating - a.safetyRating);
    
    // Get the safest route
    const safest = candidates[0];
    
    // Adjust distance penalty based on user's crime weight
    const weights = factorWeights || DEFAULT_FACTOR_WEIGHTS;
    const crimeWeight = weights.crime || 0.4;
    const distancePenaltyMultiplier = 0.5 * (DEFAULT_FACTOR_WEIGHTS.crime / crimeWeight);
    
    // Check if the safest route is reasonable in terms of distance
    const distanceRatio = safest.distance / fastestRoute.distance;
    const distancePenalty = Math.max(0, (distanceRatio - 1) * distancePenaltyMultiplier);
    
    // If safest route is too long (>50% detour) and not significantly safer, use fastest
    if (distanceRatio > 1.5 && (safest.safetyRating - fastestRoute.safetyRating) < 0.5) {
      // Find a balance: safest route within reasonable distance
      const reasonableCandidates = candidates.filter(r => r.distance <= fastestRoute.distance * 1.5);
      if (reasonableCandidates.length > 0) {
        // Among reasonable candidates, pick the safest
        reasonableCandidates.sort((a, b) => b.safetyRating - a.safetyRating);
        return reasonableCandidates[0];
      }
    }
    
    // Return the safest route
    return safest;
  }

  /**
   * Check if two routes are essentially the same
   */
  routesAreSimilar(coords1, coords2) {
    if (!coords1 || !coords2) return false;
    
    // Compare lengths - if they differ by more than 10%, they're different
    if (Math.abs(coords1.length - coords2.length) > coords1.length * 0.1) {
      return false;
    }
    
    // Sample and compare points (every 300m)
    const samples1 = this.sampleRoutePoints(coords1, 0.3);
    const samples2 = this.sampleRoutePoints(coords2, 0.3);
    
    if (samples1.length === 0 || samples2.length === 0) return false;
    
    let matchCount = 0;
    const threshold = 0.0005; // ~50m (stricter threshold)
    
    for (const p1 of samples1) {
      for (const p2 of samples2) {
        if (Math.abs(p1[0] - p2[0]) < threshold && Math.abs(p1[1] - p2[1]) < threshold) {
          matchCount++;
          break;
        }
      }
    }
    
    // Require 90% of points to match (stricter than 80%)
    const matchPercentage = matchCount / samples1.length;
    console.log(`[RouteSimilarity] Match: ${matchCount}/${samples1.length} points (${(matchPercentage * 100).toFixed(1)}%) - Threshold: 90%`);
    
    return matchPercentage >= 0.9;
  }

  /**
   * Calculate bearing between two points
   */
  calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  }

  /**
   * Offset a point by distance and bearing
   */
  offsetPoint(lat, lon, bearing, distanceKm) {
    const R = 6371; // Earth radius in km
    const bearingRad = bearing * Math.PI / 180;
    const latRad = lat * Math.PI / 180;
    const lonRad = lon * Math.PI / 180;
    
    const newLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(distanceKm / R) +
      Math.cos(latRad) * Math.sin(distanceKm / R) * Math.cos(bearingRad)
    );
    
    const newLonRad = lonRad + Math.atan2(
      Math.sin(bearingRad) * Math.sin(distanceKm / R) * Math.cos(latRad),
      Math.cos(distanceKm / R) - Math.sin(latRad) * Math.sin(newLatRad)
    );
    
    return [newLatRad * 180 / Math.PI, newLonRad * 180 / Math.PI];
  }

  async getOSRMRoute(fromLat, fromLon, toLat, toLon, mode, requestAlternatives = false) {
    const endpoints = this.osrmEndpoints[mode] || this.osrmEndpoints.walking;
    const alternativeParam = requestAlternatives ? '&alternatives=true' : '';
    
    for (const baseUrl of endpoints) {
      try {
        const url = `${baseUrl}/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson&steps=true${alternativeParam}`;
        
        console.log(`[RouteCalculator] Trying OSRM: ${url}`);
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'SafePath/1.0'
          }
        });
        
        if (!response.ok) {
          console.warn(`[RouteCalculator] OSRM returned ${response.status} for ${baseUrl}`);
          continue; // Try next endpoint
        }
        
        const data = await response.json();
        
        console.log(`[RouteCalculator] OSRM response code: ${data.code}, routes: ${data.routes?.length || 0}`);
        
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          // If alternatives requested and available, use the second route (usually longer but potentially safer)
          const routeIndex = requestAlternatives && data.routes.length > 1 ? 1 : 0;
          const route = data.routes[routeIndex];
          
          const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]); // Convert [lon,lat] to [lat,lon]
          
          console.log(`[RouteCalculator] OSRM success: ${coordinates.length} points, ${route.distance}m, ${route.duration}s`);
          
          return {
            success: true,
            coordinates,
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
        console.warn(`[RouteCalculator] OSRM endpoint ${baseUrl} failed:`, error.message);
        continue; // Try next endpoint
      }
    }
    
    console.error('[RouteCalculator] All OSRM endpoints failed');
    return { success: false };
  }

  async calculateStraightLineRoutes(fromLat, fromLon, toLat, toLon, mode, timeOfDay = 'day') {
    const distance = csvDataLoader.calculateDistance(fromLat, fromLon, toLat, toLon);
    const speed = this.getSpeedForMode(mode);
    const duration = (distance / speed) * 60; // minutes
    
    const coordinates = [[fromLat, fromLon], [toLat, toLon]];
    const safetyScore = await this.calculateRouteSafetyScore(coordinates, null, timeOfDay);
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
