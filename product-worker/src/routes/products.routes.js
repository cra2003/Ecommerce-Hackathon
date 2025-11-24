import {
	createProductHandler,
	listAllProductsHandler,
	listProductsHandler,
	getProductHandler,
	updateProductHandler,
	deleteProductHandler,
} from '../handlers/products.handler.js';
import { getFiltersHandler } from '../handlers/filters.handler.js';

export function registerProductRoutes(app) {
	app.post('/products', createProductHandler);
	app.get('/products/all', listAllProductsHandler); // Must come before /products/:id
	app.get('/products', listProductsHandler);
	app.get('/products/filters', getFiltersHandler);
	app.get('/products/:id', getProductHandler);
	app.put('/products/:id', updateProductHandler);
	app.delete('/products/:id', deleteProductHandler);
}
