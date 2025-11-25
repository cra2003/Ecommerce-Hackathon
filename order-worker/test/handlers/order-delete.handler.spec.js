import { expect } from 'chai';
import sinon from 'sinon';
import { deleteOrderHandler } from '../../src/handlers/order-delete.handler.js';

describe('Order Delete Handler', () => {
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

	describe('deleteOrderHandler', () => {
		it('should handle delete order request', async () => {
			c.req.param.withArgs('id').returns('order123');

			// Stub order user_id check
			c.env.DB.prepare.onCall(0).returns({
				bind: sandbox.stub().returns({
					first: sandbox.stub().resolves({ user_id: 'user123' }),
				}),
			});

			// Stub order delete
			c.env.DB.prepare.onCall(1).returns({
				bind: sandbox.stub().returns({
					run: sandbox.stub().resolves(),
				}),
			});

			await deleteOrderHandler(c);

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

			await deleteOrderHandler(c);

			expect(c.json.calledWith(sinon.match({ error: 'Order not found' }), 404)).to.be.true;
		});
	});
});
