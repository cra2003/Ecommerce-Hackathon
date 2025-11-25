import { expect } from 'chai';
import sinon from 'sinon';
import { healthHandler, rootHandler } from '../../src/handlers/health.handler.js';

describe('Health Handler', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			env: {},
			json: sandbox.stub().returnsThis(),
		};
	});

	afterEach(() => sandbox.restore());

	describe('healthHandler', () => {
		it('should return healthy status', () => {
			healthHandler(c);

			expect(c.json.calledOnce).to.be.true;
			const responseArg = c.json.firstCall.args[0];
			expect(responseArg.service).to.equal('payment-worker');
			expect(responseArg.status).to.equal('online');
		});
	});

	describe('rootHandler', () => {
		it('should return service info', () => {
			rootHandler(c);

			expect(c.json.calledOnce).to.be.true;
			const responseArg = c.json.firstCall.args[0];
			expect(responseArg.service).to.equal('payment-worker');
		});
	});
});
