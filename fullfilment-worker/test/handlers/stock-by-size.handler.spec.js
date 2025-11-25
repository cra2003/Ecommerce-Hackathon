import { expect } from 'chai';
import sinon from 'sinon';
import { stockBySizeHandler } from '../../src/handlers/stock-by-size.handler.js';

describe('Stock By Size Handler', () => {
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

	describe('stockBySizeHandler', () => {
		it('should return stock for product and size successfully', async () => {
			c.req.param.returns({ product_id: 'prod123', size: '10' });
			c.env.DB.prepare.returns({
				bind: sandbox.stub().returns({
					all: sandbox.stub().resolves({
						results: [{ size: '10', stock: 50, warehouse_id: 'wh_001' }],
					}),
				}),
			});

			await stockBySizeHandler(c);

			expect(c.env.DB.prepare.called).to.be.true;
			expect(c.json.calledOnce).to.be.true;
		});

		it('should return 404 when product not found for size', async () => {
			c.req.param.returns({ product_id: 'nonexistent', size: '10' });
			c.env.DB.prepare.returns({
				bind: sandbox.stub().returns({
					all: sandbox.stub().resolves({ results: [] }),
				}),
			});

			await stockBySizeHandler(c);

			expect(c.json.calledWith(sinon.match({ success: false }), 404)).to.be.true;
		});
	});
});
