-- ================================
-- ORDER WORKER MIGRATION
-- Adds guest checkout support to orders table
-- Migration ID: 0002
-- Date: 2025-01-XX
-- ================================
-- 
-- PURPOSE:
-- Modify orders table to support both authenticated users and guest sessions.
-- Enables guest checkout by making user_id nullable and adding guest_session_id.
-- Also adds shipping contact information columns for guest orders.
--
-- CHANGES:
-- 1. Make user_id nullable
-- 2. Add guest_session_id column (nullable)
-- 3. Add constraint: exactly one of user_id or guest_session_id must be set
-- 4. Add shipping_name, shipping_phone, shipping_email columns
-- 5. Update indexes to include guest_session_id
--
-- ================================

-- Create new table with updated schema
CREATE TABLE IF NOT EXISTS orders_new (
  order_id TEXT PRIMARY KEY,
  user_id TEXT,  -- Now nullable
  guest_session_id TEXT,  -- New column for guest sessions
  
  -- Shipping contact info (for guest orders, also useful for logged-in users)
  shipping_name TEXT,
  shipping_phone TEXT,
  shipping_email TEXT,
  
  products TEXT NOT NULL,              -- JSON array with product details + fulfillment allocations
  address TEXT NOT NULL,               -- JSON object with shipping address
  delivery_mode TEXT NOT NULL,         -- 'standard' or 'express'
  delivery_tier TEXT NOT NULL,         -- 'tier_1', 'tier_2', 'tier_3'
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_cost DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0.00,
  total DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',       -- pending, confirmed, paid, processing, shipped, delivered, cancelled, failed
  payment_status TEXT DEFAULT 'pending', -- pending, completed, failed, refunded
  estimated_delivery_date TEXT,        -- ISO date string
  tracking_number TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraint: exactly one of user_id or guest_session_id must be set
  CHECK (
    (user_id IS NOT NULL AND guest_session_id IS NULL) OR
    (user_id IS NULL AND guest_session_id IS NOT NULL)
  )
);

-- Copy existing data (only orders with user_id)
INSERT INTO orders_new (
  order_id, user_id, guest_session_id, 
  shipping_name, shipping_phone, shipping_email,
  products, address, delivery_mode, delivery_tier,
  subtotal, delivery_cost, tax, total,
  status, payment_status, estimated_delivery_date, tracking_number, notes,
  created_at, updated_at
)
SELECT 
  order_id, user_id, NULL,
  NULL, NULL, NULL,  -- shipping fields set to NULL for existing orders
  products, address, delivery_mode, delivery_tier,
  subtotal, delivery_cost, tax, total,
  status, payment_status, estimated_delivery_date, tracking_number, notes,
  created_at, updated_at
FROM orders;

-- Drop old table
DROP TABLE orders;

-- Rename new table to original name
ALTER TABLE orders_new RENAME TO orders;

-- Recreate indexes with guest support
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_guest_session_id ON orders(guest_session_id) WHERE guest_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_guest_status ON orders(guest_session_id, status) WHERE guest_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_shipping_email ON orders(shipping_email) WHERE shipping_email IS NOT NULL;

-- ================================
-- NOTES:
-- ================================
-- 1. user_id is now nullable to support guest checkout
-- 2. guest_session_id links to auth-worker's guest_sessions table
-- 3. Constraint ensures exactly one of user_id or guest_session_id is set (mutually exclusive)
-- 4. shipping_name, shipping_phone, shipping_email added for guest order contact info
--    - These are also useful for logged-in users as a snapshot at order time
-- 5. Indexes are created with WHERE clauses to optimize queries for both user types
-- 6. Existing orders with user_id will continue to work
-- 7. New guest orders will have user_id = NULL and guest_session_id set

