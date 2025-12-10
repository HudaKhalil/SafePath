-- Migration script to add new columns to hazards table
-- Run this script on your production database

-- Add priority_level column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hazards' AND column_name = 'priority_level'
  ) THEN
    ALTER TABLE hazards 
    ADD COLUMN priority_level VARCHAR(20) DEFAULT 'normal';
    RAISE NOTICE 'Added priority_level column';
  ELSE
    RAISE NOTICE 'priority_level column already exists';
  END IF;
END $$;

-- Add affects_traffic column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hazards' AND column_name = 'affects_traffic'
  ) THEN
    ALTER TABLE hazards 
    ADD COLUMN affects_traffic BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added affects_traffic column';
  ELSE
    RAISE NOTICE 'affects_traffic column already exists';
  END IF;
END $$;

-- Add weather_related column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hazards' AND column_name = 'weather_related'
  ) THEN
    ALTER TABLE hazards 
    ADD COLUMN weather_related BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added weather_related column';
  ELSE
    RAISE NOTICE 'weather_related column already exists';
  END IF;
END $$;

-- Update existing hazards with appropriate values based on severity and type
UPDATE hazards 
SET 
  priority_level = CASE 
    WHEN severity = 'critical' THEN 'urgent'
    WHEN severity = 'high' THEN 'high'
    WHEN severity = 'medium' THEN 'normal'
    ELSE 'low'
  END,
  affects_traffic = CASE 
    WHEN hazard_type IN ('accident', 'construction', 'road_damage', 'flooding') THEN true
    ELSE false
  END,
  weather_related = CASE 
    WHEN hazard_type IN ('flooding', 'poor_lighting') THEN true
    ELSE false
  END
WHERE priority_level IS NULL OR affects_traffic IS NULL OR weather_related IS NULL;

-- Show updated table structure
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'hazards'
ORDER BY ordinal_position;
