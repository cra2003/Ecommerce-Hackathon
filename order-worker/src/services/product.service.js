import { UPDATE_PRODUCT_STOCK } from '../models/product.model.js';

export async function reduceProductStock(db, product_id, quantity) {
	await db.prepare(UPDATE_PRODUCT_STOCK).bind(quantity, product_id).run();
}
