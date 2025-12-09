-- Migration: Create user_safety_preferences table
-- Description: Stores user-specific safety factor weights for route calculation
-- Date: 2025-12-05

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
CREATE TRIGGER update_user_safety_preferences_timestamp
  BEFORE UPDATE ON user_safety_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_safety_preferences_updated_at();

-- Insert default preferences for existing users
INSERT INTO user_safety_preferences (user_id, preset_name)
SELECT user_id, 'balanced'
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_safety_preferences WHERE user_safety_preferences.user_id = users.user_id
);

-- Add table and column comments
COMMENT ON TABLE user_safety_preferences IS 'Stores user-specific safety factor weights for personalized route calculation';
COMMENT ON COLUMN user_safety_preferences.preference_id IS 'Primary key - unique preference record identifier';
COMMENT ON COLUMN user_safety_preferences.user_id IS 'Foreign key to users table - one preference record per user';
COMMENT ON COLUMN user_safety_preferences.crime_weight IS 'Weight for crime factor (0-1), default 0.40 - Based on crime rate and severity in the area';
COMMENT ON COLUMN user_safety_preferences.collision_weight IS 'Weight for collision factor (0-1), default 0.25 - Based on traffic collision density';
COMMENT ON COLUMN user_safety_preferences.lighting_weight IS 'Weight for lighting factor (0-1), default 0.20 - Based on street lighting quality';
COMMENT ON COLUMN user_safety_preferences.hazard_weight IS 'Weight for hazard factor (0-1), default 0.15 - Based on user-reported hazards with severity levels (critical: 3.0, high: 2.5, medium: 1.2, low: 0.5). Only active hazards are considered. Distance-based weighting applies (closer hazards have more impact within 0.5km radius)';
COMMENT ON COLUMN user_safety_preferences.preset_name IS 'Name of preset being used: balanced, crime, night, cyclist, or custom';
COMMENT ON COLUMN user_safety_preferences.crime_severity_weights IS 'JSON object with custom severity weights for different crime types (e.g., {"Robbery": 0.9, "Theft": 0.5})';
COMMENT ON COLUMN user_safety_preferences.created_at IS 'Timestamp when preference record was created';
COMMENT ON COLUMN user_safety_preferences.updated_at IS 'Timestamp of last preference update (auto-updated by trigger)';
