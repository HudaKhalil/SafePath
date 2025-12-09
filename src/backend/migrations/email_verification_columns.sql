-- Add email verification columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS token_expiration TIMESTAMP;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);

-- Add comment
COMMENT ON COLUMN users.is_verified IS 'Whether the user has verified their email address';
COMMENT ON COLUMN users.verification_token IS 'Unique token sent via email for verification';
COMMENT ON COLUMN users.token_expiration IS 'Expiration timestamp for the verification token';