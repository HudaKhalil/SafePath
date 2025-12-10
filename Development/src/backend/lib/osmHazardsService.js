/**
 * OSM Hazards Service
 * Fetches construction, road closures, and other hazards from OpenStreetMap
 * Uses Overpass API for real-time querying
 * 
 * Academic Project - Proof of Concept
 * Demonstrates integration of multiple data sources for comprehensive hazard detection
 */

const axios = require('axios');

class OSMHazardsService {
  constructor() {
    // Overpass API endpoint (public, free)
    this.overpassUrl = 'https://overpass-api.de/api/interpreter';
    
    // Alternative endpoints if primary is slow
    this.alternativeEndpoints = [
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.openstreetmap.ru/api/interpreter'
    ];
    
    // Simple cache to reduce API calls (15 minute TTL)
    this.cache = new Map();
    this.cacheTTL = 15 * 60 * 1000; // 15 minutes (OSM data doesn't change frequently)
    this.backgroundRefreshThreshold = 10 * 60 * 1000; // Refresh in background after 10 minutes
  }

  /**
   * Get cache key for location
   */
  getCacheKey(lat, lon, radius) {
    // Round to 2 decimals (~1km precision) for better cache grouping
    // This means requests within ~1km will share the same cache
    const latRounded = Math.round(lat * 100) / 100;
    const lonRounded = Math.round(lon * 100) / 100;
    return `${latRounded},${lonRounded},${radius}`;
  }

  /**
   * Get cached data if available and not expired
   * Returns both data and whether it needs background refresh
   */
  getCached(key) {
    const cached = this.cache.get(key);
    if (!cached) return { data: null, needsRefresh: false };
    
    const age = Date.now() - cached.timestamp;
    
    // Still valid, no refresh needed
    if (age < this.backgroundRefreshThreshold) {
      console.log(`✅ Using fresh cached OSM data (${Math.round(age / 1000)}s old)`);
      return { data: cached.data, needsRefresh: false };
    }
    
    // Stale but still within TTL - return cached but trigger background refresh
    if (age < this.cacheTTL) {
      console.log(`⚠️  Using stale cached OSM data (${Math.round(age / 60000)}min old), will refresh in background`);
      return { data: cached.data, needsRefresh: true };
    }
    
    // Expired
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
   * Fetch construction zones and road closures from OSM
   * @param {number} latitude - Center latitude
   * @param {number} longitude - Center longitude
   * @param {number} radius - Search radius in meters (default 5000m = 5km)
   * @returns {Promise<Array>} Array of OSM hazards
   */
  async getOSMHazards(latitude, longitude, radius = 5000) {
    // Check cache first
    const cacheKey = this.getCacheKey(latitude, longitude, radius);
    const cacheResult = this.getCached(cacheKey);
    
    // Return cached data immediately if available
    if (cacheResult.data) {
      // Trigger background refresh if stale (don't wait for it)
      if (cacheResult.needsRefresh) {
        this.refreshInBackground(latitude, longitude, radius, cacheKey).catch(err => {
          console.warn('Background OSM refresh failed:', err.message);
        });
      }
      return cacheResult.data;
    }
    
    const query = this.buildOverpassQuery(latitude, longitude, radius);
    
    // Try primary endpoint with retry
    let lastError;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await axios.post(this.overpassUrl, query, {
          headers: { 'Content-Type': 'text/plain' },
          timeout: 45000 // 45 second timeout for slow OSM API
        });
        const data = this.parseOSMData(response.data);
        this.setCached(cacheKey, data);
        return data;
      } catch (error) {
        lastError = error;
        
        // If rate limited (429), wait before retry
        if (error.response?.status === 429) {
          console.warn(`⚠️  Overpass API rate limit hit (attempt ${attempt + 1}/2). Waiting...`);
          if (attempt === 0) {
            await this.sleep(2000); // Wait 2 seconds before retry
            continue;
          }
        }
        
        // For other errors, try alternative endpoint immediately
        if (attempt === 0) {
          console.warn(`⚠️  Primary Overpass endpoint failed: ${error.message}. Trying alternative...`);
        }
      }
    }
    
    // Try alternative endpoints
    for (const altUrl of this.alternativeEndpoints) {
      try {
        const response = await axios.post(altUrl, query, {
          headers: { 'Content-Type': 'text/plain' },
          timeout: 30000
        });
        console.log('✅ Alternative OSM endpoint succeeded');
        const data = this.parseOSMData(response.data);
        this.setCached(cacheKey, data);
        return data;
      } catch (altError) {
        console.warn(`⚠️  Alternative endpoint ${altUrl} failed: ${altError.message}`);
      }
    }
    
