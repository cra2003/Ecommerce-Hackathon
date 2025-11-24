import { expect } from 'chai';
import sinon from 'sinon';
import * as orderService from '../../src/services/order.service.js';

describe('Order Service', () => {
  let db, sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    db = {
      prepare: sandbox.stub().returns({
        bind: sandbox.stub().returns({
          run: sandbox.stub().returns({ meta: { last_row_id: 1 } }),
          all: sandbox.stub().returns({ results: [] }),
          first: sandbox.stub().returns(null)
        })
      })
    };
  });

  afterEach(() => sandbox.restore());

  describe('insertOrder', () => {
    it('should insert order successfully', async () => {
      const orderData = {
        order_id: 'ord123',
        user_id: 'user123',
        guest_session_id: null,
        products: '[]',
        address: '{}',
        delivery_mode: 'standard',
        delivery_tier: 'tier_1',
        subtotal: 100,
        delivery_cost: 10,
        tax: 10,
        total: 120,
        status: 'pending',
        payment_status: 'pending'
      };

      await orderService.insertOrder(db, orderData);

      expect(db.prepare.calledOnce).to.be.true;
    });
  });

  describe('insertOrderLegacy', () => {
    it('should insert legacy order successfully', async () => {
      const result = await orderService.insertOrderLegacy(db, 'user123', 100, '{}', 'standard');

      expect(db.prepare.calledOnce).to.be.true;
      expect(result).to.be.a('number');
    });
  });

  describe('getUserOrders', () => {
    it('should return user orders', async () => {
      db.prepare().bind().all.returns({ results: [{ order_id: 'ord1' }] });

      const orders = await orderService.getUserOrders(db, 'user123');

      expect(db.prepare.calledOnce).to.be.true;
      expect(orders).to.be.an('array');
    });
  });

  describe('getOrderByIdAndUser', () => {
    it('should return order by id and user', async () => {
      db.prepare().bind().first.returns({ order_id: 'ord123' });

      const order = await orderService.getOrderByIdAndUser(db, 'ord123', 'user123');

      expect(db.prepare.calledOnce).to.be.true;
      expect(order).to.be.an('object');
    });
  });
});

