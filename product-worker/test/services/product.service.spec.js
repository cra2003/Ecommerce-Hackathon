import { expect } from 'chai';
import sinon from 'sinon';
import * as productService from '../../src/services/product.service.js';

describe('Product Service', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			req: {
				param: sandbox.stub(),
				query: sandbox.stub(),
				header: sandbox.stub(),
				json: sandbox.stub(),
				formData: sandbox.stub(),
				addTraceLog: sandbox.stub(),
			},
			env: {
				DB: {
					prepare: sandbox.stub(),
				},
				'product-cache': {
					get: sandbox.stub(),
					put: sandbox.stub(),
					delete: sandbox.stub(),
				},
			},
			json: sandbox.stub().returnsThis(),
		};
	});

	afterEach(() => sandbox.restore());

	describe('listProducts', () => {
		it('should return products list successfully', async () => {
			c.req.query.withArgs('page').returns('1');
			c.req.query.withArgs('limit').returns('10');
			c.env.DB.prepare.onCall(0).returns({
				bind: sandbox.stub().returns({
					first: sandbox.stub().resolves({ total: 10 }),
				}),
			});
			c.env.DB.prepare.onCall(1).returns({
				bind: sandbox.stub().returns({
					all: sandbox.stub().resolves({ results: [{ product_id: 'prod1', name: 'Product 1' }] }),
				}),
			});

			await productService.listProducts(c);

			expect(c.env.DB.prepare.called).to.be.true;
			expect(c.json.calledOnce).to.be.true;
		});
	});

	describe('getProduct', () => {
		it('should return product by ID successfully', async () => {
			c.req.param.withArgs('id').returns('prod123');
			c.env['product-cache'].get.resolves(null);
			c.env.DB.prepare.returns({
				bind: sandbox.stub().returns({
					all: sandbox.stub().resolves({ results: [{ product_id: 'prod123', name: 'Product 1' }] }),
				}),
			});
			c.env['product-cache'].put.resolves();

			await productService.getProduct(c);

			expect(c.env.DB.prepare.called).to.be.true;
			expect(c.env['product-cache'].put.called).to.be.true;
			expect(c.json.calledOnce).to.be.true;
		});

		it('should return 404 for product not found', async () => {
			c.req.param.withArgs('id').returns('nonexistent');
			c.env['product-cache'].get.resolves(null);
			c.env.DB.prepare.returns({
				bind: sandbox.stub().returns({
					all: sandbox.stub().resolves({ results: [] }),
				}),
			});

			await productService.getProduct(c);

			expect(c.json.calledWith({ error: 'Product not found' }, 404)).to.be.true;
		});
	});

	describe('createProduct', () => {
		it('should create product successfully', async () => {
			c.req.header.withArgs('Content-Type').returns('application/json');
			c.req.json.resolves({
				name: 'Test Product',
				color_family: 'Black',
				available_sizes: '[8,9,10]',
				primary_image_url: 'https://example.com/image.jpg',
			});
			c.env.DB.prepare.returns({
				bind: sandbox.stub().returns({
					run: sandbox.stub().resolves(),
				}),
			});
			c.env['product-cache'].delete.resolves();

			await productService.createProduct(c);

			expect(c.env.DB.prepare.called).to.be.true;
			expect(c.env['product-cache'].delete.called).to.be.true;
			expect(c.json.calledOnce).to.be.true;
		});
	});

	describe('listAllProducts', () => {
		it('should return all products with pagination', async () => {
			c.req.query.withArgs('page').returns('1');
			c.req.query.withArgs('limit').returns('12');
			c.env.DB.prepare.onCall(0).returns({
				first: sandbox.stub().resolves({ total: 25 }),
			});
			c.env.DB.prepare.onCall(1).returns({
				bind: sandbox.stub().returns({
					all: sandbox.stub().resolves({ results: [{ product_id: 'prod1', name: 'Product 1' }] }),
				}),
			});

			await productService.listAllProducts(c);

			expect(c.env.DB.prepare.called).to.be.true;
			expect(c.json.calledOnce).to.be.true;
		});
	});

	describe('updateProductService', () => {
		it('should update product successfully', async () => {
			c.req.param.withArgs('id').returns('prod123');
			c.req.header.withArgs('Content-Type').returns('application/json');
			c.req.json.resolves({ name: 'Updated Product' });
			c.env.DB.prepare.onCall(0).returns({
				bind: sandbox.stub().returns({
					all: sandbox.stub().resolves({ results: [{ product_id: 'prod123', name: 'Old Product' }] }),
				}),
			});
			c.env.DB.prepare.onCall(1).returns({
				bind: sandbox.stub().returns({
					run: sandbox.stub().resolves(),
				}),
			});
			c.env['product-cache'].delete.resolves();

			await productService.updateProductService(c);

			expect(c.env.DB.prepare.called).to.be.true;
			expect(c.env['product-cache'].delete.called).to.be.true;
			expect(c.json.calledOnce).to.be.true;
		});
	});

	describe('deleteProductService', () => {
		it('should delete product successfully', async () => {
			c.req.param.withArgs('id').returns('prod123');
			c.env.DB.prepare.onCall(0).returns({
				bind: sandbox.stub().returns({
					all: sandbox.stub().resolves({ results: [{ product_id: 'prod123', primary_image_url: 'https://example.com/image.jpg' }] }),
				}),
			});
			c.env.PRODUCT_IMAGES = {
				delete: sandbox.stub().resolves(),
			};
			c.env.DB.prepare.onCall(1).returns({
				bind: sandbox.stub().returns({
					run: sandbox.stub().resolves(),
				}),
			});
			c.env['product-cache'].delete.resolves();

			await productService.deleteProductService(c);

			expect(c.env.DB.prepare.called).to.be.true;
			expect(c.env['product-cache'].delete.called).to.be.true;
			expect(c.json.calledOnce).to.be.true;
		});
	});
});
