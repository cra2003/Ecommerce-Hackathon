import { parseJSON } from '../utils/json.util.js';

/**
 * Fetch inventory for a product by product_id and size
 * Returns inventory row with stock grouped by warehouse in JSON
 */
export async function getInventoryByProductAndSize(db, product_id, size) {
  console.log(`[inventory-service] Querying for product_id: "${product_id}", size: "${size}"`);
  
  // Construct SKU from product_id and size (assuming format like "P0001-10")
  // Or query directly by product_id and size
  const { results } = await db.prepare(`
    SELECT 
      sku,
      product_id,
      size,
      stock,
      express_warehouses,
      currency,
      updated_at
    FROM product_inventory
    WHERE product_id = ? AND size = ?
    LIMIT 1
  `).bind(product_id, size).all();
  
  console.log(`[inventory-service] Query returned ${results?.length || 0} rows`);
  
  return results && results.length > 0 ? results[0] : null;
}

/**
 * Fetch inventory for a product in specific warehouses
 * Now works with grouped stock JSON structure
 * 
 * @param {D1Database} db - D1 database binding
 * @param {string} product_id - Product ID
 * @param {Array<string>} warehouseIds - Array of warehouse IDs to check
 * @param {string} size - Product size
 * @param {Array} priorityWarehouses - Optional: Priority warehouses with names for better data
 * @returns {Promise<Array>} Array of inventory entries per warehouse
 */
export async function getInventoryByProductAndWarehouses(db, product_id, warehouseIds, size, priorityWarehouses = null) {
  console.log(`[inventory-service] Querying for product_id: "${product_id}", size: "${size}", warehouses: ${warehouseIds.join(', ')}`);
  
  // Get inventory row for this product+size
  const inventory = await getInventoryByProductAndSize(db, product_id, size);
  
  if (!inventory) {
    console.log(`[inventory-service] No inventory found for product_id: ${product_id}, size: ${size}`);
    return [];
  }
  
  // Parse stock JSON: {"wh_007":73, "wh_006":76, "wh_001":53}
  const stockData = parseJSON(inventory.stock, {});
  const expressWarehouses = parseJSON(inventory.express_warehouses || '[]', []);
  
  // Create a map of warehouse_id -> warehouse name from priorityWarehouses if available
  const warehouseNameMap = {};
  if (priorityWarehouses && Array.isArray(priorityWarehouses)) {
    priorityWarehouses.forEach(wh => {
      warehouseNameMap[wh.warehouse_id] = wh.name || wh.warehouse_id;
    });
  }
  
  // Build results array with one entry per warehouse (matching old structure for compatibility)
  const results = [];
  
  for (const warehouseId of warehouseIds) {
    const stock = stockData[warehouseId] || 0;
    
    if (stock > 0) {
      results.push({
        warehouse_id: warehouseId,
        warehouse_name: warehouseNameMap[warehouseId] || warehouseId, // Use name from priority list or warehouse_id
        sku: inventory.sku,
        product_id: inventory.product_id,
        size: inventory.size,
        stock: stock, // Single warehouse stock
        stock_for_size: stock, // For compatibility
        express_available: expressWarehouses.includes(warehouseId) ? 1 : 0,
        currency: inventory.currency
      });
    }
  }
  
  console.log(`[inventory-service] Found inventory in ${results.length} warehouses`);
  
  return results;
}

/**
 * Parse inventory rows into stock maps (updated for new structure)
 * Now works with grouped stock JSON
 */
export function parseInventoryToStockMap(inventoryResults, size) {
  const inventoryMap = {};
  
  inventoryResults.forEach(item => {
    const warehouseId = item.warehouse_id;
    const stockForSize = item.stock_for_size || item.stock || 0;
    
    inventoryMap[warehouseId] = {
      warehouse_name: item.warehouse_name || warehouseId,
      sku: item.sku,
      stock_for_size: stockForSize,
      express_available: item.express_available === 1 || item.express_available === true,
      currency: item.currency || 'INR'
    };
    
    console.log(`[fulfillment-check] Warehouse ${warehouseId}: stock_for_size_${size}=${stockForSize}, express=${inventoryMap[warehouseId].express_available}`);
  });
  
  return inventoryMap;
}

/**
 * Fetch all inventory rows for a product (all sizes)
 * Used by stock-by-product and stock-by-size handlers
 * 
 * Returns one row per warehouse per size (expanded from grouped JSON)
 * This matches the old structure format for compatibility
 * 
 * @param {D1Database} db - D1 database binding
 * @param {string} product_id - Product ID
 * @returns {Promise<Array>} Array of inventory rows (one per warehouse per size)
 */
