# Guest Session Flow - Complete Explanation

This document explains how the guest checkout system works, from form submission to cookie handling and subsequent API requests.

## Overview

The guest session system allows users to shop without creating an account. It uses:

1. **Cookies** - Stored on the frontend domain (localhost:5173 or your domain)
2. **Custom Headers** - `X-Guest-Session-Id` sent to cross-domain workers
3. **Database** - `guest_sessions` table in auth-worker to store guest details

---

## Step 1: Guest Form Submission

**File:** `frontend-ui/src/lib/components/GuestForm.svelte`

### What Happens:

```javascript
// User fills out the form (name, email, phone)
async function handleSubmit(e) {
	// 1. Validate form data
	if (!name.trim() || !email.trim()) {
		error = 'Name and email are required';
		return;
	}

	// 2. POST to auth-worker to create guest session
	const response = await fetch(`${AUTH_API}/api/guest/init`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			name: name.trim(),
			email: email.trim().toLowerCase(),
			phone: phone.trim() || null,
		}),
		credentials: 'include', // Important: allows cookies to be set
	});

	// 3. If successful, get guest_session_id from response
	const data = await response.json();
	if (response.ok && data.success) {
		const guestSessionId = data.guest_session_id; // e.g., "58a92799-9299-4e9e-afa3-57f11f9bdf8a"

		// 4. Store in cookie on frontend domain
		setGuestSessionCookie(guestSessionId);
	}
}
```

**Key Points:**

- `credentials: 'include'` ensures cookies can be set/received
- The response contains `guest_session_id` (UUID)
- Frontend stores it in a cookie immediately

---

## Step 2: Backend Creates Guest Session

**File:** `auth-worker/src/handlers/guest.handler.js`

### What Happens:

```javascript
export async function initGuestSession(c) {
	// 1. Get form data
	const { name, email, phone } = await c.req.json();

	// 2. Generate UUID for guest session
	const guestSessionId = crypto.randomUUID();
	// Example: "58a92799-9299-4e9e-afa3-57f11f9bdf8a"

	// 3. Calculate expiry (6 hours from now)
	const expiresAt = new Date();
	expiresAt.setHours(expiresAt.getHours() + 6);

	// 4. Insert into database
	await c.env.DB.prepare(
		`INSERT INTO guest_sessions (guest_session_id, name, email, phone, expires_at)
     VALUES (?, ?, ?, ?, ?)`
	)
		.bind(guestSessionId, name, email, phone, expiresAt.toISOString())
		.run();

	// 5. Create cookie header
	const cookieHeader = createCookieHeader('guest_session_id', guestSessionId, {
		maxAge: 21600, // 6 hours in seconds
		path: '/', // Available to all paths
		secure: true, // HTTPS only
		httpOnly: false, // Frontend can read it (needed for cross-domain)
		sameSite: 'Lax', // Allows cross-site requests
	});

	// 6. Return response with Set-Cookie header
	return c.json(
		{
			success: true,
			guest_session_id: guestSessionId,
			expires_at: expiresAt.toISOString(),
		},
		200,
		{
			'Set-Cookie': cookieHeader, // Browser automatically sets this cookie
		}
	);
}
```

**Key Points:**

- Guest session is stored in `auth-worker` database
- Cookie is set by backend via `Set-Cookie` header
- `httpOnly: false` allows frontend JavaScript to read it
- Cookie expires in 6 hours

---

## Step 3: Frontend Stores Cookie

**File:** `frontend-ui/src/lib/utils/guest.js`

### What Happens:

