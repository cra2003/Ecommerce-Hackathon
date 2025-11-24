#!/usr/bin/env node

// Simple seeder for products:
// - Reads a JSON array of products
// - Pairs each product with an image from a folder (sorted order)
// - Sends multipart/form-data POST requests to the products API
//
// Usage:
// node scripts/seed-products.mjs \
//   --json /path/to/product-worker/data/products.json \
//   --images /path/to/images \
//   --api https://products-worker.example.workers.dev

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Node 18+ has global fetch/FormData/Blob via undici
const hasFetch = typeof fetch === 'function' && typeof FormData === 'function' && typeof Blob === 'function';
if (!hasFetch) {
	console.error('This script requires Node 18+ (global fetch/FormData/Blob).');
	process.exit(1);
}

function parseArgs(argv) {
	const args = {};
	for (let i = 2; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--json') args.json = argv[++i];
		else if (a === '--images') args.images = argv[++i];
		else if (a === '--api') args.api = argv[++i];
		else if (a === '--limit') args.limit = parseInt(argv[++i]);
	}
	return args;
}

function pickMimeByExt(ext) {
	const e = (ext || '').toLowerCase();
	if (e === '.png') return 'image/png';
	if (e === '.webp') return 'image/webp';
	if (e === '.gif') return 'image/gif';
	if (e === '.jpg' || e === '.jpeg' || e === '.jpe') return 'image/jpeg';
	return 'application/octet-stream';
}

async function main() {
	const cwd = path.dirname(fileURLToPath(import.meta.url));
	const args = parseArgs(process.argv);
	const jsonPath = args.json || path.resolve(cwd, '../product-worker/data/products.json');
	const imagesDir = args.images || '/Users/aadhi/Downloads/shhoes';
	const apiUrl = args.api || process.env.PRODUCTS_API_URL || 'https://products-worker.aadhi18082003.workers.dev';
	const limit = Number.isFinite(args.limit) ? args.limit : undefined;

	if (!fs.existsSync(jsonPath)) {
		console.error(`JSON file not found: ${jsonPath}`);
		process.exit(1);
	}
	if (!fs.existsSync(imagesDir) || !fs.lstatSync(imagesDir).isDirectory()) {
		console.error(`Images directory not found: ${imagesDir}`);
		process.exit(1);
	}

	const raw = fs.readFileSync(jsonPath, 'utf8');
	let products = JSON.parse(raw);
	if (!Array.isArray(products)) {
		console.error('JSON must be an array of products');
		process.exit(1);
	}
	if (limit) products = products.slice(0, limit);

	// Collect images in deterministic order
	const imageFiles = fs
		.readdirSync(imagesDir)
		.filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f))
		.sort((a, b) => a.localeCompare(b, 'en'));

	if (imageFiles.length < products.length) {
		console.warn(`Warning: only ${imageFiles.length} images for ${products.length} products; images will repeat.`);
	}

	let okCount = 0;
	let failCount = 0;

	for (let i = 0; i < products.length; i++) {
		const p = products[i] || {};
		const imgName = imageFiles[i % imageFiles.length];
		const imgPath = path.join(imagesDir, imgName);
		const ext = path.extname(imgName);
		const mime = pickMimeByExt(ext);

		// Build multipart form
		const form = new FormData();

		// Required by your worker when uploading an image:
		// name, color_family, available_sizes, (primary_image_url not required if image is provided)
		if (p.name) form.append('name', String(p.name));
		if (p.color_family) form.append('color_family', String(p.color_family));
		// JSON fields must be strings so the worker can parse them
		if (Array.isArray(p.available_sizes)) form.append('available_sizes', JSON.stringify(p.available_sizes));

		// Optional fields from your schema
		const simpleFields = [
			'sku',
			'brand',
			'description',
			'category',
			'gender',
			'target_audience',
			'upper_material',
			'sole_material',
			'closure_type',
			'toe_style',
			'heel_type',
			'arch_support',
			'flexibility',
			'cushioning_level',
			'water_resistance',
			'season',
			'pattern',
			'care_instructions',
			'warranty_period',
			'manufacturer_name',
			'manufacturer_country',
			'meta_title',
		];
		for (const key of simpleFields) {
			if (p[key] != null) form.append(key, String(p[key]));
		}
		if (p.heel_height_cm != null) form.append('heel_height_cm', String(p.heel_height_cm));
		if (p.weight_grams != null) form.append('weight_grams', String(p.weight_grams));
		if (Array.isArray(p.width_options)) form.append('width_options', JSON.stringify(p.width_options));
		if (Array.isArray(p.features)) form.append('features', JSON.stringify(p.features));

		// Attach image file
		try {
			const buf = fs.readFileSync(imgPath);
			const blob = new Blob([buf], { type: mime });
			form.append('image', blob, imgName);
		} catch (e) {
			console.warn(`Image read failed (${imgPath}), falling back to primary_image_url if present: ${e.message}`);
			if (p.primary_image_url) form.append('primary_image_url', String(p.primary_image_url));
		}

		// POST
		const url = `${apiUrl.replace(/\/+$/, '')}/products`;
		try {
			const resp = await fetch(url, { method: 'POST', body: form });
			const text = await resp.text();
			if (!resp.ok) {
				failCount++;
				console.error(`[${i + 1}/${products.length}] ${p.name || 'Unnamed'} -> ${resp.status} ${resp.statusText}: ${text.slice(0, 200)}`);
			} else {
				okCount++;
				console.log(`[${i + 1}/${products.length}] ${p.name || 'Unnamed'} -> OK: ${text.slice(0, 120)}`);
			}
		} catch (err) {
			failCount++;
			console.error(`[${i + 1}/${products.length}] ${p.name || 'Unnamed'} -> ERROR: ${err.message}`);
		}
	}

	console.log(`\nDone. Success: ${okCount}, Failed: ${failCount}`);
	if (failCount > 0) process.exitCode = 1;
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
