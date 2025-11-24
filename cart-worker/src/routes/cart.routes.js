import {
  addProductHandler,
  viewCartHandler,
  verifyStockHandler,
  syncCartHandler,
  incrementQuantityHandler,
  decrementQuantityHandler,
  removeCartItemHandler,
  clearCartHandler,
  saveShippingHandler,
  getCartSummaryHandler,
  placeOrderHandler
} from '../handlers/cart.handler.js';
import authOrGuestMiddleware from '../middleware/auth-or-guest.middleware.js';

export function registerCartRoutes(app) {
  // All cart routes now support both authenticated users and guest sessions
  app.post('/cart/add', authOrGuestMiddleware, addProductHandler);
  app.get('/cart', authOrGuestMiddleware, viewCartHandler);
  app.post('/cart/verify-stock', authOrGuestMiddleware, verifyStockHandler);
  app.post('/cart/sync', authOrGuestMiddleware, syncCartHandler);
  app.post('/cart/increment', authOrGuestMiddleware, incrementQuantityHandler);
  app.post('/cart/decrement', authOrGuestMiddleware, decrementQuantityHandler);
  app.delete('/cart/item', authOrGuestMiddleware, removeCartItemHandler);
  app.delete('/cart', authOrGuestMiddleware, clearCartHandler);
  app.post('/cart/shipping', authOrGuestMiddleware, saveShippingHandler);
  app.get('/cart/summary', authOrGuestMiddleware, getCartSummaryHandler);
  app.post('/cart/place-order', authOrGuestMiddleware, placeOrderHandler);
}

