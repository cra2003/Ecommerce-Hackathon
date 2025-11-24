import {
  SELECT_CART_BY_USER,
  SELECT_CART_ITEMS_WITH_PRODUCTS,
  DELETE_CART_ITEMS
} from '../models/cart.model.js';

export async function getCartByUser(db, user_id) {
  const cart = await db.prepare(SELECT_CART_BY_USER).bind(user_id).first();
  return cart;
}

export async function getCartItemsWithProducts(db, cart_id) {
  const items = await db.prepare(SELECT_CART_ITEMS_WITH_PRODUCTS).bind(cart_id).all();
  return items;
}

export async function deleteCartItems(db, cart_id) {
  await db.prepare(DELETE_CART_ITEMS).bind(cart_id).run();
}

