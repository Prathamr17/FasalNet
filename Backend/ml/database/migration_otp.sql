-- OTP Codes Table
-- Run this migration to add OTP support

CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY,
  email VARCHAR(180) NOT NULL,
  otp_hash TEXT NOT NULL,
  purpose VARCHAR(50) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempt_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_otp_codes_email_purpose ON otp_codes(email, purpose, is_verified);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes(expires_at);

-- Add email column to users table if it doesn't have unique constraint
-- ALTER TABLE users ADD CONSTRAINT unique_email UNIQUE (email);
