import { expect } from 'chai';
import sinon from 'sinon';
import * as paypalService from '../../src/services/paypal.service.js';

describe('PayPal Service', () => {
	let env, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		env = {
			PAYPAL_CLIENT_ID: 'test-client-id',
			PAYPAL_CLIENT_SECRET: 'test-secret',
			PAYPAL_API_BASE: 'https://api-m.sandbox.paypal.com',
		};
	});

	afterEach(() => {
		sandbox.restore();
		if (global.fetch) {
			delete global.fetch;
		}
	});

	describe('getPayPalAccessToken', () => {
		it('should get access token successfully', async () => {
			global.fetch = sandbox.stub().resolves({
				ok: true,
				json: sandbox.stub().resolves({ access_token: 'fake-token' }),
			});

			const token = await paypalService.getPayPalAccessToken(env);

			expect(global.fetch.calledOnce).to.be.true;
			expect(token).to.equal('fake-token');
		});

		it('should throw error for missing credentials', async () => {
			env.PAYPAL_CLIENT_ID = null;

			try {
				await paypalService.getPayPalAccessToken(env);
				expect.fail('Should have thrown error');
			} catch (err) {
				expect(err.message).to.include('PayPal credentials not configured');
			}
		});

		it('should throw error for failed request', async () => {
			global.fetch = sandbox.stub().resolves({
				ok: false,
				status: 401,
				text: sandbox.stub().resolves('Unauthorized'),
			});

			try {
				await paypalService.getPayPalAccessToken(env);
				expect.fail('Should have thrown error');
			} catch (err) {
				expect(err.message).to.include('PayPal token error');
			}
		});
	});
});
