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
					put: sandbox.stub().resolves(),
					delete: sandbox.stub().resolves(),
				},
			},
		};
	});

	afterEach(() => sandbox.restore());

	describe('getCached', () => {
		it('should get cached value', async () => {
			c.env.CACHE.get.resolves({ data: 'test' });

			const result = await cacheService.getCached(c, 'key123');

			expect(c.env.CACHE.get.calledWith('key123', 'json')).to.be.true;
			expect(result).to.deep.equal({ data: 'test' });
		});

		it('should return null when cache miss', async () => {
			c.env.CACHE.get.resolves(null);

			const result = await cacheService.getCached(c, 'key123');

			expect(result).to.be.null;
		});
	});

	describe('setCached', () => {
		it('should set cached value', async () => {
			const data = { orders: [] };
			await cacheService.setCached(c, 'key123', data, 300);

			expect(c.env.CACHE.put.calledOnce).to.be.true;
			const putCall = c.env.CACHE.put.firstCall;
			expect(putCall.args[0]).to.equal('key123');
			expect(putCall.args[1]).to.equal(JSON.stringify(data));
		});
	});
});
