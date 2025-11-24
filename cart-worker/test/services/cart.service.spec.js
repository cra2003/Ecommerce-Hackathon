import { expect } from 'chai';
import sinon from 'sinon';
import * as cartService from '../../src/services/cart.service.js';
import * as cartModel from '../../src/models/cart.model.js';
import * as externalApi from '../../src/services/external-api.service.js';
import * as cacheService from '../../src/services/cache.service.js';
import * as logService from '../../src/services/log.service.js';

describe('Cart Service', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			req: {
				json: sandbox.stub(),
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

	describe('addProductToCart', () => {
		it('should add product to cart successfully', async () => {
			c.req.json.resolves({ product_id: 'prod123', size: '10', quantity: 1 });
			c.get.withArgs('user_id').returns('user123');
			c.get.withArgs('guest_session_id').returns(null);

			const fakeProduct = { product_id: 'prod123', sku: 'P0001', name: 'Test Product' };
			const fakePrice = { price: 100, currency: 'INR' };
			const fakeCart = { cart_id: 'cart123', products: '[]' };

			sandbox.stub(externalApi, 'fetchProduct').resolves(fakeProduct);
			sandbox.stub(externalApi, 'fetchPrice').resolves(fakePrice);
			sandbox.stub(cartModel, 'getOrCreateCart').resolves(fakeCart);
			sandbox.stub(cartModel, 'updateCartProducts').resolves();
			sandbox.stub(cacheService, 'invalidateCache').resolves();
			sandbox.stub(logService, 'logEvent').resolves();

			await cartService.addProductToCart(c);

			expect(externalApi.fetchProduct.calledOnce).to.be.true;
			expect(cartModel.updateCartProducts.calledOnce).to.be.true;
		});

		it('should return error for missing product_id', async () => {
			c.req.json.resolves({ size: '10', quantity: 1 });

			await cartService.addProductToCart(c);

			expect(c.json.calledWith({ success: false, error: 'Missing product_id' }, 400)).to.be.true;
		});
	});

	describe('viewCart', () => {
		it('should return cart successfully', async () => {
			c.get.withArgs('user_id').returns('user123');
			c.get.withArgs('guest_session_id').returns(null);

			const fakeCart = { cart_id: 'cart123', products: '[]', address: null };
			sandbox.stub(cartModel, 'findActiveCart').resolves(fakeCart);
			sandbox.stub(cacheService, 'getCached').resolves(null);
			sandbox.stub(cacheService, 'setCached').resolves();

			await cartService.viewCart(c);

			expect(cartModel.findActiveCart.calledOnce).to.be.true;
		});
	});
});
