import { expect } from 'chai';
import sinon from 'sinon';
import * as cacheService from '../../src/services/cache.service.js';

describe('Cache Service', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			env: {
				CACHE: {
					get: sandbox.stub(),
					put: sandbox.stub(),
					delete: sandbox.stub(),
				},
			},
		};
	});

	afterEach(() => sandbox.restore());

	describe('getCached', () => {
		it('should get cached value successfully', async () => {
			const cachedData = { data: 'test', products: [] };
			c.env.CACHE.get.resolves(cachedData);

			const result = await cacheService.getCached(c, 'key123');

			expect(c.env.CACHE.get.calledOnce).to.be.true;
			expect(c.env.CACHE.get.calledWith('key123', 'json')).to.be.true;
			expect(result).to.deep.equal(cachedData);
		});

		it('should return null when cache miss', async () => {
			c.env.CACHE.get.resolves(null);

			const result = await cacheService.getCached(c, 'missing-key');

			expect(result).to.be.null;
		});
	});

	describe('setCached', () => {
		it('should set cached value successfully', async () => {
			const data = { cart_id: 'cart_123', products: [] };
			c.env.CACHE.put.resolves();

			await cacheService.setCached(c, 'key123', data, 300);

			expect(c.env.CACHE.put.calledOnce).to.be.true;
			expect(c.env.CACHE.put.calledWith('key123', JSON.stringify(data), { expirationTtl: 300 })).to.be.true;
		});
	});

	describe('invalidateCache', () => {
		it('should invalidate cache keys successfully', async () => {
			c.env.CACHE.delete.resolves();

			await cacheService.invalidateCache(c, ['key1', 'key2', 'key3']);

			expect(c.env.CACHE.delete.calledThrice).to.be.true;
			expect(c.env.CACHE.delete.calledWith('key1')).to.be.true;
			expect(c.env.CACHE.delete.calledWith('key2')).to.be.true;
			expect(c.env.CACHE.delete.calledWith('key3')).to.be.true;
		});
	});
});
