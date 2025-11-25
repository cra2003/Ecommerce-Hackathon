import { expect } from 'chai';
import sinon from 'sinon';
import * as externalApiService from '../../src/services/external-api.service.js';

describe('External API Service', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			env: {
				PRODUCTS_SERVICE: {
					fetch: sandbox.stub(),
				},
				PRICE_SERVICE: {
					fetch: sandbox.stub(),
				},
				FULFILLMENT_SERVICE: {
					fetch: sandbox.stub(),
				},
			},
		};
	});

	afterEach(() => sandbox.restore());

	describe('fetchProduct', () => {
		it('should fetch product from products service using service binding', async () => {
			c.env.PRODUCTS_SERVICE.fetch.resolves(
				new Response(JSON.stringify({ product_id: 'prod123', sku: 'SKU123', name: 'Test Product' }), { status: 200 }),
			);

			const result = await externalApiService.fetchProduct(c, 'prod123');

			expect(c.env.PRODUCTS_SERVICE.fetch.calledOnce).to.be.true;
			expect(result.product_id).to.equal('prod123');
			expect(result.sku).to.equal('SKU123');
		});
	});

	describe('fetchPrice', () => {
		it('should fetch price from price service using service binding', async () => {
			c.env.PRICE_SERVICE.fetch.resolves(new Response(JSON.stringify({ success: true, price: 1000, currency: 'INR' }), { status: 200 }));

			const result = await externalApiService.fetchPrice(c, 'SKU123', 'prod123');

			expect(c.env.PRICE_SERVICE.fetch.calledOnce).to.be.true;
			expect(result.success).to.be.true;
			expect(result.price).to.equal(1000);
		});
	});

	describe('checkStock', () => {
		it('should check stock from fulfillment service using service binding', async () => {
			c.env.FULFILLMENT_SERVICE.fetch.resolves(new Response(JSON.stringify({ success: true, total_stock: 5 }), { status: 200 }));

			const result = await externalApiService.checkStock(c, 'prod123', '10');

			expect(c.env.FULFILLMENT_SERVICE.fetch.calledOnce).to.be.true;
			expect(result.ok).to.be.true;
		});
	});

	describe('checkFulfillment', () => {
		it('should check fulfillment from fulfillment service using service binding', async () => {
			c.env.FULFILLMENT_SERVICE.fetch.resolves(
				new Response(JSON.stringify({ success: true, fulfillment: { allocations: [] } }), { status: 200 }),
			);

			const payload = { postal_code: '12345', product_id: 'prod123', size: '10', quantity: 1 };
			const result = await externalApiService.checkFulfillment(c, payload);

			expect(c.env.FULFILLMENT_SERVICE.fetch.calledOnce).to.be.true;
			expect(result.ok).to.be.true;
		});
	});

	describe('deductStock', () => {
		it('should deduct stock from fulfillment service using service binding', async () => {
			c.env.FULFILLMENT_SERVICE.fetch.resolves(new Response(JSON.stringify({ success: true }), { status: 200 }));

			const payload = { warehouse_id: 'WH1', product_id: 'prod123', size: '10', quantity: 1 };
			const result = await externalApiService.deductStock(c, payload);

			expect(c.env.FULFILLMENT_SERVICE.fetch.calledOnce).to.be.true;
			expect(result.ok).to.be.true;
		});
	});

	describe('restoreStock', () => {
		it('should restore stock from fulfillment service using service binding', async () => {
			c.env.FULFILLMENT_SERVICE.fetch.resolves(new Response(JSON.stringify({ success: true }), { status: 200 }));

			const payload = { warehouse_id: 'WH1', product_id: 'prod123', size: '10', quantity: 1 };
			const result = await externalApiService.restoreStock(c, payload);

			expect(c.env.FULFILLMENT_SERVICE.fetch.calledOnce).to.be.true;
			expect(result.ok).to.be.true;
		});
	});

	describe('acquireLocks', () => {
		it('should acquire locks from fulfillment service using service binding', async () => {
			c.env.FULFILLMENT_SERVICE.fetch.resolves(new Response(JSON.stringify({ success: true, locked: 2 }), { status: 200 }));

			const allocations = [{ warehouse_id: 'WH1', sku: 'SKU123', allocated_quantity: 1 }];
			const result = await externalApiService.acquireLocks(c, allocations, 'user123', null);

			expect(c.env.FULFILLMENT_SERVICE.fetch.calledOnce).to.be.true;
			expect(result.ok).to.be.true;
		});
	});

	describe('releaseLocks', () => {
		it('should release locks from fulfillment service using service binding', async () => {
			c.env.FULFILLMENT_SERVICE.fetch.resolves(new Response(JSON.stringify({ success: true, released: 2 }), { status: 200 }));

			const allocations = [{ warehouse_id: 'WH1', sku: 'SKU123', allocated_quantity: 1 }];
			const result = await externalApiService.releaseLocks(c, allocations, 'user123', null);

			expect(c.env.FULFILLMENT_SERVICE.fetch.calledOnce).to.be.true;
			expect(result.ok).to.be.true;
		});
	});
});
