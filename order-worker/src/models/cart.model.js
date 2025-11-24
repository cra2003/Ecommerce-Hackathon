// SQL strings for cart operations

export const SELECT_CART_BY_USER = `
  SELECT * FROM cart WHERE user_id = ?
`;

export const SELECT_CART_ITEMS_WITH_PRODUCTS = `
  SELECT ci.*, p.price, p.name FROM cart_items ci 
  JOIN products p ON ci.product_id = p.product_id 
  WHERE ci.cart_id = ?
`;

export const DELETE_CART_ITEMS = `
  DELETE FROM cart_items WHERE cart_id = ?
`;
