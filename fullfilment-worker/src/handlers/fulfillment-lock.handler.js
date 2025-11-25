import { acquireLock, releaseAllLocks } from '../services/inventory-lock.service.js';
import { logEvent, logError } from '../services/log.service.js';

/**
 * POST /api/fulfillment/lock
 * Acquires inventory locks for an order during checkout
 *
 * Request Body:
 * {
 *   allocations: [
 *     { warehouse_id: "wh_007", sku: "P0001-10", allocated_quantity: 5 },
 *     ...
 *   ],
 *   user_id: "user_123"
 * }
 *
 * Response:
 * {
 *   success: true,
 *   locked: 2,
 *   message: "Locks acquired successfully"
 * }
 */
export async function fulfillmentLockHandler(c) {
	let body = {};
	try {
		if (c.req.addTraceLog) {
			c.req.addTraceLog('Acquiring inventory locks');
		}
		body = await c.req.json();
		// Support both user_id and guest_session_id (can be guest_session_id for guest users)
		const { allocations, user_id, guest_session_id } = body;
		const identifier = user_id || guest_session_id; // Use either user_id or guest_session_id
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Identifier: ${identifier}, Allocations: ${allocations?.length || 0}`);
		}

		console.log(
			`[fulfillment-lock] START: identifier=${identifier} (user_id=${user_id || 'null'}, guest_session_id=${guest_session_id || 'null'}), allocations=${allocations?.length || 0}`,
		);
		await logEvent(c.env, 'fulfillment_lock_started', {
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
			allocation_count: allocations?.length || 0,
		});

		// Validation
		if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
			console.log(`[fulfillment-lock] ERROR: Missing or invalid allocations array`);
			return c.json(
				{
					success: false,
					error: 'Missing or invalid allocations array',
				},
				400,
			);
		}

		if (!identifier) {
			console.log(`[fulfillment-lock] ERROR: Missing user_id or guest_session_id`);
			return c.json(
				{
					success: false,
					error: 'Missing required field: user_id or guest_session_id',
				},
				400,
			);
		}

		// Get KV namespace for locks
		const kv = c.env.LOCKS; // Using LOCKS binding from wrangler.toml

		if (!kv) {
			console.error(`[fulfillment-lock] ERROR: LOCKS KV namespace not bound`);
			return c.json(
				{
					success: false,
					error: 'Inventory locking service not available',
				},
				500,
			);
		}

		// Acquire locks for each allocation
		const lockResults = [];
		const errors = [];

		console.log(`[fulfillment-lock] Acquiring locks for ${allocations.length} allocations`);

		for (const allocation of allocations) {
			const { warehouse_id, sku, allocated_quantity } = allocation;

			if (!warehouse_id || !sku || !allocated_quantity || allocated_quantity <= 0) {
				const error = `Invalid allocation: missing warehouse_id, sku, or allocated_quantity`;
				console.error(`[fulfillment-lock] ${error}`, allocation);
				errors.push({ allocation, error });
				continue;
			}

			// Acquire lock with 10 minute TTL (600 seconds)
			// Use identifier (either user_id or guest_session_id) as the lock key
			const lockResult = await acquireLock(
				kv,
				warehouse_id,
				sku,
				identifier, // Use identifier instead of user_id
				allocated_quantity,
				600, // 10 minutes TTL
			);

			if (lockResult.success) {
				lockResults.push({
					warehouse_id,
					sku,
					quantity: allocated_quantity,
					total_locked: lockResult.totalLocked,
				});
				console.log(`[fulfillment-lock] Lock acquired: ${warehouse_id}:${sku} = ${allocated_quantity} units`);
			} else {
				const error = `Failed to acquire lock for ${warehouse_id}:${sku}: ${lockResult.error}`;
				console.error(`[fulfillment-lock] ${error}`);
				errors.push({ allocation, error: lockResult.error });
			}
		}

		// Check if all locks were acquired successfully
		if (errors.length > 0) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog(`Failed to acquire ${errors.length} out of ${allocations.length} locks`);
			}
			console.error(`[fulfillment-lock] ERROR: Failed to acquire ${errors.length} out of ${allocations.length} locks`);

			// Release any locks that were successfully acquired
			if (lockResults.length > 0) {
				console.log(`[fulfillment-lock] Releasing ${lockResults.length} locks due to partial failure`);
				await releaseAllLocks(kv, lockResults, identifier);
			}

			await logError(c.env, 'fulfillment_lock_failed', {
				user_id: user_id || null,
				guest_session_id: guest_session_id || null,
				allocations_count: allocations.length,
				locked_count: lockResults.length,
				errors_count: errors.length,
				errors,
			});

			return c.json(
				{
					success: false,
					error: 'Failed to acquire all locks',
					locked: lockResults.length,
					total: allocations.length,
					errors,
				},
				500,
			);
		}

		console.log(`[fulfillment-lock] SUCCESS: Acquired ${lockResults.length} locks for ${user_id ? 'user' : 'guest'} ${identifier}`);
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Successfully acquired ${lockResults.length} inventory lock(s)`);
		}

		await logEvent(c.env, 'fulfillment_lock_success', {
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
			allocations_count: allocations.length,
			locked_count: lockResults.length,
		});

		return c.json({
			success: true,
			locked: lockResults.length,
			message: `Locks acquired successfully for ${lockResults.length} allocations`,
			locks: lockResults,
		});
	} catch (error) {
		console.error('[fulfillment-lock] Exception:', error);
		await logError(c.env, 'fulfillment_lock_exception', {
			user_id: body?.user_id || null,
			guest_session_id: body?.guest_session_id || null,
			allocations_count: body?.allocations?.length || 0,
			message: error.message,
			stack: error.stack,
		});
		return c.json(
			{
				success: false,
				error: 'Failed to process lock request',
				message: error.message,
			},
			500,
		);
	}
}

