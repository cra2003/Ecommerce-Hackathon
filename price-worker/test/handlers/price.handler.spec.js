import { expect } from 'chai';
import sinon from 'sinon';
import { getPriceHandler } from '../../src/handlers/price.handler.js';

describe('Price Handler', () => {
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
				PRICE_CACHE: {
					get: sandbox.stub(),
					put: sandbox.stub(),
				},
			},
			json: sandbox.stub().returnsThis(),
		};
	});

	afterEach(() => sandbox.restore());

	describe('getPriceHandler', () => {
		it('should call getPrice service with correct parameters', async () => {
			c.req.param.withArgs('sku').returns('P0001');
			c.req.query.withArgs('product_id').returns('prod123');

			// Stub the underlying dependencies that getPrice uses
			c.env.PRICE_CACHE.get.resolves(null);
			c.env.DB.prepare = sandbox.stub().returns({
				bind: sandbox.stub().returns({
					first: sandbox.stub().resolves({
						sku: 'P0001',
						product_id: 'prod123',
						base_price: 100,
						is_on_sale: 0,
						currency: 'INR',
					}),
				}),
			});
			c.env.PRICE_CACHE.put.resolves();

			await getPriceHandler(c);

			expect(c.req.param.calledWith('sku')).to.be.true;
			expect(c.req.query.calledWith('product_id')).to.be.true;
			expect(c.json.calledOnce).to.be.true;
		});

		it('should handle missing sku parameter', async () => {
			c.req.param.withArgs('sku').returns(null);

			await getPriceHandler(c);

			// Handler should still be called, service will handle error
			expect(c.req.param.calledWith('sku')).to.be.true;
		});
	});
});
