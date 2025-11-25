import { expect } from 'chai';
import sinon from 'sinon';
import { updateOrderHandler } from '../../src/handlers/order-update.handler.js';

describe('Order Update Handler', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			get: sandbox.stub().returns('user123'),
			req: {
				param: sandbox.stub(),
				json: sandbox.stub(),
			},
			env: {
				DB: {
					prepare: sandbox.stub(),
				},
				CACHE: {
					delete: sandbox.stub().resolves(),
				},
				LOGS: {
					put: sandbox.stub().resolves(),
				},
			},
			json: sandbox.stub().returnsThis(),
		};
	});

	afterEach(() => sandbox.restore());

	describe('updateOrderHandler', () => {
		it('should handle update order request', async () => {
			c.req.param.withArgs('id').returns('order123');
			c.req.json.resolves({ status: 'shipped', address: { street: 'New St' } });

			// Stub getOrderUserId
			c.env.DB.prepare.onCall(0).returns({
				bind: sandbox.stub().returns({
					first: sandbox.stub().resolves({ user_id: 'user123' }),
				}),
			});

			// Stub updateOrder
			c.env.DB.prepare.onCall(1).returns({
				bind: sandbox.stub().returns({
					run: sandbox.stub().resolves(),
				}),
			});

			await updateOrderHandler(c);

			expect(c.req.param.calledWith('id')).to.be.true;
			expect(c.req.json.calledOnce).to.be.true;
			expect(c.json.calledOnce).to.be.true;
		});
	});
});
