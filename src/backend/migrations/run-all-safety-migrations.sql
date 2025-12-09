-- ============================================================================
-- COMPLETE SAFETY ROUTING MIGRATION SCRIPT
-- ============================================================================
-- Purpose: Set up all database tables and functions for safety routing system
-- Components:
--   1. User safety preferences (crime, collision, lighting, hazard weights)
--   2. Street lighting cache from OpenStreetMap
--   3. Unique constraints and indexes
-- 
-- Usage: Run this entire file in PostgreSQL/pgAdmin
--        psql -U your_user -d your_database -f run-all-safety-migrations.sql
-- ============================================================================

\echo '🚀 Starting Complete Safety Routing Migration'
\echo '============================================================'

-- ============================================================================
-- MIGRATION 1: User Safety Preferences Table
-- ============================================================================

\echo '📋 Migration 1: User Safety Preferences'
\echo '   Creating user_safety_preferences table...'

-- Drop unused safety_priority column from users table (replaced by preset_name in user_safety_preferences)
ALTER TABLE users DROP COLUMN IF EXISTS safety_priority;

-- Create user_safety_preferences table
CREATE TABLE IF NOT EXISTS user_safety_preferences (
  preference_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- Safety factor weights (should sum to 1.0)
  crime_weight DECIMAL(4,3) DEFAULT 0.40 CHECK (crime_weight >= 0 AND crime_weight <= 1),
  collision_weight DECIMAL(4,3) DEFAULT 0.25 CHECK (collision_weight >= 0 AND collision_weight <= 1),
  lighting_weight DECIMAL(4,3) DEFAULT 0.20 CHECK (lighting_weight >= 0 AND lighting_weight <= 1),
  hazard_weight DECIMAL(4,3) DEFAULT 0.15 CHECK (hazard_weight >= 0 AND hazard_weight <= 1),
  
  -- Preset name if using a preset (balanced, crime, night, cyclist, custom)
  preset_name VARCHAR(50) DEFAULT 'balanced',
  
  -- Crime type severity weights (JSON for flexibility)
  crime_severity_weights JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure each user has only one preference record
  UNIQUE(user_id),
  
  -- Ensure weights sum to approximately 1.0 (allowing small rounding errors)
  CONSTRAINT valid_weight_sum CHECK (
    ABS((crime_weight + collision_weight + lighting_weight + hazard_weight) - 1.0) < 0.01
  )
);

