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