import { expect } from 'chai';
import sinon from 'sinon';
import { listOrdersHandler } from '../../src/handlers/order-list.handler.js';

describe('Order List Handler', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			get: sandbox.stub().returns('user123'),
			req: {
				query: sandbox.stub(),
			},
			env: {
				DB: {
					prepare: sandbox.stub(),
				},
				CACHE: {
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

	describe('listOrdersHandler', () => {
		it('should handle list orders request', async () => {
			c.env.CACHE.get.resolves(null);
			c.env.DB.prepare.returns({
				bind: sandbox.stub().returns({
					all: sandbox.stub().resolves({ results: [{ order_id: 'order1' }] }),
				}),
			});

			await listOrdersHandler(c);

			expect(c.get.calledWith('user_id')).to.be.true;
			expect(c.env.DB.prepare.called).to.be.true;
			expect(c.json.calledOnce).to.be.true;
		});

		it('should return cached orders when available', async () => {
			const cachedOrders = { orders: [{ order_id: 'order1' }] };
			c.env.CACHE.get.resolves(JSON.stringify(cachedOrders));

			await listOrdersHandler(c);

			expect(c.env.CACHE.get.calledOnce).to.be.true;
			expect(c.json.calledOnce).to.be.true;
		});
	});
});
