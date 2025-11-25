import { expect } from 'chai';
import sinon from 'sinon';
import * as productService from '../../src/services/product.service.js';

describe('Product Service', () => {
	let db, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		db = {
			prepare: sandbox.stub(),
		};
	});

	afterEach(() => sandbox.restore());

	describe('reduceProductStock', () => {
		it('should reduce product stock', async () => {
			db.prepare.returns({
				bind: sandbox.stub().returns({
					run: sandbox.stub().resolves(),
				}),
			});

			await productService.reduceProductStock(db, 'prod123', 5);

			expect(db.prepare.called).to.be.true;
		});
	});
});
