import { expect } from 'chai';
import sinon from 'sinon';
import * as priceService from '../../src/services/price.service.js';

describe('Price Service', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			req: {
				param: sandbox.stub(),
				query: sandbox.stub(),
			},
			env: {
				DB: {
					prepare: sandbox.stub(),
				},
				PRICE_CACHE: {
					get: sandbox.stub(),
					put: sandbox.stub(),
				},
			},
			json: sandbox.stub().returnsThis(),
		};
	});

	afterEach(() => sandbox.restore());

	describe('getPrice', () => {
		it('should return price from cache', async () => {
			const cachedPrice = { success: true, price: 100 };
			c.env.PRICE_CACHE.get.resolves(JSON.stringify(cachedPrice));

			await priceService.getPrice(c, 'P0001', 'prod123');

			expect(c.env.PRICE_CACHE.get.calledOnce).to.be.true;
			expect(c.json.calledOnce).to.be.true;
		});

		it('should return price from database when cache miss', async () => {
			const dbPrice = {
				sku: 'P0001',
				product_id: 'prod123',
				base_price: 100,
				sale_price: null,
				is_on_sale: 0,
				currency: 'INR',
			};

			c.env.PRICE_CACHE.get.resolves(null);
			c.env.DB.prepare.returns({
				bind: sandbox.stub().returns({
					first: sandbox.stub().resolves(dbPrice),
				}),
			});
			c.env.PRICE_CACHE.put.resolves();

			await priceService.getPrice(c, 'P0001', 'prod123');

			expect(c.env.PRICE_CACHE.get.calledOnce).to.be.true;
			expect(c.env.DB.prepare.called).to.be.true;
			expect(c.json.calledOnce).to.be.true;
		});

		it('should return 404 for price not found', async () => {
			c.env.PRICE_CACHE.get.resolves(null);
			c.env.DB.prepare.returns({
				bind: sandbox.stub().returns({
					first: sandbox.stub().resolves(null),
				}),
			});

			await priceService.getPrice(c, 'INVALID');

			expect(c.json.calledWith(sinon.match({ success: false, error: 'Price not found' }), 404)).to.be.true;
		});
	});
});
