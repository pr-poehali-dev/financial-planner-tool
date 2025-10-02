-- Make telegram_id nullable to support both Telegram and email/password auth
ALTER TABLE users DROP CONSTRAINT IF EXISTS "37701_37707_1_not_null";