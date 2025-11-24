import { expect } from 'chai';
import sinon from 'sinon';
import * as fulfillmentService from '../../src/services/fulfillment.service.js';
import * as lockService from '../../src/services/inventory-lock.service.js';

describe('Fulfillment Service', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => sandbox.restore());

  describe('allocateQuantityAcrossWarehouses', () => {
    it('should allocate quantity successfully', async () => {
      const priorityWarehouses = [
        { warehouse_id: 'wh1' },
        { warehouse_id: 'wh2' }
      ];
      const inventoryMap = {
        wh1: { stock_for_size: 10, express_available: true },
        wh2: { stock_for_size: 5, express_available: false }
      };
      const kv = null; // No KV for this test
      const skuId = null;

      const result = await fulfillmentService.allocateQuantityAcrossWarehouses(
        priorityWarehouses,
        inventoryMap,
        '10',
        8,
        kv,
        skuId
      );

      expect(result.allocations).to.be.an('array');
      expect(result.remainingQuantity).to.equal(0);
    });

    it('should handle insufficient stock', async () => {
      const priorityWarehouses = [{ warehouse_id: 'wh1' }];
      const inventoryMap = {
        wh1: { stock_for_size: 5, express_available: false }
      };

      const result = await fulfillmentService.allocateQuantityAcrossWarehouses(
        priorityWarehouses,
        inventoryMap,
        '10',
        10,
        null,
        null
      );

      expect(result.remainingQuantity).to.be.greaterThan(0);
    });

    it('should check locked quantity when KV provided', async () => {
      const priorityWarehouses = [{ warehouse_id: 'wh1' }];
      const inventoryMap = {
        wh1: { stock_for_size: 10, express_available: true }
      };
      const kv = {
        get: sandbox.stub().resolves(JSON.stringify({ user1: 3 }))
      };

      sandbox.stub(lockService, 'getLockedQuantity').resolves(3);

      const result = await fulfillmentService.allocateQuantityAcrossWarehouses(
        priorityWarehouses,
        inventoryMap,
        '10',
        5,
        kv,
        'P0001-10'
      );

      expect(lockService.getLockedQuantity.calledOnce).to.be.true;
      expect(result.allocations.length).to.be.greaterThan(0);
    });
  });

  describe('determineHighestTier', () => {
    it('should return highest tier from allocations', () => {
      const allocations = [
        { tier: 'tier_1' },
        { tier: 'tier_3' },
        { tier: 'tier_2' }
      ];

      const highestTier = fulfillmentService.determineHighestTier(allocations);

      expect(highestTier).to.equal('tier_3');
    });
  });
});

