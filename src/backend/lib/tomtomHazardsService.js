/**
 * TomTom Traffic Incidents Service
 * Fetches real-time traffic incidents including construction, road closures, and accidents
 * Uses TomTom Traffic Incidents API
 * 
 * Academic Project - Proof of Concept
 * Demonstrates integration of commercial traffic data for comprehensive hazard detection
 */

const axios = require('axios');

class TomTomHazardsService {
  constructor() {
    // TomTom API configuration
    this.apiKey = process.env.TOMTOM_API_KEY;
    this.baseUrl = 'https://api.tomtom.com/traffic/services/5/incidentDetails';
    
    if (!this.apiKey) {
      console.warn('⚠️  TOMTOM_API_KEY not found in environment. TomTom incidents will not be available.');
      console.warn('💡 Get a free API key from https://developer.tomtom.com/');
    }
    
    // Simple cache to reduce API calls (15 minute TTL for traffic data)
    this.cache = new Map();
    this.cacheTTL = 15 * 60 * 1000; // 15 minutes (traffic changes more frequently than construction)
    this.backgroundRefreshThreshold = 10 * 60 * 1000; // Refresh in background after 10 minutes
  }

  /**
   * Get cache key for location
   */
  getCacheKey(lat, lon, radius) {
    // Round to 2 decimals (~1km precision) for better cache grouping
    const latRounded = Math.round(lat * 100) / 100;
    const lonRounded = Math.round(lon * 100) / 100;
    return `${latRounded},${lonRounded},${radius}`;
  }

  /**
   * Get cached data if available and not expired
   */
  getCached(key) {
    const cached = this.cache.get(key);
    if (!cached) return { data: null, needsRefresh: false };
    
    const age = Date.now() - cached.timestamp;
    
    if (age < this.backgroundRefreshThreshold) {
      console.log(`✅ Using fresh cached TomTom data (${Math.round(age / 1000)}s old)`);
      return { data: cached.data, needsRefresh: false };
    }
    
    if (age < this.cacheTTL) {
      console.log(`⚠️  Using stale cached TomTom data (${Math.round(age / 60000)}min old), will refresh in background`);
      return { data: cached.data, needsRefresh: true };
    }
    
    return { data: null, needsRefresh: false };
  }

