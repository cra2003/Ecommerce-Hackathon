import { jwtVerify } from 'jose'

// ================= JWT AUTH MIDDLEWARE =================
export default async function authMiddleware(c, next) {
  const authHeader = c.req.header('authorization')
  console.log('[authMiddleware] Authorization header:', authHeader ? 'present' : 'missing')
  
  if (!authHeader) {
    console.log('[authMiddleware] Missing authorization header')
    return c.json({ error: 'Missing token' }, 401)
  }

  const token = authHeader.split(' ')[1]
  if (!token) {
    console.log('[authMiddleware] Token not found in header')
    return c.json({ error: 'Invalid token format' }, 401)
  }
  
  try {
    if (!c.env.JWT_SECRET) {
      console.error('[authMiddleware] JWT_SECRET not configured')
      return c.json({ error: 'Server configuration error' }, 500)
    }
    
    const { payload } = await jwtVerify(token, new TextEncoder().encode(c.env.JWT_SECRET))
    console.log('[authMiddleware] JWT payload keys:', Object.keys(payload || {}))
    
    const userId =
      (payload && (payload.user_id || payload.userId || payload.sub)) || null
    console.log('[authMiddleware] Extracted user_id:', userId)
    
    if (!userId) {
      console.log('[authMiddleware] No user_id found in payload')
      return c.json({ error: 'Invalid token: user id missing' }, 401)
    }
    c.set('user_id', String(userId))
    console.log('[authMiddleware] Auth successful, user_id set:', String(userId))
    await next()
  } catch (err) {
    console.error('[authMiddleware] JWT verification failed:', err.message)
    return c.json({ error: 'Invalid or expired token', details: err.message }, 401)
  }
}

