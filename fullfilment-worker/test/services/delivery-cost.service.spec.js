import { expect } from 'chai';
import sinon from 'sinon';
import * as deliveryCostService from '../../src/services/delivery-cost.service.js';

describe('Delivery Cost Service', () => {
	let db, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		db = {
			prepare: sandbox.stub(),
		};
	});

	afterEach(() => sandbox.restore());

	describe('getDeliveryCostsForTiers', () => {
		it('should return delivery costs for tiers', async () => {
			const mockCosts = [
				{ tier_name: 'Tier1', standard_delivery_cost: 50 },
			];
			db.prepare.returns({
				bind: sandbox.stub().returns({
					all: sandbox.stub().resolves({ results: mockCosts }),
				}),
			});

			const result = await deliveryCostService.getDeliveryCostsForTiers(db, ['Tier1']);

			expect(db.prepare.called).to.be.true;
			expect(result).to.deep.equal(mockCosts);
		});
	});
});

