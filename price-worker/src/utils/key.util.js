/**
 * Generate cache key for price data
 * Format: price:sku:product_id or price:sku if no product_id
 */
export function getCacheKey(sku, productId = null) {
	if (productId) {
		return `price:${sku}:${productId}`;
	}
	return `price:${sku}`;
}
