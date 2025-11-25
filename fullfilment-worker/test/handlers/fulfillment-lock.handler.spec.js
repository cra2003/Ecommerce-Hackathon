import { expect } from 'chai';
import sinon from 'sinon';
import { fulfillmentLockHandler, fulfillmentUnlockHandler } from '../../src/handlers/fulfillment-lock.handler.js';

describe('Fulfillment Lock Handler', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			req: {
				json: sandbox.stub(),
				param: sandbox.stub(),
			},
			env: {
				INVENTORY_LOCKS: {
					get: sandbox.stub(),
					put: sandbox.stub().resolves(),
				},
				LOCKS: {
					get: sandbox.stub(),
					put: sandbox.stub().resolves(),
				},
				LOGS: {
					put: sandbox.stub().resolves(),
				},
			},
			json: sandbox.stub().returnsThis(),
		};
	});

	afterEach(() => sandbox.restore());

	describe('fulfillmentLockHandler', () => {
		it('should handle lock acquisition request', async () => {
			c.req.json.resolves({
				allocations: [
					{
						warehouse_id: 'wh_001',
						sku: 'P0001-10',
						allocated_quantity: 2,
					},
				],
				user_id: 'user123',
			});

			// Stub KV to return no existing locks
			c.env.LOCKS.get.resolves(null);
			c.env.LOCKS.put.resolves();

			await fulfillmentLockHandler(c);

			expect(c.req.json.calledOnce).to.be.true;
			expect(c.json.calledOnce).to.be.true;
		});
	});

	describe('fulfillmentUnlockHandler', () => {
		it('should handle lock release request', async () => {
			c.req.json.resolves({
				allocations: [
					{
						warehouse_id: 'wh_001',
						sku: 'P0001-10',
					},
				],
				user_id: 'user123',
			});

			// Stub KV operations
			c.env.LOCKS.get.resolves({ user123: 2 });
			c.env.LOCKS.put.resolves();

			await fulfillmentUnlockHandler(c);

			expect(c.req.json.calledOnce).to.be.true;
			expect(c.json.calledOnce).to.be.true;
		});
	});
});
