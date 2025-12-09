-- ========================================
-- SafePath Buddy System Migration (FINAL)
-- Date: 2025-12-06
-- Description: Adds buddy system functionality
-- ========================================

-- Enable PostGIS (should already exist)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ========================================
-- CREATE TRIGGER FUNCTION FIRST
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- STEP 1: Add columns to users table
-- ========================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'location') THEN
        ALTER TABLE users ADD COLUMN location GEOGRAPHY(POINT, 4326);
        RAISE NOTICE '✓ Added location column to users table';
    ELSE
        RAISE NOTICE 'ℹ location column already exists';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'transport_mode') THEN
        ALTER TABLE users ADD COLUMN transport_mode VARCHAR(20) DEFAULT 'walking';
        RAISE NOTICE '✓ Added transport_mode column to users table';
    ELSE
        RAISE NOTICE 'ℹ transport_mode column already exists';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'safety_priority') THEN
        ALTER TABLE users ADD COLUMN safety_priority DECIMAL(3,2) DEFAULT 0.50 
            CHECK (safety_priority >= 0 AND safety_priority <= 1.0);
        RAISE NOTICE '✓ Added safety_priority column to users table';
    ELSE
        RAISE NOTICE 'ℹ safety_priority column already exists';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_location ON users USING GIST(location);

-- Set default location for existing users (Dublin, Ireland)
UPDATE users 
SET location = ST_SetSRID(ST_MakePoint(-6.2603, 53.3498), 4326)::geography
WHERE location IS NULL;

-- ========================================
-- STEP 2: Create buddy_requests table
-- ========================================

