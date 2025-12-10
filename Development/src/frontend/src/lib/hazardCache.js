/**
 * Client-side hazard cache manager
 * Caches OSM hazard data across pages for better UX
 * Uses sessionStorage for persistence during browser session
 */

const CACHE_PREFIX = 'safepath_hazards_';
const CACHE_TTL = 20 * 60 * 1000; // 20 minutes

class HazardCache {
  /**
   * Generate cache key based on location (rounded to ~1km precision)
   */
  getCacheKey(latitude, longitude, radius) {
    const latRounded = Math.round(latitude * 100) / 100;
    const lonRounded = Math.round(longitude * 100) / 100;
    return `${CACHE_PREFIX}${latRounded},${lonRounded},${radius}`;
  }

  /**
   * Get cached hazards if available and not expired
   * Returns { data: hazards[], cached: boolean, age: milliseconds }
   */
  get(latitude, longitude, radius = 5000) {
    try {
      const key = this.getCacheKey(latitude, longitude, radius);
      const cached = sessionStorage.getItem(key);
      
      if (!cached) {
        console.log('📭 Cache miss - no cached data');
        return { data: null, cached: false, age: null };
      }

      const parsed = JSON.parse(cached);
      const age = Date.now() - parsed.timestamp;

      // Check if expired
      if (age > CACHE_TTL) {
        console.log('🗑️ Cache expired, removing:', key);
        sessionStorage.removeItem(key);
        return { data: null, cached: false, age: null };
      }

      // Treat empty arrays as cache miss - force fresh fetch
      // This prevents serving stale "no hazards" data
      if (!parsed.data || !Array.isArray(parsed.data) || parsed.data.length === 0) {
        console.log('📭 Cache has empty data, treating as cache miss');
        sessionStorage.removeItem(key);
        return { data: null, cached: false, age: null };
      }

      console.log(`✅ Cache hit! Age: ${Math.round(age / 1000)}s, Hazards: ${parsed.data.length}`);
      return {
        data: parsed.data,
        cached: true,
        age: age,
        stats: parsed.stats
      };
    } catch (error) {
      console.error('❌ Cache read error:', error);
      return { data: null, cached: false, age: null };
    }
  }

  /**
   * Store hazards in cache
   */
  set(latitude, longitude, radius, hazards, stats = null) {
    try {
      const key = this.getCacheKey(latitude, longitude, radius);
      const cacheData = {
        data: hazards,
        stats: stats,
        timestamp: Date.now(),
        location: { latitude, longitude, radius }
      };

      sessionStorage.setItem(key, JSON.stringify(cacheData));
      console.log(`💾 Cached ${hazards.length} hazards for ${key}`);
      
      // Clean up old cache entries (keep last 10)
      this.cleanupOldEntries();
    } catch (error) {
      console.error('❌ Cache write error:', error);
      // If quota exceeded, clear old entries and retry
      if (error.name === 'QuotaExceededError') {
        this.clearAll();
        try {
          const key = this.getCacheKey(latitude, longitude, radius);
          const cacheData = {
            data: hazards,
            stats: stats,
            timestamp: Date.now(),
            location: { latitude, longitude, radius }
          };
          sessionStorage.setItem(key, JSON.stringify(cacheData));
        } catch (retryError) {
          console.error('❌ Cache write failed after cleanup:', retryError);
        }
      }
    }
  }

  /**
   * Clean up old cache entries, keeping only the 10 most recent
   */
  cleanupOldEntries() {
    try {
      const cacheKeys = [];
      
      // Find all cache keys
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          const data = JSON.parse(sessionStorage.getItem(key));
          cacheKeys.push({ key, timestamp: data.timestamp });
        }
      }

      // Sort by timestamp (oldest first)
      cacheKeys.sort((a, b) => a.timestamp - b.timestamp);

      // Remove old entries if more than 10
      if (cacheKeys.length > 10) {
        const toRemove = cacheKeys.slice(0, cacheKeys.length - 10);
        toRemove.forEach(item => {
          console.log('🗑️ Removing old cache entry:', item.key);
          sessionStorage.removeItem(item.key);
        });
      }
    } catch (error) {
      console.error('❌ Cache cleanup error:', error);
    }
  }

  /**
   * Clear specific cache entry
   */
  clear(latitude, longitude, radius) {
    try {
      const key = this.getCacheKey(latitude, longitude, radius);
      sessionStorage.removeItem(key);
      console.log('🗑️ Cleared cache:', key);
    } catch (error) {
      console.error('❌ Cache clear error:', error);
    }
  }

  /**
   * Clear all hazard cache
   */
  clearAll() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
      console.log(`🗑️ Cleared ${keysToRemove.length} cache entries`);
    } catch (error) {
      console.error('❌ Cache clear all error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    try {
      let count = 0;
      let totalSize = 0;
      let oldestAge = 0;

      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          count++;
          const value = sessionStorage.getItem(key);
          totalSize += value.length;
          
          const data = JSON.parse(value);
          const age = Date.now() - data.timestamp;
          if (age > oldestAge) oldestAge = age;
        }
      }

      return {
        entries: count,
        sizeKB: Math.round(totalSize / 1024),
        oldestAgeMinutes: Math.round(oldestAge / 60000)
      };
    } catch (error) {
      console.error('❌ Cache stats error:', error);
      return { entries: 0, sizeKB: 0, oldestAgeMinutes: 0 };
    }
  }
}

// Export singleton instance
export default new HazardCache();
