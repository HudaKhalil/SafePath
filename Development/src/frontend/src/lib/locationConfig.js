// Location configuration for SafePath app
export const LOCATION_CONFIG = {
  // Default center (Dublin, Ireland - more central for IE/UK coverage)
  DEFAULT_CENTER: [53.3498, -6.2603], // Dublin
  DEFAULT_ZOOM: 13,
  
  // Extended bounding box covering UK and Ireland
  BOUNDING_BOX: {
    north: 55.0,    // North Scotland
    south: 49.5,    // South England
    east: 2.0,      // East England  
    west: -11.0     // West Ireland
  },
  
  // Nominatim viewbox for UK & Ireland area (optional, can be removed)
  VIEWBOX: '-11.0,49.5,2.0,55.0',
  
  // Country codes for geocoding (IE + UK)
  COUNTRY_CODE: null, // Remove restriction to allow global search
  COUNTRY_CODES: ['ie', 'gb'], // For specific UK/IE filtering if needed
  
  // App information
  CITY: 'Dublin',
  COUNTRY: 'Ireland'
};

// Helper function to check if coordinates are within London bounds
export const isWithinLondonBounds = (lat, lng) => {
  const { BOUNDING_BOX } = LOCATION_CONFIG;
  return lat >= BOUNDING_BOX.south && 
         lat <= BOUNDING_BOX.north && 
         lng >= BOUNDING_BOX.west && 
         lng <= BOUNDING_BOX.east;
};

// Helper function to get distance from London center
export const getDistanceFromLondonCenter = (lat, lng) => {
  const [centerLat, centerLng] = LOCATION_CONFIG.DEFAULT_CENTER;
  const R = 6371; // Earth's radius in km
  const dLat = (lat - centerLat) * Math.PI / 180;
  const dLng = (lng - centerLng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(centerLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};