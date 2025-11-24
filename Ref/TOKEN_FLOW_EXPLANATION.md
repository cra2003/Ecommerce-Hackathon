# Token Authentication Flow Explanation

## Overview
This app uses a **dual-token system**:
- **Access Token (JWT)**: Short-lived (15 minutes), stored in memory on frontend
- **Refresh Token**: Long-lived (7 days), stored as httpOnly cookie

---

## 1. Where Tokens Are Stored

### Access Token (Frontend - In Memory)
**Location**: `frontend-ui/src/lib/stores/auth.js`

```javascript
export const accessToken = writable('');  // Svelte store (in-memory)
```

- Stored in a Svelte writable store (JavaScript memory)
- **NOT in localStorage** (more secure, cleared on page close)
- Automatically cleared when user logs out or token expires
- Sent in `Authorization: Bearer <token>` header for API calls

### Refresh Token (Browser Cookie)
**Location**: Set by auth-worker via `Set-Cookie` header

**Code**: `auth-worker/src/index.js` lines 120-131
```javascript
function setRefreshTokenCookie(c, token) {
  const maxAge = 60 * 60 * 24 * 7 // 7 days
  const cookie = [
    `refresh_token=${token}`,
    'HttpOnly',      // JavaScript cannot access (XSS protection)
    'Secure',        // Only sent over HTTPS
    'SameSite=Strict', // CSRF protection
    'Path=/',
    `Max-Age=${maxAge}`
  ].join('; ')
  c.header('Set-Cookie', cookie, { append: true })
}
```

- Stored as **httpOnly cookie** (JavaScript cannot read it)
- Automatically sent by browser on every request to the auth-worker
- Expires in 7 days
- Cannot be accessed via `document.cookie` (security feature)

### Refresh Token Hash (Database)
**Location**: `refresh_tokens` table in D1 database

