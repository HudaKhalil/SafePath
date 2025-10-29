import api from './api';
import Cookies from 'js-cookie';
import { LOCATION_CONFIG } from './locationConfig';

export const authService = {
  // Sign up
  async signup(userData) {
    try {
      const response = await api.post('/auth/signup', userData);
      if (response.data.success && response.data.data.token) {
        Cookies.set('auth_token', response.data.data.token, { expires: 1 }); // 1 day
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Network error' };
    }
  },

  // Log in
  async login(credentials) {
    try {
      const response = await api.post('/auth/login', credentials);
      if (response.data.success && response.data.data.token) {
        Cookies.set('auth_token', response.data.data.token, { expires: 1 }); // 1 day
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Network error' };
    }
  },

  // Log out
  logout() {
    Cookies.remove('auth_token');
  },

  // Get current user profile
  async getProfile() {
    try {
      const response = await api.get('/auth/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Network error' };
    }
  },

  // Update user profile
  async updateProfile(profileData) {
    try {
      const response = await api.put('/auth/profile', profileData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Network error' };
    }
  },

  // Check if user is logged in
  isLoggedIn() {
    return !!Cookies.get('auth_token');
  },

  // Get auth token
  getToken() {
    return Cookies.get('auth_token');
  }
};

export const routesService = {
  // Get all routes
  async getRoutes(params = {}) {
    try {
      const response = await api.get('/routes', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Network error' };
    }
  },

  // Get single route
  async getRoute(id) {
    try {
      const response = await api.get(`/routes/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Network error' };
    }
  },

  // Get routes near location
  async getNearbyRoutes(latitude, longitude, params = {}) {
    try {
      const response = await api.get(`/routes/near/${latitude}/${longitude}`, { params });
      return response.data;
    } catch (error) {
      console.error('getNearbyRoutes error:', error);
      throw error.response?.data || { success: false, message: 'Network error' };
    }
  },

  // Find routes between two points
  async findRoutes(fromLat, fromLon, toLat, toLon, mode = 'walking') {
    try {
      const response = await api.post('/routes/find', {
        fromLat,
        fromLon,
        toLat,
        toLon,
        mode
      });
      return response.data;
    } catch (error) {
      console.error('Route finding error:', error);
      throw error.response?.data || { success: false, message: 'Network error' };
    }
  }
};

export const hazardsService = {
  // Report hazard
  async reportHazard(hazardData) {
    try {
      const response = await api.post('/hazards', hazardData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Network error' };
    }
  },

  // Get all hazards
  async getHazards(params = {}) {
    try {
      const response = await api.get('/hazards', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Network error' };
    }
  },

  // Get hazards near location
  async getNearbyHazards(latitude, longitude, params = {}) {
    try {
      const response = await api.get(`/hazards/nearby/${latitude}/${longitude}`, { params });
      return response.data;
    } catch (error) {
      console.error('getNearbyHazards error:', error);
      throw error.response?.data || { success: false, message: 'Network error' };
    }
  },

  // Update hazard status
  async updateHazard(id, updateData) {
    try {
      const response = await api.patch(`/hazards/${id}`, updateData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Network error' };
    }
  }
};

export const buddiesService = {
  // Find nearby buddies
  async getNearbyBuddies(params = {}) {
    try {
      const response = await api.get('/buddies/nearby', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Network error' };
    }
  },

  // Find buddies near specific location
  async getBuddiesNearLocation(latitude, longitude, params = {}) {
    try {
      const response = await api.get(`/buddies/near/${latitude}/${longitude}`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Network error' };
    }
  },

  // Get all buddies
  async getAllBuddies(params = {}) {
    try {
      const response = await api.get('/buddies/all', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Network error' };
    }
  }
};

export const routingService = {
  // Get route following actual roads using multiple routing providers
  async getRoute(fromLat, fromLon, toLat, toLon, transportMode = 'walking') {
    const providers = [
      'osrm', // Primary: Free and reliable
      'openroute' // Secondary: More detailed but needs API key for heavy use
    ];

    for (const provider of providers) {
      try {
        const route = await this.getRouteFromProvider(provider, fromLat, fromLon, toLat, toLon, transportMode);
        if (route.success) {
          return route;
        }
      } catch (error) {
        console.warn(`${provider} routing failed:`, error.message);
        continue;
      }
    }

    // Fallback to straight line if all providers fail
    return this.getStraightLineRoute(fromLat, fromLon, toLat, toLon, transportMode);
  },

  async getRouteFromProvider(provider, fromLat, fromLon, toLat, toLon, transportMode) {
    switch (provider) {
      case 'osrm':
        return await this.getOSRMRoute(fromLat, fromLon, toLat, toLon, transportMode);
      case 'openroute':
        return await this.getOpenRouteServiceRoute(fromLat, fromLon, toLat, toLon, transportMode);
      case 'mapbox':
        // Mapbox implementation not available - fallback
        throw new Error('Mapbox provider not implemented');
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  },

  async getOSRMRoute(fromLat, fromLon, toLat, toLon, transportMode) {
    const profileMap = {
      'walking': 'foot',
      'cycling': 'bike',
      'driving': 'driving'
    };
    
    const profile = profileMap[transportMode] || 'foot';
    const url = `https://router.project-osrm.org/route/v1/${profile}/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson&steps=true`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        success: true,
        provider: 'osrm',
        coordinates: route.geometry.coordinates.map(coord => [coord[1], coord[0]]), // Convert to [lat, lon]
        distance: route.distance, // meters
        duration: route.duration, // seconds
        instructions: route.legs[0]?.steps?.map(step => ({
          instruction: step.maneuver?.instruction || 'Continue',
          distance: step.distance,
          duration: step.duration
        })) || []
      };
    }
    
    throw new Error('No route found');
  },

  async getOpenRouteServiceRoute(fromLat, fromLon, toLat, toLon, transportMode) {
    // OpenRouteService API (free tier available)
    const profileMap = {
      'walking': 'foot-walking',
      'cycling': 'cycling-regular',
      'driving': 'driving-car'
    };
    
    const profile = profileMap[transportMode] || 'foot-walking';
    const url = `https://api.openrouteservice.org/v2/directions/${profile}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: For production, you'd want to add your API key here
        // 'Authorization': 'Bearer YOUR_API_KEY'
      },
      body: JSON.stringify({
        coordinates: [[fromLon, fromLat], [toLon, toLat]],
        format: 'geojson'
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenRouteService error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const route = data.features[0];
      const properties = route.properties;
      
      return {
        success: true,
        provider: 'openroute',
        coordinates: route.geometry.coordinates.map(coord => [coord[1], coord[0]]), // Convert to [lat, lon]
        distance: properties.summary?.distance || 0,
        duration: properties.summary?.duration || 0,
        instructions: properties.segments?.[0]?.steps?.map(step => ({
          instruction: step.instruction,
          distance: step.distance,
          duration: step.duration
        })) || []
      };
    }
    
    throw new Error('No route found');
  },

  getStraightLineRoute(fromLat, fromLon, toLat, toLon, transportMode) {
    // Calculate straight-line distance using Haversine formula
    const R = 6371e3; // Earth's radius in meters
    const φ1 = fromLat * Math.PI/180;
    const φ2 = toLat * Math.PI/180;
    const Δφ = (toLat-fromLat) * Math.PI/180;
    const Δλ = (toLon-fromLon) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // in meters

    // Estimate duration based on transport mode
    const speedMap = {
      'walking': 5, // km/h
      'cycling': 15, // km/h
      'driving': 30 // km/h (urban)
    };
    
    const speed = speedMap[transportMode] || 5;
    const duration = (distance / 1000) / speed * 3600; // seconds

    return {
      success: true,
      provider: 'straight-line',
      coordinates: [[fromLat, fromLon], [toLat, toLon]],
      distance: distance,
      duration: duration,
      instructions: [{
        instruction: `Head straight to destination (${distance < 1000 ? Math.round(distance) + 'm' : (distance/1000).toFixed(1) + 'km'})`,
        distance: distance,
        duration: duration
      }],
      fallback: true
    };
  }
};

export const geocodingService = {
  // Search for locations by name
  async searchLocations(query, options = {}) {
    try {
      const params = {
        q: query,
        limit: options.limit || 5,
        countrycode: options.countrycode || LOCATION_CONFIG.COUNTRY_CODE
      };
      
      const response = await api.get('/geocoding/search', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Network error' };
    }
  },

  // Get address from coordinates (reverse geocoding)
  async getAddressFromCoords(latitude, longitude) {
    try {
      const params = { lat: latitude, lon: longitude };
      const response = await api.get('/geocoding/reverse', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Network error' };
    }
  },

  // Direct Nominatim search (fallback)
  async searchNominatim(query, options = {}) {
    try {
      const params = new URLSearchParams({
        format: 'json',
        q: query,
        limit: options.limit || 5,
        countrycodes: options.countrycode || LOCATION_CONFIG.COUNTRY_CODE,
        addressdetails: 1,
        bounded: 1,
        viewbox: LOCATION_CONFIG.VIEWBOX // London bounding box
      });

      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
      const data = await response.json();
      
      return {
        success: true,
        data: {
          locations: data.map((item, index) => ({
            id: index,
            display_name: item.display_name,
            name: item.name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            address: {
              house_number: item.address?.house_number,
              road: item.address?.road,
              suburb: item.address?.suburb,
              postcode: item.address?.postcode,
              city: item.address?.city || item.address?.town,
              county: item.address?.county,
              country: item.address?.country
            }
          }))
        }
      };
    } catch {
      throw { success: false, message: 'Geocoding search failed' };
    }
  }
};