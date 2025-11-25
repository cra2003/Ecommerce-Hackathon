import { expect } from 'chai';
import sinon from 'sinon';
import * as fulfillmentService from '../../src/services/fulfillment.service.js';

describe('Fulfillment Service', () => {
	let sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
	});

	afterEach(() => sandbox.restore());

	describe('allocateQuantityAcrossWarehouses', () => {
		it('should allocate quantity successfully', async () => {
			const priorityWarehouses = [{ warehouse_id: 'wh1' }, { warehouse_id: 'wh2' }];
			const inventoryMap = {
				wh1: { stock_for_size: 10, express_available: true },
				wh2: { stock_for_size: 5, express_available: false },
			};
			const kv = null; // No KV for this test
			const skuId = null;

			const result = await fulfillmentService.allocateQuantityAcrossWarehouses(priorityWarehouses, inventoryMap, '10', 8, kv, skuId);

			expect(result.allocations).to.be.an('array');
			expect(result.remainingQuantity).to.equal(0);
		});

		it('should handle insufficient stock', async () => {
			const priorityWarehouses = [{ warehouse_id: 'wh1' }];
			const inventoryMap = {
				wh1: { stock_for_size: 5, express_available: false },
			};

			const result = await fulfillmentService.allocateQuantityAcrossWarehouses(priorityWarehouses, inventoryMap, '10', 10, null, null);

			expect(result.remainingQuantity).to.be.greaterThan(0);
		});

		it('should check locked quantity when KV provided', async () => {
			const priorityWarehouses = [{ warehouse_id: 'wh1' }];
			const inventoryMap = {
				wh1: { stock_for_size: 10, express_available: true },
			};
			const kv = {
				get: sandbox.stub(),
			};

			// Stub KV to return locked quantity data
			// getLockedQuantity internally calls kv.get with { type: 'json' }
			// So we stub kv.get to return the parsed object
			kv.get.withArgs('lock:wh1:P0001-10', { type: 'json' }).resolves({ user1: 3 });
			kv.get.resolves({ user1: 3 }); // Fallback for any other calls

			const result = await fulfillmentService.allocateQuantityAcrossWarehouses(priorityWarehouses, inventoryMap, '10', 5, kv, 'P0001-10');

			expect(kv.get.called).to.be.true;
			expect(result.allocations.length).to.be.greaterThan(0);
			// Available stock should be 10 - 3 = 7, so 5 should fit
			expect(result.remainingQuantity).to.equal(0);
		});
	});

	describe('determineHighestTier', () => {
		it('should return highest tier from allocations', () => {
			const allocations = [{ tier: 'tier_1' }, { tier: 'tier_3' }, { tier: 'tier_2' }];

			const highestTier = fulfillmentService.determineHighestTier(allocations);

			expect(highestTier).to.equal('tier_3');
		});
	});
});
