#!/usr/bin/env node

/**
 * Seed script to ONLY populate postal_code_warehouse_map.
 * - Coalesces contiguous ranges with identical (state, region) and warehouse priority
 * - Emits DELETE (by state+region) + INSERT statements (idempotent)
 * - Does NOT touch product_inventory or delivery_cost_config
 *
 * Usage:
 *   node scripts/seed-postal-map.mjs
 * Then apply:
 *   npx wrangler d1 execute inventory-db --remote --file=./migrations/0003_postal_only.sql
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Warehouses directory (names only for presentation)
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

// Postal ranges input (paired ranges per region/state)
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

function generateWarehouseData(warehouseId, baseDays) {
	const wh = WAREHOUSES.find((w) => w.id === warehouseId);
	if (!wh) throw new Error(`Warehouse ${warehouseId} not found`);
	return { warehouse_id: warehouseId, name: wh.name, base_days: baseDays };
}

function buildSQL() {
	const sql = [];

	// Region priorities
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

	// Group ranges by (state, region)
	const keyFor = (r) => `${r.state}||${r.region}`;
	const groups = POSTAL_CODE_RANGES.reduce((acc, r) => {
		const key = keyFor(r);
		if (!acc[key]) acc[key] = [];
		acc[key].push(r);
		return acc;
	}, {});

	// Cleanup: delete existing rows for affected (state, region)
	Object.keys(groups).forEach((key) => {
		const [state, region] = key.split('||');
		const stateEsc = state.replace(/'/g, "''");
		const regionEsc = region.replace(/'/g, "''");
		sql.push(`DELETE FROM postal_code_warehouse_map WHERE state='${stateEsc}' AND region_name='${regionEsc}';`);
	});

	// Insert merged rows
	Object.entries(groups).forEach(([key, ranges]) => {
		const [state, region] = key.split('||');
		ranges.sort((a, b) => parseInt(a.start, 10) - parseInt(b.start, 10));

		const priority = warehousePriority[region] || ['wh_001', 'wh_002', 'wh_003'];
		const warehouses = priority.map((whId, idx) => generateWarehouseData(whId, idx + 1));
		const warehousesJson = JSON.stringify(warehouses).replace(/'/g, "''");
		const stateEsc = state.replace(/'/g, "''");
		const regionEsc = region.replace(/'/g, "''");

		// Coalesce contiguous ranges
		const merged = [];
		let current = null;
		for (const r of ranges) {
			const startNum = parseInt(r.start, 10);
			const endNum = parseInt(r.end, 10);
			if (!current) {
				current = { start: startNum, end: endNum };
			} else if (current.end + 1 === startNum) {
				current.end = endNum;
			} else {
				merged.push(current);
				current = { start: startNum, end: endNum };
			}
		}
		if (current) merged.push(current);

		merged.forEach((m) => {
			const mapping_id = `map_${generateUUID().substring(0, 8)}`;
			sql.push(
				`INSERT INTO postal_code_warehouse_map (mapping_id, start_postal_code, end_postal_code, state, region_name, warehouses)\n` +
					`VALUES ('${mapping_id}','${String(m.start).padStart(6, '0')}','${String(m.end).padStart(6, '0')}','${stateEsc}','${regionEsc}','${warehousesJson}');`,
			);
		});
	});

	return sql;
}

function main() {
	console.log('🧭 Generating postal_code_warehouse_map SQL (only)...');
	const migrationsDir = path.join(__dirname, '..', 'migrations');
	if (!fs.existsSync(migrationsDir)) {
		fs.mkdirSync(migrationsDir, { recursive: true });
	}
	const outFile = path.join(migrationsDir, '0003_postal_only.sql');
	const lines = [];
	lines.push('-- ================================');
	lines.push('-- POSTAL CODE MAP (ONLY)');
	lines.push('-- Generated by scripts/seed-postal-map.mjs');
	lines.push('-- Safe to re-run: deletes existing rows for affected (state, region) and reinserts merged ranges');
	lines.push('-- ================================');
	lines.push('');
	const sql = buildSQL();
	sql.forEach((s) => lines.push(s));
	fs.writeFileSync(outFile, lines.join('\n') + '\n', 'utf8');
	console.log(`✅ Wrote ${outFile}`);
	console.log('\nRun this to apply:');
	console.log('npx wrangler d1 execute inventory-db --remote --file=./migrations/0003_postal_only.sql');
}

main();
