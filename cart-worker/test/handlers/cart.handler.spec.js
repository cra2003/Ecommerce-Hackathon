import { expect } from 'chai';
import sinon from 'sinon';
import { addProductHandler, viewCartHandler } from '../../src/handlers/cart.handler.js';
import * as cartService from '../../src/services/cart.service.js';

describe('Cart Handler', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			req: {
				json: sandbox.stub(),
				raw: {
					headers: new Headers(),
				},
			},
			env: {
				DB: {},
				PRODUCTS_SERVICE: null,
			},
			get: sandbox.stub(),
			set: sandbox.stub(),
			json: sandbox.stub().returnsThis(),
		};
	});

	afterEach(() => sandbox.restore());

	describe('addProductHandler', () => {
		it('should add product to cart successfully', async () => {
			const productData = { product_id: 'prod123', size: '10', quantity: 1 };
			c.req.json.resolves(productData);
			c.get.withArgs('user_id').returns('user123');
			c.get.withArgs('guest_session_id').returns(null);

			const fakeResponse = { success: true, cart: { products: [productData] } };
			sandbox.stub(cartService, 'addProductToCart').resolves(c.json(fakeResponse));

			await addProductHandler(c);

			expect(cartService.addProductToCart.calledOnce).to.be.true;
		});

		it('should handle missing product data', async () => {
			c.req.json.resolves({});
			sandbox.stub(cartService, 'addProductToCart').resolves(c.json({ success: false, error: 'Missing product_id' }, 400));

			await addProductHandler(c);

			expect(cartService.addProductToCart.calledOnce).to.be.true;
		});
	});

	describe('viewCartHandler', () => {
		it('should return cart successfully', async () => {
			c.get.withArgs('user_id').returns('user123');
			c.get.withArgs('guest_session_id').returns(null);

			const fakeCart = { cart_id: 'cart123', products: [] };
			sandbox.stub(cartService, 'viewCart').resolves(c.json({ success: true, cart: fakeCart }));

			await viewCartHandler(c);

			expect(cartService.viewCart.calledOnce).to.be.true;
		});

		it('should handle empty cart', async () => {
			c.get.withArgs('user_id').returns('user123');
			sandbox.stub(cartService, 'viewCart').resolves(c.json({ success: true, cart: null }));

			await viewCartHandler(c);

			expect(cartService.viewCart.calledOnce).to.be.true;
		});
	});
});
