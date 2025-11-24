import { getInventoryByProduct } from '../services/inventory.service.js';

/**
 * GET /api/stock/product/:product_id
 * Aggregate stock for a product across all warehouses and sizes
 */
export async function stockByProductHandler(c) {
	const { product_id } = c.req.param();

	try {
		console.log(`[stock-by-product] Looking for product_id: "${product_id}"`);

		// Try to find inventory with exact match first
		let results = await getInventoryByProduct(c.env.DB, product_id);

		// If no results, try trimming whitespace
		if (!results || results.length === 0) {
			const trimmedId = product_id.trim();
			if (trimmedId !== product_id) {
				console.log(`[stock-by-product] Retrying with trimmed product_id: "${trimmedId}"`);
				results = await getInventoryByProduct(c.env.DB, trimmedId);
			}
		}

		// Debug: Check what product_ids exist in inventory (sample)
		if (!results || results.length === 0) {
			const sampleCheck = await c.env.DB.prepare(
				`
        SELECT DISTINCT product_id 
        FROM product_inventory 
        LIMIT 5
      `,
			).all();
			console.log(
				`[stock-by-product] Sample product_ids in inventory:`,
				sampleCheck.results?.map((r) => r.product_id),
			);
			console.log(`[stock-by-product] Requested product_id type: ${typeof product_id}, length: ${product_id.length}`);
		}

		if (!results || results.length === 0) {
			console.log(`[stock-by-product] No inventory found for product_id: "${product_id}", returning 0 stock`);
			// Return success with 0 stock instead of 404 - product exists but has no inventory
			return c.json({
				success: true,
				product_id,
				total_stock: 0,
				sizes: {},
			});
		}

		console.log(`[stock-by-product] Found ${results.length} inventory records for product_id: "${product_id}"`);

		// New structure: results are already expanded to one row per warehouse per size
		// Each row has: warehouse_id, size, stock (number), ...
		// Old structure: one row per warehouse, with stock JSON like {"7":73, "8":76}
		const sizeTotals = {};

		for (const item of results) {
			// In new structure, stock is already a number for this warehouse+size
			// item.size is the size, item.stock is the quantity
			const size = item.size;
			const qty = Number(item.stock) || 0;

			if (size && qty > 0) {
				sizeTotals[size] = (sizeTotals[size] || 0) + qty;
			}
		}

		const totalStock = Object.values(sizeTotals).reduce((sum, v) => sum + v, 0);

		console.log(
			`[stock-by-product] Total stock for product_id "${product_id}": ${totalStock} across ${Object.keys(sizeTotals).length} sizes`,
		);

		return c.json({
			success: true,
			product_id,
			total_stock: totalStock,
			sizes: sizeTotals,
		});
	} catch (error) {
		console.error('Error fetching aggregated stock:', error);
		return c.json(
			{
				success: false,
				error: 'Failed to fetch stock summary',
				message: error.message,
			},
			500,
		);
	}
}
