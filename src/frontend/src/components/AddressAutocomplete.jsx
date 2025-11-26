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

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      
      // If there are suggestions, use the first one
      if (suggestions.length > 0) {
        handleSuggestionClick(suggestions[0])
      } else if (value.length >= 3) {
        // Otherwise, search for the current value
        setIsLoading(true)
        try {
          let result;
          try {
            result = await geocodingService.searchLocations(value, { 
              limit: 1, 
              countrycode: LOCATION_CONFIG.COUNTRY_CODE
            });
          } catch (backendError) {
            result = await geocodingService.searchNominatim(value, { 
              limit: 1, 
              countrycode: LOCATION_CONFIG.COUNTRY_CODE
            });
          }

          if (result.success && result.data.locations && result.data.locations.length > 0) {
            const location = result.data.locations[0]
            onChange(location.display_name, {
              lat: location.lat,
              lon: location.lon,
              value: location.display_name,
              address: location.address
            })
          }
        } catch (error) {
          console.error('Enter key geocoding error:', error)
        } finally {
          setIsLoading(false)
          setSuggestions([])
          setShowSuggestions(false)
        }
      }
    }
  }

  const handleBlur = async () => {
    // Delay to allow clicking suggestions
    setTimeout(async () => {
      setShowSuggestions(false)
      
      // Auto-geocode if user typed but didn't select from dropdown
      if (value.length >= 3 && suggestions.length > 0) {
        // Use the first suggestion automatically
        const firstSuggestion = suggestions[0]
        onChange(firstSuggestion.value, firstSuggestion)
        setSuggestions([])
      } else if (value.length >= 3) {
        // Try to geocode what they typed
        try {
          let result;
          try {
            result = await geocodingService.searchLocations(value, { 
              limit: 1, 
              countrycode: LOCATION_CONFIG.COUNTRY_CODE
            });
          } catch (backendError) {
            result = await geocodingService.searchNominatim(value, { 
              limit: 1, 
              countrycode: LOCATION_CONFIG.COUNTRY_CODE
            });
          }

          if (result.success && result.data.locations && result.data.locations.length > 0) {
            const location = result.data.locations[0]
            onChange(location.display_name, {
              lat: location.lat,
              lon: location.lon,
              value: location.display_name,
              address: location.address
            })
          }
        } catch (error) {
          console.error('Auto-geocoding error:', error)
        }
      }
    }, 300)
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
        <label className="text-sm font-medium" style={{ color: '#06d6a0' }}>
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
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full p-4 rounded-lg border-2 focus:outline-none focus:border-accent text-base dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            color: 'var(--color-text-primary)'
          }}
          autoComplete="off"
        />
        
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent"></div>
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 rounded-lg shadow-lg max-h-60 overflow-y-auto dark:bg-slate-800 dark:border-slate-600" style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)'
        }}>
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
              className="p-3 cursor-pointer border-b last:border-b-0 dark:border-slate-700 dark:hover:bg-slate-700"
              style={{
                borderColor: 'var(--border-color)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(6, 214, 160, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                {suggestion.address.road && suggestion.address.house_number && 
                  `${suggestion.address.house_number} ${suggestion.address.road}`
                }
                {suggestion.address.road && !suggestion.address.house_number && 
                  suggestion.address.road
                }
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
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