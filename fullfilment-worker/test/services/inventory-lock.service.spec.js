import { expect } from 'chai';
import sinon from 'sinon';
import * as lockService from '../../src/services/inventory-lock.service.js';

describe('Inventory Lock Service', () => {
	let kv, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		kv = {
			get: sandbox.stub(),
			put: sandbox.stub(),
			delete: sandbox.stub(),
		};
	});

	afterEach(() => sandbox.restore());

	describe('getLockedQuantity', () => {
		it('should return locked quantity for warehouse and sku', async () => {
			// When kv.get is called with { type: 'json' }, it returns the parsed object
			kv.get.withArgs('lock:wh_001:P0001-10', { type: 'json' }).resolves({ user123: 5 });
			// Also provide fallback for when called without explicit args match
			kv.get.resolves({ user123: 5 });

			const result = await lockService.getLockedQuantity(kv, 'wh_001', 'P0001-10');

			expect(kv.get.calledOnce).to.be.true;
			expect(result).to.equal(5);
		});

		it('should return 0 when no locks exist', async () => {
			kv.get.resolves(null);

			const result = await lockService.getLockedQuantity(kv, 'wh_001', 'P0001-10');

			expect(result).to.equal(0);
		});

		it('should handle multiple users locking same warehouse', async () => {
			kv.get.withArgs('lock:wh_001:P0001-10', { type: 'json' }).resolves({
				user123: 5,
				user456: 3,
			});
			kv.get.resolves({
				user123: 5,
				user456: 3,
			});

			const result = await lockService.getLockedQuantity(kv, 'wh_001', 'P0001-10');

			expect(result).to.equal(8); // 5 + 3
		});
	});
});
