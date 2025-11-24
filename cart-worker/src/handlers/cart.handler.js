import {
  addProductToCart,
  viewCart,
  verifyStock,
  syncCart,
  incrementQuantity,
  decrementQuantity,
  removeCartItem,
  clearCart,
  saveShippingAddress,
  getCartSummary,
  placeOrder
} from '../services/cart.service.js';

export async function addProductHandler(c) {
  return await addProductToCart(c);
}

export async function viewCartHandler(c) {
  return await viewCart(c);
}

export async function verifyStockHandler(c) {
  return await verifyStock(c);
}

export async function syncCartHandler(c) {
  return await syncCart(c);
}

export async function incrementQuantityHandler(c) {
  console.log('[incrementQuantityHandler] Handler called');
  try {
    const result = await incrementQuantity(c);
    console.log('[incrementQuantityHandler] Handler completed successfully');
    return result;
  } catch (err) {
    console.error('[incrementQuantityHandler] Handler error:', err);
    throw err;
  }
}

export async function decrementQuantityHandler(c) {
  return await decrementQuantity(c);
}

export async function removeCartItemHandler(c) {
  return await removeCartItem(c);
}

export async function clearCartHandler(c) {
  return await clearCart(c);
}

export async function saveShippingHandler(c) {
  return await saveShippingAddress(c);
}

export async function getCartSummaryHandler(c) {
  return await getCartSummary(c);
}

export async function placeOrderHandler(c) {
  return await placeOrder(c);
}

