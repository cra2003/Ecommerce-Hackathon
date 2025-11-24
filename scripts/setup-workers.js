#!/usr/bin/env node

/**
 * Setup script to create minimal package.json for all workers
 * Run: node scripts/setup-workers.js
 */

const { readFileSync, writeFileSync, existsSync } = require('fs');
const { join } = require('path');

const WORKERS = [
	'auth-worker',
	'cart-worker',
	'cart-cron-worker',
	'order-worker',
	'payment-worker',
	'fullfilment-worker',
	'price-worker',
	'product-worker'
];

for (const worker of WORKERS) {
	const packageJsonPath = join(process.cwd(), worker, 'package.json');
	
	if (!existsSync(packageJsonPath)) {
		console.log(`⚠️  ${worker}/package.json not found, skipping`);
		continue;
	}

	try {
		const existingPkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
		
		// Create minimal package.json
		const minimalPkg = {
			name: existingPkg.name || worker,
			version: existingPkg.version || '1.0.0',
			type: 'module',
			scripts: {
				lint: 'eslint .',
				format: 'prettier --write .'
			}
		};

		// Preserve dependencies if they exist (runtime deps, not devDeps)
		if (existingPkg.dependencies) {
			minimalPkg.dependencies = existingPkg.dependencies;
		}

		// Write back
		writeFileSync(packageJsonPath, JSON.stringify(minimalPkg, null, '\t') + '\n');
		console.log(`✅ Updated ${worker}/package.json`);
	} catch (error) {
		console.error(`❌ Failed to update ${worker}:`, error.message);
	}
}

console.log('\n✅ All worker package.json files updated!');
console.log('Run: npm install');

