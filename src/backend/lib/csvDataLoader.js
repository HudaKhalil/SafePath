const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

class CsvDataLoader {
  constructor() {
    this.crimeData = [];
    this.gridSize = 0.01; // ~1km grid cells
    this.safetyGrid = new Map();
    this.loaded = false;
  }

  async loadCrimeData() {
    if (this.loaded) {
      return;
    }

    console.log('Loading crime data from CSV files...');
    const startTime = Date.now();
    
    const crimeDataPath = path.join(__dirname, '../crimedata');
    const months = fs.readdirSync(crimeDataPath).filter(dir => dir.startsWith('20'));
    
    // Load only the most recent 3 months for better performance
    const recentMonths = months.slice(-3);
    
    for (const month of recentMonths) {
      const monthPath = path.join(crimeDataPath, month);
      const files = fs.readdirSync(monthPath).filter(f => f.endsWith('.csv'));
      
      // Only load Metropolitan (London) data
      const londonFile = files.find(f => f.includes('metropolitan'));
      
      if (londonFile) {
        await this.loadCsvFile(path.join(monthPath, londonFile));
      }
    }
    
    this.buildSafetyGrid();
    this.loaded = true;
    
    const duration = Date.now() - startTime;
    console.log(`Crime data loaded: ${this.crimeData.length} records in ${duration}ms`);
    console.log(`Safety grid built: ${this.safetyGrid.size} cells`);
  }

