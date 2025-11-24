-- ================================
-- MIGRATION: Group inventory by SKU
-- Groups warehouse stocks into JSON per SKU (product_id + size)
-- Migration ID: 0005
-- Date: 2025-01-XX
-- ================================
-- 
-- CURRENT STRUCTURE:
-- product_inventory (one row per warehouse_id + sku)
-- - Multiple rows for same SKU in different warehouses
-- Example: 
--   inv_a7c6ebb7-11  P0005-11  wh_007  size=11  stock=16
--   inv_8dcb0a15-11  P0005-11  wh_003  size=11  stock=30
--
-- NEW STRUCTURE:
-- product_inventory (one row per SKU, stocks grouped by warehouse in JSON)
-- - Stock: {"wh_007": 16, "wh_003": 30}
-- Example:
--   P0005-11  size=11  stock={"wh_007": 16, "wh_003": 30}
--
-- ================================

-- Step 1: Create new table structure with grouped stock JSON
CREATE TABLE IF NOT EXISTS product_inventory_new (
    inventory_id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    sku TEXT NOT NULL,
    size TEXT NOT NULL,
    stock TEXT NOT NULL, -- JSON: {"wh_007": 16, "wh_003": 30}
    express_warehouses TEXT, -- JSON array of warehouse_ids that support express: ["wh_007", "wh_003"]
    currency TEXT DEFAULT 'INR',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, size)
);

-- Step 2: Create indexes for the new table
CREATE INDEX IF NOT EXISTS idx_product_inventory_new_product_id ON product_inventory_new(product_id);
CREATE INDEX IF NOT EXISTS idx_product_inventory_new_sku ON product_inventory_new(sku);
CREATE INDEX IF NOT EXISTS idx_product_inventory_new_size ON product_inventory_new(size);
CREATE INDEX IF NOT EXISTS idx_product_inventory_new_product_size ON product_inventory_new(product_id, size);

-- Step 3: Migrate data by grouping warehouses per SKU
-- Extract base SKU and group warehouse stocks into JSON
INSERT INTO product_inventory_new (
    inventory_id,
    product_id,
    sku,
    size,
    stock,
    express_warehouses,
    currency,
    updated_at
)
WITH base_sku_extracted AS (
    SELECT 
        product_id,
        size,
        -- Extract base SKU (remove size suffix like -11 from P0005-11)
        -- If sku is "P0005-11", we want "P0005"
        CASE 
            WHEN instr(sku, '-') > 0 THEN substr(sku, 1, instr(sku, '-') - 1)
            ELSE sku
        END AS base_sku,
        warehouse_id,
        stock,
        express_available,
        currency,
        updated_at
    FROM product_inventory
)
SELECT 
    base_sku || '-' || size AS inventory_id,
    product_id,
    base_sku AS sku,
    size,
    -- Build JSON object manually: {"wh_001": stock1, "wh_002": stock2, ...}
    '{' || GROUP_CONCAT(
        '"' || warehouse_id || '":' || stock,
        ','
    ) || '}' AS stock,
    -- Collect express warehouses as JSON array (filter NULL values)
    '[' || GROUP_CONCAT(
        CASE WHEN express_available = 1 THEN '"' || warehouse_id || '"' ELSE NULL END,
        ','
    ) || ']' AS express_warehouses,
    MAX(currency) AS currency,
    MAX(updated_at) AS updated_at
FROM base_sku_extracted
GROUP BY product_id, size, base_sku;

-- Step 4: Clean up express_warehouses (remove NULL values from JSON array)
UPDATE product_inventory_new 
SET express_warehouses = REPLACE(
    REPLACE(express_warehouses, ',NULL', ''),
    'NULL,', ''
)
WHERE express_warehouses LIKE '%NULL%';

-- Fix empty arrays
UPDATE product_inventory_new 
SET express_warehouses = '[]'
WHERE express_warehouses = '[NULL]' OR express_warehouses = '[]' OR express_warehouses = '';

-- Step 5: Backup old table and activate new one
-- First, rename current table to backup
ALTER TABLE product_inventory RENAME TO product_inventory_backup_2;

-- Then, rename new table to become the active table
ALTER TABLE product_inventory_new RENAME TO product_inventory;

-- Migration complete!
-- 
-- VERIFICATION:
-- Run this query to verify the migration:
-- SELECT product_id, sku, size, stock FROM product_inventory WHERE sku = 'P0005' LIMIT 5;
--
-- CLEANUP (after verifying):
-- DROP TABLE product_inventory_backup_2;
--
-- ROLLBACK (if needed):
-- DROP TABLE product_inventory;
-- ALTER TABLE product_inventory_backup_2 RENAME TO product_inventory;
