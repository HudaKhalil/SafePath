-- SafePath Database Schema
-- Initial migration: Users and authentication tables

-- Create users table if not exists
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Create index on preferences for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_users_preferences ON users USING GIN(preferences);

-- Add comment documenting preferences structure
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
- profile_picture: string (path to uploaded image)
- factorWeights: object { crime, lighting, collision, hazard }';

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
