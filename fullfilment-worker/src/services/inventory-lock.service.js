/**
 * Inventory Lock Service
 *
 * Manages distributed locks in Cloudflare KV to prevent race conditions
 * during checkout. Locks reserve inventory for a specific user for a limited time.
 *
 * Lock Key Format: "lock:{warehouse_id}:{sku_id}"
 * Lock Value Format: JSON object { "user_id": quantity, ... }
 *
 * Example:
 *   Key: "lock:wh_007:P0001-10"
 *   Value: {"user_123": 5, "user_456": 3}
 *
 * This means:
 *   - user_123 has locked 5 units from wh_007 for P0001-10
 *   - user_456 has locked 3 units from wh_007 for P0001-10
 *   - Total locked: 8 units
 */

/**
 * Get the total locked quantity for a specific warehouse+SKU combination
 *
 * @param {KVNamespace} kv - Cloudflare KV namespace binding
 * @param {string} warehouseId - Warehouse ID (e.g., "wh_007")
 * @param {string} skuId - SKU ID including size (e.g., "P0001-10")
 * @returns {Promise<number>} Total locked quantity across all users
 */
export async function getLockedQuantity(kv, warehouseId, skuId) {
	try {
		const lockKey = `lock:${warehouseId}:${skuId}`;

		// Get lock data from KV
		const lockData = await kv.get(lockKey, { type: 'json' });

		if (!lockData) {
			// No locks exist for this warehouse+SKU
			console.log(`[inventory-lock] No locks found for ${lockKey}`);
			return 0;
		}

		// Calculate total locked quantity across all users
		const totalLocked = Object.values(lockData).reduce((sum, qty) => sum + (qty || 0), 0);

		console.log(`[inventory-lock] Lock key ${lockKey}: Total locked quantity = ${totalLocked}`);
		console.log(`[inventory-lock] Lock details:`, JSON.stringify(lockData));

		return totalLocked;
	} catch (error) {
		console.error(`[inventory-lock] Error getting locked quantity for ${warehouseId}:${skuId}:`, error);
		// On error, assume no locks (fail open to avoid blocking operations)
		return 0;
	}
}

/**
 * Acquire a lock for a specific user, warehouse, and SKU
 *
 * This function:
 * 1. Gets existing locks for the warehouse+SKU
 * 2. Adds/updates the user's lock quantity
 * 3. Saves back to KV with TTL
 *
 * @param {KVNamespace} kv - Cloudflare KV namespace binding
 * @param {string} warehouseId - Warehouse ID (e.g., "wh_007")
 * @param {string} skuId - SKU ID including size (e.g., "P0001-10")
 * @param {string} userId - User ID (e.g., "user_123")
 * @param {number} quantity - Quantity to lock
 * @param {number} ttlSeconds - Time-to-live in seconds (default: 300 = 5 minutes)
 * @returns {Promise<{success: boolean, totalLocked: number, error?: string}>}
 */
export async function acquireLock(kv, warehouseId, skuId, userId, quantity, ttlSeconds = 300) {
	try {
		if (!warehouseId || !skuId || !userId || !quantity || quantity <= 0) {
			throw new Error('Invalid parameters: warehouseId, skuId, userId, and positive quantity are required');
		}

		const lockKey = `lock:${warehouseId}:${skuId}`;

		// Get existing locks
		let lockData = {};
		try {
			const existing = await kv.get(lockKey, { type: 'json' });
			if (existing) {
				lockData = existing;
			}
		} catch (error) {
			// If key doesn't exist, lockData remains empty object
			console.log(`[inventory-lock] No existing locks for ${lockKey}, creating new`);
		}

		// Add or update user's lock
		const previousLock = lockData[userId] || 0;
		lockData[userId] = (lockData[userId] || 0) + quantity;

		// Calculate total locked (for logging)
		const totalLocked = Object.values(lockData).reduce((sum, qty) => sum + (qty || 0), 0);

		// Prepare the value to be stored in KV
		const lockValue = JSON.stringify(lockData);

		console.log(`[inventory-lock] 🔒 ACQUIRING LOCK:`);
		console.log(`[inventory-lock]   KV Key: "${lockKey}"`);
		console.log(`[inventory-lock]   KV Value: ${lockValue}`);
		console.log(`[inventory-lock]   User ${userId}: ${previousLock} -> ${lockData[userId]} (added ${quantity})`);
		console.log(`[inventory-lock]   Total locked for ${lockKey}: ${totalLocked}`);
		console.log(`[inventory-lock]   TTL: ${ttlSeconds}s`);

		// Save lock data with TTL (metadata.expiration)
		await kv.put(lockKey, lockValue, {
			expirationTtl: ttlSeconds,
		});

		console.log(`[inventory-lock] ✅ LOCK STORED IN KV:`);
		console.log(`[inventory-lock]   Key: "${lockKey}"`);
		console.log(`[inventory-lock]   Value: ${lockValue}`);
		console.log(`[inventory-lock]   Successfully acquired lock for user ${userId}, qty=${quantity}, TTL=${ttlSeconds}s`);

		return {
			success: true,
			totalLocked,
			previousLock,
			newLock: lockData[userId],
		};
	} catch (error) {
		console.error(`[inventory-lock] Error acquiring lock for ${warehouseId}:${skuId}:`, error);
		return {
			success: false,
			totalLocked: 0,
			error: error.message,
		};
	}
}

