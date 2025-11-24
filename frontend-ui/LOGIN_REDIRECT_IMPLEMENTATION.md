# Cookie-Based Login Redirect System Implementation

## Overview

This implementation uses a cookie (`login_redirect_url`) to remember where a user was trying to go before being redirected to login, then redirects them back after successful authentication.

## Files Created/Modified

### 1. Core Utility: `src/lib/utils/login-redirect.js`

Contains all cookie management functions:

- `saveRedirectBeforeLogin(url)` - Saves current URL to cookie (expires in 10 minutes)
- `getRedirectFromCookie()` - Reads redirect URL from cookie
- `deleteRedirectCookie()` - Deletes the redirect cookie
- `redirectToLogin(url)` - Saves URL and redirects to login

### 2. Login Page: `src/routes/login/+page.svelte`

Updated to:

- Read redirect URL from cookie on successful login
- Delete cookie after reading
- Redirect to saved URL (or "/" if cookie missing/empty)

### 3. Product Detail Page: `src/routes/products/[slug]/+page.svelte`

- "Add to Bag" button now saves redirect URL when user is not logged in
- Redirects to `/auth/login`

### 4. Cart Page: `src/routes/cart/+page.svelte`

- Automatically saves redirect URL when page loads without auth
- "Proceed to Checkout" saves redirect URL before redirecting
- "Log In" button saves redirect URL on click

### 5. Header/Navbar: `src/lib/components/Header.svelte`

- "Login" link saves current page URL before redirecting

### 6. Orders Page: `src/routes/orders/+page.svelte`

- "Log In" button saves redirect URL on click

## Cookie Specifications

- **Name**: `login_redirect_url`
- **Expiry**: 10 minutes
- **Secure**: `false`
- **HttpOnly**: `false` (settable from client-side)
- **SameSite**: `Lax`
- **Path**: `/`

## Usage Examples

### Import and use anywhere:

```javascript
import { saveRedirectBeforeLogin, redirectToLogin } from '$lib/utils/login-redirect.js';

// Save current page and redirect
saveRedirectBeforeLogin(); // Uses current page automatically
window.location.href = '/auth/login';

// Or use the helper function
redirectToLogin(); // Saves current page and redirects

// Save specific URL
saveRedirectBeforeLogin('/products?category=sneakers');
redirectToLogin('/products?category=sneakers');
```

### In any component:

```svelte
<script>
  import { saveRedirectBeforeLogin } from '$lib/utils/login-redirect.js';

  function handleProtectedAction() {
    if (!isLoggedIn) {
      saveRedirectBeforeLogin(); // Saves current page
      goto('/auth/login');
    }
  }
</script>
```

## Important Notes

1. **Route Path**: The implementation redirects to `/auth/login`. If your login route is currently at `/login`, you need to either:
   - Move the route from `/login` to `/auth/login`, OR
   - Update all redirect paths from `/auth/login` to `/login`

2. **Server-Side Rendering**: Cookies are set client-side. For SSR support, you may need to add server-side cookie handling in `+page.server.js` files.

3. **Protected Routes**: Add `saveRedirectBeforeLogin()` in the `onMount` or `load` function of protected routes to automatically save the URL when accessed without authentication.

## Testing Checklist

- [ ] Click "Add to Bag" while logged out → redirects to login → login → returns to product page
- [ ] Visit `/cart` while logged out → redirects to login → login → returns to cart
- [ ] Click "Login" from any page → login → returns to that page
- [ ] Visit `/orders` while logged out → click login → login → returns to orders
- [ ] Cookie expires after 10 minutes (redirects to "/" if expired)
- [ ] Cookie is deleted after successful login
- [ ] Works after page refresh
