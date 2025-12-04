const express = require('express');
const axios = require('axios');
const router = express.Router();

// Geocoding service using Nominatim (OpenStreetMap)
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 5, countrycode } = req.query;
    
    if (!q || q.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Query must be at least 3 characters long'
      });
    }

    // Use Nominatim for geocoding
    const nominatimUrl = 'https://nominatim.openstreetmap.org/search';
    const params = {
      format: 'json',
      q: q,
      limit: limit,
      addressdetails: 1
      // No country code restriction - allow global search
      // No bounded viewbox - allow worldwide results
    };
    
    // Only add countrycode if explicitly provided
    if (countrycode) {
      params.countrycodes = countrycode;
    }

    const response = await axios.get(nominatimUrl, { 
      params,
      headers: {
        'User-Agent': 'SafePath-App/1.0'
      }
    });
    
    const locations = response.data.map((item, index) => ({
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
      },
      type: item.type,
      importance: item.importance
    }));

    res.json({
      success: true,
      data: {
        locations,
        query: q,
        total: locations.length
      }
    });

  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search locations'
    });
  }
});

// Reverse geocoding - get address from coordinates
router.get('/reverse', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const nominatimUrl = 'https://nominatim.openstreetmap.org/reverse';
    const params = {
      format: 'json',
      lat: lat,
      lon: lon,
      addressdetails: 1
    };

    const response = await axios.get(nominatimUrl, { 
      params,
      headers: {
        'User-Agent': 'SafePath-App/1.0'
      }
    });
    
    if (!response.data || response.data.error) {
      return res.status(404).json({
        success: false,
        message: 'No address found for these coordinates'
      });
    }

    const location = {
      display_name: response.data.display_name,
      name: response.data.name,
      lat: parseFloat(response.data.lat),
      lon: parseFloat(response.data.lon),
      address: {
        house_number: response.data.address?.house_number,
        road: response.data.address?.road,
        suburb: response.data.address?.suburb,
        postcode: response.data.address?.postcode,
        city: response.data.address?.city || response.data.address?.town,
        county: response.data.address?.county,
        country: response.data.address?.country
      }
    };

    res.json({
      success: true,
      data: {
        location
      }
    });

  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get address for coordinates'
    });
  }
});

module.exports = router;