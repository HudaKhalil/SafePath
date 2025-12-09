/**
 * Street Lighting Data Service
 * 
 * Queries OpenStreetMap Overpass API for street lighting data
 * and caches results in PostgreSQL database for fast routing queries.
 * 
 * OSM Tags Used:
 * - highway=street_lamp, highway=lamp_post
 * - lit=yes/no/automatic/interval
 * - lamp_type, light_source
 */

const db = require('../config/database');

class LightingService {
  constructor() {
    this.overpassEndpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.openstreetmap.ru/api/interpreter'
    ];
    
    // Cache settings
    this.cacheExpiryDays = 30; // Refresh lighting data monthly
    this.gridResolution = 0.01; // ~1km grid cells
    this.maxQueryArea = 0.05; // Max 5km x 5km per query
  }

  /**
   * Check if it's currently daytime at the given location
   * @param {number} latitude 
   * @param {number} longitude 
   * @param {string} forceMode - Optional: 'day', 'night', 'morning-rush', 'evening-rush' for testing
   * @returns {boolean} - True if daytime (sun is up)
   */
  isDaytime(latitude, longitude, forceMode = null) {
    // Allow manual override for testing
    if (forceMode === 'night') return false;
    if (forceMode === 'day') return true;
    if (forceMode === 'morning-rush' || forceMode === 'evening-rush') {
      // Rush hours - treat as daylight but might want different logic later
      return true;
    }
    
    const now = new Date();
    const hour = now.getUTCHours();
    
    // Simple approximation: 6 AM to 8 PM local time is considered daytime
    // For more accuracy, could use sunrise/sunset calculations
    // Adjust for approximate timezone based on longitude (-180 to 180 degrees)
    const timezoneOffset = Math.round(longitude / 15); // Rough estimate
    const localHour = (hour + timezoneOffset + 24) % 24;
    
    return localHour >= 6 && localHour < 20; // 6 AM - 8 PM
  }

  /**
   * Get lighting index for a specific location (0.0 = well-lit, 1.0 = dark)
   * @param {number} latitude 
   * @param {number} longitude 
   * @param {number} radius - Search radius in meters (default 100m)
   * @returns {Promise<number>} - Lighting darkness index (lower is better)
   */
  async getLightingIndex(latitude, longitude, radius = 100) {
    try {
      console.log(`🔦 Getting lighting index for (${latitude}, ${longitude})...`);
      
      // During daytime, lighting doesn't matter - return best score
      if (this.isDaytime(latitude, longitude)) {
        console.log(`   ☀️ Daytime detected - lighting not relevant (returning 0.1)`);
        return 0.1; // Well-lit score
      }
      
      // Check if we have recent cached data for this grid cell
      const gridCell = this.getGridCell(latitude, longitude);
      const cacheStatus = await this.checkCacheStatus(gridCell);
      
      console.log(`   Cache status: hasData=${cacheStatus.hasData}, isExpired=${cacheStatus.isExpired}`);
      
      if (!cacheStatus.hasData || cacheStatus.isExpired) {
        // Fetch and cache lighting data for this area
        console.log(`   📥 Fetching lighting data from OSM...`);
        await this.fetchAndCacheLightingData(latitude, longitude);
      }
      
      // Query nearby lights from cache
      const nearbyLights = await this.getNearbyLights(latitude, longitude, radius);
      console.log(`   Found ${nearbyLights.length} nearby lights within ${radius}m`);
      
      // Calculate lighting index based on proximity and coverage
      const lightingIndex = this.calculateLightingIndex(nearbyLights, radius);
      console.log(`   ✅ Lighting index: ${lightingIndex.toFixed(3)} (0=well-lit, 1=dark)`);
      
      return lightingIndex;
      
    } catch (error) {
      console.error('❌ Error getting lighting index:', error.message);
      console.error('   Falling back to moderate lighting (0.3)');
      // Return moderate lighting as fallback
      return 0.3;
    }
  }

  /**
   * Get lighting data for an entire route
   * @param {Array<[lon, lat]>} coordinates - Route coordinates
   * @returns {Promise<Array<number>>} - Lighting index for each segment
   */
  async getRouteLightingData(coordinates) {
    try {
      const bbox = this.calculateBoundingBox(coordinates);
      
      // Ensure we have data for the entire route area
      await this.ensureAreaCoverage(bbox);
      
      // Calculate lighting index for each coordinate
      const lightingData = [];
      for (const coord of coordinates) {
        const [lon, lat] = coord;
        const index = await this.getLightingIndex(lat, lon, 50);
        lightingData.push(index);
      }
      
      return lightingData;
      
    } catch (error) {
      console.error('Error getting route lighting data:', error);
      // Return moderate lighting for all points as fallback
      return coordinates.map(() => 0.3);
    }
  }

  /**
   * Fetch lighting data from OSM Overpass API and cache it
   */
  async fetchAndCacheLightingData(centerLat, centerLon, radiusKm = 2) {
    const bbox = {
      south: centerLat - (radiusKm / 111),  // ~111km per degree latitude
      north: centerLat + (radiusKm / 111),
      west: centerLon - (radiusKm / (111 * Math.cos(centerLat * Math.PI / 180))),
      east: centerLon + (radiusKm / (111 * Math.cos(centerLat * Math.PI / 180)))
    };
    
    // Build Overpass QL query for street lights
    const query = `
      [out:json][timeout:25];
      (
        node["highway"="street_lamp"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["highway"="lamp_post"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        way["lit"="yes"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        way["highway"]["lit"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      );
      out body;
      >;
      out skel qt;
    `;
    
    let data = null;
    let lastError = null;
    
    // Try multiple Overpass endpoints
    for (const endpoint of this.overpassEndpoints) {
      try {
        console.log(`🔦 Querying OSM Overpass API for lighting data: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          timeout: 30000
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        data = await response.json();
        console.log(`✅ Fetched ${data.elements?.length || 0} lighting elements from OSM`);
        break; // Success, exit loop
        
      } catch (error) {
        console.warn(`Failed to query ${endpoint}:`, error.message);
        lastError = error;
        continue; // Try next endpoint
      }
    }
    
    if (!data || !data.elements) {
      console.error('All Overpass API endpoints failed');
      throw lastError || new Error('Failed to fetch lighting data from OSM');
    }
    
    // Process and cache the lighting data
    await this.cacheLightingElements(data.elements);
    
    return data.elements.length;
  }

  /**
   * Cache lighting elements in database
   */
  async cacheLightingElements(elements) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      let insertCount = 0;
      
      for (const element of elements) {
        // Extract coordinates
        let lat, lon;
        
        if (element.type === 'node') {
          lat = element.lat;
          lon = element.lon;
        } else if (element.type === 'way' && element.geometry) {
          // For ways, use the center point
          const coords = element.geometry;
          lat = coords.reduce((sum, pt) => sum + pt.lat, 0) / coords.length;
          lon = coords.reduce((sum, pt) => sum + pt.lon, 0) / coords.length;
        } else {
          continue; // Skip if no coordinates
        }
        
        // Extract OSM tags
        const tags = element.tags || {};
        const lit = tags.lit || (tags.highway === 'street_lamp' || tags.highway === 'lamp_post' ? 'yes' : null);
        const lampType = tags.lamp_type || tags['lamp:type'];
        const lightSource = tags.light_source || tags['light:source'];
        const highway = tags.highway;
        const support = tags.support;
        
        // Calculate lighting score (lower = better lit)
        const lightingScore = this.calculateLightingScore(lit, lampType, lightSource);
        
        // Calculate coverage radius based on lamp type
        const coverageRadius = this.estimateCoverageRadius(tags);
        
        // Get grid cell
        const gridCell = this.getGridCell(lat, lon);
        
        // Insert or update in database (using UPSERT)
        await client.query(`
          INSERT INTO street_lighting (
            location, latitude, longitude,
            osm_id, osm_type,
            lit, lamp_type, light_source, highway, support,
            lighting_score, coverage_radius,
            osm_timestamp, grid_cell, cached_at
          ) VALUES (
            ST_SetSRID(ST_MakePoint($1, $2), 4326), $2, $1,
            $3, $4,
            $5, $6, $7, $8, $9,
            $10, $11,
            $12, $13, NOW()
          )
          ON CONFLICT (osm_id, osm_type) 
          DO UPDATE SET
            lit = EXCLUDED.lit,
            lamp_type = EXCLUDED.lamp_type,
            light_source = EXCLUDED.light_source,
            lighting_score = EXCLUDED.lighting_score,
            coverage_radius = EXCLUDED.coverage_radius,
            cached_at = NOW()
        `, [
          lon, lat, // $1, $2
          element.id, element.type, // $3, $4
          lit, lampType, lightSource, highway, support, // $5-$9
          lightingScore, coverageRadius, // $10, $11
          element.timestamp || new Date().toISOString(), gridCell // $12, $13
        ]);
        
        insertCount++;
      }
      
      await client.query('COMMIT');
      console.log(`✅ Cached ${insertCount} street lights in database`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error caching lighting elements:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get nearby lights from cache
   */
  async getNearbyLights(latitude, longitude, radiusMeters) {
    const query = `
      SELECT 
        light_id,
        latitude,
        longitude,
        lit,
        lighting_score,
        coverage_radius,
        ST_Distance(
          location::geography,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
        ) as distance
      FROM street_lighting
      WHERE ST_DWithin(
        location::geography,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
        $3
      )
      AND cached_at > NOW() - INTERVAL '${this.cacheExpiryDays} days'
      ORDER BY distance
      LIMIT 50
    `;
    
    const result = await db.query(query, [latitude, longitude, radiusMeters]);
    return result.rows;
  }

  /**
   * Calculate lighting index based on nearby lights
   * Lower value = better lighting (less darkness risk)
   */
  calculateLightingIndex(nearbyLights, searchRadius) {
    if (nearbyLights.length === 0) {
      // No lights found = dark area
      return 0.7; // High darkness risk
    }
    
    // Calculate weighted average based on proximity and coverage
    let totalWeight = 0;
    let weightedScore = 0;
    
    for (const light of nearbyLights) {
      const distance = parseFloat(light.distance);
      const coverageRadius = light.coverage_radius;
      const lightingScore = parseFloat(light.lighting_score);
      
      // Calculate influence (inverse distance decay)
      let influence;
      if (distance <= coverageRadius) {
        // Within coverage = full influence
        influence = 1.0;
      } else {
        // Beyond coverage = diminishing influence
        influence = Math.max(0, 1.0 - (distance - coverageRadius) / searchRadius);
      }
      
      totalWeight += influence;
      weightedScore += lightingScore * influence;
    }
    
    if (totalWeight === 0) {
      return 0.7; // No effective coverage
    }
    
    const finalScore = weightedScore / totalWeight;
    
    // Ensure score stays within bounds
    return Math.max(0.0, Math.min(1.0, finalScore));
  }

  /**
   * Calculate lighting score from OSM tags
   */
  calculateLightingScore(lit, lampType, lightSource) {
    let score = 0.3; // Default moderate lighting
    
    // Lower score = better lighting (less darkness risk)
    if (lit === 'yes') {
      score = 0.1; // Well-lit
    } else if (lit === 'automatic' || lit === 'interval' || lit === 'sunset-sunrise') {
      score = 0.15; // Automatic lighting
    } else if (lit === 'no') {
      score = 0.8; // Explicitly dark
    } else if (lit === 'limited') {
      score = 0.5; // Poor lighting
    }
    
    // Adjust based on lamp technology
    if (lightSource === 'LED') {
      score *= 0.9; // LED is brighter
    } else if (lightSource === 'metal_halide') {
      score *= 0.95;
    } else if (lightSource === 'gas_lantern') {
      score *= 1.2; // Dimmer
    }
    
    return Math.max(0.0, Math.min(1.0, score));
  }

  /**
   * Estimate coverage radius based on lamp type
   */
  estimateCoverageRadius(tags) {
    const lampType = tags.lamp_type || tags['lamp:type'];
    const lightSource = tags.light_source || tags['light:source'];
    const highway = tags.highway;
    
    // Typical coverage radii
    if (lightSource === 'LED' && lampType === 'electric') {
      return 40; // Modern LED street lights
    } else if (highway === 'street_lamp') {
      return 30; // Standard street lamp
    } else if (highway === 'lamp_post') {
      return 25; // Smaller lamp post
    } else if (lightSource === 'gas_lantern') {
      return 15; // Historic gas lights
    }
    
    return 30; // Default coverage
  }

  /**
   * Get grid cell for coordinates
   */
  getGridCell(lat, lon) {
    const latRounded = Math.round(lat / this.gridResolution) * this.gridResolution;
    const lonRounded = Math.round(lon / this.gridResolution) * this.gridResolution;
    return `${latRounded.toFixed(2)}_${lonRounded.toFixed(2)}`;
  }

  /**
   * Check cache status for a grid cell
   */
  async checkCacheStatus(gridCell) {
    const query = `
      SELECT 
        COUNT(*) as light_count,
        MAX(cached_at) as last_cached
      FROM street_lighting
      WHERE grid_cell = $1
      AND cached_at > NOW() - INTERVAL '${this.cacheExpiryDays} days'
    `;
    
    const result = await db.query(query, [gridCell]);
    const row = result.rows[0];
    
    return {
      hasData: parseInt(row.light_count) > 0,
      isExpired: !row.last_cached || 
                 (Date.now() - new Date(row.last_cached).getTime() > this.cacheExpiryDays * 24 * 60 * 60 * 1000)
    };
  }

  /**
   * Calculate bounding box for route coordinates
   */
  calculateBoundingBox(coordinates) {
    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;
    
    for (const [lon, lat] of coordinates) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
    }
    
    return { minLat, maxLat, minLon, maxLon };
  }

  /**
   * Ensure we have lighting data coverage for an area
   */
  async ensureAreaCoverage(bbox) {
    const centerLat = (bbox.minLat + bbox.maxLat) / 2;
    const centerLon = (bbox.minLon + bbox.maxLon) / 2;
    
    const gridCell = this.getGridCell(centerLat, centerLon);
    const cacheStatus = await this.checkCacheStatus(gridCell);
    
    if (!cacheStatus.hasData || cacheStatus.isExpired) {
      // Calculate appropriate radius (diagonal of bbox / 2)
      const latDiff = bbox.maxLat - bbox.minLat;
      const lonDiff = bbox.maxLon - bbox.minLon;
      const radiusKm = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111 / 2;
      
      await this.fetchAndCacheLightingData(centerLat, centerLon, Math.min(radiusKm, 5));
    }
  }
}

module.exports = new LightingService();
