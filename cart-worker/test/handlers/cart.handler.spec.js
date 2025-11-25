import { expect } from 'chai';
import sinon from 'sinon';
import { addProductHandler, viewCartHandler } from '../../src/handlers/cart.handler.js';

describe('Cart Handler', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			req: {
				json: sandbox.stub(),
				param: sandbox.stub(),
				header: sandbox.stub(),
				addTraceLog: sandbox.stub(),
			},
			env: {
				DB: {
					prepare: sandbox.stub(),
				},
				CACHE: {
					get: sandbox.stub(),
					put: sandbox.stub(),
					delete: sandbox.stub(),
				},
				PRODUCTS_SERVICE: {
					fetch: sandbox.stub(),
				},
				PRICE_SERVICE: {
					fetch: sandbox.stub(),
				},
				LOGS: {
					put: sandbox.stub(),
				},
			},
			get: sandbox.stub(),
			json: sandbox.stub().returnsThis(),
		};
		c.get.withArgs('user_id').returns(null);
		c.get.withArgs('guest_session_id').returns('guest-session-123');
	});

	afterEach(() => sandbox.restore());

	describe('addProductHandler', () => {
		it('should add product to cart successfully', async () => {
			c.req.json.resolves({ product_id: 'prod123', size: '10', quantity: 1 });

			const mockProduct = { product_id: 'prod123', sku: 'SKU123', name: 'Test Product', primary_image_url: 'https://example.com/image.jpg' };
			const mockPrice = { success: true, price: 1000, currency: 'INR' };

			c.env.PRODUCTS_SERVICE.fetch.resolves(
				new Response(JSON.stringify(mockProduct), { status: 200 }),
			);
			c.env.PRICE_SERVICE.fetch.resolves(
				new Response(JSON.stringify(mockPrice), { status: 200 }),
			);

			// Mock getOrCreateCart
			const mockCart = { cart_id: 'cart_123', products: '[]' };
			c.env.DB.prepare.onCall(0).returns({
				bind: sandbox.stub().returns({
					first: sandbox.stub().resolves(null), // No existing cart
				}),
			});
			c.env.DB.prepare.onCall(1).returns({
				bind: sandbox.stub().returns({
					run: sandbox.stub().resolves(), // Insert cart
				}),
			});
			c.env.DB.prepare.onCall(2).returns({
				bind: sandbox.stub().returns({
					first: sandbox.stub().resolves(mockCart), // Get created cart
				}),
			});
			c.env.DB.prepare.onCall(3).returns({
				bind: sandbox.stub().returns({
					run: sandbox.stub().resolves(), // Update cart products
				}),
			});

			const result = await addProductHandler(c);

			expect(c.env.PRODUCTS_SERVICE.fetch.calledOnce).to.be.true;
			expect(c.env.PRICE_SERVICE.fetch.calledOnce).to.be.true;
			expect(c.json.calledOnce).to.be.true;
			const responseArg = c.json.firstCall.args[0];
			expect(responseArg.success).to.be.true;
			expect(responseArg.product.product_id).to.equal('prod123');
		});
	});

	describe('viewCartHandler', () => {
		it('should return cart data successfully', async () => {
			const mockCart = {
				cart_id: 'cart_123',
				user_id: null,
				products: JSON.stringify([
					{ product_id: 'prod123', size: '10', quantity: 1, price: 1000 },
				]),
				address: null,
				status: 'active',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z',
			};

			// Mock cache miss
			c.env.CACHE.get.resolves(null);

			// Mock findActiveCart - it calls DB.prepare multiple times
			// First call: SELECT all carts (for debugging)
			// Second call: SELECT by guest_session_id exact match
			const allCartsStub = sandbox.stub().resolves({ results: [] });
			const exactMatchStub = sandbox.stub().resolves(mockCart);

			c.env.DB.prepare.onCall(0).returns({
				all: allCartsStub,
			});
			c.env.DB.prepare.onCall(1).returns({
				bind: sandbox.stub().returns({
					first: exactMatchStub,
				}),
			});
			c.env.CACHE.put.resolves();

			const result = await viewCartHandler(c);

			expect(c.env.CACHE.get.calledOnce).to.be.true;
			expect(c.env.DB.prepare.called).to.be.true;
			expect(c.json.calledOnce).to.be.true;
			const responseArg = c.json.firstCall.args[0];
			expect(responseArg.success).to.be.true;
			expect(responseArg.cart.cart_id).to.equal('cart_123');
			expect(responseArg.cart.item_count).to.equal(1);
		});
	});
});
