import { expect } from 'chai';
import sinon from 'sinon';
import { getFiltersHandler } from '../../src/handlers/filters.handler.js';

describe('Filters Handler', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			req: {
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

	describe('getFiltersHandler', () => {
		it('should return filter options successfully', async () => {
			const mockCategories = { results: [{ category: 'Sneakers' }, { category: 'Boots' }] };
			const mockBrands = { results: [{ brand: 'Nike' }, { brand: 'Adidas' }] };
			const mockGenders = { results: [{ gender: 'Male' }, { gender: 'Female' }] };
			const mockTargetAudiences = { results: [{ target_audience: 'Men' }] };
			const mockClosureTypes = { results: [{ closure_type: 'Lace' }] };
			const mockSoleMaterials = { results: [{ sole_material: 'Rubber' }] };

			const allStub = sandbox.stub().resolves();
			allStub.onCall(0).resolves(mockCategories);
			allStub.onCall(1).resolves(mockBrands);
			allStub.onCall(2).resolves(mockGenders);
			allStub.onCall(3).resolves(mockTargetAudiences);
			allStub.onCall(4).resolves(mockClosureTypes);
			allStub.onCall(5).resolves(mockSoleMaterials);

			c.env.DB.prepare.returns({
				all: allStub,
			});

			await getFiltersHandler(c);

			expect(c.env.DB.prepare.called).to.be.true;
			expect(c.json.calledOnce).to.be.true;
			const responseArg = c.json.firstCall.args[0];
			expect(responseArg.success).to.be.true;
			expect(responseArg.filters.categories).to.deep.equal(['Sneakers', 'Boots']);
			expect(responseArg.filters.brands).to.deep.equal(['Nike', 'Adidas']);
		});

		it('should handle empty filter results', async () => {
			const emptyResults = { results: [] };
			const allStub = sandbox.stub().resolves(emptyResults);
			c.env.DB.prepare.returns({ all: allStub });

			await getFiltersHandler(c);

			expect(c.json.calledOnce).to.be.true;
			const responseArg = c.json.firstCall.args[0];
			expect(responseArg.success).to.be.true;
			expect(responseArg.filters.categories).to.deep.equal([]);
		});

		it('should handle database errors', async () => {
			c.env.DB.prepare.returns({
				all: sandbox.stub().rejects(new Error('Database error')),
			});

			await getFiltersHandler(c);

			expect(c.json.calledOnce).to.be.true;
			const responseArg = c.json.firstCall.args[0];
			expect(responseArg.error).to.equal('Database error');
			expect(c.json.firstCall.args[1]).to.equal(500);
		});
	});
});
