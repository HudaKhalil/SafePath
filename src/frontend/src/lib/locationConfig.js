// Location configuration for SafePath app
export const LOCATION_CONFIG = {
  // London coordinates
  DEFAULT_CENTER: [51.5074, -0.1278],
  DEFAULT_ZOOM: 13,
  
  // London bounding box for map restrictions and geocoding
  BOUNDING_BOX: {
    north: 51.691874,
    south: 51.286760,
    east: 0.334015,
    west: -0.510375
  },
  
  // Nominatim viewbox for London area
  VIEWBOX: '-0.510375,51.286760,0.334015,51.691874',
  
  // Country code for geocoding
  COUNTRY_CODE: 'gb',
  
  // City information
  CITY: 'London',
  COUNTRY: 'United Kingdom'
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