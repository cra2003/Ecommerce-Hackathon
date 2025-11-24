#!/usr/bin/env node

/**
 * Seed script for price-worker prices table
 * Fetches products from product-worker and generates price data
 *
 * Usage:
 * node scripts/seed-prices.mjs
 *   --api https://products-worker.aadhi18082003.workers.dev
 *   --db price-db
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRODUCTS_API = process.env.PRODUCTS_API || 'https://products-worker.aadhi18082003.workers.dev';
const DB_NAME = process.env.DB_NAME || 'price-db';

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

function randomFloat(min, max, decimals = 2) {
	const value = Math.random() * (max - min) + min;
	return parseFloat(value.toFixed(decimals));
}

/**
 * Generate realistic base price based on product category
 */
function generateBasePrice(category) {
	const priceRanges = {
		Running: { min: 3000, max: 12000 },
		Casual: { min: 2000, max: 8000 },
		Formal: { min: 4000, max: 15000 },
		Sports: { min: 2500, max: 10000 },
		Sneakers: { min: 3000, max: 12000 },
		Boots: { min: 5000, max: 18000 },
		Sandals: { min: 1500, max: 6000 },
		default: { min: 2000, max: 10000 },
	};

	const range = priceRanges[category] || priceRanges.default;
	return randomInt(range.min, range.max);
}

/**
 * Generate sale price and discount
 */
function generateSalePrice(basePrice) {
	// 30% chance of being on sale
	if (Math.random() > 0.3) {
		return {
			sale_price: null,
			discount_percentage: null,
			is_on_sale: 0,
		};
	}

	// Discount between 10% and 40%
	const discountPercent = randomFloat(10, 40);
	const salePrice = Math.round(basePrice * (1 - discountPercent / 100));

	return {
		sale_price: salePrice,
		discount_percentage: parseFloat(discountPercent.toFixed(2)),
		is_on_sale: 1,
	};
}

/**
 * Generate member pricing
 */
function generateMemberPrice(basePrice, salePrice) {
	// 20% chance of member exclusive pricing
	if (Math.random() > 0.2) {
		return {
			member_price: null,
			member_discount_percentage: null,
			is_member_exclusive: 0,
		};
	}

	// Member gets additional 5-15% off
	const effectivePrice = salePrice || basePrice;
	const memberDiscount = randomFloat(5, 15);
	const memberPrice = Math.round(effectivePrice * (1 - memberDiscount / 100));

	return {
		member_price: memberPrice,
		member_discount_percentage: parseFloat(memberDiscount.toFixed(2)),
		is_member_exclusive: 1,
	};
}

/**
 * Generate offer details
 */
function generateOffer(basePrice) {
	// 25% chance of having an active offer
	if (Math.random() > 0.25) {
		return {
			offer_type: null,
			offer_description: null,
			offer_value: null,
			min_purchase_quantity: null,
			max_discount_amount: null,
			offer_start_date: null,
			offer_end_date: null,
			is_offer_active: 0,
		};
	}

	const offerTypes = [
		{ type: 'FLAT_OFF', desc: 'Flat ₹{value} off', valueRange: { min: 200, max: 1000 } },
		{ type: 'PERCENTAGE_OFF', desc: '{value}% off', valueRange: { min: 10, max: 30 } },
		{ type: 'BULK_DISCOUNT', desc: 'Buy {min} or more', valueRange: { min: 3, max: 5 } },
	];

	const selectedOffer = offerTypes[randomInt(0, offerTypes.length - 1)];
	const offerValue =
		selectedOffer.type === 'FLAT_OFF'
			? randomInt(selectedOffer.valueRange.min, selectedOffer.valueRange.max)
			: randomInt(selectedOffer.valueRange.min, selectedOffer.valueRange.max);

	const minQuantity = selectedOffer.type === 'BULK_DISCOUNT' ? randomInt(2, 4) : null;

	const maxDiscount = selectedOffer.type === 'PERCENTAGE_OFF' ? Math.round(basePrice * (offerValue / 100)) : null;

	// Offer valid for next 7-30 days
	const startDate = new Date();
	const endDate = new Date();
	endDate.setDate(endDate.getDate() + randomInt(7, 30));

	const description = selectedOffer.desc.replace('{value}', offerValue).replace('{min}', minQuantity || '');

	return {
		offer_type: selectedOffer.type,
		offer_description: description,
		offer_value: offerValue,
		min_purchase_quantity: minQuantity,
		max_discount_amount: maxDiscount,
		offer_start_date: startDate.toISOString(),
		offer_end_date: endDate.toISOString(),
		is_offer_active: 1,
	};
}

/**
 * Generate bulk pricing tiers
 */
