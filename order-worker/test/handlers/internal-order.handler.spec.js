import { expect } from 'chai';
import sinon from 'sinon';
import { internalOrderCreateHandler } from '../../src/handlers/internal-order.handler.js';
import * as orderService from '../../src/services/order.service.js';

describe('Internal Order Create Handler', () => {
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

	describe('internalOrderCreateHandler', () => {
		it('should create order successfully', async () => {
			const orderData = {
				order_id: 'ord123',
				user_id: 'user123',
				products: '[]',
				address: '{}',
				delivery_mode: 'standard',
				delivery_tier: 'tier_1',
				subtotal: 100,
				delivery_cost: 10,
				tax: 10,
				total: 120,
			};
			c.req.json.resolves(orderData);

			sandbox.stub(orderService, 'insertOrder').resolves();
			sandbox.stub(orderService, 'invalidateCache').resolves();
			sandbox.stub(orderService, 'logEvent').resolves();

			await internalOrderCreateHandler(c);

			expect(orderService.insertOrder.calledOnce).to.be.true;
			expect(c.json.calledWith({ success: true, order_id: 'ord123' })).to.be.true;
		});

		it('should return 400 for missing required fields', async () => {
			c.req.json.resolves({ order_id: 'ord123' });

			await internalOrderCreateHandler(c);

			expect(c.json.calledWith({ success: false, error: 'Missing required fields' }, 400)).to.be.true;
		});

		it('should return 400 for missing user_id and guest_session_id', async () => {
			c.req.json.resolves({
				order_id: 'ord123',
				products: '[]',
				address: '{}',
				delivery_mode: 'standard',
				delivery_tier: 'tier_1',
				total: 120,
			});

			await internalOrderCreateHandler(c);

			expect(c.json.calledWith(sinon.match({ success: false, error: sinon.match.string }), 400)).to.be.true;
		});
	});
});
