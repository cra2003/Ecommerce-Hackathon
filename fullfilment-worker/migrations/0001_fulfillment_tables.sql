-- ================================
-- FULFILLMENT WORKER MIGRATION
-- Creates: product_inventory, postal_code_warehouse_map, delivery_cost_config
-- ================================

-- ================================
-- TABLE 1: product_inventory
-- ================================
CREATE TABLE IF NOT EXISTS product_inventory (
    inventory_id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    sku TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    warehouse_name TEXT NOT NULL,
    stock TEXT NOT NULL, -- JSON: {"6": 20, "7": 10, "8": 15, "9": 5, "10": 8}
    express_available INTEGER DEFAULT 1 CHECK (express_available IN (0, 1)),
    currency TEXT DEFAULT 'INR',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_product_inventory_product_id ON product_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_product_inventory_warehouse_id ON product_inventory(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_product_inventory_sku ON product_inventory(sku);

-- ================================
-- TABLE 2: postal_code_warehouse_map
-- ================================
CREATE TABLE IF NOT EXISTS postal_code_warehouse_map (
    mapping_id TEXT PRIMARY KEY,
    start_postal_code TEXT NOT NULL,
    end_postal_code TEXT NOT NULL,
    state TEXT NOT NULL,
    region_name TEXT,
    warehouses TEXT NOT NULL, -- JSON: [{"warehouse_id": "wh_001", "name": "Mumbai Central", "base_days": 1}, ...]
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_postal_code_warehouse_map_codes ON postal_code_warehouse_map(start_postal_code, end_postal_code);

-- ================================
-- TABLE 3: delivery_cost_config
-- ================================
CREATE TABLE IF NOT EXISTS delivery_cost_config (
    config_id TEXT PRIMARY KEY,
    tier_name TEXT NOT NULL UNIQUE CHECK (tier_name IN ('tier_1', 'tier_2', 'tier_3')),
    tier_description TEXT,
    standard_delivery_cost DECIMAL(10,2) NOT NULL,
    express_delivery_cost DECIMAL(10,2) NOT NULL,
    free_delivery_threshold DECIMAL(10,2),
    currency TEXT DEFAULT 'INR',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