function generateBulkPricing(basePrice) {
	// 15% chance of having bulk pricing
	if (Math.random() > 0.15) {
		return null;
	}

	const tiers = [];
	const numTiers = randomInt(2, 3);

	for (let i = 0; i < numTiers; i++) {
		const quantity = (i + 1) * 2; // 2, 4, 6
		const discount = (i + 1) * 5; // 5%, 10%, 15%
		const tierPrice = Math.round(basePrice * (1 - discount / 100));

		tiers.push({
			quantity,
			price: tierPrice,
		});
	}

	return JSON.stringify(tiers);
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

function generatePricesSQL(products) {
	console.log('💰 Generating prices seed data...');
	const sqlStatements = [];

	for (const product of products) {
		if (!product.sku) {
			console.warn(`⚠️  Skipping product without sku: ${product.name || 'Unknown'}`);
			continue;
		}

		const price_id = `price_${generateUUID().substring(0, 8)}`;
		const basePrice = generateBasePrice(product.category || 'default');
		const saleData = generateSalePrice(basePrice);
		const memberData = generateMemberPrice(basePrice, saleData.sale_price);
		const offerData = generateOffer(basePrice);
		const bulkPricing = generateBulkPricing(basePrice);

		// Escape single quotes
		const skuEscaped = String(product.sku).replace(/'/g, "''");
		const productIdEscaped = product.product_id ? String(product.product_id).replace(/'/g, "''") : 'NULL';
		const offerDescEscaped = offerData.offer_description ? offerData.offer_description.replace(/'/g, "''") : 'NULL';
		const bulkPricingEscaped = bulkPricing ? bulkPricing.replace(/'/g, "''") : 'NULL';

		const sql = `INSERT OR IGNORE INTO prices (
      price_id, sku, product_id,
      base_price, currency,
      sale_price, discount_percentage, is_on_sale,
      member_price, member_discount_percentage, is_member_exclusive,
      offer_type, offer_description, offer_value,
      min_purchase_quantity, max_discount_amount,
      offer_start_date, offer_end_date, is_offer_active,
      bulk_pricing, status
    ) VALUES (
      '${price_id}',
      '${skuEscaped}',
      ${productIdEscaped === 'NULL' ? 'NULL' : `'${productIdEscaped}'`},
      ${basePrice},
      'INR',
      ${saleData.sale_price || 'NULL'},
      ${saleData.discount_percentage || 'NULL'},
      ${saleData.is_on_sale},
      ${memberData.member_price || 'NULL'},
      ${memberData.member_discount_percentage || 'NULL'},
      ${memberData.is_member_exclusive},
      ${offerData.offer_type ? `'${offerData.offer_type}'` : 'NULL'},
      ${offerDescEscaped === 'NULL' ? 'NULL' : `'${offerDescEscaped}'`},
      ${offerData.offer_value || 'NULL'},
      ${offerData.min_purchase_quantity || 'NULL'},
      ${offerData.max_discount_amount || 'NULL'},
      ${offerData.offer_start_date ? `'${offerData.offer_start_date}'` : 'NULL'},
      ${offerData.offer_end_date ? `'${offerData.offer_end_date}'` : 'NULL'},
      ${offerData.is_offer_active},
      ${bulkPricingEscaped === 'NULL' ? 'NULL' : `'${bulkPricingEscaped}'`},
      'active'
    )`;

		sqlStatements.push(sql);
	}

	console.log(`✅ Generated ${sqlStatements.length} price entries\n`);
	return sqlStatements;
}

async function main() {
	console.log('🚀 Starting price data seeding...\n');
	console.log(`📡 Products API: ${PRODUCTS_API}`);
	console.log(`💾 Database: ${DB_NAME}\n`);

	try {
		// 1. Fetch products from product-worker
		const products = await fetchProducts();

		// 2. Generate price SQL statements
		const pricesSQL = generatePricesSQL(products);

		// 3. Combine SQL statements
		const sqlLines = [];
		sqlLines.push('-- ================================');
		sqlLines.push('-- PRICE WORKER SEED DATA');
		sqlLines.push('-- Generated by seed-prices.mjs');
		sqlLines.push('-- ================================');
		sqlLines.push('');
		sqlLines.push('-- Product Prices');
		sqlLines.push('');

		pricesSQL.forEach((stmt) => {
			sqlLines.push(stmt + ';');
			sqlLines.push('');
		});

		// 4. Write to SQL file
		const migrationsDir = path.join(__dirname, '..', 'migrations');
		if (!fs.existsSync(migrationsDir)) {
			fs.mkdirSync(migrationsDir, { recursive: true });
		}

		const seedFile = path.join(migrationsDir, '0002_seed_prices.sql');
		// Remove the last empty line and join with newlines
		const finalSQL = sqlLines.slice(0, -1).join('\n');
		fs.writeFileSync(seedFile, finalSQL, 'utf8');

		console.log(`\n✅ SQL seed file created: ${seedFile}`);
		console.log(`\n📊 Summary:`);
		console.log(`   - Price entries: ${pricesSQL.length}`);
		console.log(`\n📋 To apply the seed data, run:`);
		console.log(`   npx wrangler d1 execute ${DB_NAME} --remote --file=./migrations/0002_seed_prices.sql\n`);
	} catch (err) {
		console.error('\n❌ Seeding failed:', err.message);
		console.error(err.stack);
		process.exit(1);
	}
}

main();
