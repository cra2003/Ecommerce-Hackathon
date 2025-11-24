import { expect } from 'chai';
import sinon from 'sinon';
import * as priceService from '../../src/services/price.service.js';
import * as priceModel from '../../src/models/price.model.js';
import * as cacheService from '../../src/services/cache.service.js';

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
				DB: {},
			},
			json: sandbox.stub().returnsThis(),
		};
	});

	afterEach(() => sandbox.restore());

	describe('getPrice', () => {
		it('should return price from cache', async () => {
			c.req.param.withArgs('sku').returns('P0001');
			c.req.query.withArgs('product_id').returns('prod123');

			const cachedPrice = { success: true, price: 100 };
			sandbox.stub(cacheService, 'getCachedPrice').resolves(cachedPrice);

			await priceService.getPrice(c, 'P0001', 'prod123');

			expect(cacheService.getCachedPrice.calledOnce).to.be.true;
			expect(c.json.calledWith(cachedPrice)).to.be.true;
		});

		it('should return price from database', async () => {
			c.req.param.withArgs('sku').returns('P0001');
			c.req.query.withArgs('product_id').returns('prod123');

			const dbPrice = {
				sku: 'P0001',
				product_id: 'prod123',
				base_price: 100,
				sale_price: null,
				is_on_sale: 0,
				currency: 'INR',
			};

			sandbox.stub(cacheService, 'getCachedPrice').resolves(null);
			sandbox.stub(priceModel, 'getPriceBySkuAndProductId').resolves(dbPrice);
			sandbox.stub(cacheService, 'setCachedPrice').resolves();

			await priceService.getPrice(c, 'P0001', 'prod123');

			expect(priceModel.getPriceBySkuAndProductId.calledOnce).to.be.true;
		});

		it('should return 404 for price not found', async () => {
			c.req.param.withArgs('sku').returns('INVALID');

			sandbox.stub(cacheService, 'getCachedPrice').resolves(null);
			sandbox.stub(priceModel, 'getPriceBySku').resolves(null);

			await priceService.getPrice(c, 'INVALID');

			expect(c.json.calledWith(sinon.match({ success: false, error: 'Price not found' }), 404)).to.be.true;
		});
	});
});
