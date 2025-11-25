import { expect } from 'chai';
import sinon from 'sinon';
import { healthHandler } from '../../src/handlers/health.handler.js';

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
				AUTH_ENC_KEY: 'test-encryption-key-32chars!!',
			},
			json: sandbox.stub().returnsThis(),
		};
	});

	afterEach(() => sandbox.restore());

	it('should return healthy status when all checks pass', async () => {
		c.env.DB.prepare.returns({
			first: sandbox.stub().resolves({ test: 1 }),
		});

		await healthHandler(c);

		expect(c.json.calledOnce).to.be.true;
		const responseArg = c.json.firstCall.args[0];
		expect(responseArg.service).to.equal('auth-worker');
		expect(responseArg.status).to.equal('healthy');
	});
});
