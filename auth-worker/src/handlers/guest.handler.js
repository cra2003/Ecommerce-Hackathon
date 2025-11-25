/**
 * Guest session handlers
 */

// Using crypto.randomUUID() directly
import { createCookieHeader } from '../utils/cookie.util.js';

/**
 * Initialize a guest session
 * POST /api/guest/init
 */
export async function initGuestSession(c) {
	try {
		if (c.req.addTraceLog) {
			c.req.addTraceLog('Initializing guest session');
		}
		const { name, email, phone } = await c.req.json();

		// Validate required fields (at least name and email recommended)
		if (!name || !email) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog('Guest session initialization failed: Missing required fields');
			}
			return c.json(
				{
					success: false,
					error: 'Name and email are required',
				},
				400,
			);
		}

		// Generate guest session ID
		const guestSessionId = crypto.randomUUID();
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Generated guest_session_id: ${guestSessionId}`);
		}

		// Set expiry to 6 hours from now
		const expiresAt = new Date();
		expiresAt.setHours(expiresAt.getHours() + 6);

		// Insert guest session into database
		await c.env.DB.prepare(
			`INSERT INTO guest_sessions (guest_session_id, name, email, phone, expires_at)
			 VALUES (?, ?, ?, ?, ?)`,
		)
			.bind(guestSessionId, name || null, email || null, phone || null, expiresAt.toISOString())
			.run();

		// Create cookie header (6 hours = 21600 seconds)
		// Note: httpOnly is false so frontend can read it and send to other workers
		// This is needed because cookies don't cross subdomains (auth-worker vs cart-worker)
		const cookieHeader = createCookieHeader('guest_session_id', guestSessionId, {
			maxAge: 21600, // 6 hours
			path: '/',
			secure: true,
			httpOnly: false, // Changed to false so frontend can read it
			sameSite: 'Lax',
		});

		if (c.req.addTraceLog) {
			c.req.addTraceLog('Guest session initialized successfully');
		}

		// Return success with Set-Cookie header
		return c.json(
			{
				success: true,
				guest_session_id: guestSessionId,
				expires_at: expiresAt.toISOString(),
			},
			200,
			{
				'Set-Cookie': cookieHeader,
			},
		);
	} catch (err) {
		console.error('[guest] Failed to initialize guest session:', err);
		return c.json(
			{
				success: false,
				error: err.message || 'Failed to initialize guest session',
			},
			500,
		);
	}
}
