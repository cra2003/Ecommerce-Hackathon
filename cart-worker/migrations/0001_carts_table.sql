-- ================================
-- CART WORKER MIGRATION
-- Creates: carts table for user shopping carts
-- ================================

-- ================================
-- TABLE: carts
-- ================================
CREATE TABLE IF NOT EXISTS carts (
    cart_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    
    -- Products in cart (JSON array)
    -- Format: [
    --   {
    --     "product_id": "uuid-here",
    --     "sku": "P0001",
    --     "name": "Skyline Vapour Alpha",
    --     "size": "9",
    --     "quantity": 2,
    --     "price": 3500.00,
    --     "currency": "INR"
    --   },
    --   ...
    -- ]
    products TEXT NOT NULL DEFAULT '[]',
    
    -- Delivery address (JSON object)
    -- Format: {
    --   "full_name": "John Doe",
    --   "phone": "+91 9876543210",
    --   "address_line1": "123 Main Street",
    --   "address_line2": "Apt 4B",
    --   "city": "Mumbai",
    --   "state": "Maharashtra",
    --   "postal_code": "400001",
    --   "country": "India",
    --   "is_default": true
    -- }
    address TEXT,
    
    -- Cart metadata
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'abandoned', 'converted')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_status ON carts(status);
CREATE INDEX IF NOT EXISTS idx_carts_user_status ON carts(user_id, status);

-- ================================
-- NOTES:
-- ================================
-- 1. cart_id is PRIMARY KEY (UUID)
-- 2. user_id links to auth-worker's users table
-- 3. products is a JSON array of product objects with details
-- 4. address is a JSON object for delivery address (optional, set at checkout)
-- 5. status: 'active' = current cart, 'abandoned' = old cart, 'converted' = cart became order
-- 6. One active cart per user (enforced in application logic)

