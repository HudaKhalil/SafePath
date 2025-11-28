-- Profile Pictures Feature Migration
-- Adds support for user profile pictures stored in preferences JSONB

-- No schema changes needed - profile_picture is stored in existing preferences column
-- This migration documents the feature and ensures proper indexing

-- Verify preferences column exists (should already exist from 001_initial_schema.sql)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'preferences'
    ) THEN
        ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}'::jsonb;
        CREATE INDEX idx_users_preferences ON users USING GIN(preferences);
    END IF;
END $$;

-- Update column comment to include profile_picture field
COMMENT ON COLUMN users.preferences IS 
'JSONB column storing user preferences including:
- phone: string
- address: string
- emergency_contact: string
- preferred_transport: string (walking/cycling)
- safety_priority: string
- notifications: boolean
- longitude: number
- latitude: number
- profile_picture: string (path to uploaded image, e.g., "/uploads/profiles/xyz.jpg")
- factorWeights: object { crime, lighting, collision, hazard }';

-- Example query to get users with profile pictures:
-- SELECT user_id, username, preferences->>'profile_picture' as profile_picture
-- FROM users
-- WHERE preferences ? 'profile_picture';

-- Example query to update profile picture:
-- UPDATE users 
-- SET preferences = preferences || '{"profile_picture": "/uploads/profiles/abc.jpg"}'::jsonb
-- WHERE user_id = 1;

-- Example query to remove profile picture:
-- UPDATE users 
-- SET preferences = preferences - 'profile_picture'
-- WHERE user_id = 1;
