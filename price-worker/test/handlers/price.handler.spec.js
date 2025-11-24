import { expect } from 'chai';
import sinon from 'sinon';
import { getPriceHandler } from '../../src/handlers/price.handler.js';
import * as priceService from '../../src/services/price.service.js';

describe('Price Handler', () => {
  let c, sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    c = {
      req: {
        param: sandbox.stub(),
        query: sandbox.stub()
      },
      env: {
        DB: {}
      },
      json: sandbox.stub().returnsThis()
    };
  });

  afterEach(() => sandbox.restore());

  describe('getPriceHandler', () => {
    it('should return price successfully', async () => {
      c.req.param.withArgs('sku').returns('P0001');
      c.req.query.withArgs('product_id').returns('prod123');
      
      const fakePrice = { price: 100, is_on_sale: false, discount_percentage: null };
      sandbox.stub(priceService, 'getPrice').resolves(c.json({ success: true, ...fakePrice }));

      await getPriceHandler(c);

      expect(priceService.getPrice.calledOnce).to.be.true;
    });

    it('should handle price not found', async () => {
      c.req.param.withArgs('sku').returns('INVALID');
      sandbox.stub(priceService, 'getPrice').resolves(c.json({ success: false, error: 'Price not found' }, 404));

      await getPriceHandler(c);

      expect(priceService.getPrice.calledOnce).to.be.true;
    });
  });
});

