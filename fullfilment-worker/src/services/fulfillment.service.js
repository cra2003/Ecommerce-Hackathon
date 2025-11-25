import { getTierForIndex } from '../utils/delivery-tier.util.js';
import { getLockedQuantity } from './inventory-lock.service.js';

/**
 * Allocate quantity across warehouses based on priority
 * Now supports inventory locking to prevent race conditions during checkout.
 *
 * This function:
 * 1. Checks available stock in each warehouse (from DB)
 * 2. Gets locked quantity from KV (reserved by other users)
 * 3. Calculates available stock = DB stock - locked quantity
 * 4. Only allocates from truly available stock
 *
 * @param {Array} priorityWarehouses - Priority-ordered warehouses
 * @param {Object} inventoryMap - Map of warehouse_id -> inventory data
 * @param {string} size - Product size
 * @param {number} quantity - Quantity to allocate
 * @param {KVNamespace} kv - Cloudflare KV binding for locks (optional)
 * @param {string} skuId - SKU ID (e.g., "P0001-10") for lock lookup
 * @returns {Promise<{allocations: Array, remainingQuantity: number, anyExpressAvailable: boolean}>}
 */
export async function allocateQuantityAcrossWarehouses(priorityWarehouses, inventoryMap, size, quantity, kv = null, skuId = null) {
	if (kv && skuId) {
		// Note: addTraceLog is not available in this pure function context
		// Logs should be added at the handler level
	}
	let remainingQuantity = quantity;
	const allocations = [];
	let anyExpressAvailable = false;

	for (let i = 0; i < priorityWarehouses.length; i++) {
		const priorityWh = priorityWarehouses[i];
		const inventory = inventoryMap[priorityWh.warehouse_id];

		if (!inventory) {
			console.log(`[fulfillment-check] Warehouse ${priorityWh.warehouse_id} (priority ${i + 1}): No inventory record`);
			continue;
		}

		if (remainingQuantity <= 0) {
			console.log(`[fulfillment-check] All quantity allocated, stopping`);
			break;
		}

		// Get total stock from database
		const totalStock = inventory.stock_for_size;

		if (totalStock <= 0) {
			console.log(`[fulfillment-check] Warehouse ${priorityWh.warehouse_id} (priority ${i + 1}): No stock for size ${size}`);
			continue;
		}

		// Get locked quantity from KV (if KV and skuId are provided)
		let lockedQuantity = 0;
		if (kv && skuId) {
			try {
				lockedQuantity = await getLockedQuantity(kv, priorityWh.warehouse_id, skuId);
				console.log(
					`[fulfillment-check] Warehouse ${priorityWh.warehouse_id}: Total stock=${totalStock}, Locked=${lockedQuantity}, Available=${totalStock - lockedQuantity}`,
				);
			} catch (error) {
				console.error(`[fulfillment-check] Error getting locked quantity for ${priorityWh.warehouse_id}:${skuId}:`, error);
				// On error, assume no locks (fail open)
				lockedQuantity = 0;
			}
		} else {
			console.log(`[fulfillment-check] Warehouse ${priorityWh.warehouse_id}: KV not provided, using total stock (not checking locks)`);
		}

		// Calculate available stock (total stock minus locked quantity)
		const availableStock = Math.max(0, totalStock - lockedQuantity);

		if (availableStock <= 0) {
			console.log(
				`[fulfillment-check] Warehouse ${priorityWh.warehouse_id} (priority ${i + 1}): No available stock (total=${totalStock}, locked=${lockedQuantity}, available=${availableStock})`,
			);
			continue;
		}

		// Allocate as much as possible from available stock
		const allocatedQuantity = Math.min(availableStock, remainingQuantity);
		remainingQuantity -= allocatedQuantity;

		// Determine tier based on priority index
		const tier = getTierForIndex(i);

		console.log(
			`[fulfillment-check] Warehouse ${priorityWh.warehouse_id} (priority ${i + 1}): Allocating ${allocatedQuantity} units (from ${availableStock} available), tier=${tier}, express=${inventory.express_available}`,
		);

		allocations.push({
			warehouse_id: priorityWh.warehouse_id,
			warehouse_name: inventory.warehouse_name,
			allocated_quantity: allocatedQuantity,
			available_stock: availableStock, // Available stock (after locks)
			total_stock: totalStock, // Total stock in DB
			locked_quantity: lockedQuantity, // Locked quantity
			base_days: priorityWh.base_days,
			tier,
			express_available: inventory.express_available,
			currency: inventory.currency,
			sku: skuId || null, // Include SKU in allocation for lock/unlock operations
		});

		// Track if any warehouse supports express
		if (inventory.express_available) {
			anyExpressAvailable = true;
		}

		// If we've allocated all requested quantity, stop
		if (remainingQuantity === 0) {
			console.log(`[fulfillment-check] Fully allocated ${quantity} units`);
			break;
		}
	}

	return { allocations, remainingQuantity, anyExpressAvailable };
}

/**
 * Determine highest tier from allocations
 */
export function determineHighestTier(allocations) {
	const tiersUsed = [...new Set(allocations.map((a) => a.tier))];
	const tierOrder = ['tier_3', 'tier_2', 'tier_1'];
	let highestTier = null;
	for (const tier of tierOrder) {
		if (tiersUsed.includes(tier)) {
			highestTier = tier;
			break;
		}
	}
	return highestTier;
}
