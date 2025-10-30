'use client'

import { useState, useCallback, useRef } from 'react'
import { debounce } from 'lodash'
import { geocodingService } from '../lib/services'
import { LOCATION_CONFIG } from '../lib/locationConfig'

export default function AddressAutocomplete({ value, onChange, placeholder, icon }) {
  const [suggestions, setSuggestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef(null)

  // Enhanced search function that tries backend first, then fallback to direct Nominatim
  const searchAddress = async (query) => {
    if (!query || query.length < 3) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    try {
      // Try backend geocoding service first
      let result;
      try {
        result = await geocodingService.searchLocations(query, { 
          limit: 5, 
          countrycode: LOCATION_CONFIG.COUNTRY_CODE
        });
      } catch (backendError) {
        console.log('Backend geocoding failed, using direct Nominatim:', backendError.message);
        // Fallback to direct Nominatim search
        result = await geocodingService.searchNominatim(query, { 
          limit: 5, 
          countrycode: LOCATION_CONFIG.COUNTRY_CODE
        });
      }

      if (result.success && result.data.locations) {
        const formattedSuggestions = result.data.locations.map((item, index) => ({
          id: index,
          label: item.display_name,
          value: item.display_name,
          lat: item.lat,
          lon: item.lon,
          address: item.address
        }))
        
        setSuggestions(formattedSuggestions)
      } else {
        setSuggestions([])
      }
    } catch (error) {
      console.error('Address search error:', error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query) => searchAddress(query), 300),
    []
  )

  const handleInputChange = (e) => {
    const inputValue = e.target.value
    onChange(inputValue)
    setShowSuggestions(true)
    
    if (inputValue.length >= 3) {
      debouncedSearch(inputValue)
    } else {
      setSuggestions([])
    }
  }

  const handleSuggestionClick = (suggestion) => {
    onChange(suggestion.value, suggestion)
    setSuggestions([])
    setShowSuggestions(false)
  }

  const handleBlur = () => {
    // Delay hiding suggestions to allow clicking
    setTimeout(() => setShowSuggestions(false), 200)
  }

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-2">
        <span className={`${icon === 'from' ? 'text-green-600' : 'text-red-600'}`}>📍</span>
        <label className="text-sm font-medium text-gray-700">
          {icon === 'from' ? 'From' : 'To'}
        </label>
      </div>
      
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="w-full p-4 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-accent text-gray-900"
          autoComplete="off"
        />
        
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent"></div>
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
              className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-900 text-sm">
                {suggestion.address.road && suggestion.address.house_number && 
                  `${suggestion.address.house_number} ${suggestion.address.road}`
                }
                {suggestion.address.road && !suggestion.address.house_number && 
                  suggestion.address.road
                }
              </div>
              <div className="text-gray-600 text-xs">
                {[
                  suggestion.address.suburb,
                  suggestion.address.city,
                  suggestion.address.postcode
                ].filter(Boolean).join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}