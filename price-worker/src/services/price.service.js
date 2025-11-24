import { getCachedPrice, setCachedPrice } from './cache.service.js';
import { getPriceBySku, getPriceBySkuAndProductId } from '../models/price.model.js';

/**
 * Fetches price for a product using SKU and optionally product_id
 * Returns sale_price if is_on_sale = 1, else returns base_price
 * Includes discount_percentage if available
 */
export async function getPrice(c, sku, productId = null) {
  try {
    // Try cache first
    const cached = await getCachedPrice(c, sku, productId);
    if (cached) {
      return c.json(cached);
    }
    
    // Build query - prefer product_id if provided, otherwise use SKU
    let result;
    
    if (productId) {
      result = await getPriceBySkuAndProductId(c.env.DB, sku, productId);
    } else {
      result = await getPriceBySku(c.env.DB, sku);
    }
    
    if (!result) {
      return c.json({
        success: false,
        error: 'Price not found',
        sku,
        product_id: productId || null
      }, 404);
    }
    
    // Determine which price to return
    const isOnSale = result.is_on_sale === 1;
    const currentPrice = isOnSale ? parseFloat(result.sale_price) : parseFloat(result.base_price);
    
    // Build response
    const response = {
      success: true,
      sku: result.sku,
      product_id: result.product_id,
      price: currentPrice,
      base_price: parseFloat(result.base_price),
      currency: result.currency,
      is_on_sale: isOnSale
    };
    
    // Include sale_price and discount_percentage if on sale
    if (isOnSale) {
      response.sale_price = parseFloat(result.sale_price);
      if (result.discount_percentage) {
        response.discount_percentage = parseFloat(result.discount_percentage);
      }
    }
    
    // Cache the response for 5 minutes
    await setCachedPrice(c, sku, productId, response, 300);
    
    return c.json(response);
    
  } catch (error) {
    console.error('Error fetching price:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch price',
      message: error.message
    }, 500);
  }
}

