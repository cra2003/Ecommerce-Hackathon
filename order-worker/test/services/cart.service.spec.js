import { expect } from 'chai';
import sinon from 'sinon';
import * as cartService from '../../src/services/cart.service.js';

describe('Cart Service', () => {
	let db, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		db = {
			prepare: sandbox.stub(),
		};
	});

	afterEach(() => sandbox.restore());

	describe('getCartByUser', () => {
		it('should get cart by user_id', async () => {
			const mockCart = { cart_id: 'cart123', user_id: 'user123' };
			db.prepare.returns({
				bind: sandbox.stub().returns({
					first: sandbox.stub().resolves(mockCart),
				}),
			});

			const result = await cartService.getCartByUser(db, 'user123');

			expect(db.prepare.called).to.be.true;
			expect(result).to.deep.equal(mockCart);
		});
	});

	describe('getCartItemsWithProducts', () => {
		it('should get cart items with products', async () => {
			const mockItems = { results: [{ product_id: 'prod1', quantity: 1 }] };
			db.prepare.returns({
				bind: sandbox.stub().returns({
					all: sandbox.stub().resolves(mockItems),
				}),
			});

			const result = await cartService.getCartItemsWithProducts(db, 'cart123');

			expect(db.prepare.called).to.be.true;
			expect(result).to.deep.equal(mockItems);
		});
	});
});
