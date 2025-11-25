import { expect } from 'chai';
import sinon from 'sinon';
import { internalOrderCreateHandler } from '../../src/handlers/internal-order.handler.js';

describe('Internal Order Handler', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			req: {
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

	describe('internalOrderCreateHandler', () => {
		it('should handle internal order creation request', async () => {
			c.req.json.resolves({
				order_id: 'order123',
				user_id: 'user123',
				products: [],
				address: {},
				delivery_mode: 'standard',
				delivery_tier: 'tier_1',
				total: 100,
			});

			c.env.DB.prepare.returns({
				bind: sandbox.stub().returns({
					run: sandbox.stub().resolves(),
				}),
			});

			await internalOrderCreateHandler(c);

			expect(c.req.json.calledOnce).to.be.true;
			expect(c.json.calledOnce).to.be.true;
		});

		it('should return 400 for missing required fields', async () => {
			c.req.json.resolves({
				order_id: 'order123',
				// Missing required fields
			});

			await internalOrderCreateHandler(c);

			expect(c.json.calledWith(sinon.match({ success: false, error: 'Missing required fields' }), 400)).to.be.true;
		});
	});
});