**Code**: `auth-worker/src/index.js` lines 140-144
```javascript
async function storeRefreshToken(db, { token_id, user_id, token_hash, user_agent, ip_address, expires_at }) {
  await db.prepare(
    `INSERT INTO refresh_tokens (token_id, user_id, token_hash, user_agent, ip_address, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(token_id, user_id, token_hash, user_agent, ip_address, expires_at).run()
}
```

- Only the **SHA-256 hash** of the refresh token is stored (never the plain token)
- Includes metadata: user_id, user_agent, IP address, expiration
- Can be revoked (sets `revoked_at` timestamp)

---

## 2. How Tokens Are Created

### Access Token Creation
**Code**: `auth-worker/src/index.js` lines 91-103

```javascript
async function generateAccessToken(user, secret) {
  const nowSec = Math.floor(Date.now() / 1000)
  const payload = {
    sub: user.user_id,           // Subject (user ID)
    iat: nowSec,                 // Issued at
    exp: nowSec + 15 * 60,       // Expires in 15 minutes
    first_name: user.first_name,
    last_name: user.last_name,
    email_hash: user.email_hash,
    pwd: user.password_changed_at ? Math.floor(new Date(user.password_changed_at).getTime() / 1000) : 0
  }
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .sign(te.encode(secret))
}
```

**Process**:
1. Creates JWT payload with user info
2. Signs with HS256 algorithm using `JWT_SECRET`
3. Expires in **15 minutes**
4. Includes `pwd` timestamp to invalidate if password changes

### Refresh Token Creation
**Code**: `auth-worker/src/index.js` lines 108-112

```javascript
async function generateRefreshToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)  // Cryptographically secure random
  return base64url(bytes)        // Convert to URL-safe base64
}
```

**Process**:
1. Generates 32 random bytes using `crypto.getRandomValues()`
2. Converts to base64url format (URL-safe)
3. **Never stored in plain text** - only SHA-256 hash is stored in DB

---

## 3. Login Flow (How Tokens Are Created)

**Frontend**: `frontend-ui/src/routes/login/+page.svelte`
```javascript
await login({ email, password });
await loadProfile();
```

**Backend**: `auth-worker/src/index.js` lines 237-266

1. **User submits email/password**
2. **Server validates credentials**:
   - Hashes email with SHA-256 to find user
   - Compares password with bcrypt hash
3. **Server generates tokens**:
   ```javascript
   const accessToken = await generateAccessToken(user, c.env.JWT_SECRET)
   const refreshToken = await generateRefreshToken()
   const token_hash = await sha256Hex(refreshToken)  // Hash for storage
   ```
4. **Server stores refresh token hash in DB**:
   ```javascript
   await storeRefreshToken(c.env.DB, {
     token_id: crypto.randomUUID(),
     user_id: user.user_id,
     token_hash: token_hash,  // Only hash stored
     user_agent: ua,
     ip_address: ip,
     expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
   })
   ```
5. **Server sets refresh token cookie**:
   ```javascript
   setRefreshTokenCookie(c, refreshToken)  // Sets httpOnly cookie
   ```
6. **Server returns access token in JSON**:
   ```javascript
   return c.json({ accessToken })
   ```
7. **Frontend stores access token in memory**:
   ```javascript
   // In stores/auth.js
   setToken(res?.accessToken || '')  // Stores in Svelte writable store
   ```

---

## 4. Refresh Flow (How New Access Token Is Created)

**Frontend**: `frontend-ui/src/lib/components/Header.svelte` lines 17-19
```javascript
await tryRefresh();  // Called on page load
```

**Backend**: `auth-worker/src/index.js` lines 269-301

1. **Frontend calls `/api/auth/refresh`** (no body, cookie sent automatically)
2. **Server extracts refresh token from cookie**:
   ```javascript
   const cookie = c.req.header('cookie') || ''
   const m = cookie.match(/(?:^|;\s*)refresh_token=([^;]+)/)
   const rt = m ? decodeURIComponent(m[1]) : null
   ```
3. **Server hashes token and looks it up in DB**:
   ```javascript
   const token_hash = await sha256Hex(rt)
   const rec = await getRefreshToken(c.env.DB, token_hash)
   ```
4. **Server validates**:
   - Token exists and not revoked
   - Token not expired
5. **Server revokes old refresh token** (token rotation):
   ```javascript
   await revokeRefreshToken(c.env.DB, { token_hash })  // Sets revoked_at
   ```
6. **Server generates NEW tokens**:
   ```javascript
   const accessToken = await generateAccessToken(user, c.env.JWT_SECRET)  // New 15min token
   const newRt = await generateRefreshToken()  // New refresh token
   ```
7. **Server stores new refresh token hash**:
   ```javascript
   await storeRefreshToken(c.env.DB, { ...newRefreshTokenData })
   ```
8. **Server sets new refresh token cookie**:
   ```javascript
   setRefreshTokenCookie(c, newRt)  // Replaces old cookie
   ```
9. **Server returns new access token**:
   ```javascript
   return c.json({ accessToken })
   ```
10. **Frontend updates access token in memory**:
    ```javascript
    setToken(res?.accessToken || '')  // Updates store
    ```

**Why rotate refresh tokens?**
- Security: If a refresh token is stolen, it can only be used once
- Old token is immediately revoked when new one is issued

---

## 5. Using Access Token for API Calls

**Frontend**: `frontend-ui/src/lib/utils/api.js` lines 77-84

```javascript
export async function fetchMe(token) {
  const res = await fetch(`${AUTH_API}/api/auth/me`, {
    headers: { authorization: `Bearer ${token}` },  // Access token in header
    credentials: 'include'  // Include refresh token cookie
  });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
}
```

**Backend**: `auth-worker/src/index.js` lines 161-176

```javascript
async function getAuthUser(c, next) {
  const auth = c.req.header('authorization') || ''
  const [, token] = auth.split(' ')  // Extract token from "Bearer <token>"
  const { payload } = await jwtVerify(token, te.encode(c.env.JWT_SECRET))
  // Validate token signature and expiration
  c.set('auth', { user_id: payload.sub, email_hash: payload.email_hash })
  return next()  // Continue to protected route
}
```

---

## 6. Logout Flow

**Frontend**: `frontend-ui/src/lib/stores/auth.js` lines 29-36

```javascript
export async function logout() {
  try {
    await logoutSession();  // Calls API to revoke refresh token
  } finally {
    setToken('');           // Clear access token from memory
    profile.set(null);      // Clear user profile
  }
}
```

**Backend**: `auth-worker/src/index.js` lines 303-312

```javascript
app.post(`${base}/logout`, async (c) => {
  const cookie = c.req.header('cookie') || ''
  const m = cookie.match(/(?:^|;\s*)refresh_token=([^;]+)/)
  if (m) {
    const rt = decodeURIComponent(m[1])
    const token_hash = await sha256Hex(rt)
    await revokeRefreshToken(c.env.DB, { token_hash })  // Revoke in DB
  }
  clearAuthCookies(c)  // Clear cookie
  return c.json({ message: 'Logged out' })
})
```

---

## Summary Diagram

```
┌─────────────┐
│   Login     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Auth Worker                        │
│  1. Validate credentials            │
│  2. Generate accessToken (JWT)     │
│  3. Generate refreshToken (random)  │
│  4. Hash refreshToken → SHA-256     │
│  5. Store hash in DB                │
│  6. Set refreshToken as httpOnly    │
│     cookie (7 days)                 │
│  7. Return accessToken in JSON       │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Frontend                           │
│  • accessToken → Svelte store       │
│    (in-memory, 15min)               │
│  • refreshToken → httpOnly cookie   │
│    (browser, 7 days)                 │
└─────────────────────────────────────┘

When accessToken expires (15min):
┌─────────────┐
│  Frontend   │
│  Calls      │
│  /refresh   │
└──────┬──────┘
       │ (sends refreshToken cookie)
       ▼
┌─────────────────────────────────────┐
│  Auth Worker                        │
│  1. Validate refreshToken           │
│  2. Revoke old refreshToken         │
│  3. Generate NEW accessToken         │
│  4. Generate NEW refreshToken        │
│  5. Store new refreshToken hash     │
│  6. Set new refreshToken cookie     │
│  7. Return new accessToken           │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Frontend                            │
│  Updates accessToken in store        │
└─────────────────────────────────────┘
```

---

## Security Features

1. **Access Token**: Short-lived (15min) limits exposure if stolen
2. **Refresh Token Rotation**: Old token revoked when new one issued
3. **httpOnly Cookie**: JavaScript cannot access refresh token (XSS protection)
4. **Secure Cookie**: Only sent over HTTPS
5. **SameSite=Strict**: CSRF protection
6. **Token Hashing**: Only hash stored in DB, not plain token
7. **Password Change Invalidation**: Access tokens invalidated if password changes

