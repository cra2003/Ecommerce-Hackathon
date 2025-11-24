import { getInventoryByProduct } from '../services/inventory.service.js';

/**
 * GET /api/stock/:product_id/:size
 * Returns stock availability for a product and size across all warehouses
 */
export async function stockBySizeHandler(c) {
	const { product_id, size } = c.req.param();

	try {
		console.log(`[fulfillment][stock] request product_id=${product_id} size=${size}`);

		// Query inventory for this product+size (new structure: one row per product+size)
		// Stock JSON is now grouped by warehouse: {"wh_007":73, "wh_006":76}
		const results = await getInventoryByProduct(c.env.DB, product_id);

		// Filter to only the requested size (results now have one row per warehouse for each size)
		const sizeResults = results.filter((item) => item.size === size);

		if (!sizeResults || sizeResults.length === 0) {
			console.log(`[fulfillment][stock] no inventory rows for product_id=${product_id} size=${size}`);
			return c.json(
				{
					success: false,
					error: 'Product not found in inventory for this size',
				},
				404,
			);
		}
		console.log(`[fulfillment][stock] inventory rows for size ${size}: ${sizeResults.length}`);

		// Parse stock JSON (now grouped by warehouse, not size)
		// Each row represents one warehouse's stock for this product+size
		const stockByWarehouse = sizeResults.map((item) => {
			// Stock is now at item level (warehouse-specific), not in JSON for this size
			// Actually, with the new structure from getInventoryByProduct, we get one row per warehouse
			// and the stock is already parsed per warehouse
			const quantityForSize = Number(item.stock ?? 0) || 0;

			console.log(`[fulfillment][stock] wh=${item.warehouse_id} size=${size} qty=${quantityForSize}`);

			return {
				warehouse_id: item.warehouse_id,
				warehouse_name: item.warehouse_name,
				sku: item.sku,
				size: item.size,
				quantity: quantityForSize,
				express_available: item.express_available === 1,
				currency: item.currency,
				updated_at: item.updated_at,
			};
		});

		// Calculate total stock across all warehouses
		const totalStock = stockByWarehouse.reduce((sum, wh) => sum + wh.quantity, 0);
		const availableWarehouses = stockByWarehouse.filter((wh) => wh.quantity > 0).length;
		console.log(
			`[fulfillment][stock] total for product_id=${product_id} size=${size} => ${totalStock} (availableWarehouses=${availableWarehouses})`,
		);

		return c.json({
			success: true,
			product_id,
			size,
			total_stock: totalStock,
			warehouses: stockByWarehouse,
			available_in_warehouses: availableWarehouses,
		});
	} catch (error) {
		console.error('Error fetching stock:', error);
		return c.json(
			{
				success: false,
				error: 'Failed to fetch stock details',
				message: error.message,
			},
			500,
		);
	}
}
