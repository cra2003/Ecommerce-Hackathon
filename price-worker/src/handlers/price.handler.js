import { getPrice } from '../services/price.service.js';

/**
 * GET /api/price/:sku
 * GET /api/price?sku=XXX&product_id=YYY
 *
 * Fetches price for a product using SKU and optionally product_id
 * Returns sale_price if is_on_sale = 1, else returns base_price
 * Includes discount_percentage if available
 */
export async function getPriceHandler(c) {
	const sku = c.req.param('sku');
	const productId = c.req.query('product_id');

	return await getPrice(c, sku, productId);
}

/**
 * GET /api/price?sku=XXX&product_id=YYY
 * Alternative query parameter endpoint
 */
export async function getPriceQueryHandler(c) {
	const sku = c.req.query('sku');
	const productId = c.req.query('product_id');

	if (!sku) {
		return c.json(
			{
				success: false,
				error: 'SKU parameter is required',
			},
			400,
		);
	}

	// Redirect to the path parameter endpoint
	const url = productId ? `/api/price/${sku}?product_id=${productId}` : `/api/price/${sku}`;

	return c.redirect(url);
}
