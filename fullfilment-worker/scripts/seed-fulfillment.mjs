#!/usr/bin/env node

/**
 * Seed script for fulfillment-worker tables
 * Fetches products from product-worker and generates:
 * 1. postal_code_warehouse_map: Maps postal codes to warehouses (GENERATED FIRST)
 * 2. product_inventory: Uses warehouse IDs from postal mappings, product_id, sku, available_sizes
 * 3. delivery_cost_config: Delivery cost tiers
 *
 * Usage:
 * node scripts/seed-fulfillment.mjs
 *   --api https://products-worker.aadhi18082003.workers.dev
 *   --db ecommerce-db-1
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRODUCTS_API = process.env.PRODUCTS_API || 'https://products-worker.aadhi18082003.workers.dev';
const DB_NAME = process.env.DB_NAME || 'ecommerce-db-1';

// Warehouse configuration
const WAREHOUSES = [
	{ id: 'wh_001', name: 'Mumbai Central Warehouse' },
	{ id: 'wh_002', name: 'Delhi North Warehouse' },
	{ id: 'wh_003', name: 'Bangalore Tech Warehouse' },
	{ id: 'wh_004', name: 'Chennai Central Warehouse' },
	{ id: 'wh_005', name: 'Kolkata East Warehouse' },
	{ id: 'wh_006', name: 'Hyderabad North Warehouse' },
	{ id: 'wh_007', name: 'Pune West Warehouse' },
	{ id: 'wh_008', name: 'Ahmedabad Central Warehouse' },
];

// Expanded postal code ranges for major regions (India)
const POSTAL_CODE_RANGES = [
	{ start: '400001', end: '400099', state: 'Maharashtra', region: 'Mumbai Metro' },
	{ start: '400100', end: '400199', state: 'Maharashtra', region: 'Mumbai Metro' },
	{ start: '110001', end: '110099', state: 'Delhi', region: 'Delhi NCR' },
	{ start: '110100', end: '110199', state: 'Delhi', region: 'Delhi NCR' },
	{ start: '560001', end: '560099', state: 'Karnataka', region: 'Bangalore Metro' },
	{ start: '560100', end: '560199', state: 'Karnataka', region: 'Bangalore Metro' },
	{ start: '600001', end: '600099', state: 'Tamil Nadu', region: 'Chennai Metro' },
	{ start: '600100', end: '600199', state: 'Tamil Nadu', region: 'Chennai Metro' },
	{ start: '700001', end: '700099', state: 'West Bengal', region: 'Kolkata Metro' },
	{ start: '700100', end: '700199', state: 'West Bengal', region: 'Kolkata Metro' },
	{ start: '500001', end: '500099', state: 'Telangana', region: 'Hyderabad Metro' },
	{ start: '500100', end: '500199', state: 'Telangana', region: 'Hyderabad Metro' },
	{ start: '411001', end: '411099', state: 'Maharashtra', region: 'Pune Metro' },
	{ start: '411100', end: '411199', state: 'Maharashtra', region: 'Pune Metro' },
	{ start: '380001', end: '380099', state: 'Gujarat', region: 'Ahmedabad Metro' },
	{ start: '380100', end: '380199', state: 'Gujarat', region: 'Ahmedabad Metro' },
];

function generateUUID() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateStock(availableSizes) {
	// available_sizes is a JSON array like ["7","8","9","10","11"]
	// Generate stock ONLY for sizes that exist in available_sizes
	const stock = {};
	availableSizes.forEach((size) => {
		// Ensure size is a string key
		const sizeKey = String(size);
		// Realistic stock: popular sizes (7-10) have more stock, extremes have less
		const sizeNum = parseInt(sizeKey);
		let stockQty;
		if (sizeNum >= 7 && sizeNum <= 10) {
			stockQty = randomInt(20, 80); // Popular sizes: 20-80 units
		} else if (sizeNum >= 5 && sizeNum <= 12) {
			stockQty = randomInt(10, 40); // Medium sizes: 10-40 units
		} else {
			stockQty = randomInt(5, 20); // Extreme sizes: 5-20 units
		}
		stock[sizeKey] = stockQty;
	});
	return JSON.stringify(stock);
}

function generateWarehouseData(warehouseId, baseDays) {
	const warehouse = WAREHOUSES.find((w) => w.id === warehouseId);
	if (!warehouse) {
		throw new Error(`Warehouse ${warehouseId} not found`);
	}
	return {
		warehouse_id: warehouseId,
		name: warehouse.name,
		base_days: baseDays,
	};
}

async function fetchProducts() {
	try {
		console.log(`📡 Fetching products from ${PRODUCTS_API}...`);
		const res = await fetch(`${PRODUCTS_API}/products`);
		if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`);
		const products = await res.json();
		console.log(`✅ Fetched ${products.length} products\n`);
		return products;
	} catch (err) {
		console.error('❌ Error fetching products:', err.message);
		console.log('💡 Make sure the products-worker is deployed and accessible');
		process.exit(1);
	}
}

/**
 * Generate postal_code_warehouse_map FIRST
 * Returns both SQL statements and the list of warehouse IDs used
 */
