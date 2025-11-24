import { getInventoryRow } from '../services/inventory.service.js';
import { parseJSON } from '../utils/json.util.js';
import { logEvent, logError } from '../services/log.service.js';

/**
 * POST /api/stock/restore
 * Restore stock to a specific warehouse (for order cancellation)
 */
export async function stockRestoreHandler(c) {
	let warehouse_id, product_id, size, quantity;
	try {
		({ warehouse_id, product_id, size, quantity } = await c.req.json());

		console.log(`[stock-restore] START: warehouse=${warehouse_id}, product=${product_id}, size=${size}, qty=${quantity}`);

		// Validation
		if (!warehouse_id || !product_id || !size || !quantity) {
			return c.json(
				{
					success: false,
					error: 'Missing required fields: warehouse_id, product_id, size, quantity',
				},
				400,
			);
		}

		if (quantity <= 0) {
			return c.json(
				{
					success: false,
					error: 'Quantity must be greater than 0',
				},
				400,
			);
		}

		// Fetch inventory row (now query by product_id + size, not warehouse_id)
		// Stock JSON is now grouped by warehouse: {"wh_007":73, "wh_006":76}
		const inventory = await getInventoryRow(c.env.DB, warehouse_id, product_id, size);

		if (!inventory) {
			console.log(`[stock-restore] ERROR: Inventory not found for product=${product_id}, size=${size}`);
			return c.json(
				{
					success: false,
					error: 'Product not found in inventory',
				},
				404,
			);
		}

		// Parse and update stock (now grouped by warehouse, not size)
		const stockData = parseJSON(inventory.stock, {});
		const currentStock = Number(stockData[warehouse_id] || 0);
		const newStock = currentStock + quantity;
		stockData[warehouse_id] = newStock; // Update stock for specific warehouse

		console.log(`[stock-restore] Restoring ${quantity} units to warehouse ${warehouse_id}. Old: ${currentStock}, New: ${newStock}`);

		// Note: Using sku (primary key) instead of inventory_id
		await c.env.DB.prepare(
			`
      UPDATE product_inventory
      SET stock = ?, updated_at = CURRENT_TIMESTAMP
      WHERE sku = ?
    `,
		)
			.bind(JSON.stringify(stockData), inventory.sku)
			.run();

		console.log(`[stock-restore] SUCCESS: Stock restored`);

		await logEvent(c.env, 'stock_restored', {
			warehouse_id,
			product_id,
			size,
			quantity,
			new_total: newStock,
		});

		return c.json({
			success: true,
			message: 'Stock restored successfully',
			warehouse_id,
			product_id,
			size,
			restored: quantity,
			new_total: newStock,
		});
	} catch (error) {
		console.error('[stock-restore] Exception:', error);
		await logError(c.env, 'stock_restore_failed', {
			warehouse_id,
			product_id,
			size,
			quantity,
			message: error.message,
			stack: error.stack,
		});
		return c.json(
			{
				success: false,
				error: error.message || 'Failed to restore stock',
			},
			500,
		);
	}
}
