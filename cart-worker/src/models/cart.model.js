import { generateUUID } from '../utils/uuid.util.js';

/**
 * Get or create active cart for user or guest
 * @param {D1Database} db - Database instance
 * @param {string|null} user_id - User ID (if authenticated)
 * @param {string|null} guest_session_id - Guest session ID (if guest)
 */
export async function getOrCreateCart(db, user_id, guest_session_id = null) {
	// Determine lookup key based on user or guest
	const lookupId = user_id || guest_session_id;
	const lookupField = user_id ? 'user_id' : 'guest_session_id';

	// Get active cart
	const existing = await db
		.prepare(
			`
    SELECT * FROM carts 
    WHERE ${lookupField} = ? AND status = 'active'
    LIMIT 1
  `,
		)
		.bind(lookupId)
		.first();

	if (existing) return existing;

	// Create new cart
	const cart_id = `cart_${generateUUID().substring(0, 8)}`;
	await db
		.prepare(
			`
    INSERT INTO carts (cart_id, user_id, guest_session_id, products, status)
    VALUES (?, ?, ?, '[]', 'active')
  `,
		)
		.bind(cart_id, user_id || null, guest_session_id || null)
		.run();

	return await db
		.prepare(
			`
    SELECT * FROM carts WHERE cart_id = ?
  `,
		)
		.bind(cart_id)
		.first();
}

/**
 * Find active cart for user or guest without creating one (read-only)
 * @param {D1Database} db - Database instance
 * @param {string|null} user_id - User ID (if authenticated)
 * @param {string|null} guest_session_id - Guest session ID (if guest)
 */
export async function findActiveCart(db, user_id, guest_session_id = null) {
	if (user_id) {
		const existing = await db
			.prepare(
				`
      SELECT * FROM carts 
      WHERE user_id = ? AND status = 'active'
      LIMIT 1
    `,
			)
			.bind(user_id)
			.first();
		return existing || null;
	} else if (guest_session_id) {
		// Trim and normalize the guest_session_id to avoid whitespace issues
		const normalizedGuestId = String(guest_session_id).trim();
		console.log(
			'[cart-model] Looking up cart by guest_session_id:',
			normalizedGuestId.substring(0, 12) + '...',
			'(full length:',
			normalizedGuestId.length + ')',
		);

		// Also try to see if any carts exist at all (for debugging)
		const allCarts = await db
			.prepare(
				`
      SELECT cart_id, guest_session_id, status, user_id FROM carts 
      WHERE status = 'active'
      LIMIT 10
    `,
			)
			.all();
		console.log(
			'[cart-model] Debug: All active carts:',
			allCarts.results?.map((c) => ({
				cart_id: c.cart_id,
				has_user_id: !!c.user_id,
				guest_session_id: c.guest_session_id ? c.guest_session_id.substring(0, 12) + '...' : null,
				guest_session_id_length: c.guest_session_id ? c.guest_session_id.length : 0,
			})),
		);

		// Try exact match first
		let existing = await db
			.prepare(
				`
      SELECT * FROM carts 
      WHERE guest_session_id = ? AND status = 'active'
      LIMIT 1
    `,
			)
			.bind(normalizedGuestId)
			.first();

		// If not found, try with trimmed version (in case there's whitespace in DB)
		if (!existing) {
			console.log('[cart-model] Exact match failed, trying with LIKE pattern...');
			const likePattern = `%${normalizedGuestId}%`;
			existing = await db
				.prepare(
					`
        SELECT * FROM carts 
        WHERE guest_session_id LIKE ? AND status = 'active'
        LIMIT 1
      `,
				)
				.bind(likePattern)
				.first();
		}

		console.log('[cart-model] Cart lookup result:', {
			found: !!existing,
			cart_id: existing?.cart_id || null,
			searched_with: normalizedGuestId.substring(0, 12) + '...',
			found_guest_id: existing?.guest_session_id ? existing.guest_session_id.substring(0, 12) + '...' : null,
		});

		if (!existing) {
			console.log('[cart-model] WARNING: No cart found with guest_session_id:', normalizedGuestId.substring(0, 12) + '...');
			console.log(
				'[cart-model] Available guest_session_ids:',
				allCarts.results?.filter((c) => c.guest_session_id).map((c) => c.guest_session_id.substring(0, 12) + '...'),
			);
		}

		return existing || null;
	}
	console.log('[cart-model] WARNING: findActiveCart called with both user_id and guest_session_id null');
	return null;
}

/**
 * Update cart products
 */
export async function updateCartProducts(db, cart_id, productsJson) {
	await db
		.prepare(
			`
    UPDATE carts 
    SET products = ?, updated_at = CURRENT_TIMESTAMP
    WHERE cart_id = ?
  `,
		)
		.bind(productsJson, cart_id)
		.run();
}

/**
 * Update cart address
 */
export async function updateCartAddress(db, cart_id, addressJson) {
	await db
		.prepare(
			`
    UPDATE carts 
    SET address = ?, updated_at = CURRENT_TIMESTAMP
    WHERE cart_id = ?
  `,
		)
		.bind(addressJson, cart_id)
		.run();
}

/**
 * Delete cart
 */
export async function deleteCart(db, cart_id) {
	await db
		.prepare(
			`
    DELETE FROM carts WHERE cart_id = ?
  `,
		)
		.bind(cart_id)
		.run();
}

/**
 * Delete active cart for user or guest
 * @param {D1Database} db - Database instance
 * @param {string|null} user_id - User ID (if authenticated)
 * @param {string|null} guest_session_id - Guest session ID (if guest)
 */
export async function deleteActiveCartForUser(db, user_id, guest_session_id = null) {
	if (user_id) {
		await db
			.prepare(
				`
      DELETE FROM carts WHERE user_id = ? AND status = 'active'
    `,
			)
			.bind(user_id)
			.run();
	} else if (guest_session_id) {
		await db
			.prepare(
				`
      DELETE FROM carts WHERE guest_session_id = ? AND status = 'active'
    `,
			)
			.bind(guest_session_id)
			.run();
	}
}

/**
 * Mark cart as converted
 */
export async function markCartAsConverted(db, cart_id) {
	await db
		.prepare(
			`
    UPDATE carts 
    SET status = 'converted',
        updated_at = CURRENT_TIMESTAMP
    WHERE cart_id = ?
  `,
		)
		.bind(cart_id)
		.run();
}
