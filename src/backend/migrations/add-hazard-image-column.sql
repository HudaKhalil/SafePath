-- Migration: Add image_url column to hazards table
-- Purpose: Store uploaded hazard photos for better reporting
-- Date: 2025

DO $$
BEGIN
    -- Add image_url column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'hazards'
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE hazards ADD COLUMN image_url TEXT;
        RAISE NOTICE 'Added image_url column to hazards table';
    ELSE
        RAISE NOTICE 'image_url column already exists in hazards table';
    END IF;
END $$;

-- Verify the change
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'hazards'
AND column_name = 'image_url';
