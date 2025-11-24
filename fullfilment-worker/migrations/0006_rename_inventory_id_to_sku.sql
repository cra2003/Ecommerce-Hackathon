-- ================================
-- MIGRATION: Rename inventory_id to sku and remove sku column
-- Migration ID: 0006
-- ================================
-- 
-- CHANGES:
-- - Rename inventory_id column to sku
-- - Delete the old sku column
--
-- SQLite doesn't support ALTER COLUMN, so we need to:
-- 1. Create new table with correct structure
-- 2. Copy data (using inventory_id as new sku)
-- 3. Drop old table and rename new table
-- ================================

-- Step 1: Create new table with inventory_id renamed to sku (and no separate sku column)
CREATE TABLE IF NOT EXISTS product_inventory_new (
    sku TEXT PRIMARY KEY,  -- This was inventory_id, now it's sku
    product_id TEXT NOT NULL,
    size TEXT NOT NULL,
    stock TEXT NOT NULL, -- JSON: {"wh_007": 16, "wh_003": 30}
    express_warehouses TEXT, -- JSON array of warehouse_ids
    currency TEXT DEFAULT 'INR',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, size)
);

-- Step 2: Create indexes for the new table
CREATE INDEX IF NOT EXISTS idx_product_inventory_new_product_id ON product_inventory_new(product_id);
CREATE INDEX IF NOT EXISTS idx_product_inventory_new_sku ON product_inventory_new(sku);
CREATE INDEX IF NOT EXISTS idx_product_inventory_new_size ON product_inventory_new(size);
CREATE INDEX IF NOT EXISTS idx_product_inventory_new_product_size ON product_inventory_new(product_id, size);

-- Step 3: Copy data from old table (using inventory_id as new sku)
INSERT INTO product_inventory_new (
    sku,
    product_id,
    size,
    stock,
    express_warehouses,
    currency,
    updated_at
)
SELECT 
    inventory_id AS sku,  -- Use inventory_id as the new sku
    product_id,
    size,
    stock,
    express_warehouses,
    currency,
    updated_at
FROM product_inventory;

-- Step 4: Backup old table and activate new one
-- First, rename current table to backup
ALTER TABLE product_inventory RENAME TO product_inventory_backup_3;

-- Then, rename new table to become the active table
ALTER TABLE product_inventory_new RENAME TO product_inventory;

-- Migration complete!
-- 
-- VERIFICATION:
-- Run this query to verify:
-- PRAGMA table_info(product_inventory);
-- SELECT sku, product_id, size, stock FROM product_inventory LIMIT 5;
--
-- CLEANUP (after verifying):
-- DROP TABLE product_inventory_backup_3;
--
-- ROLLBACK (if needed):
-- DROP TABLE product_inventory;
-- ALTER TABLE product_inventory_backup_3 RENAME TO product_inventory;