    // All endpoints failed - return empty array with warning
    console.error('❌ All OSM endpoints failed. Returning community hazards only.');
    if (lastError?.response?.status === 429) {
      console.error('💡 Rate limit exceeded. OSM data temporarily unavailable. Please wait a few minutes.');
    }
    
    // Last resort: return expired cache if available (better than nothing)
    const anyCached = this.cache.get(cacheKey);
    if (anyCached) {
      console.log('💾 Using expired cache as fallback since API failed');
      return anyCached.data || [];
    }
    
    return [];
  }

  /**
   * Refresh OSM data in background without blocking
   */
  async refreshInBackground(latitude, longitude, radius, cacheKey) {
    try {
      console.log('🔄 Refreshing OSM data in background...');
      const query = this.buildOverpassQuery(latitude, longitude, radius);
      
      const response = await axios.post(this.overpassUrl, query, {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 45000
      });
      
      const data = this.parseOSMData(response.data);
      this.setCached(cacheKey, data);
      console.log('✅ Background OSM refresh completed');
    } catch (error) {
      console.warn('Background refresh failed, keeping old cache:', error.message);
    }
  }

  /**
   * Sleep utility for retry delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Build Overpass QL query for construction and closures
   * Simplified query for better performance
   */
  buildOverpassQuery(lat, lon, radius) {
    return `
      [out:json][timeout:30];
      (
        // Roads under construction (most common)
        way["highway"="construction"](around:${radius},${lat},${lon});
        
        // Closed roads with access restrictions
        way["highway"]["access"="no"](around:${radius},${lat},${lon});
      );
      out center meta;
    `;
  }

  /**
   * Parse OSM Overpass API response into hazard format
   * Handles both "out center" and full node data
   */
  parseOSMData(data) {
    const hazards = [];
    
    if (!data.elements || data.elements.length === 0) {
      return hazards;
    }

    // Process ways (roads) - with center coordinates from "out center"
    data.elements.forEach(element => {
      if (element.type === 'way') {
        // "out center" provides center lat/lon directly
        if (element.center && element.center.lat && element.center.lon) {
          const hazard = this.createHazardFromWay(element, element.center);
          if (hazard) {
            hazards.push(hazard);
          }
        } else if (element.lat && element.lon) {
          // Some formats include lat/lon directly
          const hazard = this.createHazardFromWay(element, { lat: element.lat, lon: element.lon });
          if (hazard) {
            hazards.push(hazard);
          }
        }
      } else if (element.type === 'node' && element.lat && element.lon) {
        // Process standalone nodes (barriers, construction points)
        const hazard = this.createHazardFromNode(element);
        if (hazard) {
          hazards.push(hazard);
        }
      }
    });

    return hazards;
  }

  /**
   * Calculate center point of a way
   */
  getWayCenter(way, nodes) {
    const validNodes = way.nodes
      .map(nodeId => nodes[nodeId])
      .filter(node => node && node.lat && node.lon);

    if (validNodes.length === 0) return null;

    const centerIndex = Math.floor(validNodes.length / 2);
    return validNodes[centerIndex];
  }

  /**
   * Create hazard object from OSM way
   */
  createHazardFromWay(way, centerNode) {
    const tags = way.tags || {};
    
    // Check if hazard has expired (end_date in the past)
    const endDate = tags.end_date || tags['construction:end_date'] || tags['temporary:end_date'] || tags.expected_end_date || tags.opening_date;
    if (endDate) {
      try {
        const endDateTime = new Date(endDate);
        const now = new Date();
        if (endDateTime < now) {
          console.log(`⏭️  Skipping expired OSM hazard (ended ${endDate}): ${tags.name || 'Unnamed'}`);
          return null; // Filter out expired hazards
        }
      } catch (e) {
        // Invalid date format, continue showing hazard
      }
    }
    
    // Filter out very old construction (started more than 2 years ago, likely stale data)
    const startDate = tags['construction:date'] || tags.start_date || tags['construction:start_date'];
    if (startDate) {
      try {
        const startDateTime = new Date(startDate);
        const now = new Date();
        const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
        if (startDateTime < twoYearsAgo) {
          console.log(`⏭️  Skipping old OSM hazard (started ${startDate}): ${tags.name || 'Unnamed'} - likely stale`);
          return null; // Filter out very old construction that's likely completed
        }
      } catch (e) {
        // Invalid date format, continue showing hazard
      }
    }
    
    // Determine hazard type
    let type = 'construction';
    let description = 'Road construction or closure';
    let severity = 'medium';

    if (tags.construction) {
      type = 'construction';
      description = `Road under construction: ${tags.name || 'Unnamed road'}`;
      severity = 'high';
    } else if (tags.highway === 'construction') {
      type = 'construction';
      description = `New road construction: ${tags.name || 'Unnamed road'}`;
      severity = 'high';
    } else if (tags.access === 'no') {
      type = 'road_closure';
      description = `Road closed: ${tags.name || 'Unnamed road'}`;
      severity = 'critical';
    } else if (tags['temporary:access'] === 'no') {
      type = 'road_closure';
      description = `Temporary road closure: ${tags.name || 'Unnamed road'}`;
      severity = 'high';
    } else if (tags.roadworks === 'yes') {
      type = 'road_work';
      description = `Road works in progress: ${tags.name || 'Unnamed road'}`;
      severity = 'medium';
    }

    // Add additional context if available
    if (tags.note) {
      description += ` - ${tags.note}`;
    }
    if (tags['construction:date'] || tags.start_date) {
      description += ` (Started: ${tags['construction:date'] || tags.start_date})`;
    }
    if (endDate) {
      description += ` (Ends: ${endDate})`;
    }

    return {
      id: `osm-way-${way.id}`,
      source: 'osm',
      type: type,
      latitude: centerNode.lat,
      longitude: centerNode.lon,
      description: description,
      severity: severity,
      verified: true, // OSM data is community-verified
      created_at: way.timestamp || new Date().toISOString(), // Use OSM edit timestamp
      metadata: {
        osm_id: way.id,
        osm_type: 'way',
        name: tags.name || null,
        highway_type: tags.highway,
        surface: tags.surface || null,
        osm_timestamp: way.timestamp || null,
        osm_version: way.version || null,
        construction_date: tags['construction:date'] || tags.start_date || null,
        end_date: endDate || null,
        tags: tags
      }
    };
  }

  /**
   * Create hazard object from OSM node
   */
  createHazardFromNode(node) {
    const tags = node.tags || {};
    
    // Check if hazard has expired
    const endDate = tags.end_date || tags['construction:end_date'] || tags['temporary:end_date'] || tags.expected_end_date;
    if (endDate) {
      try {
        const endDateTime = new Date(endDate);
        const now = new Date();
        if (endDateTime < now) {
          console.log(`⏭️  Skipping expired OSM node (ended ${endDate})`);
          return null;
        }
      } catch (e) {
        // Invalid date format, continue
      }
    }
    
    let type = 'barrier';
    let description = 'Barrier or obstruction';
    let severity = 'medium';

    if (tags.barrier === 'gate' && tags.access === 'no') {
      type = 'barrier';
      description = 'Closed gate blocking access';
      severity = 'high';
    } else if (tags.barrier === 'bollard' && tags.access === 'no') {
      type = 'barrier';
      description = 'Bollards restricting access';
      severity = 'medium';
    } else if (tags.highway === 'construction') {
      type = 'construction';
      description = 'Construction point';
      severity = 'medium';
    }

    if (tags.note) {
      description += ` - ${tags.note}`;
    }
    if (endDate) {
      description += ` (Ends: ${endDate})`;
    }

    return {
      id: `osm-node-${node.id}`,
      source: 'osm',
      type: type,
      latitude: node.lat,
      longitude: node.lon,
      description: description,
      severity: severity,
      verified: true,
      created_at: node.timestamp || new Date().toISOString(), // Use OSM edit timestamp
      metadata: {
        osm_id: node.id,
        osm_type: 'node',
        osm_timestamp: node.timestamp || null,
        osm_version: node.version || null,
        end_date: endDate || null,
        tags: tags
      }
    };
  }

  /**
   * Merge OSM hazards with community-reported hazards
   * Removes duplicates and prioritizes recent community reports
   */
  mergeHazards(communityHazards, osmHazards) {
    const merged = [...communityHazards];
    
    osmHazards.forEach(osmHazard => {
      // Check if similar hazard exists in community reports (within 50m)
      const isDuplicate = communityHazards.some(communityHazard => {
        const distance = this.calculateDistance(
          osmHazard.latitude,
          osmHazard.longitude,
          communityHazard.latitude,
          communityHazard.longitude
        );
        return distance < 0.05; // 50 meters
      });

      if (!isDuplicate) {
        merged.push(osmHazard);
      }
    });

    return merged;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   * Returns distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }
}

module.exports = new OSMHazardsService();
