// SQL strings for product stock operations

export const UPDATE_PRODUCT_STOCK = `
  UPDATE products SET stock = stock - ? WHERE product_id = ?
`;
