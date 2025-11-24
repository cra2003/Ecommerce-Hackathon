#!/usr/bin/env node

/**
 * Helper script to add lint/format scripts to all worker package.json files
 * Run: node scripts/update-worker-scripts.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const WORKERS = [
	'auth-worker',
	'cart-worker',
	'cart-cron-worker',
	'order-worker',
	'payment-worker',
	'fullfilment-worker',
	'price-worker',
	'product-worker',
];

const REQUIRED_SCRIPTS = {
	lint: 'eslint . --ext .js',
	'lint:fix': 'eslint . --ext .js --fix',
	format: 'prettier --write "**/*.{js,json,md}"',
	'format:check': 'prettier --check "**/*.{js,json,md}"',
	'format:fix': 'prettier --write "**/*.{js,json,md}"',
};

const REQUIRED_DEV_DEPS = {
	eslint: '^8.57.0',
	'eslint-config-prettier': '^9.1.0',
	'eslint-plugin-prettier': '^5.1.3',
	prettier: '^3.2.4',
};

for (const worker of WORKERS) {
	const packageJsonPath = join(process.cwd(), worker, 'package.json');

	try {
		const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

		// Add scripts
		if (!pkg.scripts) pkg.scripts = {};
		for (const [script, command] of Object.entries(REQUIRED_SCRIPTS)) {
			if (!pkg.scripts[script]) {
				pkg.scripts[script] = command;
			}
		}

		// Add devDependencies
		if (!pkg.devDependencies) pkg.devDependencies = {};
		for (const [dep, version] of Object.entries(REQUIRED_DEV_DEPS)) {
			if (!pkg.devDependencies[dep]) {
				pkg.devDependencies[dep] = version;
			}
		}

		// Ensure type: module
		if (!pkg.type) pkg.type = 'module';

		// Write back
		writeFileSync(packageJsonPath, JSON.stringify(pkg, null, '\t') + '\n');
		console.log(`✅ Updated ${worker}/package.json`);
	} catch (error) {
		console.error(`❌ Failed to update ${worker}:`, error.message);
	}
}

console.log('\n✅ All worker package.json files updated!');
console.log('Run: npm install -ws');