function generatePostalCodeSQL() {
	console.log('📍 Generating postal_code_warehouse_map seed data...');
	const sqlStatements = [];
	const usedWarehouseIds = new Set();

	// Define warehouse priority for each region (nearest to farthest)
	const warehousePriority = {
		'Mumbai Metro': ['wh_001', 'wh_007', 'wh_003', 'wh_002'],
		'Delhi NCR': ['wh_002', 'wh_001', 'wh_003', 'wh_004'],
		'Bangalore Metro': ['wh_003', 'wh_001', 'wh_004', 'wh_002'],
		'Chennai Metro': ['wh_004', 'wh_003', 'wh_001', 'wh_002'],
		'Kolkata Metro': ['wh_005', 'wh_002', 'wh_001', 'wh_003'],
		'Hyderabad Metro': ['wh_006', 'wh_003', 'wh_001', 'wh_002'],
		'Pune Metro': ['wh_007', 'wh_001', 'wh_003', 'wh_002'],
		'Ahmedabad Metro': ['wh_008', 'wh_001', 'wh_002', 'wh_003'],
	};

	// 1) Coalesce contiguous ranges with identical (state, region, priority)
	const keyFor = (r) => `${r.state}||${r.region}`;
	// Group by (state, region)
	const groups = POSTAL_CODE_RANGES.reduce((acc, r) => {
		const key = keyFor(r);
		if (!acc[key]) acc[key] = [];
		acc[key].push(r);
		return acc;
	}, {});

	// Build cleanup (DELETE) statements per (state, region) to make this idempotent
	const cleanupPairs = Object.keys(groups).map((k) => {
		const [state, region] = k.split('||');
		return { state, region };
	});

	// Delete existing rows for affected (state, region) pairs to prevent duplicates
	cleanupPairs.forEach(({ state, region }) => {
		const stateEscaped = state.replace(/'/g, "''");
		const regionEscaped = region.replace(/'/g, "''");
		sqlStatements.push(`DELETE FROM postal_code_warehouse_map WHERE state='${stateEscaped}' AND region_name='${regionEscaped}'`);
	});

	// Coalesce within each group and insert
	Object.entries(groups).forEach(([key, ranges]) => {
		const [state, region] = key.split('||');
		// Sort by start code numeric
		ranges.sort((a, b) => parseInt(a.start, 10) - parseInt(b.start, 10));

		const priority = warehousePriority[region] || ['wh_001', 'wh_002', 'wh_003'];
		priority.forEach((whId) => usedWarehouseIds.add(whId));
		const warehouses = priority.map((whId, index) => generateWarehouseData(whId, index + 1));
		const warehousesJson = JSON.stringify(warehouses).replace(/'/g, "''");
		const stateEscaped = state.replace(/'/g, "''");
		const regionEscaped = region.replace(/'/g, "''");

		// Merge contiguous ranges
		const merged = [];
		let current = null;
		for (const r of ranges) {
			const startNum = parseInt(r.start, 10);
			const endNum = parseInt(r.end, 10);
			if (!current) {
				current = { start: startNum, end: endNum };
			} else {
				// If contiguous (previous end + 1 == this start), merge
				if (current.end + 1 === startNum) {
					current.end = endNum;
				} else {
					merged.push(current);
					current = { start: startNum, end: endNum };
				}
			}
		}
		if (current) merged.push(current);

		// Insert merged rows
		merged.forEach((m) => {
			const mapping_id = `map_${generateUUID().substring(0, 8)}`;
			const sql = `INSERT INTO postal_code_warehouse_map (
        mapping_id, start_postal_code, end_postal_code, state, region_name, warehouses
      ) VALUES (
        '${mapping_id}',
        '${String(m.start).padStart(6, '0')}',
        '${String(m.end).padStart(6, '0')}',
        '${stateEscaped}',
        '${regionEscaped}',
        '${warehousesJson}'
      )`;
			sqlStatements.push(sql);
		});
	});

	console.log(`✅ Generated ${sqlStatements.length} postal code SQL statements (including cleanup)`);
	console.log(`   Using warehouses: ${Array.from(usedWarehouseIds).sort().join(', ')}\n`);

	return { sqlStatements, warehouseIds: Array.from(usedWarehouseIds) };
}

/**
 * Generate product_inventory using warehouse IDs from postal mappings
 * Uses product_id, sku, and available_sizes from products
 */
function generateInventorySQL(products, warehouseIds) {
	console.log('📦 Generating product_inventory seed data...');
	const sqlStatements = [];

	if (!warehouseIds || warehouseIds.length === 0) {
		console.error('❌ No warehouse IDs provided. Generate postal_code_warehouse_map first!');
		return sqlStatements;
	}

	for (const product of products) {
		// Validate required fields
		if (!product.product_id || !product.sku) {
			console.warn(`⚠️  Skipping product without product_id or sku: ${product.name || 'Unknown'}`);
			continue;
		}

		// Parse available_sizes from product (could be JSON string or array)
		let availableSizes = [];
		try {
			if (typeof product.available_sizes === 'string') {
				// Try parsing as JSON string first
				const parsed = JSON.parse(product.available_sizes);
				availableSizes = Array.isArray(parsed) ? parsed : [];
			} else if (Array.isArray(product.available_sizes)) {
				availableSizes = product.available_sizes;
			}
		} catch (e) {
			console.warn(`⚠️  Could not parse available_sizes for ${product.sku} (${product.name}), using default sizes`);
			availableSizes = ['7', '8', '9', '10', '11'];
		}

		// Ensure we have sizes
		if (availableSizes.length === 0) {
			console.warn(`⚠️  No available_sizes found for ${product.sku} (${product.name}), using default sizes`);
			availableSizes = ['7', '8', '9', '10', '11']; // Default fallback
		}

		// Convert all sizes to strings for consistency
		availableSizes = availableSizes.map((s) => String(s));

		// Log which sizes are being used for this product (debug mode)
		if (process.env.DEBUG) {
			console.log(`  📏 ${product.sku}: Using sizes ${availableSizes.join(', ')}`);
		}

		// Smart inventory distribution:
		// - Popular products (first 12) get inventory in 3-4 warehouses
		// - Regular products get inventory in 2-3 warehouses
		// - Less popular products get inventory in 1-2 warehouses
		const productIndex = products.indexOf(product);
		let numWarehouses;
		if (productIndex < 12) {
			numWarehouses = randomInt(3, 4); // Top products: 3-4 warehouses
		} else if (productIndex < 24) {
			numWarehouses = randomInt(2, 3); // Mid products: 2-3 warehouses
		} else {
			numWarehouses = randomInt(1, 2); // Other products: 1-2 warehouses
		}

		// Select warehouses randomly from the available ones
		const selectedWarehouses = warehouseIds.sort(() => 0.5 - Math.random()).slice(0, numWarehouses);

		for (const warehouseId of selectedWarehouses) {
			const warehouse = WAREHOUSES.find((w) => w.id === warehouseId);
			if (!warehouse) {
				console.warn(`⚠️  Warehouse ${warehouseId} not found, skipping`);
				continue;
			}

			const stock = generateStock(availableSizes);
			const inventory_id = `inv_${generateUUID().substring(0, 8)}`;

			// Escape single quotes in JSON strings
			const stockEscaped = stock.replace(/'/g, "''");
			const warehouseNameEscaped = warehouse.name.replace(/'/g, "''");

			// Ensure product_id and sku are properly escaped
			const productIdEscaped = String(product.product_id).replace(/'/g, "''");
			const skuEscaped = String(product.sku).replace(/'/g, "''");

			const sql = `INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        '${inventory_id}',
        '${productIdEscaped}',
        '${skuEscaped}',
        '${warehouseId}',
        '${warehouseNameEscaped}',
        '${stockEscaped}',
        ${randomInt(0, 1)},
        'INR'
      )`;

			sqlStatements.push(sql);
		}
	}

	console.log(`✅ Generated ${sqlStatements.length} inventory entries for ${products.length} products\n`);
	return sqlStatements;
}

function generateDeliveryCostSQL() {
	console.log('💰 Generating delivery_cost_config seed data...');
	const sqlStatements = [];

	// Delete existing delivery cost configs to avoid UNIQUE constraint conflicts
	sqlStatements.push("DELETE FROM delivery_cost_config WHERE tier_name IN ('tier_1', 'tier_2', 'tier_3')");

	const tiers = [
		{
			tier_name: 'tier_1',
			tier_description: 'Nearest warehouse (1-2 days)',
			standard_delivery_cost: 0.0,
			express_delivery_cost: 99.0,
			free_delivery_threshold: 2999.0,
		},
		{
			tier_name: 'tier_2',
			tier_description: 'Regional warehouse (2-3 days)',
			standard_delivery_cost: 49.0,
			express_delivery_cost: 149.0,
			free_delivery_threshold: 2999.0,
		},
		{
			tier_name: 'tier_3',
			tier_description: 'Distant warehouse (3-4 days)',
			standard_delivery_cost: 99.0,
			express_delivery_cost: 249.0,
			free_delivery_threshold: 2999.0,
		},
	];

	for (const tier of tiers) {
		// Use deterministic config_id based on tier_name for idempotent inserts
		const config_id = `cost_${tier.tier_name}`;
		const descEscaped = tier.tier_description.replace(/'/g, "''");

		const sql = `INSERT INTO delivery_cost_config (
      config_id, tier_name, tier_description,
      standard_delivery_cost, express_delivery_cost,
      free_delivery_threshold, currency
    ) VALUES (
      '${config_id}',
      '${tier.tier_name}',
      '${descEscaped}',
      ${tier.standard_delivery_cost},
      ${tier.express_delivery_cost},
      ${tier.free_delivery_threshold},
      'INR'
    )`;

		sqlStatements.push(sql);
	}

	console.log(`✅ Generated ${sqlStatements.length} delivery cost statements (1 DELETE + ${tiers.length} INSERTs)\n`);
	return sqlStatements;
}

async function main() {
	console.log('🚀 Starting fulfillment data seeding...\n');
	console.log(`📡 Products API: ${PRODUCTS_API}`);
	console.log(`💾 Database: ${DB_NAME}\n`);

	try {
		// 1. Generate postal_code_warehouse_map FIRST (so we have warehouse IDs)
		const { sqlStatements: postalSQL, warehouseIds } = generatePostalCodeSQL();

		// 2. Fetch products from product-worker
		const products = await fetchProducts();

		// 3. Generate product_inventory using warehouse IDs from postal mappings
		const inventorySQL = generateInventorySQL(products, warehouseIds);

		// 4. Generate delivery_cost_config
		const deliverySQL = generateDeliveryCostSQL();

		// 5. Combine all SQL statements in correct order:
		//    - postal_code_warehouse_map (FIRST)
		//    - product_inventory (uses warehouse IDs from postal mappings)
		//    - delivery_cost_config
		const sqlLines = [];

		// Add header comments
		sqlLines.push('-- ================================');
		sqlLines.push('-- FULFILLMENT WORKER SEED DATA');
		sqlLines.push('-- Generated by seed-fulfillment.mjs');
		sqlLines.push('-- ================================');
		sqlLines.push('');

		// Add postal code mappings
		sqlLines.push('-- STEP 1: Postal Code Warehouse Map (generated first)');
		sqlLines.push('-- This defines which warehouses serve which postal codes');
		sqlLines.push('');
		postalSQL.forEach((stmt) => {
			sqlLines.push(stmt + ';');
			sqlLines.push('');
		});

		// Add delivery cost config
		sqlLines.push('-- STEP 3: Delivery Cost Config');
		sqlLines.push('-- Delivery cost tiers for different warehouse distances');
		sqlLines.push('');
		deliverySQL.forEach((stmt) => {
			sqlLines.push(stmt + ';');
			sqlLines.push('');
		});

		// 6. Write main seed file (postal codes + delivery config)
		const migrationsDir = path.join(__dirname, '..', 'migrations');
		if (!fs.existsSync(migrationsDir)) {
			fs.mkdirSync(migrationsDir, { recursive: true });
		}

		const seedFile = path.join(migrationsDir, '0002_seed_data.sql');
		// Remove the last empty line and join with newlines
		const finalSQL = sqlLines.slice(0, -1).join('\n');
		fs.writeFileSync(seedFile, finalSQL, 'utf8');

		// 7. Split product_inventory into batches (D1 has ~50 statement limit per transaction)
		const BATCH_SIZE = 45; // Keep it under 50 to be safe
		const inventoryBatches = [];
		for (let i = 0; i < inventorySQL.length; i += BATCH_SIZE) {
			inventoryBatches.push(inventorySQL.slice(i, i + BATCH_SIZE));
		}

		const inventoryFiles = [];
		inventoryBatches.forEach((batch, index) => {
			const batchLines = [];
			batchLines.push('-- ================================');
			batchLines.push(`-- PRODUCT INVENTORY BATCH ${index + 1} of ${inventoryBatches.length}`);
			batchLines.push(`-- Entries ${index * BATCH_SIZE + 1} to ${Math.min((index + 1) * BATCH_SIZE, inventorySQL.length)}`);
			batchLines.push('-- ================================');
			batchLines.push('');
			batchLines.push('-- Product Inventory');
			batchLines.push('-- Uses warehouse IDs from postal_code_warehouse_map');
			batchLines.push('-- Uses product_id, sku, and available_sizes from products');
			batchLines.push('');

			batch.forEach((stmt) => {
				batchLines.push(stmt + ';');
				batchLines.push('');
			});

			const batchFile = path.join(migrationsDir, `0002_seed_inventory_batch_${index + 1}.sql`);
			const batchSQL = batchLines.slice(0, -1).join('\n');
			fs.writeFileSync(batchFile, batchSQL, 'utf8');
			inventoryFiles.push(batchFile);
		});

		console.log(`\n✅ SQL seed files created:`);
		console.log(`   - Main file: ${seedFile}`);
		inventoryFiles.forEach((file, idx) => {
			console.log(`   - Inventory batch ${idx + 1}: ${path.basename(file)}`);
		});

		console.log(`\n📊 Summary:`);
		console.log(`   - Postal code mappings: ${postalSQL.length}`);
		console.log(`   - Product inventory entries: ${inventorySQL.length} (split into ${inventoryBatches.length} batches)`);
		console.log(`   - Delivery cost config: ${deliverySQL.length - 1} tiers (includes cleanup DELETE)`);
		console.log(`\n📋 To apply the seed data, run:`);
		console.log(`   1. Main data (postal codes + delivery config):`);
		console.log(`      npx wrangler d1 execute inventory-db --remote --file=./migrations/0002_seed_data.sql`);
		console.log(`   2. Product inventory batches:`);
		inventoryFiles.forEach((file, idx) => {
			console.log(`      npx wrangler d1 execute inventory-db --remote --file=./migrations/${path.basename(file)}`);
		});
		console.log('');
	} catch (err) {
		console.error('\n❌ Seeding failed:', err.message);
		console.error(err.stack);
		process.exit(1);
	}
}

main();