CREATE TABLE IF NOT EXISTS buddy_requests (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT no_self_request CHECK (sender_id != receiver_id),
    CONSTRAINT unique_buddy_request UNIQUE(sender_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_buddy_requests_sender ON buddy_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_buddy_requests_receiver ON buddy_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_buddy_requests_status ON buddy_requests(status);
CREATE INDEX IF NOT EXISTS idx_buddy_requests_created ON buddy_requests(created_at DESC);

DROP TRIGGER IF EXISTS update_buddy_requests_updated_at ON buddy_requests;
CREATE TRIGGER update_buddy_requests_updated_at
    BEFORE UPDATE ON buddy_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- STEP 3: Create group_routes table
-- ========================================

CREATE TABLE IF NOT EXISTS group_routes (
    id SERIAL PRIMARY KEY,
    creator_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    route_name VARCHAR(255) NOT NULL,
    start_location GEOGRAPHY(POINT, 4326) NOT NULL,
    end_location GEOGRAPHY(POINT, 4326) NOT NULL,
    start_address TEXT,
    end_address TEXT,
    transport_mode VARCHAR(20) DEFAULT 'walking',
    departure_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_group_routes_creator ON group_routes(creator_id);
CREATE INDEX IF NOT EXISTS idx_group_routes_status ON group_routes(status);
CREATE INDEX IF NOT EXISTS idx_group_routes_start ON group_routes USING GIST(start_location);
CREATE INDEX IF NOT EXISTS idx_group_routes_end ON group_routes USING GIST(end_location);
CREATE INDEX IF NOT EXISTS idx_group_routes_created ON group_routes(created_at DESC);

DROP TRIGGER IF EXISTS update_group_routes_updated_at ON group_routes;
CREATE TRIGGER update_group_routes_updated_at
    BEFORE UPDATE ON group_routes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- STEP 4: Create group_route_members table
-- ========================================

CREATE TABLE IF NOT EXISTS group_route_members (
    id SERIAL PRIMARY KEY,
    group_route_id INTEGER NOT NULL REFERENCES group_routes(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_route_member UNIQUE(group_route_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_route_members_route ON group_route_members(group_route_id);
CREATE INDEX IF NOT EXISTS idx_group_route_members_user ON group_route_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_route_members_joined ON group_route_members(joined_at DESC);

-- ========================================
-- STEP 5: Create helper functions
-- ========================================

CREATE OR REPLACE FUNCTION get_nearby_buddies(
    p_lat DOUBLE PRECISION,
    p_lon DOUBLE PRECISION,
    p_radius INTEGER,
    p_user_id INTEGER
)
RETURNS TABLE (
    user_id INTEGER,
    username VARCHAR,
    email VARCHAR,
    transport_mode VARCHAR,
    safety_priority DECIMAL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_km DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.user_id,
        u.username,
        u.email,
        u.transport_mode,
        u.safety_priority,
        ST_Y(u.location::geometry) as latitude,
        ST_X(u.location::geometry) as longitude,
        ST_Distance(
            u.location::geography,
            ST_SetSRID(ST_Point(p_lon, p_lat), 4326)::geography
        ) / 1000.0 as distance_km
    FROM users u
    WHERE u.user_id != p_user_id
        AND u.location IS NOT NULL
        AND ST_DWithin(
            u.location::geography,
            ST_SetSRID(ST_Point(p_lon, p_lat), 4326)::geography,
            p_radius
        )
    ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION are_buddies(
    p_user_id_1 INTEGER,
    p_user_id_2 INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM buddy_requests
        WHERE ((sender_id = p_user_id_1 AND receiver_id = p_user_id_2)
            OR (sender_id = p_user_id_2 AND receiver_id = p_user_id_1))
        AND status = 'accepted'
    );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- STEP 6: Add sample test data
-- ========================================

DO $$
DECLARE
    sample_users INTEGER[];
    user_count INTEGER;
BEGIN
    -- FIXED: Use subquery with ORDER BY inside ARRAY_AGG
    SELECT ARRAY_AGG(sub.user_id) INTO sample_users
    FROM (
        SELECT user_id 
        FROM users 
        ORDER BY user_id 
        LIMIT 5
    ) sub;
    
    user_count := array_length(sample_users, 1);
    
    IF user_count > 0 THEN
        UPDATE users SET 
            location = ST_SetSRID(ST_MakePoint(
                -6.2603 + (random() - 0.5) * 0.1,
                53.3498 + (random() - 0.5) * 0.1
            ), 4326)::geography,
            transport_mode = CASE 
                WHEN random() < 0.33 THEN 'walking'
                WHEN random() < 0.66 THEN 'cycling'
                ELSE 'driving'
            END,
            safety_priority = 0.3 + (random() * 0.6)
        WHERE user_id = ANY(sample_users);
        
        RAISE NOTICE '✓ Updated % users with sample location data', user_count;
    ELSE
        RAISE NOTICE 'ℹ No users found to update with sample data';
    END IF;
END $$;

-- ========================================
-- STEP 7: Verify installation
-- ========================================

DO $$
DECLARE
    table_count INTEGER;
    user_count INTEGER;
    users_with_location INTEGER;
    postgis_version TEXT;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_name IN ('buddy_requests', 'group_routes', 'group_route_members');
    
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO users_with_location FROM users WHERE location IS NOT NULL;
    
    SELECT PostGIS_version() INTO postgis_version;
    
    RAISE NOTICE '';
    RAISE NOTICE '======================================';
    RAISE NOTICE '  BUDDY SYSTEM MIGRATION COMPLETE';
    RAISE NOTICE '======================================';
    RAISE NOTICE 'PostGIS version: %', postgis_version;
    RAISE NOTICE 'Buddy system tables: % created', table_count;
    RAISE NOTICE 'Total users: %', user_count;
    RAISE NOTICE 'Users with location: %', users_with_location;
    RAISE NOTICE 'Helper functions: 2 created';
    RAISE NOTICE 'Indexes: 15+ created';
    RAISE NOTICE '======================================';
    RAISE NOTICE '';
    
    IF table_count = 3 THEN
        RAISE NOTICE '✅ SUCCESS! All tables created successfully!';
        RAISE NOTICE '✅ Migration completed successfully!';
        RAISE NOTICE '';
        RAISE NOTICE '📋 Next steps:';
        RAISE NOTICE '1. Copy buddies.js to backend/routes/buddies.js';
        RAISE NOTICE '2. Restart your backend server (npm run dev)';
        RAISE NOTICE '3. Test at http://localhost:3000/findBuddy';
        RAISE NOTICE '';
        RAISE NOTICE '🎉 Your buddy system is ready to use!';
    ELSE
        RAISE WARNING '⚠ Expected 3 tables, found %. Check for errors above.', table_count;
    END IF;
END $$;

COMMENT ON TABLE buddy_requests IS 'Stores buddy connection requests between users';
COMMENT ON TABLE group_routes IS 'Stores group travel routes created by users';
COMMENT ON TABLE group_route_members IS 'Tracks which users have joined which group routes';
COMMENT ON COLUMN users.location IS 'User location as PostGIS geography (lat/lon)';
COMMENT ON COLUMN users.transport_mode IS 'Preferred transport mode: walking, cycling, driving';
COMMENT ON COLUMN users.safety_priority IS 'User safety priority level (0.0 to 1.0)';
