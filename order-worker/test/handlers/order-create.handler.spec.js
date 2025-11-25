import { expect } from 'chai';
import sinon from 'sinon';
import { createOrderHandler } from '../../src/handlers/order-create.handler.js';

describe('Order Create Handler', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			get: sandbox.stub().returns('user123'),
			req: {
				json: sandbox.stub(),
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

	describe('createOrderHandler', () => {
		it('should handle create order request', async () => {
			c.req.json.resolves({ address: { street: '123 Main St' }, delivery_mode: 'standard' });

			// Stub cart lookup
			c.env.DB.prepare.onCall(0).returns({
				bind: sandbox.stub().returns({
					first: sandbox.stub().resolves({ cart_id: 'cart123' }),
				}),
			});

			// Stub cart items
			c.env.DB.prepare.onCall(1).returns({
				bind: sandbox.stub().returns({
					all: sandbox.stub().resolves({ results: [{ product_id: 'prod1', quantity: 1, price: 100 }] }),
				}),
			});

			// Stub order insert
			c.env.DB.prepare.onCall(2).returns({
				bind: sandbox.stub().returns({
					run: sandbox.stub().resolves({ meta: { last_row_id: 1 }, lastInsertRowid: 1 }),
				}),
			});

			// Stub order item insert and stock reduction (multiple calls)
			c.env.DB.prepare.returns({
				bind: sandbox.stub().returns({
					run: sandbox.stub().resolves(),
				}),
			});

			await createOrderHandler(c);

			expect(c.get.calledWith('user_id')).to.be.true;
			expect(c.req.json.calledOnce).to.be.true;
			expect(c.json.calledOnce).to.be.true;
		});

		it('should return 404 when no cart found', async () => {
			c.req.json.resolves({ address: { street: '123 Main St' } });
			c.env.DB.prepare.returns({
				bind: sandbox.stub().returns({
					first: sandbox.stub().resolves(null),
				}),
			});

			await createOrderHandler(c);

			expect(c.json.calledWith(sinon.match({ error: 'No active cart found' }), 404)).to.be.true;
		});
	});
});
