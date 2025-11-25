import { expect } from 'chai';
import sinon from 'sinon';
import { healthHandler, rootHandler } from '../../src/handlers/health.handler.js';

describe('Health Handler', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			env: {
				DB: {
					prepare: sandbox.stub(),
				},
			},
			json: sandbox.stub().returnsThis(),
		};
	});

	afterEach(() => sandbox.restore());

	describe('healthHandler', () => {
		it('should return healthy status when all checks pass', async () => {
			c.env.DB.prepare.returns({
				first: sandbox.stub().resolves({ test: 1 }),
			});

			const mockKV = {
				put: sandbox.stub().resolves(),
				get: sandbox.stub().resolves('test'),
				delete: sandbox.stub().resolves(),
			};

			c.env.PRICE_CACHE = mockKV;

			await healthHandler(c);

			expect(c.json.calledOnce).to.be.true;
			const responseArg = c.json.firstCall.args[0];
			expect(responseArg.status).to.equal('healthy');
			expect(responseArg.service).to.equal('price-worker');
			expect(responseArg.bindings.DB.status).to.equal('ok');
			expect(c.json.firstCall.args[1]).to.equal(200);
		});

		it('should return degraded status when DB check fails', async () => {
			c.env.DB.prepare.returns({
				first: sandbox.stub().rejects(new Error('DB error')),
			});

			await healthHandler(c);

			expect(c.json.calledOnce).to.be.true;
			const responseArg = c.json.firstCall.args[0];
			expect(responseArg.status).to.equal('degraded');
			expect(responseArg.bindings.DB.status).to.equal('error');
			expect(c.json.firstCall.args[1]).to.equal(503);
		});

		it('should handle missing bindings gracefully', async () => {
			c.env.DB.prepare.returns({
				first: sandbox.stub().resolves({ test: 1 }),
			});
			delete c.env.PRICE_CACHE;

			await healthHandler(c);

			expect(c.json.calledOnce).to.be.true;
			const responseArg = c.json.firstCall.args[0];
			expect(responseArg.status).to.equal('healthy');
			expect(responseArg.bindings.PRICE_CACHE.status).to.equal('not_configured');
		});
	});

	describe('rootHandler', () => {
		it('should return service info', () => {
			const result = rootHandler(c);

			expect(c.json.calledOnce).to.be.true;
			const responseArg = c.json.firstCall.args[0];
			expect(responseArg.service).to.equal('price-worker');
			expect(responseArg.status).to.equal('online');
		});
	});
});