  /**
   * Store data in cache
   */
  setCached(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
    
    // Clean up old cache entries (keep last 50)
    if (this.cache.size > 50) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Fetch traffic incidents from TomTom
   * @param {number} latitude - Center latitude
   * @param {number} longitude - Center longitude
   * @param {number} radius - Search radius in meters (default 5000m = 5km)
   * @returns {Promise<Array>} Array of traffic incident hazards
   */
  async getTomTomHazards(latitude, longitude, radius = 5000) {
    // Check if API key is available
    if (!this.apiKey) {
      console.warn('⚠️  TomTom API key not configured. Returning empty results.');
      return [];
    }

    // Check cache first
    const cacheKey = this.getCacheKey(latitude, longitude, radius);
    const cacheResult = this.getCached(cacheKey);
    
    if (cacheResult.data) {
      if (cacheResult.needsRefresh) {
        this.refreshInBackground(latitude, longitude, radius, cacheKey).catch(err => {
          console.warn('Background TomTom refresh failed:', err.message);
        });
      }
      return cacheResult.data;
    }
    
    try {
      // Calculate bounding box from center point and radius
      const bbox = this.calculateBoundingBox(latitude, longitude, radius);
      
      // TomTom Traffic Incidents API
      const url = `${this.baseUrl}`;
      const params = {
        key: this.apiKey,
        bbox: `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`,
        fields: '{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,endTime,from,to,length,delay,roadNumbers,timeValidity}}}',
        language: 'en-GB',
        categoryFilter: '0,1,2,3,4,5,6,7,8,9,10,11,14', // Include most incident types
        timeValidityFilter: 'present'
      };

      console.log(`🚦 Fetching TomTom traffic incidents for bbox: ${params.bbox}`);
      
      const response = await axios.get(url, {
        params,
        timeout: 30000
      });

      const incidents = this.parseTomTomData(response.data, latitude, longitude);
      console.log(`✅ Found ${incidents.length} TomTom traffic incidents`);
      
      this.setCached(cacheKey, incidents);
      return incidents;

    } catch (error) {
      console.error('❌ TomTom API error:', error.response?.data || error.message);
      
      // Return expired cache if available
      const anyCached = this.cache.get(cacheKey);
      if (anyCached) {
        console.log('💾 Using expired cache as fallback');
        return anyCached.data || [];
      }
      
      return [];
    }
  }

  /**
   * Refresh TomTom data in background
   */
  async refreshInBackground(latitude, longitude, radius, cacheKey) {
    try {
      console.log('🔄 Refreshing TomTom data in background...');
      const bbox = this.calculateBoundingBox(latitude, longitude, radius);
      
      const url = `${this.baseUrl}`;
      const params = {
        key: this.apiKey,
        bbox: `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`,
        fields: '{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,endTime,from,to,length,delay,roadNumbers,timeValidity}}}',
        language: 'en-GB',
        categoryFilter: '0,1,2,3,4,5,6,7,8,9,10,11,14',
        timeValidityFilter: 'present'
      };

      const response = await axios.get(url, { params, timeout: 30000 });
      const incidents = this.parseTomTomData(response.data, latitude, longitude);
      
      this.setCached(cacheKey, incidents);
      console.log('✅ Background TomTom refresh completed');
    } catch (error) {
      console.warn('Background refresh failed, keeping old cache:', error.message);
    }
  }

  /**
   * Calculate bounding box from center point and radius
   */
  calculateBoundingBox(lat, lon, radiusMeters) {
    // Approximate degrees per meter
    const latDegreePerMeter = 1 / 111000;
    const lonDegreePerMeter = 1 / (111000 * Math.cos(lat * Math.PI / 180));
    
    const latDelta = radiusMeters * latDegreePerMeter;
    const lonDelta = radiusMeters * lonDegreePerMeter;
    
    return {
      minLat: lat - latDelta,
      maxLat: lat + latDelta,
      minLon: lon - lonDelta,
      maxLon: lon + lonDelta
    };
  }

  /**
   * Parse TomTom API response into hazard format
   */
  parseTomTomData(data, centerLat, centerLon) {
    const hazards = [];
    
    if (!data.incidents || data.incidents.length === 0) {
      return hazards;
    }

    data.incidents.forEach(incident => {
      try {
        const hazard = this.createHazardFromIncident(incident, centerLat, centerLon);
        if (hazard) {
          hazards.push(hazard);
        }
      } catch (error) {
        console.warn('Error parsing TomTom incident:', error.message);
      }
    });

    return hazards;
  }

  /**
   * Create hazard object from TomTom incident
   */
  createHazardFromIncident(incident, centerLat, centerLon) {
    const props = incident.properties || {};
    const geometry = incident.geometry || {};
    
    // Get coordinates (use first point of LineString or Point coordinates)
    let lat, lon;
    if (geometry.type === 'Point' && geometry.coordinates) {
      [lon, lat] = geometry.coordinates;
    } else if (geometry.type === 'LineString' && geometry.coordinates && geometry.coordinates.length > 0) {
      // Use middle point of the line
      const midIndex = Math.floor(geometry.coordinates.length / 2);
      [lon, lat] = geometry.coordinates[midIndex];
    } else {
      return null; // No valid coordinates
    }

    // Map TomTom icon categories to our hazard types
    const hazardType = this.mapIconCategoryToHazardType(props.iconCategory);
    const severity = this.mapMagnitudeToSeverity(props.magnitudeOfDelay);

    // Get description from events
    let description = '';
    if (props.events && props.events.length > 0) {
      description = props.events.map(e => e.description).join('. ');
    }
    
    // Build detailed description
    const from = props.from || '';
    const to = props.to || '';
    const roadNumbers = props.roadNumbers ? props.roadNumbers.join(', ') : '';
    
    let detailedDescription = description;
    if (from && to) {
      detailedDescription += ` From ${from} to ${to}.`;
    } else if (from) {
      detailedDescription += ` At ${from}.`;
    }
    if (roadNumbers) {
      detailedDescription += ` Road: ${roadNumbers}.`;
    }
    if (props.length) {
      detailedDescription += ` Length: ${Math.round(props.length)}m.`;
    }
    if (props.delay) {
      detailedDescription += ` Delay: ${Math.round(props.delay / 60)} min.`;
    }

    return {
      id: `tomtom-${props.id}`,
      latitude: lat,
      longitude: lon,
      type: hazardType,
      hazardType: hazardType,
      severity: severity,
      description: detailedDescription.trim() || 'Traffic incident',
      source: 'tomtom',
      reported_at: props.startTime || new Date().toISOString(),
      start_date: props.startTime || null,
      end_date: props.endTime || null,
      distanceMeters: this.calculateDistance(centerLat, centerLon, lat, lon),
      verified: true, // TomTom data is from official sources
      // Additional TomTom-specific data
      iconCategory: props.iconCategory,
      magnitudeOfDelay: props.magnitudeOfDelay,
      length: props.length,
      delay: props.delay
    };
  }

  /**
   * Map TomTom icon category to our hazard types
   * TomTom Categories:
   * 0: Unknown, 1: Accident, 2: Fog, 3: Dangerous Conditions, 4: Rain
   * 5: Ice, 6: Jam, 7: Lane Closed, 8: Road Closed, 9: Road Works
   * 10: Wind, 11: Flooding, 14: Broken Down Vehicle
   */
  mapIconCategoryToHazardType(category) {
    const mapping = {
      0: 'accident',
      1: 'accident',
      2: 'poor_lighting', // Fog affects visibility
      3: 'road_damage',
      4: 'flooding',
      5: 'road_damage', // Ice
      6: 'accident', // Traffic jam (often due to incidents)
      7: 'road_closure',
      8: 'road_closure',
      9: 'construction',
      10: 'road_damage', // Wind damage
      11: 'flooding',
      14: 'accident' // Broken down vehicle
    };
    
    return mapping[category] || 'accident';
  }

  /**
   * Map TomTom magnitude of delay to severity
   * 0: Unknown, 1: Minor, 2: Moderate, 3: Major, 4: Undefined
   */
  mapMagnitudeToSeverity(magnitude) {
    const mapping = {
      0: 'medium',
      1: 'low',
      2: 'medium',
      3: 'high',
      4: 'critical'
    };
    
    return mapping[magnitude] || 'medium';
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @returns {number} Distance in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  }

  /**
   * Calculate collision density from TomTom traffic incidents (accidents, jams, breakdowns)
   * @param {number} latitude - Center point latitude
   * @param {number} longitude - Center point longitude
   * @param {number} radiusKm - Search radius in kilometers
   * @returns {Promise<number>} Collision density score 0-1 (0=safe, 1=high collision risk)
   */
  async getCollisionDensity(latitude, longitude, radiusKm = 0.5) {
    try {
      const incidents = await this.getTomTomHazards(latitude, longitude, radiusKm * 1000);
      
      // Filter for collision-related incidents
      const collisionIncidents = incidents.filter(inc => {
        const category = inc.iconCategory;
        // Categories: 1=Accident, 6=Jam, 14=Broken Down Vehicle
        return category === 1 || category === 6 || category === 14;
      });

      if (collisionIncidents.length === 0) {
        return 0.1; // Low baseline collision risk if no incidents
      }

      console.log(`[CollisionDensity] Found ${collisionIncidents.length} collision-related incidents within ${radiusKm}km of [${latitude.toFixed(4)}, ${longitude.toFixed(4)}]`);

      // Score based on:
      // 1. Number of incidents
      // 2. Severity (magnitudeOfDelay)
      // 3. Distance (closer = higher risk)
      
      const severityWeights = {
        'critical': 3.0,
        'high': 2.0,
        'medium': 1.0,
        'low': 0.5
      };

      let totalScore = 0;

      collisionIncidents.forEach(incident => {
        const distanceKm = incident.distanceMeters / 1000;
        const distanceFactor = Math.max(0, 1 - (distanceKm / radiusKm));
        
        const severityWeight = severityWeights[incident.severity] || 1.0;
        
        // Active accidents are more concerning than resolved jams
        const urgencyBonus = incident.iconCategory === 1 ? 1.5 : 1.0;
        
        const incidentImpact = severityWeight * distanceFactor * urgencyBonus;
        totalScore += incidentImpact;
        
        console.log(`    - [Collision] ${incident.type} (${incident.severity}): distance=${distanceKm.toFixed(3)}km, impact=${incidentImpact.toFixed(3)}`);
      });

      // Normalize: 2+ high-severity accidents nearby = maximum danger (1.0)
      const normalizedScore = Math.min(1.0, totalScore / 2.0);
      
      console.log(`[CollisionDensity] Total score: ${totalScore.toFixed(3)}, Normalized: ${normalizedScore.toFixed(3)}`);
      
      return normalizedScore;

    } catch (error) {
      console.error('Error calculating collision density from TomTom:', error.message);
      return 0.2; // Fallback to moderate risk
    }
  }
}

// Export singleton instance
module.exports = new TomTomHazardsService();
