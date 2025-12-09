/**
 * Centralized Location Manager
 * Manages user location across the application with localStorage persistence
 */

const STORAGE_KEYS = {
  USER_LOCATION: 'userLocation',
  USER_ADDRESS: 'userAddress',
  MAP_CENTER: 'mapCenter',
  MAP_ZOOM: 'mapZoom',
  LOCATION_TIMESTAMP: 'locationTimestamp'
};

const DEFAULT_LOCATION = [51.5074, -0.1278]; // London
const DEFAULT_ZOOM = 13;
const LOCATION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Get stored user location from sessionStorage (GDPR-compliant)
 * Location is automatically cleared when browser closes
 */
export function getStoredLocation() {
  if (typeof window === 'undefined') return null;
  
  try {
    // Use sessionStorage for sensitive location data
    const stored = sessionStorage.getItem(STORAGE_KEYS.USER_LOCATION);
    const timestamp = sessionStorage.getItem(STORAGE_KEYS.LOCATION_TIMESTAMP);
    
    if (stored && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      // If location is fresh (less than 30 minutes old), use it
      if (age < LOCATION_EXPIRY_MS) {
        return JSON.parse(stored);
      }
    }
  } catch (error) {
    console.error('Error reading stored location:', error);
  }
  
  return null;
}

/**
 * Save user location to sessionStorage (GDPR-compliant)
 * Automatically cleared when browser closes
 */
export function saveLocation(latitude, longitude, address = null) {
  if (typeof window === 'undefined') return;
  
  try {
    const location = [latitude, longitude];
    
    // Use sessionStorage for sensitive location data (GDPR-compliant)
    sessionStorage.setItem(STORAGE_KEYS.USER_LOCATION, JSON.stringify(location));
    sessionStorage.setItem(STORAGE_KEYS.LOCATION_TIMESTAMP, Date.now().toString());
    
    if (address) {
      sessionStorage.setItem(STORAGE_KEYS.USER_ADDRESS, address);
    }
    
    // Use localStorage for map center (used across sessions for better UX)
    localStorage.setItem(STORAGE_KEYS.MAP_CENTER, JSON.stringify(location));
    
    // Dispatch event so other components can react
    window.dispatchEvent(new CustomEvent('locationUpdated', { 
      detail: { location, address } 
    }));
  } catch (error) {
    console.error('Error saving location:', error);
  }
}

/**
 * Get stored map center (persists across pages)
 */
export function getStoredMapCenter() {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.MAP_CENTER);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading stored map center:', error);
  }
  
  return null;
}

/**
 * Save map center and zoom
 */
export function saveMapView(center, zoom) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEYS.MAP_CENTER, JSON.stringify(center));
    if (zoom) {
      localStorage.setItem(STORAGE_KEYS.MAP_ZOOM, zoom.toString());
    }
  } catch (error) {
    console.error('Error saving map view:', error);
  }
}

/**
 * Get stored map zoom level
 */
export function getStoredMapZoom() {
  if (typeof window === 'undefined') return DEFAULT_ZOOM;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.MAP_ZOOM);
    if (stored) {
      return parseInt(stored);
    }
  } catch (error) {
    console.error('Error reading stored zoom:', error);
  }
  
  return DEFAULT_ZOOM;
}

/**
 * Get stored user address from sessionStorage
 */
export function getStoredAddress() {
  if (typeof window === 'undefined') return 'Current Location';
  
  return sessionStorage.getItem(STORAGE_KEYS.USER_ADDRESS) || 'Current Location';
}

/**
 * Get current location from browser with fallback to stored location
 */
export function getCurrentLocation(options = {}) {
  return new Promise((resolve, reject) => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      const storedLocation = getStoredLocation();
      if (storedLocation) {
        resolve(storedLocation);
      } else {
        resolve(DEFAULT_LOCATION);
      }
      return;
    }

    // Try to get fresh location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = [position.coords.latitude, position.coords.longitude];
        
        // Automatically save if requested
        if (options.autoSave !== false) {
          saveLocation(location[0], location[1]);
        }
        
        resolve(location);
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        
        // Fallback to stored location
        const storedLocation = getStoredLocation();
        if (storedLocation) {
          resolve(storedLocation);
        } else {
          resolve(DEFAULT_LOCATION);
        }
      },
      {
        enableHighAccuracy: options.highAccuracy !== false,
        timeout: options.timeout || 10000,
        maximumAge: options.maximumAge || 60000
      }
    );
  });
}

/**
 * Initialize location on app startup (call this when user logs in)
 */
export async function initializeUserLocation(geocodingService) {
  try {
    const location = await getCurrentLocation({ autoSave: true });
    
    // Get address if geocoding service is provided
    if (geocodingService && location) {
      try {
        const response = await geocodingService.getAddressFromCoords(
          location[0],
          location[1]
        );
        if (response.success && response.data?.display_name) {
          saveLocation(location[0], location[1], response.data.display_name);
        }
      } catch (error) {
        console.warn('Could not get address for current location:', error);
      }
    }
    
    return location;
  } catch (error) {
    console.error('Error initializing user location:', error);
    return DEFAULT_LOCATION;
  }
}

/**
 * Clear stored location data (call on logout)
 * Clears sensitive data from sessionStorage and localStorage
 */
export function clearStoredLocation() {
  if (typeof window === 'undefined') return;
  
  try {
    // Clear sensitive location data from sessionStorage
    sessionStorage.removeItem(STORAGE_KEYS.USER_LOCATION);
    sessionStorage.removeItem(STORAGE_KEYS.USER_ADDRESS);
    sessionStorage.removeItem(STORAGE_KEYS.LOCATION_TIMESTAMP);
    
    // Also clear map center from localStorage on logout
    localStorage.removeItem(STORAGE_KEYS.MAP_CENTER);
    
    // Keep MAP_ZOOM and other UI preferences (non-sensitive)
    console.log('✓ Location data cleared on logout');
  } catch (error) {
    console.error('Error clearing stored location:', error);
  }
}

/**
 * Clear all storage including preferences (for privacy/security)
 */
export function clearAllStoredData() {
  if (typeof window === 'undefined') return;
  
  try {
    // Clear all session data
    sessionStorage.clear();
    
    // Clear all local storage
    localStorage.clear();
    
    console.log('✓ All stored data cleared');
  } catch (error) {
    console.error('Error clearing all stored data:', error);
  }
}

export { DEFAULT_LOCATION, DEFAULT_ZOOM };
