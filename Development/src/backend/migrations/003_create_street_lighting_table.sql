-- ============================================================================
-- Migration 003: Create Street Lighting Cache Table
-- ============================================================================
-- Purpose: Store OpenStreetMap street lighting data for fast routing queries
-- Data Source: OSM Overpass API (highway=street_lamp, highway=lamp_post, lit=yes)
-- ============================================================================

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
    grid_cell VARCHAR(20), -- Format: "lat_lon" rounded to 0.01 degrees (~1km)
    
    -- Unique constraint for ON CONFLICT clause
    UNIQUE (osm_id, osm_type)
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

-- ============================================================================
-- Helper Functions
-- ============================================================================

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

-- ============================================================================
-- Update Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_street_lighting_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_street_lighting_timestamp
BEFORE UPDATE ON street_lighting
FOR EACH ROW
EXECUTE FUNCTION update_street_lighting_timestamp();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE street_lighting IS 'Cached OpenStreetMap street lighting data for safety routing calculations';
COMMENT ON COLUMN street_lighting.lighting_score IS 'Darkness risk score: 0.0=well-lit (safe), 1.0=dark (risky)';
COMMENT ON COLUMN street_lighting.coverage_radius IS 'Estimated illumination radius in meters';
COMMENT ON COLUMN street_lighting.grid_cell IS 'Spatial grid cell for efficient queries (~1km resolution)';

-- ============================================================================
-- Initial Data / Placeholder
-- ============================================================================

-- Note: Actual lighting data will be populated via OSM Overpass API queries
-- This table starts empty and is populated on-demand by area

COMMENT ON TABLE street_lighting IS 
'Street lighting cache from OpenStreetMap. 
Populated on-demand via Overpass API queries.
Data covers areas where routes are calculated.';
