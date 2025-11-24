import { PRODUCTS_API, PRICE_API, FULFILLMENT_API } from '../config/api.config.js';

/**
 * Fetch product details from product-worker
 * Uses service binding if available, falls back to HTTP
 * 
 * Calls: GET /products/:id (product-worker refactored to modular structure)
 * Route: routes/products.routes.js -> handlers/products.handler.js -> services/product.service.js
 */
export async function fetchProduct(c, product_id) {
  try {
    let res;
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5 second timeout
    
    try {
      // Try service binding first (direct worker-to-worker)
      if (c.env.PRODUCTS_SERVICE) {
        console.log(`[fetchProduct] Using service binding for product ${product_id}`);
        // Calls GET /products/:id endpoint in product-worker
        const request = new Request(`https://internal/products/${product_id}`, {
          method: 'GET',
          signal: controller.signal
        });
        res = await c.env.PRODUCTS_SERVICE.fetch(request);
      } else {
        // Fallback to HTTP
        const url = `${PRODUCTS_API}/products/${product_id}`;
        console.log(`[fetchProduct] Using HTTP fallback: ${url}`);
        res = await fetch(url, { signal: controller.signal });
      }
      
      clearTimeout(timeoutId);
      
      console.log(`[fetchProduct] Response status: ${res.status}`);
      if (!res.ok) {
        const errorText = await res.text().catch(() => 'Unable to read error response');
        console.error(`[fetchProduct] Error response: ${errorText}`);
        throw new Error(`Product API error: ${res.status} - ${errorText}`);
      }
      const data = await res.json();
      console.log(`[fetchProduct] Success: product ${data.product_id || data.sku}`);
      return data;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Product fetch timeout - request took too long');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('[fetchProduct] Exception:', error);
    throw error;
  }
}

/**
 * Fetch price from price-worker
 * Uses service binding if available, falls back to HTTP
 */
export async function fetchPrice(c, sku, product_id) {
  try {
    let res;
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5 second timeout
    
    try {
      if (c.env.PRICE_SERVICE) {
        console.log(`[fetchPrice] Using service binding for sku=${sku} product_id=${product_id}`);
        const req = new Request(`https://internal/api/price/${encodeURIComponent(sku)}?product_id=${encodeURIComponent(product_id)}`, {
          method: 'GET',
          signal: controller.signal
        });
        res = await c.env.PRICE_SERVICE.fetch(req);
      } else {
        const url = `${PRICE_API}/api/price/${encodeURIComponent(sku)}?product_id=${encodeURIComponent(product_id)}`;
        console.log(`[fetchPrice] Using HTTP fallback: ${url}`);
        res = await fetch(url, { signal: controller.signal });
      }
      
      clearTimeout(timeoutId);
      
      console.log(`[fetchPrice] Response status: ${res.status}`);
      if (!res.ok) {
        const errorText = await res.text().catch(() => 'Unable to read error response');
        console.error(`[fetchPrice] Error response: ${errorText}`);
        throw new Error(`Price API error: ${res.status} - ${errorText}`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Price not found');
      }
      return data;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Price fetch timeout - request took too long');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('[fetchPrice] Exception:', error);
    throw error;
  }
}

/**
 * Check stock from fulfillment-worker
 */
export async function checkStock(c, product_id, size) {
  let res;
  if (c.env.FULFILLMENT_SERVICE) {
    const internalUrl = `https://internal/api/stock/${encodeURIComponent(product_id)}/${encodeURIComponent(size)}`;
    console.log(`[verify-stock] calling via service binding: ${internalUrl}`);
    const req = new Request(internalUrl, { method: 'GET' });
    res = await c.env.FULFILLMENT_SERVICE.fetch(req);
  } else {
    const url = `${FULFILLMENT_API}/api/stock/${product_id}/${size}`;
    console.log(`[verify-stock] calling via HTTP: ${url}`);
    res = await fetch(url);
  }
  return res;
}

/**
 * Check fulfillment for product
 */
export async function checkFulfillment(c, payload) {
  let res;
  if (c.env.FULFILLMENT_SERVICE) {
    console.log(`[cart-summary] Using service binding for fulfillment check`);
    const req = new Request('https://internal/api/fulfillment/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    res = await c.env.FULFILLMENT_SERVICE.fetch(req);
  } else {
    console.log(`[cart-summary] Using HTTP fallback for fulfillment check`);
    res = await fetch(`${FULFILLMENT_API}/api/fulfillment/check`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }
  return res;
}

/**
 * Deduct stock from fulfillment-worker
 */
export async function deductStock(c, deductPayload) {
  let res;
  if (c.env.FULFILLMENT_SERVICE) {
    const req = new Request('https://internal/api/stock/deduct', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(deductPayload)
    });
    res = await c.env.FULFILLMENT_SERVICE.fetch(req);
  } else {
    res = await fetch(`${FULFILLMENT_API}/api/stock/deduct`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(deductPayload)
    });
  }
  return res;
}

/**
 * Restore stock to fulfillment-worker
 */
export async function restoreStock(c, restorePayload) {
  let res;
  if (c.env.FULFILLMENT_SERVICE) {
    const req = new Request('https://internal/api/stock/restore', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(restorePayload)
    });
    res = await c.env.FULFILLMENT_SERVICE.fetch(req);
  } else {
    res = await fetch(`${FULFILLMENT_API}/api/stock/restore`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(restorePayload)
    });
  }
  return res;
}

/**
 * Acquire inventory locks from fulfillment-worker
 * @param {Object} c - Hono context
 * @param {Array} allocations - Array of {warehouse_id, sku, allocated_quantity}
 * @param {string|null} user_id - User ID (if authenticated)
 * @param {string|null} guest_session_id - Guest session ID (if guest)
 */
export async function acquireLocks(c, allocations, user_id, guest_session_id) {
  let res;
  const identifier = user_id || guest_session_id;
  
  console.log(`[acquireLocks] Acquiring locks for ${allocations.length} allocations, identifier: ${identifier}`);
  
  const payload = {
    allocations,
    user_id: user_id || null,
    guest_session_id: guest_session_id || null
  };
  
  if (c.env.FULFILLMENT_SERVICE) {
    const req = new Request('https://internal/api/fulfillment/lock', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    res = await c.env.FULFILLMENT_SERVICE.fetch(req);
  } else {
    res = await fetch(`${FULFILLMENT_API}/api/fulfillment/lock`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }
  return res;
}

/**
 * Release inventory locks from fulfillment-worker
 * @param {Object} c - Hono context
 * @param {Array} allocations - Array of {warehouse_id, sku} or {warehouse_id, product_id, size}
 * @param {string|null} user_id - User ID (if authenticated)
 * @param {string|null} guest_session_id - Guest session ID (if guest)
 */
export async function releaseLocks(c, allocations, user_id, guest_session_id) {
  let res;
  const identifier = user_id || guest_session_id;
  
  console.log(`[releaseLocks] Releasing locks for ${allocations.length} allocations, identifier: ${identifier}`);
  
  const payload = {
    allocations,
    user_id: user_id || null,
    guest_session_id: guest_session_id || null
  };
  
  if (c.env.FULFILLMENT_SERVICE) {
    const req = new Request('https://internal/api/fulfillment/unlock', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    res = await c.env.FULFILLMENT_SERVICE.fetch(req);
  } else {
    res = await fetch(`${FULFILLMENT_API}/api/fulfillment/unlock`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }
  return res;
}

