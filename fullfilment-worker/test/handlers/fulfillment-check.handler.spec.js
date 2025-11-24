import { expect } from 'chai';
import sinon from 'sinon';
import { fulfillmentCheckHandler } from '../../src/handlers/fulfillment-check.handler.js';
import * as postalMapService from '../../src/services/postal-map.service.js';
import * as inventoryService from '../../src/services/inventory.service.js';
import * as fulfillmentService from '../../src/services/fulfillment.service.js';

describe('Fulfillment Check Handler', () => {
  let c, sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    c = {
      req: {
        json: sandbox.stub()
      },
      env: {
        DB: {},
        LOCKS: null
      },
      json: sandbox.stub().returnsThis()
    };
  });

  afterEach(() => sandbox.restore());

  describe('fulfillmentCheckHandler', () => {
    it('should check fulfillment successfully', async () => {
      const checkData = {
        postal_code: '110001',
        product_id: 'prod123',
        size: '10',
        quantity: 1
      };
      c.req.json.resolves(checkData);

      const fakeMappings = [{ start_postal_code: '110000', end_postal_code: '110099', region_name: 'Delhi' }];
      const fakeInventory = [{ warehouse_id: 'wh1', stock_for_size: 10, sku: 'P0001-10' }];
      const fakeAllocations = [{ warehouse_id: 'wh1', allocated_quantity: 1, tier: 'tier_1' }];

      sandbox.stub(postalMapService, 'getAllPostalMappings').resolves(fakeMappings);
      sandbox.stub(postalMapService, 'findMatchedMapping').returns(fakeMappings[0]);
      sandbox.stub(postalMapService, 'getPriorityWarehouses').returns([{ warehouse_id: 'wh1' }]);
      sandbox.stub(inventoryService, 'getInventoryByProductAndWarehouses').resolves(fakeInventory);
      sandbox.stub(inventoryService, 'parseInventoryToStockMap').returns({ wh1: 10 });
      sandbox.stub(fulfillmentService, 'allocateQuantityAcrossWarehouses').resolves({
        allocations: fakeAllocations,
        remainingQuantity: 0,
        anyExpressAvailable: true
      });
      sandbox.stub(fulfillmentService, 'determineHighestTier').returns('tier_1');

      await fulfillmentCheckHandler(c);

      expect(postalMapService.getAllPostalMappings.calledOnce).to.be.true;
    });

    it('should return 400 for missing fields', async () => {
      c.req.json.resolves({ postal_code: '110001' });

      await fulfillmentCheckHandler(c);

      expect(c.json.calledWith(
        sinon.match({ success: false, error: sinon.match.string }),
        400
      )).to.be.true;
    });

    it('should return 404 for no warehouse coverage', async () => {
      c.req.json.resolves({
        postal_code: '999999',
        product_id: 'prod123',
        size: '10',
        quantity: 1
      });

      sandbox.stub(postalMapService, 'getAllPostalMappings').resolves([]);
      sandbox.stub(postalMapService, 'findMatchedMapping').returns(null);

      await fulfillmentCheckHandler(c);

      expect(c.json.calledWith(
        sinon.match({ success: false, error: sinon.match.string }),
        404
      )).to.be.true;
    });
  });
});

