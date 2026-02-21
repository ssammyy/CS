-- Migration: Add phone column to users table
-- Version: V18
-- Description: Adds an optional phone number field to the users table for contact information

-- Add phone column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Create index on phone for faster lookups (optional, but useful if phone is used for searches)
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- Add comment to the column
COMMENT ON COLUMN users.phone IS 'User phone number for contact purposes';
