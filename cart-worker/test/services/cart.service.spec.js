import { expect } from 'chai';
import sinon from 'sinon';
import * as cartService from '../../src/services/cart.service.js';

describe('Cart Service', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			req: {
				json: sandbox.stub(),
				header: sandbox.stub(),
				param: sandbox.stub(),
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
				FULFILLMENT_SERVICE: {
					fetch: sandbox.stub(),
				},
				ORDER_SERVICE: {
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
		// Reset DB.prepare call count
		c.env.DB.prepare.resetHistory = sandbox.stub();
	});

	afterEach(() => sandbox.restore());

	describe('addProductToCart', () => {
		it('should add product to cart successfully', async () => {
			c.req.json.resolves({ product_id: 'prod123', size: '10', quantity: 1 });

			const mockProduct = {
				product_id: 'prod123',
				sku: 'SKU123',
				name: 'Test Product',
				primary_image_url: 'https://example.com/image.jpg',
			};
			const mockPrice = { success: true, price: 1000, currency: 'INR' };

			c.env.PRODUCTS_SERVICE.fetch.resolves(new Response(JSON.stringify(mockProduct), { status: 200 }));
			c.env.PRICE_SERVICE.fetch.resolves(new Response(JSON.stringify(mockPrice), { status: 200 }));

			// Mock getOrCreateCart - no existing cart, create new one
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

			const result = await cartService.addProductToCart(c);

			expect(c.env.PRODUCTS_SERVICE.fetch.calledOnce).to.be.true;
			expect(c.env.PRICE_SERVICE.fetch.calledOnce).to.be.true;
			expect(c.json.calledOnce).to.be.true;
			const responseArg = c.json.firstCall.args[0];
			expect(responseArg.success).to.be.true;
			expect(responseArg.product.product_id).to.equal('prod123');
		});

		it('should return error when product_id is missing', async () => {
			c.req.json.resolves({ size: '10', quantity: 1 });

			const result = await cartService.addProductToCart(c);

			expect(c.json.calledWith({ success: false, error: 'Missing product_id' }, 400)).to.be.true;
		});

		it('should return error when size is missing', async () => {
			c.req.json.resolves({ product_id: 'prod123', quantity: 1 });

			const result = await cartService.addProductToCart(c);

			expect(c.json.calledWith({ success: false, error: 'Missing size' }, 400)).to.be.true;
		});

		it('should return error when quantity is invalid', async () => {
			c.req.json.resolves({ product_id: 'prod123', size: '10', quantity: -1 });

			const result = await cartService.addProductToCart(c);

			expect(c.json.calledWith({ success: false, error: 'Quantity must be a positive number' }, 400)).to.be.true;
		});

		it('should return error when product not found', async () => {
			c.req.json.resolves({ product_id: 'prod123', size: '10', quantity: 1 });
			c.env.PRODUCTS_SERVICE.fetch.resolves(new Response(JSON.stringify({ product_id: 'prod123' }), { status: 200 }));

			const result = await cartService.addProductToCart(c);

			expect(c.json.calledWith({ success: false, error: 'Product not found' }, 404)).to.be.true;
		});

		it('should return error when price fetch fails', async () => {
			c.req.json.resolves({ product_id: 'prod123', size: '10', quantity: 1 });
			const mockProduct = { product_id: 'prod123', sku: 'SKU123', name: 'Test Product' };
			c.env.PRODUCTS_SERVICE.fetch.resolves(new Response(JSON.stringify(mockProduct), { status: 200 }));
			c.env.PRICE_SERVICE.fetch.rejects(new Error('Price fetch failed'));

			const result = await cartService.addProductToCart(c);

			expect(c.json.calledWith({ success: false, error: 'Price not found for product' }, 404)).to.be.true;
		});

		it('should update existing item quantity when item already in cart', async () => {
			c.req.json.resolves({ product_id: 'prod123', size: '10', quantity: 2 });
			const mockProduct = {
				product_id: 'prod123',
				sku: 'SKU123',
				name: 'Test Product',
				primary_image_url: 'https://example.com/image.jpg',
			};
			const mockPrice = { success: true, price: 1000, currency: 'INR' };
			const existingCart = {
				cart_id: 'cart_123',
				products: JSON.stringify([{ product_id: 'prod123', size: '10', quantity: 1, price: 1000 }]),
			};

			c.env.PRODUCTS_SERVICE.fetch.resolves(new Response(JSON.stringify(mockProduct), { status: 200 }));
			c.env.PRICE_SERVICE.fetch.resolves(new Response(JSON.stringify(mockPrice), { status: 200 }));
			c.env.DB.prepare.onCall(0).returns({
				bind: sandbox.stub().returns({
					first: sandbox.stub().resolves(existingCart),
				}),
			});
			c.env.DB.prepare.onCall(1).returns({
				bind: sandbox.stub().returns({
					run: sandbox.stub().resolves(),
				}),
			});

			const result = await cartService.addProductToCart(c);

			expect(c.json.calledOnce).to.be.true;
			const responseArg = c.json.firstCall.args[0];
			expect(responseArg.success).to.be.true;
		});

		it('should handle errors in catch block', async () => {
			c.req.json.rejects(new Error('JSON parse error'));

			const result = await cartService.addProductToCart(c);

			expect(c.json.calledWith({ success: false, error: 'JSON parse error' }, 500)).to.be.true;
		});
	});

	describe('viewCart', () => {
		it('should return cart from cache successfully', async () => {
			const cachedCart = { cart_id: 'cart_123', products: [] };
			c.env.CACHE.get.resolves(cachedCart);

			await cartService.viewCart(c);

			expect(c.env.CACHE.get.calledOnce).to.be.true;
			expect(c.json.calledWith({ success: true, cart: cachedCart })).to.be.true;
		});

		it('should return null cart when no cart exists', async () => {
			c.env.CACHE.get.resolves(null);
			// findActiveCart for guest_session_id first calls all() for debugging, then bind().first() for lookup
			let callCount = 0;
			c.env.DB.prepare.callsFake(() => {
				if (callCount === 0) {
					callCount++;
					return {
						all: sandbox.stub().resolves({ results: [] }),
					};
				} else {
					return {
						bind: sandbox.stub().returns({
							first: sandbox.stub().resolves(null), // No cart found
						}),
					};
				}
			});

			await cartService.viewCart(c);

			expect(c.json.calledOnce).to.be.true;
			const responseArg = c.json.firstCall.args[0];
			expect(responseArg.success).to.be.true;
			expect(responseArg.cart).to.be.null;
		});

		it('should return cart from database when cache miss', async () => {
			const mockCart = {
				cart_id: 'cart_123',
				user_id: null,
				products: JSON.stringify([{ product_id: 'prod123', size: '10', quantity: 1, price: 1000 }]),
				address: null,
				status: 'active',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z',
			};

			c.env.CACHE.get.resolves(null);
			// findActiveCart for guest_session_id first calls all() for debugging, then bind().first() for lookup
			c.env.DB.prepare.onCall(0).returns({
				all: sandbox.stub().resolves({ results: [] }),
			});
			c.env.DB.prepare.onCall(1).returns({
				bind: sandbox.stub().returns({
					first: sandbox.stub().resolves(mockCart), // Cart found
				}),
			});
			c.env.CACHE.put.resolves();

			await cartService.viewCart(c);

			expect(c.json.calledOnce).to.be.true;
			const responseArg = c.json.firstCall.args[0];
			expect(responseArg.success).to.be.true;
			expect(responseArg.cart.cart_id).to.equal('cart_123');
		});

		it('should handle errors in catch block', async () => {
			c.env.CACHE.get.rejects(new Error('Cache error'));

			await cartService.viewCart(c);

			expect(c.json.calledWith({ success: false, error: 'Cache error' }, 500)).to.be.true;
		});
	});

	describe('verifyStock', () => {
		it('should verify stock for cart items', async () => {
			const mockCart = {
				cart_id: 'cart_123',
				products: JSON.stringify([{ product_id: 'prod123', size: '10', quantity: 1, sku: 'SKU123', name: 'Test' }]),
			};
			c.env.CACHE.get.resolves(null);
			c.env.DB.prepare.onCall(0).returns({
				bind: sandbox.stub().returns({
					first: sandbox.stub().resolves(mockCart),
				}),
			});
			c.env.DB.prepare.onCall(1).returns({
				all: sandbox.stub().resolves({ results: [] }),
			});
			c.env.FULFILLMENT_SERVICE.fetch.resolves(new Response(JSON.stringify({ success: true, total_stock: 5 }), { status: 200 }));

			await cartService.verifyStock(c);

			expect(c.json.calledOnce).to.be.true;
		});
	});

	describe('syncCart', () => {
		it('should sync cart items successfully', async () => {
			c.get.withArgs('user_id').returns('user123');
			c.req.json.resolves({ items: [{ product_id: 'prod123', size: '10', quantity: 1, sku: 'SKU123', name: 'Test', price: 1000 }] });
			c.env.DB.prepare.returns({
				bind: sandbox.stub().returns({
					first: sandbox.stub().resolves(null), // No existing cart
				}),
			});

			await cartService.syncCart(c);

			expect(c.json.calledOnce).to.be.true;
		});
	});

	describe('incrementQuantity', () => {
		it('should increment item quantity successfully', async () => {
			c.req.json.resolves({ product_id: 'prod123', size: '10' });
			const mockCart = { cart_id: 'cart_123', products: JSON.stringify([{ product_id: 'prod123', size: '10', quantity: 1 }]) };
			c.env.CACHE.get.resolves(null);
			c.env.DB.prepare.onCall(0).returns({
				bind: sandbox.stub().returns({
					first: sandbox.stub().resolves(mockCart),
				}),
			});
			c.env.DB.prepare.onCall(1).returns({
				bind: sandbox.stub().returns({
					run: sandbox.stub().resolves(),
				}),
			});

			await cartService.incrementQuantity(c);

			expect(c.json.calledOnce).to.be.true;
		});
	});

	describe('decrementQuantity', () => {
		it('should decrement item quantity successfully', async () => {
			c.req.json.resolves({ product_id: 'prod123', size: '10' });
			const mockCart = { cart_id: 'cart_123', products: JSON.stringify([{ product_id: 'prod123', size: '10', quantity: 2 }]) };
			c.env.DB.prepare.returns({
				bind: sandbox.stub().returns({
					first: sandbox.stub().resolves(mockCart),
				}),
			});

			await cartService.decrementQuantity(c);

			expect(c.json.calledOnce).to.be.true;
		});
	});

	describe('removeCartItem', () => {
		it('should remove cart item successfully', async () => {
			c.req.json.resolves({ product_id: 'prod123', size: '10' });
			const mockCart = { cart_id: 'cart_123', products: JSON.stringify([{ product_id: 'prod123', size: '10', quantity: 1 }]) };
			c.env.DB.prepare.returns({
				bind: sandbox.stub().returns({
					first: sandbox.stub().resolves(mockCart),
				}),
			});

			await cartService.removeCartItem(c);

			expect(c.json.calledOnce).to.be.true;
		});
	});

	describe('clearCart', () => {
		it('should clear cart successfully', async () => {
			c.env.DB.prepare.returns({
				bind: sandbox.stub().returns({
					run: sandbox.stub().resolves(),
				}),
			});

			await cartService.clearCart(c);

			expect(c.env.DB.prepare.called).to.be.true;
			expect(c.json.calledWith({ success: true })).to.be.true;
		});
	});

	describe('saveShippingAddress', () => {
		it('should save shipping address successfully', async () => {
			c.req.json.resolves({ line1: '123 Main St', city: 'City', state: 'State', postal_code: '12345', country: 'IN' });
			const mockCart = { cart_id: 'cart_123' };
			c.env.DB.prepare.returns({
				bind: sandbox.stub().returns({
					first: sandbox.stub().resolves(null),
					run: sandbox.stub().resolves(),
				}),
			});

			await cartService.saveShippingAddress(c);

			expect(c.json.calledOnce).to.be.true;
		});
	});

	describe('getCartSummary', () => {
		it('should get cart summary successfully', async () => {
			const mockCart = {
				cart_id: 'cart_123',
				products: JSON.stringify([{ product_id: 'prod123', size: '10', quantity: 1, price: 1000, sku: 'SKU123', name: 'Test' }]),
				address: JSON.stringify({ postal_code: '12345' }),
			};
			c.env.CACHE.get.resolves(null);
			c.env.DB.prepare.returns({
				bind: sandbox.stub().returns({
					first: sandbox.stub().resolves(mockCart),
				}),
			});
			c.env.FULFILLMENT_SERVICE.fetch.resolves(
				new Response(JSON.stringify({ success: true, delivery: { highest_tier: 'tier_1' } }), { status: 200 }),
			);

			await cartService.getCartSummary(c);

			expect(c.json.calledOnce).to.be.true;
		});
	});

	describe('placeOrder', () => {
		it('should place order successfully', async () => {
			c.req.json.resolves({ delivery_mode: 'standard', payment_status: 'pending' });
			const mockCart = {
				cart_id: 'cart_123',
				products: JSON.stringify([{ product_id: 'prod123', size: '10', quantity: 1, price: 1000, sku: 'SKU123' }]),
				address: JSON.stringify({ postal_code: '12345' }),
			};
			c.env.CACHE.get.resolves(null);
			c.env.DB.prepare.onCall(0).returns({
				bind: sandbox.stub().returns({
					first: sandbox.stub().resolves(mockCart),
				}),
			});
			c.env.FULFILLMENT_SERVICE.fetch.resolves(
				new Response(JSON.stringify({ success: true, fulfillment: { allocations: [] }, delivery: { highest_tier: 'tier_1' } }), {
					status: 200,
				}),
			);
			c.env.ORDER_SERVICE.fetch.resolves(new Response(JSON.stringify({ success: true }), { status: 200 }));
			c.env.DB.prepare.onCall(1).returns({
				bind: sandbox.stub().returns({
					run: sandbox.stub().resolves(),
				}),
			});

			await cartService.placeOrder(c);

			expect(c.json.calledOnce).to.be.true;
		});
	});
});
