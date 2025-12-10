-- SafePath Database Schema
-- Hazards table optimizations and performance functions

-- Ensure hazards table exists with all necessary columns
CREATE TABLE IF NOT EXISTS hazards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    description TEXT NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    hazard_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb,
    priority_level INTEGER DEFAULT 1,
    affects_traffic BOOLEAN DEFAULT false,
    weather_related BOOLEAN DEFAULT false,
    is_resolved BOOLEAN DEFAULT false,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns if they don't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='hazards' AND column_name='priority_level') THEN
        ALTER TABLE hazards ADD COLUMN priority_level INTEGER DEFAULT 1;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='hazards' AND column_name='affects_traffic') THEN
        ALTER TABLE hazards ADD COLUMN affects_traffic BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='hazards' AND column_name='weather_related') THEN
        ALTER TABLE hazards ADD COLUMN weather_related BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='hazards' AND column_name='created_at') THEN
        ALTER TABLE hazards ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Update existing records to extract metadata fields
UPDATE hazards 
SET 
    affects_traffic = COALESCE((metadata->>'affectsTraffic')::boolean, false),
    weather_related = COALESCE((metadata->>'weatherRelated')::boolean, false)
WHERE affects_traffic IS NULL OR weather_related IS NULL;

-- Create spatial index for fast location queries
CREATE INDEX IF NOT EXISTS idx_hazards_location ON hazards USING GIST(location);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_hazards_status ON hazards(status);
CREATE INDEX IF NOT EXISTS idx_hazards_severity ON hazards(severity);
CREATE INDEX IF NOT EXISTS idx_hazards_type ON hazards(hazard_type);
CREATE INDEX IF NOT EXISTS idx_hazards_created_at ON hazards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hazards_priority ON hazards(priority_level DESC);
CREATE INDEX IF NOT EXISTS idx_hazards_user_id ON hazards(user_id);

-- Create composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_hazards_status_created ON hazards(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hazards_active_priority ON hazards(status, priority_level DESC) 
    WHERE status = 'active';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_hazards_updated_at ON hazards;
CREATE TRIGGER update_hazards_updated_at
    BEFORE UPDATE ON hazards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create optimized function for nearby hazards with priority scoring
-- This function provides <100ms query performance for hazard retrieval
CREATE OR REPLACE FUNCTION get_nearby_hazards(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    search_radius INTEGER DEFAULT 5000,
    result_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id INTEGER,
    hazard_type VARCHAR,
    severity VARCHAR,
    description TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    priority_level INTEGER,
    affects_traffic BOOLEAN,
    weather_related BOOLEAN,
    status VARCHAR,
    created_at TIMESTAMP,
    distance_meters DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        h.hazard_type,
        h.severity,
        h.description,
        h.latitude,
        h.longitude,
        h.priority_level,
        h.affects_traffic,
        h.weather_related,
        h.status,
        h.created_at,
        ST_Distance(
            h.location::geography,
            ST_SetSRID(ST_Point(user_lng, user_lat), 4326)::geography
        ) as distance_meters
    FROM hazards h
    WHERE 
        h.status = 'active'
        AND ST_DWithin(
            h.location::geography,
            ST_SetSRID(ST_Point(user_lng, user_lat), 4326)::geography,
            search_radius
        )
        AND h.created_at > CURRENT_TIMESTAMP - INTERVAL '48 hours'
    ORDER BY 
        h.priority_level DESC,
        distance_meters ASC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to calculate and update priority levels
-- Priority is based on severity, recency, and impact
CREATE OR REPLACE FUNCTION calculate_hazard_priority(hazard_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    priority INTEGER := 1;
    h_severity VARCHAR;
    h_age_hours NUMERIC;
    h_affects_traffic BOOLEAN;
    h_weather_related BOOLEAN;
BEGIN
    SELECT 
        severity,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at))/3600,
        affects_traffic,
        weather_related
    INTO h_severity, h_age_hours, h_affects_traffic, h_weather_related
    FROM hazards
    WHERE id = hazard_id;
    
    -- Base priority on severity
    CASE h_severity
        WHEN 'critical' THEN priority := 5;
        WHEN 'high' THEN priority := 4;
        WHEN 'medium' THEN priority := 3;
        WHEN 'low' THEN priority := 2;
        ELSE priority := 1;
    END CASE;
    
    -- Boost priority for recent hazards (within 6 hours)
    IF h_age_hours < 6 THEN
        priority := priority + 1;
    END IF;
    
    -- Boost priority if affects traffic
    IF h_affects_traffic THEN
        priority := priority + 1;
    END IF;
    
    -- Cap maximum priority
    priority := LEAST(priority, 7);
    
    RETURN priority;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate priority on insert/update
CREATE OR REPLACE FUNCTION update_hazard_priority()
RETURNS TRIGGER AS $$
BEGIN
    NEW.priority_level := calculate_hazard_priority(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_hazard_priority'
    ) THEN
        CREATE TRIGGER trigger_update_hazard_priority
            BEFORE INSERT OR UPDATE ON hazards
            FOR EACH ROW
            EXECUTE FUNCTION update_hazard_priority();
    END IF;
END $$;

-- Update priority for existing hazards
UPDATE hazards SET priority_level = calculate_hazard_priority(id) WHERE priority_level = 1;

-- Add comments for documentation
COMMENT ON FUNCTION get_nearby_hazards IS 
'Optimized function to retrieve nearby hazards with priority scoring. 
Target performance: <100ms for typical queries.
Parameters:
- user_lat: User latitude
- user_lng: User longitude  
- search_radius: Search radius in meters (default 5000m)
- result_limit: Maximum results to return (default 20)';

COMMENT ON COLUMN hazards.priority_level IS 
'Calculated priority level (1-7) based on severity, recency, and impact factors';

COMMENT ON COLUMN hazards.affects_traffic IS 
'Boolean flag indicating if hazard affects traffic flow';

COMMENT ON COLUMN hazards.weather_related IS 
'Boolean flag indicating if hazard is weather-related';
