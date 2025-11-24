import { expect } from 'chai';
import sinon from 'sinon';
import { listProductsHandler, getProductHandler } from '../../src/handlers/products.handler.js';
import * as productService from '../../src/services/product.service.js';

describe('Products Handler', () => {
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

  describe('listProductsHandler', () => {
    it('should return products list successfully', async () => {
      c.req.query.returns({ page: '1', limit: '10' });
      
      const fakeProducts = {
        products: [{ product_id: 'prod1', name: 'Product 1' }],
        pagination: { page: 1, totalPages: 1 }
      };
      sandbox.stub(productService, 'listProducts').resolves(c.json(fakeProducts));

      await listProductsHandler(c);

      expect(productService.listProducts.calledOnce).to.be.true;
    });
  });

  describe('getProductHandler', () => {
    it('should return product by ID successfully', async () => {
      c.req.param.withArgs('id').returns('prod123');
      
      const fakeProduct = { product_id: 'prod123', name: 'Product 1' };
      sandbox.stub(productService, 'getProduct').resolves(c.json(fakeProduct));

      await getProductHandler(c);

      expect(productService.getProduct.calledOnce).to.be.true;
    });

    it('should handle product not found', async () => {
      c.req.param.withArgs('id').returns('nonexistent');
      sandbox.stub(productService, 'getProduct').resolves(c.json({ error: 'Product not found' }, 404));

      await getProductHandler(c);

      expect(productService.getProduct.calledOnce).to.be.true;
    });
  });
});

