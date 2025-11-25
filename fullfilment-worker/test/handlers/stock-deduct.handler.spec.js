import { expect } from 'chai';
import sinon from 'sinon';
import { stockDeductHandler } from '../../src/handlers/stock-deduct.handler.js';

describe('Stock Deduct Handler', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			req: {
				json: sandbox.stub(),
			},
			env: {
				DB: {},
			},
			json: sandbox.stub().returnsThis(),
		};
	});

	afterEach(() => sandbox.restore());

	describe('stockDeductHandler', () => {
		it('should handle stock deduction request', async () => {
			c.req.json.resolves({
				product_id: 'prod123',
				size: '10',
				quantity: 5,
				warehouse_id: 'wh_001',
			});

			await stockDeductHandler(c);

			expect(c.req.json.calledOnce).to.be.true;
		});
	});
});
