export async function getPriceBySku(db, sku) {
	const query = `
    SELECT 
      price_id,
      sku,
      product_id,
      base_price,
      sale_price,
      discount_percentage,
      is_on_sale,
      currency,
      status
    FROM prices
    WHERE sku = ? AND status = 'active'
    LIMIT 1
  `;
	const result = await db.prepare(query).bind(sku).first();
	return result;
}

export async function getPriceBySkuAndProductId(db, sku, productId) {
	const query = `
    SELECT 
      price_id,
      sku,
      product_id,
      base_price,
      sale_price,
      discount_percentage,
      is_on_sale,
      currency,
      status
    FROM prices
    WHERE sku = ? AND product_id = ? AND status = 'active'
    LIMIT 1
  `;
	const result = await db.prepare(query).bind(sku, productId).first();
	return result;
}
