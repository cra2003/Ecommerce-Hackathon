import { expect } from 'chai';
import sinon from 'sinon';
import { getOrderHandler } from '../../src/handlers/order-single.handler.js';

describe('Order Single Handler', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			get: sandbox.stub().returns('user123'),
			req: {
				param: sandbox.stub(),
			},
			env: {
				DB: {
					prepare: sandbox.stub(),
				},
				LOGS: {
					put: sandbox.stub().resolves(),
				},
			},
			json: sandbox.stub().returnsThis(),
		};
	});

	afterEach(() => sandbox.restore());

	describe('getOrderHandler', () => {
		it('should handle get order request', async () => {
			c.req.param.withArgs('id').returns('order123');

			// Stub order lookup
			c.env.DB.prepare.onCall(0).returns({
				bind: sandbox.stub().returns({
					first: sandbox.stub().resolves({ order_id: 'order123', total: 100 }),
				}),
			});

			// Stub order items
			c.env.DB.prepare.onCall(1).returns({
				bind: sandbox.stub().returns({
					all: sandbox.stub().resolves({ results: [{ product_id: 'prod1', quantity: 1 }] }),
				}),
			});

			await getOrderHandler(c);

			expect(c.get.calledWith('user_id')).to.be.true;
			expect(c.req.param.calledWith('id')).to.be.true;
			expect(c.json.calledOnce).to.be.true;
		});

		it('should return 404 when order not found', async () => {
			c.req.param.withArgs('id').returns('nonexistent');
			c.env.DB.prepare.returns({
				bind: sandbox.stub().returns({
					first: sandbox.stub().resolves(null),
				}),
			});

			await getOrderHandler(c);

			expect(c.json.calledWith(sinon.match({ error: 'Order not found' }), 404)).to.be.true;
		});
	});
});