```javascript
export function setGuestSessionCookie(guestSessionId) {
	// 1. Calculate expiry date (6 hours from now)
	const expires = new Date();
	expires.setHours(expires.getHours() + 6);

	// 2. Build cookie string
	const cookieString = `guest_session_id=${encodeURIComponent(guestSessionId)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax; Secure`;

	// 3. Set cookie in browser
	document.cookie = cookieString;
	// Result: Cookie is now stored in browser
	// Name: guest_session_id
	// Value: 58a92799-9299-4e9e-afa3-57f11f9bdf8a
	// Domain: localhost (or your domain)
	// Path: /
	// Expires: 6 hours from now
}
```

**Cookie Details:**

- **Name:** `guest_session_id`
- **Value:** UUID (e.g., `58a92799-9299-4e9e-afa3-57f11f9bdf8a`)
- **Domain:** Frontend domain (localhost:5173 or your domain)
- **Path:** `/` (available to all paths)
- **Expires:** 6 hours
- **SameSite:** Lax (allows cross-site requests)
- **Secure:** true (HTTPS only)

---

## Step 4: Subsequent API Requests

### How Frontend Sends Guest Session ID

**File:** `frontend-ui/src/lib/utils/api.js`

```javascript
function buildAuthHeaders(token = null, additionalHeaders = {}) {
	const headers = {
		'Content-Type': 'application/json',
		...additionalHeaders,
	};

	if (token) {
		// Authenticated user: use JWT token
		headers.authorization = `Bearer ${token}`;
	} else {
		// Guest user: get guest_session_id from cookie
		const guestSessionId = getGuestSessionId(); // Reads from document.cookie

		if (guestSessionId) {
			// Send as custom header (needed for cross-domain workers)
			headers['X-Guest-Session-Id'] = guestSessionId;
			// Example: X-Guest-Session-Id: 58a92799-9299-4e9e-afa3-57f11f9bdf8a
		}
	}

	return headers;
}

// Example: Adding product to cart
export async function addProductToCart(token, payload) {
	const headers = buildAuthHeaders(token); // Gets guest_session_id from cookie

	const res = await fetch(`${CART_API}/cart/add`, {
		method: 'POST',
		headers, // Contains X-Guest-Session-Id header
		body: JSON.stringify(payload),
		credentials: 'include', // Also sends cookies (though workers can't read them cross-domain)
	});
}
```

**Why Custom Header?**

- Cookies are domain-specific
- Frontend is on `localhost:5173` (or your domain)
- Workers are on `*.workers.dev` (different domain)
- Cookies don't automatically cross domains
- Solution: Read cookie in frontend, send as `X-Guest-Session-Id` header

---

## Step 5: Backend Receives and Processes

### Cart Worker Receives Request

**File:** `cart-worker/src/middleware/auth-or-guest.middleware.js`

```javascript
export default async function authOrGuestMiddleware(c, next) {
	// 1. Check if user is authenticated OR guest
	const authInfo = await getUserOrGuest(c.req.raw, c.env);

	// authInfo will be:
	// { type: 'user', user_id: '...' } OR
	// { type: 'guest', guest_session_id: '...' } OR
	// { type: null }

	if (authInfo.type === 'user') {
		c.set('user_id', authInfo.user_id);
		c.set('guest_session_id', null);
	} else if (authInfo.type === 'guest') {
		c.set('user_id', null);
		c.set('guest_session_id', authInfo.guest_session_id);
	} else {
		return c.json({ error: 'Authentication required' }, 401);
	}

	await next(); // Continue to handler
}
```

### How Backend Identifies Guest

**File:** `cart-worker/src/utils/auth.util.js`

```javascript
export async function getUserOrGuest(request, env) {
  // 1. First, check for JWT token (authenticated user)
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const { payload } = await jwtVerify(token, ...);
      return { type: 'user', user_id: payload.user_id };
    } catch {
      // Invalid token, continue to check guest
    }
  }

  // 2. Check for guest session ID in header (preferred)
  let guestSessionId = request.headers.get('X-Guest-Session-Id');
  if (guestSessionId) {
    guestSessionId = guestSessionId.trim();
    return { type: 'guest', guest_session_id: guestSessionId };
  }

  // 3. Fallback: check cookie (if same domain)
  const cookies = parseCookies(request);
  guestSessionId = cookies.guest_session_id;
  if (guestSessionId) {
    return { type: 'guest', guest_session_id: guestSessionId };
  }

  // 4. No auth found
  return { type: null };
}
```

**Priority Order:**

1. JWT token (if present) → Authenticated user
2. `X-Guest-Session-Id` header → Guest user
3. `guest_session_id` cookie → Guest user (fallback)
4. Nothing → Unauthenticated

---

## Step 6: Cart Operations with Guest Session

**File:** `cart-worker/src/services/cart.service.js`

```javascript
export async function addProductToCart(c) {
	// 1. Get user/guest identifier from context
	const cartInfo = getCartIdentifier(c);
	// Returns: { user_id: null, guest_session_id: '58a92799-...', cacheKey: '...' }

	// 2. Find or create cart using guest_session_id
	let cart = await findActiveCart(c.env.DB, null, cartInfo.guest_session_id);
	// SQL: SELECT * FROM carts WHERE guest_session_id = ? AND status = 'active'

	if (!cart) {
		// Create new cart for guest
		cart = await getOrCreateCart(c.env.DB, null, cartInfo.guest_session_id);
		// SQL: INSERT INTO carts (cart_id, user_id, guest_session_id, products, status)
		//      VALUES (?, NULL, '58a92799-...', '[]', 'active')
	}

	// 3. Add product to cart
	// ... rest of logic
}
```

**Database Schema:**

```sql
CREATE TABLE carts (
  cart_id TEXT PRIMARY KEY,
  user_id TEXT NULL,              -- NULL for guests
  guest_session_id TEXT NULL,     -- NULL for authenticated users
  products TEXT,                  -- JSON array
  status TEXT,
  CHECK (
    (user_id IS NOT NULL AND guest_session_id IS NULL) OR
    (user_id IS NULL AND guest_session_id IS NOT NULL)
  )
);
```

**Key Constraint:**

- Either `user_id` OR `guest_session_id` must be present
- Not both, not neither

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER FILLS GUEST FORM                                        │
│    GuestForm.svelte: handleSubmit()                             │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. FRONTEND POSTS TO AUTH-WORKER                                │
│    POST /api/guest/init                                          │
│    Body: { name, email, phone }                                  │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. AUTH-WORKER CREATES GUEST SESSION                             │
│    - Generates UUID: guest_session_id                            │
│    - Inserts into guest_sessions table                           │
│    - Returns: { success: true, guest_session_id: "..." }        │
│    - Sets cookie via Set-Cookie header                           │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. FRONTEND STORES COOKIE                                        │
│    setGuestSessionCookie(guestSessionId)                         │
│    Cookie: guest_session_id=58a92799-...                        │
│    Domain: localhost:5173                                         │
│    Expires: 6 hours                                               │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. USER ADDS PRODUCT TO CART                                     │
│    addProductToCart(null, { product_id, size, quantity })        │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. FRONTEND BUILDS REQUEST HEADERS                               │
│    buildAuthHeaders(null)                                        │
│    - Reads cookie: getGuestSessionId()                            │
│    - Adds header: X-Guest-Session-Id: 58a92799-...               │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. REQUEST SENT TO CART-WORKER                                   │
│    POST /cart/add                                                │
│    Headers: { X-Guest-Session-Id: "58a92799-..." }               │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. CART-WORKER MIDDLEWARE PROCESSES                             │
│    authOrGuestMiddleware()                                       │
│    - Calls getUserOrGuest()                                      │
│    - Finds X-Guest-Session-Id header                             │
│    - Sets context: guest_session_id = "58a92799-..."            │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. CART SERVICE USES GUEST SESSION                               │
│    addProductToCart()                                            │
│    - Gets guest_session_id from context                          │
│    - Finds/creates cart with guest_session_id                     │
│    - Adds product to cart                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Concepts

### 1. Cookie vs Header

**Cookie:**

- Stored in browser on frontend domain
- Automatically sent with requests to same domain
- Can be read by JavaScript (`document.cookie`)
- Does NOT cross domains (localhost → workers.dev)

**Header:**

- Manually added by frontend JavaScript
- Sent with every request
- Works across domains
- Used to send guest_session_id to workers

### 2. Why Both?

- **Cookie:** Persistent storage on frontend domain
- **Header:** Cross-domain communication to workers

### 3. Session Expiry

- Cookie expires in 6 hours
- Database record expires in 6 hours
- After expiry, user must create new guest session

### 4. Security

- `httpOnly: false` - Allows frontend to read (needed for cross-domain)
- `Secure: true` - HTTPS only
- `SameSite: Lax` - Prevents CSRF while allowing navigation
- Guest session validated in database

---

## Example: Complete Request Flow

### Request 1: Add to Cart (Guest)

```javascript
// Frontend
const guestSessionId = getGuestSessionId(); // From cookie
// guestSessionId = "58a92799-9299-4e9e-afa3-57f11f9bdf8a"

fetch('https://cart-worker.aadhi18082003.workers.dev/cart/add', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
		'X-Guest-Session-Id': '58a92799-9299-4e9e-afa3-57f11f9bdf8a',
	},
	body: JSON.stringify({ product_id: '...', size: '10', quantity: 1 }),
});
```

```javascript
// Backend (cart-worker)
// Middleware extracts guest_session_id from header
const guestSessionId = request.headers.get('X-Guest-Session-Id');
// guestSessionId = "58a92799-9299-4e9e-afa3-57f11f9bdf8a"

// Service uses it to find/create cart
const cart = await findActiveCart(db, null, guestSessionId);
// SQL: SELECT * FROM carts WHERE guest_session_id = '58a92799-...' AND status = 'active'
```

### Request 2: View Cart (Guest)

```javascript
// Frontend
const guestSessionId = getGuestSessionId(); // Still in cookie

fetch('https://cart-worker.aadhi18082003.workers.dev/cart', {
	headers: {
		'X-Guest-Session-Id': '58a92799-9299-4e9e-afa3-57f11f9bdf8a',
	},
});
```

```javascript
// Backend finds cart using same guest_session_id
const cart = await findActiveCart(db, null, guestSessionId);
// Returns the cart created in Request 1
```

---

## Summary

1. **Guest fills form** → Frontend sends to auth-worker
2. **Auth-worker creates session** → Stores in DB, sets cookie
3. **Frontend stores cookie** → Available for 6 hours
4. **Subsequent requests** → Frontend reads cookie, sends as header
5. **Backend receives header** → Extracts guest_session_id
6. **Backend uses guest_session_id** → Finds/creates cart, processes order

The system seamlessly handles both authenticated users (JWT) and guests (cookie + header), allowing the same API endpoints to work for both.
