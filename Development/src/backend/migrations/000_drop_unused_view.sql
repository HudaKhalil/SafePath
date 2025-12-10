-- Drop the view if it exists (CASCADE will drop any dependent objects)
DROP VIEW IF EXISTS user_safety_profiles CASCADE;

-- Add comment to track this migration
COMMENT ON SCHEMA public IS 'Dropped user_safety_profiles view on 2025-12-05 - not used in application code';
