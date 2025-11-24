-- ================================
-- PRICE WORKER MIGRATION
-- Creates: prices table for product pricing, discounts, and offers
-- ================================

-- ================================
-- TABLE: prices
-- ================================
CREATE TABLE IF NOT EXISTS prices (
    price_id TEXT PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE,
    product_id TEXT, -- Optional: link to product-worker's product_id
    
    -- Base Pricing
    base_price DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    
    -- Sale Pricing
    sale_price DECIMAL(10,2),
    discount_percentage DECIMAL(5,2), -- e.g., 15.50 for 15.5% off
    is_on_sale BOOLEAN DEFAULT 0 CHECK (is_on_sale IN (0, 1)),
    
    -- Member Pricing
    member_price DECIMAL(10,2),
    member_discount_percentage DECIMAL(5,2),
    is_member_exclusive BOOLEAN DEFAULT 0 CHECK (is_member_exclusive IN (0, 1)),
    
    -- Offer Details
    offer_type TEXT, -- e.g., 'FLAT_OFF', 'PERCENTAGE_OFF', 'BUY_ONE_GET_ONE', 'BULK_DISCOUNT'
    offer_description TEXT,
    offer_value DECIMAL(10,2), -- Flat discount amount or percentage
    min_purchase_quantity INTEGER, -- Minimum quantity for offer to apply
    max_discount_amount DECIMAL(10,2), -- Cap on discount amount
    
    -- Offer Validity
    offer_start_date DATETIME,
    offer_end_date DATETIME,
    is_offer_active BOOLEAN DEFAULT 0 CHECK (is_offer_active IN (0, 1)),
    
    -- Bulk Pricing (JSON: {"quantity": 3, "price": 2500.00})
    bulk_pricing TEXT, -- JSON array of bulk pricing tiers
    
    -- Status & Metadata
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    price_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prices_sku ON prices(sku);
CREATE INDEX IF NOT EXISTS idx_prices_product_id ON prices(product_id);
CREATE INDEX IF NOT EXISTS idx_prices_status ON prices(status);
CREATE INDEX IF NOT EXISTS idx_prices_is_on_sale ON prices(is_on_sale);
CREATE INDEX IF NOT EXISTS idx_prices_offer_active ON prices(is_offer_active);
CREATE INDEX IF NOT EXISTS idx_prices_offer_dates ON prices(offer_start_date, offer_end_date);

-- ================================
-- NOTES:
-- ================================
-- 1. sku is UNIQUE - one price record per SKU
-- 2. base_price is always required
-- 3. sale_price and discount_percentage are optional
-- 4. member_price is for member-only pricing
-- 5. offer_type can be: FLAT_OFF, PERCENTAGE_OFF, BOGO, BULK_DISCOUNT, etc.
-- 6. bulk_pricing is JSON: [{"quantity": 3, "price": 2500.00}, {"quantity": 5, "price": 2300.00}]
-- 7. offer_start_date and offer_end_date control offer validity
-- 8. is_offer_active flag for quick filtering of active offers

