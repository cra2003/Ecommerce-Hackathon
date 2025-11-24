-- ================================
-- PRODUCT INVENTORY BATCH 3 of 3
-- Entries 91 to 91
-- ================================

-- Product Inventory
-- Uses warehouse IDs from postal_code_warehouse_map
-- Uses product_id, sku, and available_sizes from products

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_9bcdbf42',
        'f0e13a97-f872-4aea-8ad5-60fb4f1347f9',
        'P0036',
        'wh_008',
        'Ahmedabad Central Warehouse',
        '{"4":8,"5":28,"6":23,"7":44,"8":22}',
        0,
        'INR'
      );