  async loadCsvFile(filePath) {
    return new Promise((resolve, reject) => {
      const records = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          const lon = parseFloat(row.Longitude);
          const lat = parseFloat(row.Latitude);
          const crimeType = row['Crime type'];
          
          if (!isNaN(lon) && !isNaN(lat) && crimeType) {
            // Only include London area coordinates
            if (lat >= 51.3 && lat <= 51.7 && lon >= -0.5 && lon <= 0.3) {
              records.push({
                longitude: lon,
                latitude: lat,
                crimeType: crimeType,
                severity: this.getCrimeSeverity(crimeType),
                month: row.Month
              });
            }
          }
        })
        .on('end', () => {
          // Use concat instead of spread operator to avoid stack overflow with large arrays
          this.crimeData = this.crimeData.concat(records);
          resolve();
        })
        .on('error', reject);
    });
  }

  getCrimeSeverity(crimeType, userSeverityWeights = null) {
    // Use user-specific severity weights if provided, otherwise use defaults
    if (userSeverityWeights && userSeverityWeights[crimeType] !== undefined) {
      return userSeverityWeights[crimeType];
    }
    
    // Default severity map (used when no user weights available)
    const defaultSeverityMap = {
      'Violence and sexual offences': 1.0,
      'Robbery': 0.9,
      'Burglary': 0.8,
      'Vehicle crime': 0.6,
      'Drugs': 0.7,
      'Possession of weapons': 0.9,
      'Public order': 0.5,
      'Theft from the person': 0.7,
      'Other theft': 0.5,
      'Criminal damage and arson': 0.6,
      'Shoplifting': 0.3,
      'Bicycle theft': 0.4,
      'Other crime': 0.5,
      'Anti-social behaviour': 0.3
    };
    
    return defaultSeverityMap[crimeType] || 0.5;
  }

  buildSafetyGrid(userSeverityWeights = null, userFactorWeights = null) {
    // Build a grid-based safety map with optional user-specific weights
    const gridCounts = new Map();
    
    // Default factor weights if not provided
    const factorWeights = userFactorWeights || {
      crime: 0.4,
      collision: 0.25,
      lighting: 0.2,
      hazard: 0.15
    };
    
    for (const crime of this.crimeData) {
      const gridKey = this.getGridKey(crime.latitude, crime.longitude);
      
      if (!gridCounts.has(gridKey)) {
        gridCounts.set(gridKey, {
          count: 0,
          totalSeverity: 0,
          lat: Math.round(crime.latitude / this.gridSize) * this.gridSize,
          lon: Math.round(crime.longitude / this.gridSize) * this.gridSize
        });
      }
      
      const cell = gridCounts.get(gridKey);
      cell.count += 1;
      // Use user-specific severity if available
      const severity = userSeverityWeights ? 
        this.getCrimeSeverity(crime.crimeType, userSeverityWeights) : 
        crime.severity;
      cell.totalSeverity += severity;
    }
    
    // Calculate percentile-based normalization for better differentiation
    const counts = Array.from(gridCounts.values()).map(c => c.count);
    const severities = Array.from(gridCounts.values()).map(c => c.totalSeverity);
    counts.sort((a, b) => a - b);
    severities.sort((a, b) => a - b);
    
    // Define percentile thresholds for crime scoring
    const getPercentile = (arr, p) => arr[Math.floor(arr.length * p)] || arr[arr.length - 1];
    const p25Count = getPercentile(counts, 0.25);
    const p50Count = getPercentile(counts, 0.50);
    const p75Count = getPercentile(counts, 0.75);
    const p90Count = getPercentile(counts, 0.90);
    const p95Count = getPercentile(counts, 0.95);
    
    console.log(`[SafetyGrid] Percentiles - p25:${p25Count}, p50:${p50Count}, p75:${p75Count}, p90:${p90Count}, p95:${p95Count}`);
    
    for (const [key, cell] of gridCounts.entries()) {
      // Use percentile-based scoring instead of max normalization
      // This provides better differentiation across the safety spectrum
      let crimeRate;
      if (cell.count <= p25Count) {
        // Bottom 25% - Very safe (0.0 - 0.2)
        crimeRate = (cell.count / p25Count) * 0.2;
      } else if (cell.count <= p50Count) {
        // 25-50% - Safe (0.2 - 0.4)
        crimeRate = 0.2 + ((cell.count - p25Count) / (p50Count - p25Count)) * 0.2;
      } else if (cell.count <= p75Count) {
        // 50-75% - Moderate (0.4 - 0.6)
        crimeRate = 0.4 + ((cell.count - p50Count) / (p75Count - p50Count)) * 0.2;
      } else if (cell.count <= p90Count) {
        // 75-90% - Elevated risk (0.6 - 0.8)
        crimeRate = 0.6 + ((cell.count - p75Count) / (p90Count - p75Count)) * 0.2;
      } else {
        // Top 10% - High risk (0.8 - 1.0)
        crimeRate = 0.8 + Math.min(0.2, ((cell.count - p90Count) / (p95Count - p90Count + 1)) * 0.2);
      }
      
      // Apply severity weighting (high severity crimes boost the score)
      const avgSeverity = cell.count > 0 ? cell.totalSeverity / cell.count : 0.5;
      const severityMultiplier = 0.7 + (avgSeverity * 0.6); // Range: 0.7 to 1.3
      const crimeScore = Math.min(1.0, crimeRate * severityMultiplier);
      
      // Estimate other factors (in a real system, these would come from additional data sources)
      const lightingIndex = this.estimateLighting(cell.lat, cell.lon);
      // Collision and hazard have weak correlation with crime (mostly independent factors)
      // Lower multipliers to avoid double-counting crime impact
      const collisionDensity = Math.min(1.0, crimeScore * 0.3 + Math.random() * 0.15 + 0.1);
      const hazardDensity = Math.min(1.0, crimeScore * 0.2 + Math.random() * 0.1 + 0.1);
      
      // Calculate safety score using user-specific or default factor weights
      const safetyScore = (crimeScore * factorWeights.crime) + 
                         (collisionDensity * factorWeights.collision) + 
                         (lightingIndex * factorWeights.lighting) + 
                         (hazardDensity * factorWeights.hazard);
      
      this.safetyGrid.set(key, {
        latitude: cell.lat,
        longitude: cell.lon,
        crimeRate: crimeScore,
        lightingIndex,
        collisionDensity,
        hazardDensity,
        safetyScore: Math.min(1.0, safetyScore),
        crimeCount: cell.count,
        factorWeights // Store the weights used for this calculation
      });
    }
  }

  estimateLighting(lat, lon) {
    // Improved lighting heuristic:
    // - Central London (Zone 1): Well-lit (score 0.2-0.3)
    // - Inner suburbs (Zone 2-3): Well-lit (score 0.2-0.4)
    // - Outer suburbs (Zone 4+): Generally well-lit residential (score 0.3-0.5)
    // Suburban areas like Richmond, St Margarets are well-lit residential
    
    const centralLondonLat = 51.5074;
    const centralLondonLon = -0.1278;
    
    const distance = Math.sqrt(
      Math.pow(lat - centralLondonLat, 2) + 
      Math.pow(lon - centralLondonLon, 2)
    );
    
    // Better model: residential areas have decent street lighting
    // Only remote/rural areas (distance > 0.5) would have poor lighting
    // Scale: 0.2 (central) to 0.5 (outer suburbs) - max 0.5 for built-up areas
    if (distance < 0.1) {
      return 0.2; // Central London - excellent lighting
    } else if (distance < 0.25) {
      return 0.25 + (distance - 0.1) * 0.5; // Inner suburbs - good lighting (0.25-0.325)
    } else {
      return Math.min(0.5, 0.325 + (distance - 0.25) * 0.3); // Outer suburbs - decent lighting (max 0.5)
    }
  }

  getGridKey(latitude, longitude) {
    const latKey = Math.round(latitude / this.gridSize);
    const lonKey = Math.round(longitude / this.gridSize);
    return `${latKey},${lonKey}`;
  }

  getSafetyScoreForLocation(latitude, longitude) {
    const gridKey = this.getGridKey(latitude, longitude);
    const cell = this.safetyGrid.get(gridKey);
    
    if (cell) {
      return cell.safetyScore;
    }
    
    // If no data for this cell, check neighboring cells
    const neighbors = this.getNeighboringCells(latitude, longitude);
    if (neighbors.length > 0) {
      const avgScore = neighbors.reduce((sum, n) => sum + n.safetyScore, 0) / neighbors.length;
      return avgScore;
    }
    
    // Default to SAFE if no crime data (no crimes = safe area)
    return 0.1;
  }

  getNeighboringCells(latitude, longitude, radius = 1) {
    const neighbors = [];
    const centerLatKey = Math.round(latitude / this.gridSize);
    const centerLonKey = Math.round(longitude / this.gridSize);
    
    for (let latOffset = -radius; latOffset <= radius; latOffset++) {
      for (let lonOffset = -radius; lonOffset <= radius; lonOffset++) {
        if (latOffset === 0 && lonOffset === 0) continue;
        
        const key = `${centerLatKey + latOffset},${centerLonKey + lonOffset}`;
        const cell = this.safetyGrid.get(key);
        if (cell) {
          neighbors.push(cell);
        }
      }
    }
    
    return neighbors;
  }

  getSafetyMetrics(latitude, longitude) {
    const gridKey = this.getGridKey(latitude, longitude);
    const cell = this.safetyGrid.get(gridKey);
    
    if (cell) {
      return {
        crimeRate: cell.crimeRate,
        lightingIndex: cell.lightingIndex,
        collisionDensity: cell.collisionDensity,
        hazardDensity: cell.hazardDensity,
        safetyScore: cell.safetyScore,
        crimeCount: cell.crimeCount
      };
    }
    
    // Return default values if no data - no crimes means SAFE area
    return {
      crimeRate: 0.1,        // Low crime (no data = no reported crimes)
      lightingIndex: 0.3,    // Assume decent lighting in residential areas
      collisionDensity: 0.2, // Low collision risk
      hazardDensity: 0.2,    // Low hazard risk
      safetyScore: 0.1,      // Safe overall
      crimeCount: 0
    };
  }

  getCrimesNearLocation(latitude, longitude, radiusKm = 1) {
    const crimes = [];
    const radiusDegrees = radiusKm / 111; // Rough conversion
    
    for (const crime of this.crimeData) {
      const distance = this.calculateDistance(
        latitude, longitude,
        crime.latitude, crime.longitude
      );
      
      if (distance <= radiusKm) {
        crimes.push({
          ...crime,
          distance
        });
      }
    }
    
    return crimes;
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  isLoaded() {
    return this.loaded;
  }

  /**
   * Calculate real hazard density from database hazards
   * @param {number} latitude 
   * @param {number} longitude 
   * @param {number} radiusKm - Search radius in kilometers (default 0.5km)
   * @returns {Promise<number>} - Hazard density score 0-1
   */
  async calculateHazardDensity(latitude, longitude, radiusKm = 0.5) {
    try {
      const db = require('../config/database');
      
      // Query hazards within radius using PostGIS
      const query = `
        SELECT 
          id,
          hazard_type,
          severity,
          metadata,
          ST_Distance(
            location::geography,
            ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
          ) / 1000 as distance_km
        FROM hazards
        WHERE 
          status = 'active'
          AND ST_DWithin(
            location::geography,
            ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
            $3
          )
        ORDER BY distance_km ASC
      `;
      
      const result = await db.query(query, [
        latitude,
        longitude,
        radiusKm * 1000 // Convert km to meters
      ]);
      
      if (!result.rows || result.rows.length === 0) {
        return 0.1; // Low baseline hazard if no reports
      }
      
      console.log(`[HazardDensity] Found ${result.rows.length} hazard(s) within ${radiusKm}km of [${latitude.toFixed(4)}, ${longitude.toFixed(4)}]`);
      
      // Calculate weighted hazard score based on:
      // 1. Number of hazards
      // 2. Severity levels
      // 3. Distance (closer = higher impact)
      // 4. Priority and traffic impact
      
      const severityWeights = {
        'critical': 3.0, // Critical severity - immediate danger
        'high': 2.5,     // High severity - serious hazard
        'medium': 1.2,   // Medium severity - moderate concern
        'low': 0.5       // Low severity - minor issue
      };
      
      let totalScore = 0;
      result.rows.forEach(hazard => {
        // Distance decay: closer hazards have more impact
        const distanceFactor = Math.max(0, 1 - (hazard.distance_km / radiusKm));
        
        // Severity weight - default to 'high' if unknown
        const severityWeight = severityWeights[hazard.severity] || severityWeights['high'];
        
        // Parse metadata for additional factors
        let metadata = {};
        try {
          metadata = typeof hazard.metadata === 'string' ? JSON.parse(hazard.metadata) : (hazard.metadata || {});
        } catch (e) {
          metadata = {};
        }
        
        // Traffic impact bonus from metadata
        const trafficBonus = metadata.affectsTraffic ? 0.3 : 0;
        
        // Combined hazard impact (simplified without priority)
        const hazardImpact = (severityWeight + trafficBonus) * distanceFactor;
        totalScore += hazardImpact;
        
        console.log(`    - ${hazard.hazard_type} (${hazard.severity}): distance=${hazard.distance_km.toFixed(3)}km, impact=${hazardImpact.toFixed(3)}`);
      });
      
      // Normalize to 0-1 scale
      // Assume 3+ high-severity hazards in area = maximum danger (1.0)
      const normalizedScore = Math.min(1.0, totalScore / 3.0);
      
      console.log(`[HazardDensity] Total score: ${totalScore.toFixed(3)}, Normalized: ${normalizedScore.toFixed(3)}`);
      
      return normalizedScore;
      
    } catch (error) {
      console.error('Error calculating hazard density:', error);
      // Fallback to estimated value if database query fails
      return 0.2;
    }
  }

  // Stub functions for collision and lighting (return baseline values)
  // These would be implemented with real data sources in production
  getCollisionDensity(latitude, longitude) {
    // Default to low collision risk (no real data available)
    // In production, this would query collision database
    return 0.2;
  }

  getLightingIndex(latitude, longitude) {
    // Default to moderate lighting (no real data available)
    // In production, this would query street lighting database
    return 0.3;
  }

  // Stub functions for collision and lighting (return baseline values)
  // These would be implemented with real data sources in production
  getCollisionDensity(latitude, longitude) {
    // Default to low collision risk (no real data available)
    // In production, this would query collision database
    return 0.2;
  }

  getLightingIndex(latitude, longitude) {
    // Default to moderate lighting (no real data available)
    // In production, this would query street lighting database
    return 0.3;
  }

  getStats() {
    return {
      totalRecords: this.crimeData.length,
      gridCells: this.safetyGrid.size,
      loaded: this.loaded
    };
  }
}

const csvDataLoader = new CsvDataLoader();

module.exports = csvDataLoader;
