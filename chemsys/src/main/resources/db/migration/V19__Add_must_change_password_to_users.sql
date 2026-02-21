-- Add must_change_password column for force-reset-on-first-login flow
-- Add as nullable first, backfill existing rows, then set NOT NULL (handles tables with existing data)
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN;
UPDATE users SET must_change_password = false WHERE must_change_password IS NULL;
ALTER TABLE users ALTER COLUMN must_change_password SET NOT NULL;
ALTER TABLE users ALTER COLUMN must_change_password SET DEFAULT false;
COMMENT ON COLUMN users.must_change_password IS 'When true, user must change password on next login';
