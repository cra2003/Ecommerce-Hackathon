# SvelteKit Load Function Flow - `+page.server.js`

## When `+page.server.js` Load Function is Called

### Scenario 1: Initial Page Load (SSR)

```
User visits: http://localhost:5173/products
  ↓
SvelteKit Server receives request
  ↓
Calls: load({ fetch, ul }) from +page.server.js
  ↓
Function executes on SERVER
  ↓
Returns: { products: [...], pagination: {...} }
  ↓
SvelteKit serializes data using `devalue`
  ↓
HTML is rendered with data (SSR)
  ↓
Sends HTML + serialized data to browser
  ↓
Browser receives pre-rendered page
```

### Scenario 2: Client-Side Navigation (if +page.js exists)

```
User clicks: /products?page=2
  ↓
SvelteKit intercepts navigation
  ↓
Calls: load() from +page.js (CLIENT-SIDE)
  ↓
Function executes in BROWSER
  ↓
API calls visible in Network tab
  ↓
Returns: { products: [...], pagination: {...} }
  ↓
SvelteKit updates page with new data
```

## Step-by-Step: What Happens Inside `load()` Function

### Step 1: Function Receives Context

```javascript
export async function load({ fetch, url }) {
  // fetch: Server-side fetch (can access private APIs, has credentials)
  // url: URL object with searchParams, pathname, etc.
```

### Step 2: Extract URL Parameters

```javascript
const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '12', 10));
// Example: /products?page=2 → page = 2, limit = 12
```

### Step 3: Fetch Products from Backend

```javascript
const res = await fetch(`${PRODUCTS_API}/products?page=${page}&limit=${limit}`);
// This runs on SERVER, so you won't see it in browser Network tab
// But you'll see it in server logs: [SERVER] Fetching products...
```

### Step 4: Parse Response

```javascript
const data = await res.json();
const rawProducts = data.products || [];
const pagination = data.pagination || {...};
```

### Step 5: Enrich Each Product (Parallel)

```javascript
const products = await Promise.all(
  rawProducts.map(async (p) => {
    // For EACH product, fetch price and stock in parallel
    const [priceData, stockData] = await Promise.all([
      fetch(`${PRICE_API}/api/price/${sku}?product_id=${id}`),
      fetch(`${FULFILL_API}/api/stock/product/${id}`)
    ]);
    // Combine all data
    return { id, name, image, price, inStock, ... };
  })
);
```

### Step 6: Return Data

```javascript
return {
	products, // Array of enriched products
	pagination, // { page, totalPages, total, hasNext, hasPrev }
};
```

## What Happens AFTER `load()` Returns

### Step 7: SvelteKit Serializes Data

```javascript
// SvelteKit uses `devalue` library to serialize
// This is why you see numbers/references in __data.json
// Example: { "products": 1, "pagination": 90 }
// This is SvelteKit's internal format for efficient serialization
```

### Step 8: Data is Passed to Component

```javascript
// In +page.svelte:
let { data } = $props();
// data.products = [...]
// data.pagination = {...}
```

### Step 9: Component Renders

```javascript
// +page.svelte receives the data
// Uses $derived to create reactive values
let products = $derived(data.products || []);
let currentPage = $derived(data.pagination?.page || 1);

// Renders UI
<ProductGrid {products} />
<Pagination page={currentPage} pages={totalPages} />
```

## Complete Request Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER ACTION                                              │
│    - Visits /products or clicks pagination link            │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. SVELTEKIT ROUTER                                         │
│    - Determines which load function to call                │
│    - Initial load: +page.server.js (SSR)                  │
│    - Client nav: +page.js (if exists)                       │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. LOAD FUNCTION EXECUTES                                  │
│    - Runs on SERVER (if +page.server.js)                   │
│    - Runs on CLIENT (if +page.js)                          │
│    - Fetches from backend APIs                             │
│    - Enriches products with price/stock                    │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. LOAD FUNCTION RETURNS                                  │
│    return { products: [...], pagination: {...} }           │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. SVELTEKIT SERIALIZES                                    │
│    - Uses `devalue` library                                │
│    - Creates efficient serialization format                │
│    - Creates __data.json endpoint                          │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. DATA SENT TO BROWSER                                     │
│    - HTML (if SSR)                                          │
│    - __data.json (serialized data)                          │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. COMPONENT RECEIVES DATA                                 │
│    - +page.svelte gets data via $props()                  │
│    - Creates reactive derived values                       │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. UI RENDERS                                               │
│    - ProductGrid displays products                          │
│    - Pagination shows page numbers                          │
│    - User sees the page                                    │
└─────────────────────────────────────────────────────────────┘
```

## Key Differences: +page.server.js vs +page.js

| Feature               | +page.server.js        | +page.js                   |
| --------------------- | ---------------------- | -------------------------- |
| **Runs on**           | Server only            | Client & Server            |
| **API calls visible** | No (server-side)       | Yes (browser Network tab)  |
| **Initial load**      | ✅ SSR                 | ❌ No SSR                  |
| **Client navigation** | Uses \_\_data.json     | Direct API calls           |
| **Security**          | ✅ Can use secrets     | ❌ Exposed to browser      |
| **Performance**       | ✅ Faster initial load | ⚠️ Slower (client fetches) |

## Current Setup in Your Project

You have BOTH files:

- `+page.server.js` - For SSR (initial page load)
- `+page.js` - For client-side navigation (pagination clicks)

**Result:**

- First visit: Uses `+page.server.js` (SSR, fast)
- Pagination clicks: Uses `+page.js` (client-side, visible in Network tab)
