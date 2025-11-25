import { expect } from 'chai';
import sinon from 'sinon';
import { stockByProductHandler } from '../../src/handlers/stock-by-product.handler.js';

describe('Stock By Product Handler', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			req: {
				param: sandbox.stub(),
			},
			env: {
				DB: {
					prepare: sandbox.stub(),
				},
			},
			json: sandbox.stub().returnsThis(),
		};
	});

	afterEach(() => sandbox.restore());

	describe('stockByProductHandler', () => {
		it('should return aggregated stock for product successfully', async () => {
			c.req.param.returns({ product_id: 'prod123' });
			c.env.DB.prepare.onCall(0).returns({
				bind: sandbox.stub().returns({
					all: sandbox.stub().resolves({
						results: [
							{ size: '10', stock: 50 },
							{ size: '11', stock: 30 },
						],
					}),
				}),
			});
			c.env.DB.prepare.onCall(1).returns({
				all: sandbox.stub().resolves({ results: [] }),
			});

			await stockByProductHandler(c);

			expect(c.env.DB.prepare.called).to.be.true;
			expect(c.json.calledOnce).to.be.true;
		});
	});
});
