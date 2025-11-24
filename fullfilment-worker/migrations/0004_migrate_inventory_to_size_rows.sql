-- ================================
-- MIGRATION: Expand inventory rows by size
-- Converts stock JSON into individual rows per size variant
-- Migration ID: 0004
-- Date: 2025-01-XX
-- ================================
-- 
-- CURRENT STRUCTURE:
-- product_inventory (stock as JSON: {"7":75,"8":68,"9":39})
--
-- NEW STRUCTURE:
-- product_inventory (size as column, stock as INTEGER)
--
-- NOTE: This migration expands one row per size into multiple rows
-- ================================

-- Step 1: Create new table structure with size column
CREATE TABLE IF NOT EXISTS product_inventory_new (
    inventory_id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    sku TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    warehouse_name TEXT NOT NULL,
    size TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    express_available INTEGER DEFAULT 1 CHECK (express_available IN (0, 1)),
    currency TEXT DEFAULT 'INR',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(warehouse_id, sku)
);

-- Step 2: Create indexes for the new table
CREATE INDEX IF NOT EXISTS idx_product_inventory_new_product_id ON product_inventory_new(product_id);
CREATE INDEX IF NOT EXISTS idx_product_inventory_new_warehouse_id ON product_inventory_new(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_product_inventory_new_sku ON product_inventory_new(sku);
CREATE INDEX IF NOT EXISTS idx_product_inventory_new_size ON product_inventory_new(size);
CREATE INDEX IF NOT EXISTS idx_product_inventory_new_product_size ON product_inventory_new(product_id, size);
CREATE INDEX IF NOT EXISTS idx_product_inventory_new_warehouse_product ON product_inventory_new(warehouse_id, product_id);

-- Step 3: Migrate data by expanding JSON stock into individual rows
-- This uses json_each to expand each size in the stock JSON into a separate row
INSERT INTO product_inventory_new (
    inventory_id,
    product_id,
    sku,
    warehouse_id,
    warehouse_name,
    size,
    stock,
    express_available,
    currency,
    updated_at
)
SELECT 
    -- Generate new inventory_id: original_id + '-' + size
    pi.inventory_id || '-' || je.key AS inventory_id,
    pi.product_id,
    -- New sku format: original_sku + '-' + size
    pi.sku || '-' || je.key AS sku,
    pi.warehouse_id,
    pi.warehouse_name,
    je.key AS size,
    -- Extract stock quantity for this size from JSON
    CAST(je.value AS INTEGER) AS stock,
    pi.express_available,
    pi.currency,
    pi.updated_at
FROM product_inventory pi
CROSS JOIN json_each(pi.stock) je
WHERE CAST(je.value AS INTEGER) > 0;  -- Only include sizes with stock > 0

-- Step 4: Backup old table and activate new one
-- First, rename current table to backup
ALTER TABLE product_inventory RENAME TO product_inventory_backup;

-- Then, rename new table to become the active table
ALTER TABLE product_inventory_new RENAME TO product_inventory;

-- Migration complete!
-- 
-- VERIFICATION:
-- Run this query to verify the migration:
-- SELECT product_id, sku, warehouse_id, size, stock FROM product_inventory LIMIT 10;
--
-- CLEANUP (after verifying):
-- DROP TABLE product_inventory_backup;
--
-- ROLLBACK (if needed):
-- DROP TABLE product_inventory;
-- ALTER TABLE product_inventory_backup RENAME TO product_inventory;
