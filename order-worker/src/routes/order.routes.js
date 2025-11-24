import { createOrderHandler } from '../handlers/order-create.handler.js';
import { listOrdersHandler } from '../handlers/order-list.handler.js';
import { getOrderHandler } from '../handlers/order-single.handler.js';
import { updateOrderHandler } from '../handlers/order-update.handler.js';
import { deleteOrderHandler } from '../handlers/order-delete.handler.js';

export function registerOrderRoutes(app) {
	app.post('/orders', createOrderHandler);
	app.get('/orders', listOrdersHandler);
	app.get('/orders/:id', getOrderHandler);
	app.put('/orders/:id', updateOrderHandler);
	app.delete('/orders/:id', deleteOrderHandler);
}
