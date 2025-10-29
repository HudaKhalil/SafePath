import api from './api';
import Cookies from 'js-cookie';

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
