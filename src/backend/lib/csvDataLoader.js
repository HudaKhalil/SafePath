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
          // Push records in batches to avoid stack overflow
          const batchSize = 1000;
          for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            this.crimeData.push(...batch);
          }
          resolve();
        })
        .on('error', reject);
    });
  }

  getCrimeSeverity(crimeType) {
    const severityMap = {
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
    
    return severityMap[crimeType] || 0.5;
  }

  buildSafetyGrid() {
    // Build a grid-based safety map
    const gridCounts = new Map();
    
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
      cell.totalSeverity += crime.severity;
    }
    
    // Calculate normalized safety scores for each grid cell
    const maxCount = Math.max(...Array.from(gridCounts.values()).map(c => c.count));
    const maxSeverity = Math.max(...Array.from(gridCounts.values()).map(c => c.totalSeverity));
    
    for (const [key, cell] of gridCounts.entries()) {
      const crimeRate = maxCount > 0 ? cell.count / maxCount : 0;
      const severityRate = maxSeverity > 0 ? cell.totalSeverity / maxSeverity : 0;
      
      // Combine count and severity
      const crimeScore = (crimeRate * 0.6) + (severityRate * 0.4);
      
      // Estimate other factors (in a real system, these would come from additional data sources)
      const lightingIndex = this.estimateLighting(cell.lat, cell.lon);
      const collisionDensity = crimeScore * 0.3; // Approximation
      const hazardDensity = crimeScore * 0.2; // Approximation
      
      // Calculate safety score using the formula from requirements
      const safetyScore = (crimeScore * 0.5) + 
                         (collisionDensity * 0.2) + 
                         (lightingIndex * 0.2) + 
                         (hazardDensity * 0.1);
      
      this.safetyGrid.set(key, {
        latitude: cell.lat,
        longitude: cell.lon,
        crimeRate: crimeScore,
        lightingIndex,
        collisionDensity,
        hazardDensity,
        safetyScore: Math.min(1.0, safetyScore),
        crimeCount: cell.count
      });
    }
  }

  estimateLighting(lat, lon) {
    // Simple heuristic: central London (high lighting) vs outer areas
    const centralLondonLat = 51.5074;
    const centralLondonLon = -0.1278;
    
    const distance = Math.sqrt(
      Math.pow(lat - centralLondonLat, 2) + 
      Math.pow(lon - centralLondonLon, 2)
    );
    
    // Lower distance = better lighting (lower score is safer)
    // Scale from 0 (well-lit central) to 1 (dark outer areas)
    return Math.min(1.0, distance / 0.3);
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
    
    // Default to moderate safety if no data
    return 0.5;
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
    
    // Return default values if no data
    return {
      crimeRate: 0.5,
      lightingIndex: 0.5,
      collisionDensity: 0.5,
      hazardDensity: 0.5,
      safetyScore: 0.5,
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
