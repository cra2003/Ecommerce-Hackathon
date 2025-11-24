import { expect } from 'chai';
import sinon from 'sinon';
import * as productService from '../../src/services/product.service.js';
import * as productModel from '../../src/models/product.model.js';
import * as cacheService from '../../src/services/cache.service.js';

describe('Product Service', () => {
  let c, sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    c = {
      req: {
        param: sandbox.stub(),
        query: sandbox.stub(),
        header: sandbox.stub()
      },
      env: {
        DB: {}
      },
      json: sandbox.stub().returnsThis()
    };
  });

  afterEach(() => sandbox.restore());

  describe('listProducts', () => {
    it('should return products list successfully', async () => {
      c.req.query.withArgs('page').returns('1');
      c.req.query.withArgs('limit').returns('10');
      c.env.DB = {
        prepare: sandbox.stub().returns({
          bind: sandbox.stub().returns({
            first: sandbox.stub().resolves({ total: 10 }),
            all: sandbox.stub().resolves({ results: [{ product_id: 'prod1', name: 'Product 1' }] })
          })
        })
      };

      await productService.listProducts(c);

      expect(c.env.DB.prepare.called).to.be.true;
    });
  });

  describe('getProduct', () => {
    it('should return product by ID successfully', async () => {
      c.req.param.withArgs('id').returns('prod123');
      c.env.DB = {
        prepare: sandbox.stub().returns({
          bind: sandbox.stub().returns({
            all: sandbox.stub().resolves({ results: [{ product_id: 'prod123', name: 'Product 1' }] })
          })
        })
      };
      sandbox.stub(cacheService, 'getCached').resolves(null);

      await productService.getProduct(c);

      expect(c.env.DB.prepare.called).to.be.true;
    });

    it('should return 404 for product not found', async () => {
      c.req.param.withArgs('id').returns('nonexistent');
      c.env.DB = {
        prepare: sandbox.stub().returns({
          bind: sandbox.stub().returns({
            all: sandbox.stub().resolves({ results: [] })
          })
        })
      };
      sandbox.stub(cacheService, 'getCached').resolves(null);

      await productService.getProduct(c);

      expect(c.json.calledWith({ error: 'Product not found' }, 404)).to.be.true;
    });
  });
});

