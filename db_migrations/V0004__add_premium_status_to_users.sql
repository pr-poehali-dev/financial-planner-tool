-- Add premium status fields to users table
ALTER TABLE users 
ADD COLUMN is_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN premium_expires_at TIMESTAMP;

-- Add index for quick premium status checks
CREATE INDEX idx_users_premium ON users(is_premium, premium_expires_at);