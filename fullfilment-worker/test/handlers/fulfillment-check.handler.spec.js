import { expect } from 'chai';
import sinon from 'sinon';
import { fulfillmentCheckHandler } from '../../src/handlers/fulfillment-check.handler.js';

describe('Fulfillment Check Handler', () => {
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
				LOCKS: null,
				LOGS: {
					put: sandbox.stub().resolves(),
				},
			},
			json: sandbox.stub().returnsThis(),
		};
	});

	afterEach(() => sandbox.restore());

	describe('fulfillmentCheckHandler', () => {
		it('should check fulfillment successfully', async () => {
			const checkData = {
				postal_code: '110001',
				product_id: 'prod123',
				size: '10',
				quantity: 1,
			};
			c.req.json.resolves(checkData);

			// Stub DB to return postal mappings
			const fakeMappings = [
				{
					start_postal_code: '110000',
					end_postal_code: '110099',
					region_name: 'Delhi',
					warehouses: '["wh_001"]',
				},
			];

			c.env.DB.prepare.onCall(0).returns({
				all: sandbox.stub().resolves({ results: fakeMappings }),
			});

			// Stub inventory query
			c.env.DB.prepare.onCall(1).returns({
				bind: sandbox.stub().returns({
					all: sandbox.stub().resolves({
						results: [
							{
								warehouse_id: 'wh_001',
								size: '10',
								stock: 10,
								express_warehouses: '["wh_001"]',
							},
						],
					}),
				}),
			});

			// Stub delivery cost query
			c.env.DB.prepare.onCall(2).returns({
				bind: sandbox.stub().returns({
					all: sandbox.stub().resolves({
						results: [
							{
								tier_name: 'tier_1',
								standard_delivery_cost: 50,
								express_delivery_cost: 100,
							},
						],
					}),
				}),
			});

			await fulfillmentCheckHandler(c);

			expect(c.env.DB.prepare.called).to.be.true;
			expect(c.json.calledOnce).to.be.true;
		});

		it('should return 400 for missing fields', async () => {
			c.req.json.resolves({ postal_code: '110001' });

			await fulfillmentCheckHandler(c);

			expect(c.json.calledWith(sinon.match({ success: false, error: sinon.match.string }), 400)).to.be.true;
		});

		it('should return 404 for no warehouse coverage', async () => {
			c.req.json.resolves({
				postal_code: '999999',
				product_id: 'prod123',
				size: '10',
				quantity: 1,
			});

			c.env.DB.prepare.returns({
				all: sandbox.stub().resolves({ results: [] }),
			});

			await fulfillmentCheckHandler(c);

			expect(c.json.calledWith(sinon.match({ success: false, error: sinon.match.string }), 404)).to.be.true;
		});
	});
});