/**
 * POST /api/fulfillment/unlock
 * Releases inventory locks for an order (after payment success/failure)
 *
 * Request Body:
 * {
 *   allocations: [
 *     { warehouse_id: "wh_007", sku: "P0001-10" },
 *     ...
 *   ],
 *   user_id: "user_123"
 * }
 *
 * Response:
 * {
 *   success: true,
 *   released: 2,
 *   message: "Locks released successfully"
 * }
 */
export async function fulfillmentUnlockHandler(c) {
	let body = {};
	try {
		if (c.req.addTraceLog) {
			c.req.addTraceLog('Releasing inventory locks');
		}
		body = await c.req.json();
		// Support both user_id and guest_session_id (can be guest_session_id for guest users)
		const { allocations, user_id, guest_session_id } = body;
		const identifier = user_id || guest_session_id; // Use either user_id or guest_session_id
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Identifier: ${identifier}, Allocations: ${allocations?.length || 0}`);
		}

		console.log(
			`[fulfillment-unlock] START: identifier=${identifier} (user_id=${user_id || 'null'}, guest_session_id=${guest_session_id || 'null'}), allocations=${allocations?.length || 0}`,
		);
		await logEvent(c.env, 'fulfillment_unlock_started', {
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
			allocation_count: allocations?.length || 0,
		});

		// Validation
		if (!allocations || !Array.isArray(allocations)) {
			console.log(`[fulfillment-unlock] ERROR: Missing or invalid allocations array`);
			return c.json(
				{
					success: false,
					error: 'Missing or invalid allocations array',
				},
				400,
			);
		}

		if (!identifier) {
			console.log(`[fulfillment-unlock] ERROR: Missing user_id or guest_session_id`);
			return c.json(
				{
					success: false,
					error: 'Missing required field: user_id or guest_session_id',
				},
				400,
			);
		}

		// Get KV namespace for locks
		const kv = c.env.LOCKS;

		if (!kv) {
			console.error(`[fulfillment-unlock] ERROR: LOCKS KV namespace not bound`);
			return c.json(
				{
					success: false,
					error: 'Inventory locking service not available',
				},
				500,
			);
		}

		// Release all locks for the user/guest
		// Use identifier (either user_id or guest_session_id) as the lock key
		console.log(`[fulfillment-unlock] Releasing locks for ${allocations.length} allocations`);
		console.log(`[fulfillment-unlock] Using identifier: ${identifier} (${user_id ? 'user' : 'guest'})`);
		const releaseResult = await releaseAllLocks(kv, allocations, identifier);

		if (!releaseResult.success) {
			console.error(`[fulfillment-unlock] ERROR: Failed to release some locks`, releaseResult.errors);

			await logError(c.env, 'fulfillment_unlock_failed', {
				user_id: user_id || null,
				guest_session_id: guest_session_id || null,
				allocations_count: allocations.length,
				released_count: releaseResult.released,
				errors: releaseResult.errors,
			});

			return c.json(
				{
					success: false,
					error: 'Failed to release some locks',
					released: releaseResult.released,
					total: allocations.length,
					errors: releaseResult.errors,
				},
				500,
			);
		}

		console.log(`[fulfillment-unlock] SUCCESS: Released ${releaseResult.released} locks for ${user_id ? 'user' : 'guest'} ${identifier}`);
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Successfully released ${releaseResult.released} inventory lock(s)`);
		}

		await logEvent(c.env, 'fulfillment_unlock_success', {
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
			allocations_count: allocations.length,
			released_count: releaseResult.released,
		});

		return c.json({
			success: true,
			released: releaseResult.released,
			message: `Locks released successfully for ${releaseResult.released} allocations`,
			results: releaseResult.results,
		});
	} catch (error) {
		console.error('[fulfillment-unlock] Exception:', error);
		await logError(c.env, 'fulfillment_unlock_exception', {
			user_id: body?.user_id || null,
			guest_session_id: body?.guest_session_id || null,
			allocations_count: body?.allocations?.length || 0,
			message: error.message,
			stack: error.stack,
		});
		return c.json(
			{
				success: false,
				error: 'Failed to process unlock request',
				message: error.message,
			},
			500,
		);
	}
}
