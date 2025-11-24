import { expect } from 'chai';
import sinon from 'sinon';
import { createPaymentHandler, capturePaymentHandler } from '../../src/handlers/payment.handler.js';
import * as paypalService from '../../src/services/paypal.service.js';

describe('Payment Handler', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			req: {
				json: sandbox.stub(),
			},
			env: {
				PAYPAL_CLIENT_ID: 'test-client-id',
				PAYPAL_CLIENT_SECRET: 'test-secret',
				PAYPAL_API_BASE: 'https://api-m.sandbox.paypal.com',
			},
			json: sandbox.stub().returnsThis(),
		};
	});

	afterEach(() => {
		sandbox.restore();
		if (global.fetch) {
			delete global.fetch;
		}
	});

	describe('createPaymentHandler', () => {
		it('should create payment successfully', async () => {
			const paymentData = { total: 100, currency: 'USD' };
			c.req.json.resolves(paymentData);

			sandbox.stub(paypalService, 'getPayPalAccessToken').resolves('fake-access-token');

			global.fetch = sandbox.stub().resolves({
				ok: true,
				json: sandbox.stub().resolves({
					id: 'ORDER123',
					status: 'CREATED',
					links: [{ rel: 'approve', href: 'https://paypal.com/approve' }],
				}),
			});

			await createPaymentHandler(c);

			expect(paypalService.getPayPalAccessToken.calledOnce).to.be.true;
		});

		it('should return 400 for invalid total', async () => {
			c.req.json.resolves({ total: 0 });

			await createPaymentHandler(c);

			expect(c.json.calledWith({ success: false, error: 'Invalid total amount' }, 400)).to.be.true;
		});
	});

	describe('capturePaymentHandler', () => {
		it('should capture payment successfully', async () => {
			c.req.json.resolves({ paypal_order_id: 'ORDER123' });

			sandbox.stub(paypalService, 'getPayPalAccessToken').resolves('fake-access-token');

			global.fetch = sandbox
				.stub()
				.onFirstCall()
				.resolves({
					ok: true,
					json: sandbox.stub().resolves({ status: 'APPROVED' }),
				})
				.onSecondCall()
				.resolves({
					ok: true,
					json: sandbox.stub().resolves({ status: 'COMPLETED' }),
				});

			await capturePaymentHandler(c);

			expect(paypalService.getPayPalAccessToken.calledOnce).to.be.true;
		});

		it('should return 400 for missing order ID', async () => {
			c.req.json.resolves({});

			await capturePaymentHandler(c);

			expect(c.json.calledWith({ success: false, error: 'paypal_order_id is required' }, 400)).to.be.true;
		});
	});
});
