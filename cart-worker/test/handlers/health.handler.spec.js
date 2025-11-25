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
				JWT_SECRET: 'test-secret',
			},
			json: sandbox.stub().returnsThis(),
		};
	});

	afterEach(() => sandbox.restore());

	describe('healthHandler', () => {
		it('should return healthy status when checks pass', async () => {
			c.env.DB.prepare.returns({
				first: sandbox.stub().resolves({ test: 1 }),
			});

			await healthHandler(c);

			expect(c.json.calledOnce).to.be.true;
			const responseArg = c.json.firstCall.args[0];
			expect(responseArg.service).to.equal('cart-worker');
			expect(c.json.firstCall.args[1]).to.equal(200);
		});
	});

	describe('rootHandler', () => {
		it('should return service info', () => {
			rootHandler(c);

			expect(c.json.calledOnce).to.be.true;
			const responseArg = c.json.firstCall.args[0];
			expect(responseArg.service).to.equal('cart-worker');
		});
	});
});
