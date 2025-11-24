-- ================================
-- ORDERS WORKER TABLES
-- ================================

-- Orders table with fulfillment data
CREATE TABLE IF NOT EXISTS orders (
  order_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
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
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);


