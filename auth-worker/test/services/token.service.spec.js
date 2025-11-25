import { expect } from 'chai';
import sinon from 'sinon';
import * as tokenService from '../../src/services/token.service.js';

describe('Token Service', () => {
	let env, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		env = 'test-secret-123';
	});

	afterEach(() => sandbox.restore());

	it('should generate access token successfully', async () => {
		const user = {
			user_id: 'user123',
			first_name: 'Test',
			last_name: 'User',
			email_hash: 'hash123',
		};

		const token = await tokenService.generateAccessToken(user, env);

		expect(token).to.be.a('string');
		expect(token.length).to.be.greaterThan(0);
	});
});