export async function getInventoryByProduct(db, product_id) {
  console.log(`[inventory-service] Querying for product_id: "${product_id}"`);
  
  const { results } = await db.prepare(`
    SELECT 
      sku,
      product_id,
      size,
      stock,
      express_warehouses,
      currency,
      updated_at
    FROM product_inventory
    WHERE product_id = ?
    ORDER BY size
  `).bind(product_id).all();
  
  console.log(`[inventory-service] Query returned ${results?.length || 0} rows`);
  
  // Transform results to match old structure format for compatibility
  // Old structure: one row per warehouse per size
  // New structure: one row per size, with stock JSON grouped by warehouse
  const transformed = (results || []).map(row => {
    // Parse stock JSON to get warehouse stocks: {"wh_007":73, "wh_006":76}
    const stockData = parseJSON(row.stock, {});
    const expressWarehouses = parseJSON(row.express_warehouses || '[]', []);
    
    // Return one row per warehouse (for compatibility with old handlers)
    const warehouseRows = [];
    for (const [warehouseId, stock] of Object.entries(stockData)) {
      const stockQty = Number(stock) || 0;
      
      // Only include rows with stock > 0, or include all if we want to show zero stock too
      // For now, include all rows so aggregation works correctly
      warehouseRows.push({
        warehouse_id: warehouseId,
        warehouse_name: warehouseId, // We don't have warehouse names in new structure
        sku: row.sku,
        product_id: row.product_id,
        size: row.size,
        stock: stockQty, // Stock for this warehouse and size (ensure it's a number)
        express_available: expressWarehouses.includes(warehouseId) ? 1 : 0,
        currency: row.currency,
        updated_at: row.updated_at
      });
    }
    
    return warehouseRows;
  }).flat(); // Flatten array of arrays
  
  console.log(`[inventory-service] Expanded ${results?.length || 0} rows to ${transformed.length} warehouse-size combinations`);
  
  return transformed;
}

/**
 * Fetch single inventory row for stock operations (by product_id and size)
 * Updated for new structure where stock is JSON grouped by warehouse
 * 
 * Note: This is used by stock-deduct and stock-restore handlers
 * They need to update stock JSON for a specific warehouse
 * 
 * The stock JSON format is now: {"wh_007":73, "wh_006":76} (warehouse -> quantity)
 * Not the old format: {"7":73, "8":76} (size -> quantity)
 * 
 * @param {D1Database} db - D1 database binding
 * @param {string} warehouse_id - Warehouse ID (not used for query, but passed for compatibility)
 * @param {string} product_id - Product ID
 * @param {string} size - Product size (optional, but recommended for accurate query)
 * @returns {Promise<Object|null>} Inventory row with stock JSON, or null
 */
export async function getInventoryRow(db, warehouse_id, product_id, size = null) {
  console.log(`[inventory-service] Querying for warehouse=${warehouse_id}, product_id=${product_id}, size=${size || 'any'}`);
  
  let query;
  let bindings;
  
  if (size) {
    query = `
      SELECT 
        sku,
        product_id,
        size,
        stock,
        express_warehouses,
        currency,
        updated_at
      FROM product_inventory
      WHERE product_id = ? AND size = ?
      LIMIT 1
    `;
    bindings = [product_id, size];
  } else {
    // Query first row for product_id (for backwards compatibility)
    // WARNING: This may not be the correct size!
    query = `
      SELECT 
        sku,
        product_id,
        size,
        stock,
        express_warehouses,
        currency,
        updated_at
      FROM product_inventory
      WHERE product_id = ?
      LIMIT 1
    `;
    bindings = [product_id];
  }
  
  const inventory = await db.prepare(query).bind(...bindings).first();
  
  if (!inventory) {
    console.log(`[inventory-service] No inventory found for product_id=${product_id}, size=${size || 'any'}`);
    return null;
  }
  
  // Return in format expected by stock-deduct/stock-restore handlers
  // They expect: { inventory_id (or sku), stock (JSON string) }
  return {
    inventory_id: inventory.sku, // Use sku as inventory_id for compatibility
    sku: inventory.sku,
    product_id: inventory.product_id,
    size: inventory.size,
    stock: inventory.stock, // JSON string like {"wh_007":73, "wh_006":76}
    express_warehouses: inventory.express_warehouses,
    currency: inventory.currency,
    updated_at: inventory.updated_at
  };
}

/**
 * Fetch inventory for constructing SKU ID
 */
export async function getInventorySkuId(db, product_id, size) {
  const inventory = await getInventoryByProductAndSize(db, product_id, size);
  return inventory ? inventory.sku : null;
}
