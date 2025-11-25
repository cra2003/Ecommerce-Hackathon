import { expect } from 'chai';
import sinon from 'sinon';
import { listProductsHandler, getProductHandler } from '../../src/handlers/products.handler.js';

describe('Products Handler', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			req: {
				param: sandbox.stub(),
				query: sandbox.stub(),
				addTraceLog: sandbox.stub(),
			},
			env: {
				DB: {
					prepare: sandbox.stub(),
				},
			},
			json: sandbox.stub().returnsThis(),
		};
	});

	afterEach(() => sandbox.restore());

	describe('listProductsHandler', () => {
		it('should return products list successfully', async () => {
			c.req.query.withArgs('page').returns('1');
			c.req.query.withArgs('limit').returns('10');

			const mockProducts = [{ product_id: 'prod1', name: 'Product 1' }];
			const countStub = sandbox.stub().resolves({ total: 1 });
			const allStub = sandbox.stub().resolves({ results: mockProducts });

			c.env.DB.prepare.onCall(0).returns({
				bind: sandbox.stub().returns({
					first: countStub,
				}),
			});
			c.env.DB.prepare.onCall(1).returns({
				bind: sandbox.stub().returns({
					all: allStub,
				}),
			});

			await listProductsHandler(c);

			expect(c.env.DB.prepare.called).to.be.true;
			expect(c.json.calledOnce).to.be.true;
			const responseArg = c.json.firstCall.args[0];
			expect(responseArg.products).to.deep.equal(mockProducts);
			expect(responseArg.pagination).to.exist;
			expect(responseArg.pagination.total).to.equal(1);
		});
	});

	describe('getProductHandler', () => {
		it('should return product by ID successfully', async () => {
			c.req.param.withArgs('id').returns('prod123');

			const mockProduct = { product_id: 'prod123', name: 'Product 1' };
			c.env.DB.prepare.returns({
				bind: sandbox.stub().returns({
					all: sandbox.stub().resolves({ results: [mockProduct] }),
				}),
			});

			await getProductHandler(c);

			expect(c.env.DB.prepare.called).to.be.true;
			expect(c.json.calledOnce).to.be.true;
			const responseArg = c.json.firstCall.args[0];
			expect(responseArg.product_id).to.equal('prod123');
		});

		it('should handle product not found', async () => {
			c.req.param.withArgs('id').returns('nonexistent');
			c.env.DB.prepare.returns({
				bind: sandbox.stub().returns({
					all: sandbox.stub().resolves({ results: [] }),
				}),
			});

			await getProductHandler(c);

			expect(c.json.calledWith({ error: 'Product not found' }, 404)).to.be.true;
		});
	});
});
