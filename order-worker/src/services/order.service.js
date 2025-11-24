import {
  INSERT_ORDER,
  INSERT_ORDER_LEGACY,
  INSERT_ORDER_ITEM,
  SELECT_USER_ORDERS,
  SELECT_ORDER_BY_ID_AND_USER,
  SELECT_ORDER_USER_ID,
  SELECT_ORDER_ITEMS_WITH_PRODUCTS,
  UPDATE_ORDER,
  DELETE_ORDER
} from '../models/order.model.js';

export async function insertOrder(db, orderData) {
  const {
    order_id,
    user_id,
    guest_session_id,
    products,
    address,
    delivery_mode,
    delivery_tier,
    subtotal,
    delivery_cost,
    tax,
    total,
    status = 'pending',
    payment_status = 'pending',
    estimated_delivery_date
  } = orderData;

  await db.prepare(INSERT_ORDER).bind(
    String(order_id),
    user_id ? String(user_id) : null,
    guest_session_id ? String(guest_session_id) : null,
    String(products),
    String(address),
    String(delivery_mode),
    String(delivery_tier),
    Number(subtotal ?? 0),
    Number(delivery_cost ?? 0),
    Number(tax ?? 0),
    Number(total),
    String(status),
    String(payment_status),
    estimated_delivery_date ? String(estimated_delivery_date) : null
  ).run();
}

export async function insertOrderLegacy(db, user_id, total, address, delivery_mode) {
  const result = await db.prepare(INSERT_ORDER_LEGACY).bind(
    user_id, total, address, delivery_mode || 'Normal', 'Pending'
  ).run();
  return Number(result.meta?.last_row_id || result.lastInsertRowid);
}

export async function insertOrderItem(db, orderId, product_id, quantity, price) {
  await db.prepare(INSERT_ORDER_ITEM).bind(orderId, product_id, quantity, price).run();
}

export async function getUserOrders(db, user_id) {
  const orders = await db.prepare(SELECT_USER_ORDERS).bind(user_id).all();
  return orders.results || [];
}

export async function getOrderByIdAndUser(db, order_id, user_id) {
  const order = await db.prepare(SELECT_ORDER_BY_ID_AND_USER).bind(order_id, user_id).first();
  return order;
}

export async function getOrderUserId(db, order_id) {
  const existing = await db.prepare(SELECT_ORDER_USER_ID).bind(order_id).first();
  return existing;
}

export async function getOrderItemsWithProducts(db, order_id) {
  const items = await db.prepare(SELECT_ORDER_ITEMS_WITH_PRODUCTS).bind(order_id).all();
  return items.results || [];
}

export async function updateOrder(db, order_id, status, address) {
  await db.prepare(UPDATE_ORDER).bind(status, address, order_id).run();
}

export async function deleteOrder(db, order_id, user_id) {
  await db.prepare(DELETE_ORDER).bind(order_id, user_id).run();
}

