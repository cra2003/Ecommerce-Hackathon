import { expect } from 'chai';
import sinon from 'sinon';
import * as logService from '../../src/services/log.service.js';

describe('Log Service', () => {
	let env, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		env = {
			LOGS: {
				put: sandbox.stub().resolves(),
			},
		};
	});

	afterEach(() => sandbox.restore());

	describe('logEvent', () => {
		it('should log event successfully', async () => {
			await logService.logEvent(env, 'test_event', { data: 'test' });

			expect(env.LOGS.put.called).to.be.true;
		});
	});
});

