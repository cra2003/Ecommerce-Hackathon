import { expect } from 'chai';
import sinon from 'sinon';
import { createPaymentHandler, capturePaymentHandler } from '../../src/handlers/payment.handler.js';

describe('Payment Handler', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		// Stub global fetch
		global.fetch = sandbox.stub();
		c = {
			req: {
				json: sandbox.stub(),
				param: sandbox.stub(),
			},
			env: {
				PAYPAL_API_BASE: 'https://api.sandbox.paypal.com',
				PAYPAL_CLIENT_ID: 'test_client_id',
				PAYPAL_CLIENT_SECRET: 'test_client_secret',
			},
			json: sandbox.stub().returnsThis(),
		};
	});

	afterEach(() => {
		sandbox.restore();
		delete global.fetch;
	});

	describe('createPaymentHandler', () => {
		it('should create payment order successfully', async () => {
			c.req.json.resolves({ total: 100, currency: 'USD' });

			// Stub token fetch
			global.fetch.onCall(0).resolves(
				new Response(JSON.stringify({ access_token: 'test_token' }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				}),
			);

			// Stub order creation
			global.fetch.onCall(1).resolves(
				new Response(
					JSON.stringify({
						id: 'ORDER123',
						status: 'CREATED',
						links: [{ rel: 'approve', href: 'https://sandbox.paypal.com/checkout?token=ORDER123' }],
					}),
					{
						status: 201,
						headers: { 'Content-Type': 'application/json' },
					},
				),
			);

			await createPaymentHandler(c);

			expect(c.req.json.calledOnce).to.be.true;
			expect(global.fetch.calledTwice).to.be.true;
			expect(c.json.calledOnce).to.be.true;
			const responseArg = c.json.firstCall.args[0];
			expect(responseArg.success).to.be.true;
			expect(responseArg.paypal_order_id).to.equal('ORDER123');
		});

		it('should return 400 for invalid total amount', async () => {
			c.req.json.resolves({ total: 0 });

			await createPaymentHandler(c);

			expect(c.json.calledWith(sinon.match({ success: false, error: 'Invalid total amount' }), 400)).to.be.true;
		});
	});

	describe('capturePaymentHandler', () => {
		it('should capture payment successfully', async () => {
			c.req.json.resolves({ paypal_order_id: 'ORDER123' });

			// Stub token fetch
			global.fetch.onCall(0).resolves(
				new Response(JSON.stringify({ access_token: 'test_token' }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				}),
			);

			// Stub order status check (APPROVED)
			global.fetch.onCall(1).resolves(
				new Response(
					JSON.stringify({
						id: 'ORDER123',
						status: 'APPROVED',
					}),
					{
						status: 200,
						headers: { 'Content-Type': 'application/json' },
					},
				),
			);

			// Stub capture
			global.fetch.onCall(2).resolves(
				new Response(
					JSON.stringify({
						id: 'ORDER123',
						status: 'COMPLETED',
					}),
					{
						status: 200,
						headers: { 'Content-Type': 'application/json' },
					},
				),
			);

			await capturePaymentHandler(c);

			expect(c.req.json.calledOnce).to.be.true;
			expect(global.fetch.called).to.be.true;
			expect(c.json.calledOnce).to.be.true;
			const responseArg = c.json.firstCall.args[0];
			expect(responseArg.success).to.be.true;
			expect(responseArg.paypal_order_id).to.equal('ORDER123');
		});

		it('should return 400 for missing paypal_order_id', async () => {
			c.req.json.resolves({});

			await capturePaymentHandler(c);

			expect(c.json.calledWith(sinon.match({ success: false, error: 'paypal_order_id is required' }), 400)).to.be.true;
		});

		it('should handle already completed order', async () => {
			c.req.json.resolves({ paypal_order_id: 'ORDER123' });

			// Stub token fetch
			global.fetch.onCall(0).resolves(
				new Response(JSON.stringify({ access_token: 'test_token' }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				}),
			);

			// Stub order status check (COMPLETED)
			global.fetch.onCall(1).resolves(
				new Response(
					JSON.stringify({
						id: 'ORDER123',
						status: 'COMPLETED',
						purchase_units: [
							{
								payments: {
									captures: [{ id: 'CAPTURE123' }],
								},
							},
						],
					}),
					{
						status: 200,
						headers: { 'Content-Type': 'application/json' },
					},
				),
			);

			await capturePaymentHandler(c);

			expect(c.json.calledOnce).to.be.true;
			const responseArg = c.json.firstCall.args[0];
			expect(responseArg.success).to.be.true;
			expect(responseArg.already_captured).to.be.true;
		});
	});
});
