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
          this.crimeData.push(...records);
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
}

const csvDataLoader = new CsvDataLoader();

module.exports = csvDataLoader;