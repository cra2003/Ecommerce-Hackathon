import { stockBySizeHandler } from '../handlers/stock-by-size.handler.js';
import { stockByProductHandler } from '../handlers/stock-by-product.handler.js';

export function registerStockRoutes(app) {
	// IMPORTANT: More specific routes must be registered BEFORE more general routes
	// Otherwise /api/stock/product/:product_id will match /api/stock/:product_id/:size
	app.get('/api/stock/product/:product_id', stockByProductHandler);
	app.get('/api/stock/:product_id/:size', stockBySizeHandler);
}
