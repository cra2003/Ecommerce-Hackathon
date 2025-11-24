import { jwtVerify } from 'jose';

// =============== JWT AUTH MIDDLEWARE ==================
export default async function authMiddleware(c, next) {
	const authHeader = c.req.header('authorization');
	if (!authHeader) return c.json({ error: 'Missing token' }, 401);

	const token = authHeader.split(' ')[1];
	try {
		const { payload } = await jwtVerify(token, new TextEncoder().encode(c.env.JWT_SECRET));
		const userId = (payload && (payload.user_id || payload.userId || payload.sub)) || null;
		if (!userId) {
			return c.json({ error: 'Invalid token: user id missing' }, 401);
		}
		c.set('user_id', String(userId));
		await next();
	} catch (err) {
		return c.json({ error: 'Invalid or expired token' }, 401);
	}
}
