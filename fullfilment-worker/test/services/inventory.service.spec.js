import { expect } from 'chai';
import sinon from 'sinon';
import * as inventoryService from '../../src/services/inventory.service.js';

describe('Inventory Service', () => {
	let db, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		db = {
			prepare: sandbox.stub(),
		};
	});

	afterEach(() => sandbox.restore());

	describe('getInventoryByProductAndSize', () => {
		it('should return inventory for product and size', async () => {
			const mockResult = {
				sku: 'P0001-10',
				product_id: 'prod123',
				size: '10',
				stock: 50,
			};
			db.prepare.returns({
				bind: sandbox.stub().returns({
					all: sandbox.stub().resolves({ results: [mockResult] }),
				}),
			});

			const result = await inventoryService.getInventoryByProductAndSize(db, 'prod123', '10');

			expect(db.prepare.called).to.be.true;
			expect(result).to.deep.equal(mockResult);
		});
	});
});
