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

	describe('createLogKey', () => {
		it('should create log key with proper structure', () => {
			const timestamp = '2025-01-15T10:30:00.000Z';
			const key = logService.createLogKey(timestamp, 'event');

			expect(key).to.include('logs/year=2025/month=01/day=15');
			expect(key).to.include('level=event');
		});
	});
});
