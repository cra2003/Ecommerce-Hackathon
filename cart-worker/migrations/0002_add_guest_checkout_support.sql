-- ================================
-- CART WORKER MIGRATION
-- Adds guest checkout support to carts table
-- Migration ID: 0002
-- Date: 2025-01-XX
-- ================================
-- 
-- PURPOSE:
-- Modify carts table to support both authenticated users and guest sessions.
-- Enables guest checkout by making user_id nullable and adding guest_session_id.
--
-- CHANGES:
-- 1. Make user_id nullable
-- 2. Add guest_session_id column (nullable)
-- 3. Add constraint: exactly one of user_id or guest_session_id must be set
-- 4. Update indexes to include guest_session_id
--
-- ================================

-- Step 1: Add guest_session_id column (nullable)
ALTER TABLE carts ADD COLUMN guest_session_id TEXT;

-- Step 2: Make user_id nullable
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table
-- However, D1 supports some ALTER operations. Let's try a safer approach:
-- We'll use a table recreation strategy if ALTER doesn't work

-- First, let's create a backup strategy comment
-- Note: If this fails, you may need to recreate the table

-- Attempt to make user_id nullable by recreating the table
-- This is the safest approach for SQLite/D1

-- Create new table with updated schema
CREATE TABLE IF NOT EXISTS carts_new (
    cart_id TEXT PRIMARY KEY,
    user_id TEXT,  -- Now nullable
    guest_session_id TEXT,  -- New column for guest sessions
    
    -- Products in cart (JSON array)
    products TEXT NOT NULL DEFAULT '[]',
    
    -- Delivery address (JSON object)
    address TEXT,
    
    -- Cart metadata
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'abandoned', 'converted')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: exactly one of user_id or guest_session_id must be set
    CHECK (
        (user_id IS NOT NULL AND guest_session_id IS NULL) OR
        (user_id IS NULL AND guest_session_id IS NOT NULL)
    )
);

-- Copy existing data (only carts with user_id)
INSERT INTO carts_new (cart_id, user_id, guest_session_id, products, address, status, created_at, updated_at)
SELECT cart_id, user_id, NULL, products, address, status, created_at, updated_at
FROM carts;

-- Drop old table
DROP TABLE carts;

-- Rename new table to original name
ALTER TABLE carts_new RENAME TO carts;

-- Step 3: Recreate indexes with guest support
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_carts_guest_session_id ON carts(guest_session_id) WHERE guest_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_carts_status ON carts(status);
CREATE INDEX IF NOT EXISTS idx_carts_user_status ON carts(user_id, status) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_carts_guest_status ON carts(guest_session_id, status) WHERE guest_session_id IS NOT NULL;

-- ================================
-- NOTES:
-- ================================
-- 1. user_id is now nullable to support guest checkout
-- 2. guest_session_id links to auth-worker's guest_sessions table
-- 3. Constraint ensures exactly one of user_id or guest_session_id is set (mutually exclusive)
-- 4. Indexes are created with WHERE clauses to optimize queries for both user types
-- 5. Existing carts with user_id will continue to work
-- 6. New guest carts will have user_id = NULL and guest_session_id set

