import { expect } from 'chai';
import sinon from 'sinon';
import * as paypalService from '../../src/services/paypal.service.js';

describe('PayPal Service', () => {
	let env, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		// Stub global fetch
		global.fetch = sandbox.stub();
		env = {
			PAYPAL_API_BASE: 'https://api.sandbox.paypal.com',
			PAYPAL_CLIENT_ID: 'test_client_id',
			PAYPAL_CLIENT_SECRET: 'test_client_secret',
		};
	});

	afterEach(() => {
		sandbox.restore();
		delete global.fetch;
	});

	describe('getPayPalAccessToken', () => {
		it('should return access token successfully', async () => {
			global.fetch.resolves(
				new Response(JSON.stringify({ access_token: 'test_token_123' }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				}),
			);

			const token = await paypalService.getPayPalAccessToken(env);

			expect(global.fetch.calledOnce).to.be.true;
			expect(token).to.equal('test_token_123');
		});

		it('should throw error when credentials are missing', async () => {
			env.PAYPAL_CLIENT_ID = null;

			try {
				await paypalService.getPayPalAccessToken(env);
				expect.fail('Should have thrown an error');
			} catch (err) {
				expect(err.message).to.include('PayPal credentials not configured');
			}
		});

		it('should throw error when PayPal API returns error', async () => {
			global.fetch.resolves(
				new Response(JSON.stringify({ error: 'invalid_client' }), {
					status: 401,
					headers: { 'Content-Type': 'application/json' },
				}),
			);

			try {
				await paypalService.getPayPalAccessToken(env);
				expect.fail('Should have thrown an error');
			} catch (err) {
				expect(err.message).to.include('PayPal token error');
			}
		});
	});
});