-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_user_safety_preferences_user_id ON user_safety_preferences(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_safety_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_user_safety_preferences ON user_safety_preferences;
CREATE TRIGGER trigger_update_user_safety_preferences
  BEFORE UPDATE ON user_safety_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_safety_preferences_updated_at();

-- Comments
COMMENT ON TABLE user_safety_preferences IS 'User-specific safety factor weights for route calculation';
COMMENT ON COLUMN user_safety_preferences.crime_weight IS 'Weight for crime density (0.0-1.0)';
COMMENT ON COLUMN user_safety_preferences.collision_weight IS 'Weight for traffic collision risk (0.0-1.0)';
COMMENT ON COLUMN user_safety_preferences.lighting_weight IS 'Weight for street lighting quality (0.0-1.0)';
COMMENT ON COLUMN user_safety_preferences.hazard_weight IS 'Weight for reported hazards (0.0-1.0)';
COMMENT ON COLUMN user_safety_preferences.preset_name IS 'Preset identifier or "custom" for manual weights';

\echo '✅ Migration 1 completed: user_safety_preferences table created'
\echo ''

-- ============================================================================
-- MIGRATION 2: Street Lighting Cache Table
-- ============================================================================

\echo '📋 Migration 2: Street Lighting Cache'
\echo '   Creating street_lighting table with PostGIS...'

-- Create street_lighting table to cache OSM lighting data
CREATE TABLE IF NOT EXISTS street_lighting (
    light_id SERIAL PRIMARY KEY,
    
    -- Geographic location (PostGIS point)
    location GEOMETRY(Point, 4326) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    
    -- OSM metadata
    osm_id BIGINT,
    osm_type VARCHAR(20), -- 'node' or 'way'
    
    -- Lighting attributes from OSM tags
    lit VARCHAR(10),           -- 'yes', 'no', 'automatic', 'interval', 'sunset-sunrise'
    lamp_type VARCHAR(50),     -- 'electric', 'LED', 'gas_lantern', 'solar', etc.
    light_source VARCHAR(50),  -- 'LED', 'metal_halide', 'sodium', 'fluorescent', etc.
    highway VARCHAR(50),       -- 'street_lamp', 'lamp_post'
    support VARCHAR(50),       -- 'pole', 'wall_mounted', 'suspended', etc.
    
    -- Calculated lighting quality (0.0 = dark, 1.0 = well-lit)
    -- Lower values are BETTER for safety (less darkness risk)
    lighting_score DECIMAL(3, 2) DEFAULT 0.3 CHECK (lighting_score >= 0.0 AND lighting_score <= 1.0),
    
    -- Coverage radius in meters (how far this light illuminates)
    coverage_radius INTEGER DEFAULT 30,
    
    -- Data freshness
    osm_timestamp TIMESTAMP,
    cached_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Grid cell for efficient spatial queries
    grid_cell VARCHAR(20) -- Format: "lat_lon" rounded to 0.01 degrees (~1km)
);

-- Create spatial index on location for fast proximity queries
CREATE INDEX IF NOT EXISTS idx_street_lighting_location 
ON street_lighting USING GIST (location);

-- Create index on grid cell for efficient area queries
CREATE INDEX IF NOT EXISTS idx_street_lighting_grid 
ON street_lighting (grid_cell);

-- Create index on lit tag for filtering
CREATE INDEX IF NOT EXISTS idx_street_lighting_lit 
ON street_lighting (lit);

-- Create composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_street_lighting_coords 
ON street_lighting (latitude, longitude);

-- Function to calculate grid cell from coordinates
CREATE OR REPLACE FUNCTION get_lighting_grid_cell(lat DECIMAL, lon DECIMAL)
RETURNS VARCHAR(20) AS $$
BEGIN
    RETURN CONCAT(
        ROUND(lat::numeric, 2)::text,
        '_',
        ROUND(lon::numeric, 2)::text
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate lighting score based on OSM tags
CREATE OR REPLACE FUNCTION calculate_lighting_score(
    p_lit VARCHAR,
    p_lamp_type VARCHAR,
    p_light_source VARCHAR
)
RETURNS DECIMAL(3, 2) AS $$
DECLARE
    score DECIMAL(3, 2) := 0.3; -- Default moderate lighting
BEGIN
    -- Lower score = better lighting (less darkness risk)
    
    -- Check 'lit' tag (most important indicator)
    IF p_lit = 'yes' THEN
        score := 0.1; -- Well-lit area
    ELSIF p_lit = 'automatic' OR p_lit = 'interval' THEN
        score := 0.15; -- Automatic lighting (usually on at night)
    ELSIF p_lit = 'sunset-sunrise' THEN
        score := 0.15; -- Time-based lighting
    ELSIF p_lit = 'no' THEN
        score := 0.8; -- Explicitly dark
    ELSIF p_lit = 'limited' THEN
        score := 0.5; -- Poor lighting
    END IF;
    
    -- Adjust based on lamp technology (modern = better)
    IF p_light_source = 'LED' THEN
        score := score * 0.9; -- LED is brighter, reduce darkness risk by 10%
    ELSIF p_light_source = 'metal_halide' THEN
        score := score * 0.95; -- Good lighting
    ELSIF p_light_source = 'gas_lantern' THEN
        score := score * 1.2; -- Dim lighting
    END IF;
    
    -- Ensure score stays within bounds
    IF score < 0.0 THEN score := 0.0; END IF;
    IF score > 1.0 THEN score := 1.0; END IF;
    
    RETURN score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update trigger for street_lighting
CREATE OR REPLACE FUNCTION update_street_lighting_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_street_lighting_timestamp ON street_lighting;
CREATE TRIGGER trigger_update_street_lighting_timestamp
BEFORE UPDATE ON street_lighting
FOR EACH ROW
EXECUTE FUNCTION update_street_lighting_timestamp();

-- Comments
COMMENT ON TABLE street_lighting IS 'Cached OpenStreetMap street lighting data for safety routing calculations';
COMMENT ON COLUMN street_lighting.lighting_score IS 'Darkness risk score: 0.0=well-lit (safe), 1.0=dark (risky)';
COMMENT ON COLUMN street_lighting.coverage_radius IS 'Estimated illumination radius in meters';
COMMENT ON COLUMN street_lighting.grid_cell IS 'Spatial grid cell for efficient queries (~1km resolution)';

\echo '✅ Migration 2 completed: street_lighting table created'
\echo ''

-- ============================================================================
-- MIGRATION 3: Unique Constraints
-- ============================================================================

\echo '📋 Migration 3: Adding Unique Constraints'
\echo '   Adding unique constraint to street_lighting...'

-- Add unique constraint to prevent duplicate OSM entries
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_osm_light'
  ) THEN
    ALTER TABLE street_lighting 
    ADD CONSTRAINT unique_osm_light UNIQUE (osm_id, osm_type);
    RAISE NOTICE '✅ Unique constraint added: unique_osm_light';
  ELSE
    RAISE NOTICE '⚠️  Unique constraint already exists: unique_osm_light';
  END IF;
END $$;

\echo '✅ Migration 3 completed: unique constraints added'
\echo ''

-- ============================================================================
-- SUMMARY
-- ============================================================================

\echo '============================================================'
\echo '📊 Migration Summary'
\echo '============================================================'
\echo '✅ All migrations completed successfully!'
\echo ''
\echo 'Created/Verified:'
\echo '  📊 user_safety_preferences table'
\echo '     - crime_weight, collision_weight, lighting_weight, hazard_weight'
\echo '     - preset_name (balanced, crime, night, cyclist, custom)'
\echo '     - Unique constraint per user'
\echo ''
\echo '  💡 street_lighting table'
\echo '     - OSM street lighting cache (PostGIS)'
\echo '     - Spatial indexes for proximity queries'
\echo '     - lighting_score (0.0=well-lit, 1.0=dark)'
\echo '     - Helper functions for grid cells and scoring'
\echo ''
\echo '  🔒 Unique constraints'
\echo '     - Prevents duplicate OSM lighting entries'
\echo ''
\echo '✨ Your safety routing system is ready!'
\echo '============================================================'