/**
 * Release a user's lock for a specific warehouse+SKU combination
 *
 * This function:
 * 1. Gets existing locks
 * 2. Removes the user's entry
 * 3. If no locks remain, deletes the KV key entirely
 * 4. Otherwise, saves updated lock data
 *
 * @param {KVNamespace} kv - Cloudflare KV namespace binding
 * @param {string} warehouseId - Warehouse ID (e.g., "wh_007")
 * @param {string} skuId - SKU ID including size (e.g., "P0001-10")
 * @param {string} userId - User ID (e.g., "user_123")
 * @returns {Promise<{success: boolean, released: boolean, error?: string}>}
 */
export async function releaseLock(kv, warehouseId, skuId, userId) {
	try {
		if (!warehouseId || !skuId || !userId) {
			throw new Error('Invalid parameters: warehouseId, skuId, and userId are required');
		}

		const lockKey = `lock:${warehouseId}:${skuId}`;

		// Get existing locks
		let lockData = null;
		try {
			lockData = await kv.get(lockKey, { type: 'json' });
		} catch (error) {
			// Key doesn't exist, nothing to release
			console.log(`[inventory-lock] No locks found for ${lockKey}, nothing to release`);
			return {
				success: true,
				released: false,
				message: 'No locks found',
			};
		}

		if (!lockData || !lockData[userId]) {
			// User doesn't have a lock for this warehouse+SKU
			console.log(`[inventory-lock] User ${userId} has no lock for ${lockKey}`);
			return {
				success: true,
				released: false,
				message: 'User has no lock',
			};
		}

		const lockedQuantity = lockData[userId];
		const previousValue = JSON.stringify(lockData);

		delete lockData[userId];

		// Check if any locks remain
		const remainingLockCount = Object.keys(lockData).length;

		console.log(`[inventory-lock] 🔓 RELEASING LOCK:`);
		console.log(`[inventory-lock]   KV Key: "${lockKey}"`);
		console.log(`[inventory-lock]   Previous Value: ${previousValue}`);
		console.log(`[inventory-lock]   User ${userId} releasing: ${lockedQuantity} units`);

		if (remainingLockCount === 0) {
			// No locks remain, delete the key entirely
			await kv.delete(lockKey);
			console.log(`[inventory-lock] ✅ LOCK KEY DELETED FROM KV:`);
			console.log(`[inventory-lock]   Key: "${lockKey}"`);
			console.log(`[inventory-lock]   Reason: No remaining locks (user ${userId} had ${lockedQuantity} units)`);

			return {
				success: true,
				released: true,
				releasedQuantity: lockedQuantity,
				keyDeleted: true,
			};
		} else {
			// Other users still have locks, update the key
			const newValue = JSON.stringify(lockData);
			await kv.put(lockKey, newValue);
			console.log(`[inventory-lock] ✅ LOCK UPDATED IN KV:`);
			console.log(`[inventory-lock]   Key: "${lockKey}"`);
			console.log(`[inventory-lock]   New Value: ${newValue}`);
			console.log(`[inventory-lock]   User ${userId} released ${lockedQuantity} units, ${remainingLockCount} users still locked`);

			return {
				success: true,
				released: true,
				releasedQuantity: lockedQuantity,
				remainingLocks: remainingLockCount,
				keyDeleted: false,
			};
		}
	} catch (error) {
		console.error(`[inventory-lock] Error releasing lock for ${warehouseId}:${skuId}:`, error);
		return {
			success: false,
			released: false,
			error: error.message,
		};
	}
}

/**
 * Release all locks for a user across multiple allocations
 *
 * This is used when an order is completed or cancelled.
 * It releases locks for all warehouse+SKU combinations in the allocations array.
 *
 * @param {KVNamespace} kv - Cloudflare KV namespace binding
 * @param {Array<{warehouse_id: string, sku?: string}>} allocations - Array of allocation objects
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, released: number, errors: Array}>}
 */
export async function releaseAllLocks(kv, allocations, userId) {
	if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
		console.log(`[inventory-lock] No allocations provided for releaseAllLocks`);
		return {
			success: true,
			released: 0,
			errors: [],
		};
	}

	if (!userId) {
		console.error(`[inventory-lock] No userId provided for releaseAllLocks`);
		return {
			success: false,
			released: 0,
			errors: ['userId is required'],
		};
	}

	console.log(`[inventory-lock] 🔓 RELEASING ALL LOCKS:`);
	console.log(`[inventory-lock]   User/Guest ID: ${userId}`);
	console.log(`[inventory-lock]   Allocations count: ${allocations.length}`);

	const results = [];
	const errors = [];

	// Release locks for each allocation
	for (const allocation of allocations) {
		const warehouseId = allocation.warehouse_id;
		// SKU might be in allocation or constructed from product_id + size
		const skuId = allocation.sku || (allocation.product_id && allocation.size ? `${allocation.product_id}-${allocation.size}` : null);

		if (!warehouseId || !skuId) {
			const error = `Missing warehouse_id or sku in allocation: ${JSON.stringify(allocation)}`;
			console.error(`[inventory-lock] ${error}`);
			errors.push(error);
			continue;
		}

		const result = await releaseLock(kv, warehouseId, skuId, userId);

		if (result.success && result.released) {
			results.push({
				warehouse_id: warehouseId,
				sku: skuId,
				released_quantity: result.releasedQuantity,
			});
		} else if (!result.success) {
			errors.push(`Failed to release lock for ${warehouseId}:${skuId}: ${result.error}`);
		}
	}

	const success = errors.length === 0;

	console.log(`[inventory-lock] Released ${results.length} locks for user ${userId}, ${errors.length} errors`);

	return {
		success,
		released: results.length,
		results,
		errors: errors.length > 0 ? errors : undefined,
	};
}
