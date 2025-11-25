import { expect } from 'chai';
import sinon from 'sinon';
import { stockRestoreHandler } from '../../src/handlers/stock-restore.handler.js';

describe('Stock Restore Handler', () => {
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

	describe('stockRestoreHandler', () => {
		it('should handle stock restoration request', async () => {
			c.req.json.resolves({
				product_id: 'prod123',
				size: '10',
				quantity: 5,
				warehouse_id: 'wh_001',
			});

			await stockRestoreHandler(c);

			expect(c.req.json.calledOnce).to.be.true;
		});
	});
});

