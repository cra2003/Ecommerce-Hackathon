-- ================================
-- AUTH WORKER MIGRATION
-- Creates: guest_sessions table for guest checkout support
-- Migration ID: 0003
-- Date: 2025-01-XX
-- ================================
-- 
-- PURPOSE:
-- Store guest session information for users who checkout without creating an account.
-- Guest sessions are temporary and expire after a period of time.
--
-- ================================

CREATE TABLE IF NOT EXISTS guest_sessions (
  guest_session_id TEXT PRIMARY KEY,
  email TEXT,
  phone TEXT,
  name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);

-- Indexes for guest sessions
CREATE INDEX IF NOT EXISTS idx_guest_sessions_email ON guest_sessions(email);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_expires_at ON guest_sessions(expires_at);

-- ================================
-- NOTES:
-- ================================
-- 1. guest_session_id is PRIMARY KEY (UUID)
-- 2. email, phone, name are optional and can be NULL until guest provides them
-- 3. expires_at is required and should be set to a future date (e.g., 30 days from creation)
-- 4. This table enables guest checkout without requiring user registration
-- 5. Guest sessions can be used in cart-worker and order-worker via guest_session_id

