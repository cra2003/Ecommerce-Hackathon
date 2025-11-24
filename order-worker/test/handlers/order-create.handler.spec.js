import { expect } from 'chai';
import sinon from 'sinon';
import { createOrderHandler } from '../../src/handlers/order-create.handler.js';
import * as orderService from '../../src/services/order.service.js';
import * as cartService from '../../src/services/cart.service.js';
import * as productService from '../../src/services/product.service.js';
import * as cacheService from '../../src/services/cache.service.js';
import * as logService from '../../src/services/log.service.js';

describe('Order Create Handler', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			req: {
				json: sandbox.stub(),
			},
			env: {
				DB: {},
			},
			get: sandbox.stub(),
			json: sandbox.stub().returnsThis(),
		};
	});

	afterEach(() => sandbox.restore());

	describe('createOrderHandler', () => {
		it('should create order successfully', async () => {
			c.get.withArgs('user_id').returns('user123');
			c.req.json.resolves({ address: { line1: '123 Main St' }, delivery_mode: 'standard' });

			const fakeCart = { cart_id: 'cart123' };
			const fakeItems = { results: [{ product_id: 'prod1', quantity: 1, price: 100 }] };

			sandbox.stub(cartService, 'getCartByUser').resolves(fakeCart);
			sandbox.stub(cartService, 'getCartItemsWithProducts').resolves(fakeItems);
			sandbox.stub(cartService, 'deleteCartItems').resolves();
			sandbox.stub(orderService, 'insertOrderLegacy').resolves(1);
			sandbox.stub(orderService, 'insertOrderItem').resolves();
			sandbox.stub(productService, 'reduceProductStock').resolves();
			sandbox.stub(cacheService, 'invalidateCache').resolves();
			sandbox.stub(logService, 'logEvent').resolves();

			await createOrderHandler(c);

			expect(orderService.insertOrderLegacy.calledOnce).to.be.true;
		});

		it('should return 400 for missing address', async () => {
			c.get.withArgs('user_id').returns('user123');
			c.req.json.resolves({});

			await createOrderHandler(c);

			expect(c.json.calledWith({ error: 'Address required' }, 400)).to.be.true;
		});

		it('should return 404 for no cart', async () => {
			c.get.withArgs('user_id').returns('user123');
			c.req.json.resolves({ address: { line1: '123 Main St' } });
			sandbox.stub(cartService, 'getCartByUser').resolves(null);

			await createOrderHandler(c);

			expect(c.json.calledWith({ error: 'No active cart found' }, 404)).to.be.true;
		});
	});
});
