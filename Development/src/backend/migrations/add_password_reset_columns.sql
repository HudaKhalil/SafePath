-- Add password reset token columns to users table
-- Migration: add_password_reset_columns.sql

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON users(password_reset_token);

-- Add comment
COMMENT ON COLUMN users.password_reset_token IS 'Token for password reset verification';
COMMENT ON COLUMN users.password_reset_expires IS 'Expiration timestamp for password reset token (1 hour validity)';
