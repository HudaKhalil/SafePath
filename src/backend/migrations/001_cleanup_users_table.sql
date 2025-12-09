-- Prerequisite: Run 000_drop_unused_view.sql first

-- Remove unused routing weight columns that should be in user_safety_preferences table
ALTER TABLE users 
DROP COLUMN IF EXISTS crime_weight,
DROP COLUMN IF EXISTS lighting_weight,
DROP COLUMN IF EXISTS traffic_weight,
DROP COLUMN IF EXISTS population_weight,
DROP COLUMN IF EXISTS police_weight;

-- Remove columns that should be in user_safety_preferences table
ALTER TABLE users 
DROP COLUMN IF EXISTS crime_severity_weights,
DROP COLUMN IF EXISTS safety_factor_weights;

-- -- Remove unused location sharing columns
-- ALTER TABLE users 
-- DROP COLUMN IF EXISTS location_sharing_enabled,
-- DROP COLUMN IF EXISTS discoverable,
-- DROP COLUMN IF EXISTS share_location_default_radius;

-- Add comments columns for clarity
COMMENT ON TABLE users IS 'User authentication and profile information';
COMMENT ON COLUMN users.user_id IS 'Primary key - unique user identifier';
COMMENT ON COLUMN users.username IS 'User display name';
COMMENT ON COLUMN users.email IS 'User email address (unique, used for authentication)';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password';
COMMENT ON COLUMN users.phone IS 'User phone number with country code';
COMMENT ON COLUMN users.address IS 'User home address';
COMMENT ON COLUMN users.emergency_contact IS 'Emergency contact phone number';
COMMENT ON COLUMN users.preferred_transport IS 'Default transport mode: walking, cycling, or driving';
COMMENT ON COLUMN users.notifications IS 'Whether user wants to receive notifications';
COMMENT ON COLUMN users.latitude IS 'User home location latitude';
COMMENT ON COLUMN users.longitude IS 'User home location longitude';
COMMENT ON COLUMN users.preferences IS 'JSONB column for flexible data storage (currently used for profile_picture URL)';
COMMENT ON COLUMN users.is_verified IS 'Whether user email has been verified';
COMMENT ON COLUMN users.verification_token IS 'Email verification token (temporary)';
COMMENT ON COLUMN users.token_expiration IS 'Verification token expiration timestamp';
COMMENT ON COLUMN users.created_at IS 'Account creation timestamp';
COMMENT ON COLUMN users.updated_at IS 'Last profile update timestamp';
