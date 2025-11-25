import { getInventoryRow } from '../services/inventory.service.js';
import { parseJSON } from '../utils/json.util.js';
import { logEvent, logError } from '../services/log.service.js';

/**
 * POST /api/stock/deduct
 * Deduct stock from a specific warehouse for a product/size
 * Used when order is confirmed
 */
export async function stockDeductHandler(c) {
	let warehouse_id, product_id, size, quantity;
	try {
		if (c.req.addTraceLog) {
			c.req.addTraceLog('Deducting stock from warehouse');
		}
		({ warehouse_id, product_id, size, quantity } = await c.req.json());
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Warehouse: ${warehouse_id}, Product: ${product_id}, Size: ${size}, Qty: ${quantity}`);
		}

		console.log(`[stock-deduct] START: warehouse=${warehouse_id}, product=${product_id}, size=${size}, qty=${quantity}`);

		// Validation
		if (!warehouse_id || !product_id || !size || !quantity) {
			console.log(`[stock-deduct] ERROR: Missing required fields`);
			return c.json(
				{
					success: false,
					error: 'Missing required fields: warehouse_id, product_id, size, quantity',
				},
				400,
			);
		}

		if (quantity <= 0) {
			console.log(`[stock-deduct] ERROR: Invalid quantity: ${quantity}`);
			return c.json(
				{
					success: false,
					error: 'Quantity must be greater than 0',
				},
				400,
			);
		}

		// CRITICAL: Use optimistic locking to prevent race conditions
		// Fetch current stock (now query by product_id + size, not warehouse_id)
		// Stock JSON is now grouped by warehouse: {"wh_007":73, "wh_006":76}
		const inventory = await getInventoryRow(c.env.DB, warehouse_id, product_id, size);

		if (!inventory) {
			console.log(`[stock-deduct] ERROR: Inventory not found for product=${product_id}, size=${size}`);
			return c.json(
				{
					success: false,
					error: 'Product not found in inventory',
				},
				404,
			);
		}

		// Parse current stock JSON (now grouped by warehouse, not size)
		const stockData = parseJSON(inventory.stock, {});
		const currentStock = Number(stockData[warehouse_id] || 0);

		console.log(`[stock-deduct] Current stock for warehouse ${warehouse_id}: ${currentStock}`);

		// Check if sufficient stock available
		if (currentStock < quantity) {
			console.log(`[stock-deduct] ERROR: Insufficient stock. Available: ${currentStock}, Requested: ${quantity}`);
			return c.json(
				{
					success: false,
					error: 'Insufficient stock',
					available: currentStock,
					requested: quantity,
				},
				400,
			);
		}

		// Calculate new stock for this warehouse
		const newStock = currentStock - quantity;
		stockData[warehouse_id] = newStock; // Update stock for specific warehouse
		const newStockJson = JSON.stringify(stockData);

		console.log(`[stock-deduct] Deducting ${quantity} units from warehouse ${warehouse_id}. New stock: ${newStock}`);

		// Atomic update: Only update if current stock hasn't changed (optimistic locking)
		// This prevents race conditions where two orders try to deduct from same stock
		// Note: Using sku (primary key) instead of inventory_id
		const result = await c.env.DB.prepare(
			`
      UPDATE product_inventory
      SET stock = ?, updated_at = CURRENT_TIMESTAMP
      WHERE sku = ? AND stock = ?
    `,
		)
			.bind(newStockJson, inventory.sku, inventory.stock)
			.run();

		// Check if update succeeded (rows_written > 0 means stock hadn't changed)
		if (!result.meta || result.meta.changes === 0) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog('Stock deduction failed: Race condition detected');
			}
			console.log(`[stock-deduct] ERROR: Stock changed during transaction (race condition detected)`);
			return c.json(
				{
					success: false,
					error: 'Stock changed during transaction. Please retry.',
					race_condition: true,
				},
				409,
			); // 409 Conflict
		}

		console.log(
			`[stock-deduct] SUCCESS: Stock deducted. Warehouse=${warehouse_id}, Product=${product_id}, Size=${size}, Deducted=${quantity}, Remaining=${newStock}`,
		);
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Stock deducted successfully. Remaining: ${newStock}`);
		}

		await logEvent(c.env, 'stock_deducted', {
			warehouse_id,
			product_id,
			size,
			quantity,
			remaining: newStock,
		});

		return c.json({
			success: true,
			message: 'Stock deducted successfully',
			warehouse_id,
			product_id,
			size,
			deducted: quantity,
			remaining: newStock,
		});
	} catch (error) {
		console.error('[stock-deduct] Exception:', error);
		await logError(c.env, 'stock_deduct_failed', {
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
				error: error.message || 'Failed to deduct stock',
			},
			500,
		);
	}
}
