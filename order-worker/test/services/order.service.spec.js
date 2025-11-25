import { expect } from 'chai';
import sinon from 'sinon';
import * as orderService from '../../src/services/order.service.js';

describe('Order Service', () => {
	let db, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		db = {
			prepare: sandbox.stub(),
		};
	});

	afterEach(() => sandbox.restore());

	describe('insertOrder', () => {
		it('should insert order successfully', async () => {
			const orderData = {
				order_id: 'order123',
				user_id: 'user123',
				products: '[]',
				address: '{}',
				delivery_mode: 'standard',
				delivery_tier: 'tier_1',
				total: 100,
			};

			db.prepare.returns({
				bind: sandbox.stub().returns({
					run: sandbox.stub().resolves(),
				}),
			});

			await orderService.insertOrder(db, orderData);

			expect(db.prepare.called).to.be.true;
		});
	});

	describe('getUserOrders', () => {
		it('should get user orders', async () => {
			const mockOrders = { results: [{ order_id: 'order1' }] };
			db.prepare.returns({
				bind: sandbox.stub().returns({
					all: sandbox.stub().resolves(mockOrders),
				}),
			});

			const result = await orderService.getUserOrders(db, 'user123');

			expect(db.prepare.called).to.be.true;
			expect(result).to.deep.equal(mockOrders.results);
		});
	});
});
