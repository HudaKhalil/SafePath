-- Quick check if image_url column exists in hazards table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'hazards'
ORDER BY ordinal_position;
