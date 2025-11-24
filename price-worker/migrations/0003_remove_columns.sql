-- ================================
-- PRICE WORKER MIGRATION
-- Removes: member pricing, offer details, and bulk pricing columns
-- ================================

-- Step 1: Create new table without the columns to be removed
CREATE TABLE IF NOT EXISTS prices_new (
    price_id TEXT PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE,
    product_id TEXT,
    
    -- Base Pricing
    base_price DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    
    -- Sale Pricing
    sale_price DECIMAL(10,2),
    discount_percentage DECIMAL(5,2),
    is_on_sale BOOLEAN DEFAULT 0 CHECK (is_on_sale IN (0, 1)),
    
    -- Status & Metadata
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    price_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Copy data from old table to new table (only columns that exist in both)
INSERT INTO prices_new (
    price_id,
    sku,
    product_id,
    base_price,
    currency,
    sale_price,
    discount_percentage,
    is_on_sale,
    status,
    price_updated_at,
    created_at,
    updated_at
)
SELECT 
    price_id,
    sku,
    product_id,
    base_price,
    currency,
    sale_price,
    discount_percentage,
    is_on_sale,
    status,
    price_updated_at,
    created_at,
    updated_at
FROM prices;

-- Step 3: Drop old table
DROP TABLE IF EXISTS prices;

-- Step 4: Rename new table to original name
ALTER TABLE prices_new RENAME TO prices;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_prices_sku ON prices(sku);
CREATE INDEX IF NOT EXISTS idx_prices_product_id ON prices(product_id);
CREATE INDEX IF NOT EXISTS idx_prices_status ON prices(status);
CREATE INDEX IF NOT EXISTS idx_prices_is_on_sale ON prices(is_on_sale);

