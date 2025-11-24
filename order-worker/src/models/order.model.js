// SQL strings for order operations

export const INSERT_ORDER = `
  INSERT INTO orders (
    order_id, user_id, guest_session_id, products, address, delivery_mode, delivery_tier,
    subtotal, delivery_cost, tax, total, status, payment_status, estimated_delivery_date
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`

export const INSERT_ORDER_LEGACY = `
  INSERT INTO orders (user_id, total_amount, address, delivery_mode, status) 
  VALUES (?, ?, ?, ?, ?)
`

export const INSERT_ORDER_ITEM = `
  INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)
`

export const SELECT_USER_ORDERS = `
  SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC
`

export const SELECT_ORDER_BY_ID_AND_USER = `
  SELECT * FROM orders WHERE order_id = ? AND user_id = ?
`

export const SELECT_ORDER_USER_ID = `
  SELECT user_id FROM orders WHERE order_id = ?
`

export const SELECT_ORDER_ITEMS_WITH_PRODUCTS = `
  SELECT oi.*, p.name, p.image_url 
  FROM order_items oi 
  JOIN products p ON oi.product_id = p.product_id 
  WHERE order_id = ?
`

export const UPDATE_ORDER = `
  UPDATE orders SET status = COALESCE(?, status), address = COALESCE(?, address) WHERE order_id = ?
`

export const DELETE_ORDER = `
  DELETE FROM orders WHERE order_id = ? AND user_id = ?
`

