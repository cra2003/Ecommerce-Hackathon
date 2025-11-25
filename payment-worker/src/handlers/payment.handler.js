import { getPayPalAccessToken } from '../services/paypal.service.js';

/**
 * POST /payment/create
 * Creates a PayPal order in Sandbox and returns the approval URL.
 * Expects JSON:
 * {
 *   total: number,
 *   currency?: string, // NOTE: for Sandbox we recommend 'USD'
 *   description?: string,
 *   return_url?: string,
 *   cancel_url?: string
 * }
 */
export async function createPaymentHandler(c) {
	try {
		if (c.req.addTraceLog) {
			c.req.addTraceLog('Creating PayPal payment order');
		}
		const { total, currency = 'USD', description = 'Order payment', return_url, cancel_url } = await c.req.json();
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Total: ${total} ${currency}`);
		}

		if (!total || Number(total) <= 0) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog('Validation failed: Invalid total amount');
			}
			return c.json({ success: false, error: 'Invalid total amount' }, 400);
		}

		if (c.req.addTraceLog) {
			c.req.addTraceLog('Fetching PayPal access token');
		}
		const accessToken = await getPayPalAccessToken(c.env);
		const base = c.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';

		const res = await fetch(`${base}/v2/checkout/orders`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
			// Note: no card data here, only order meta
			body: JSON.stringify({
				intent: 'CAPTURE',
				purchase_units: [
					{
						amount: {
							currency_code: currency,
							value: total.toString(),
						},
						description,
					},
				],
				application_context: {
					user_action: 'PAY_NOW',
					return_url: return_url || undefined,
					cancel_url: cancel_url || undefined,
				},
			}),
		});

		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog(`PayPal order creation failed: ${data.message || res.status}`);
			}
			console.error('[payment-create] PayPal error payload:', {
				status: res.status,
				name: data.name,
				message: data.message,
				details: data.details,
			});
			return c.json({ success: false, error: data.message || 'Failed to create PayPal order' }, 500);
		}

		const approvalLink = (data.links || []).find((l) => l.rel === 'approve')?.href || null;
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`PayPal order created: ${data.id}, Status: ${data.status}`);
		}

		return c.json({
			success: true,
			paypal_order_id: data.id,
			approval_url: approvalLink,
			status: data.status,
		});
	} catch (err) {
		// No card data or PII logged
		console.error('[payment-create] error:', err?.message);
		return c.json({ success: false, error: err.message || 'Payment create failed' }, 500);
	}
}

/**
 * POST /payment/capture
 * Captures a PayPal order after the user approved it in the UI.
 * Expects JSON: { paypal_order_id: string }
 */
export async function capturePaymentHandler(c) {
	try {
		if (c.req.addTraceLog) {
			c.req.addTraceLog('Capturing PayPal payment');
		}
		const { paypal_order_id } = await c.req.json();
		console.log(`[payment-capture] Starting capture for order: ${paypal_order_id}`);
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`PayPal Order ID: ${paypal_order_id}`);
		}

		if (!paypal_order_id) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog('Validation failed: paypal_order_id is required');
			}
			return c.json({ success: false, error: 'paypal_order_id is required' }, 400);
		}

		if (c.req.addTraceLog) {
			c.req.addTraceLog('Fetching PayPal access token');
		}
		const accessToken = await getPayPalAccessToken(c.env);
		const base = c.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';

		// First, check the order status before attempting capture
		console.log(`[payment-capture] Checking order status for: ${paypal_order_id}`);
		let orderStatus = null;

		try {
			const orderCheckRes = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(paypal_order_id)}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${accessToken}`,
				},
			});

			const orderData = await orderCheckRes.json().catch(() => ({}));
			orderStatus = orderData.status;

			console.log(`[payment-capture] Order status: ${orderStatus}`);

			// If order is already completed, return success
			if (orderStatus === 'COMPLETED') {
				if (c.req.addTraceLog) {
					c.req.addTraceLog('Order already completed');
				}
				const existingCapture = orderData.purchase_units?.[0]?.payments?.captures?.[0];
				console.log(`[payment-capture] Order already completed. Capture ID: ${existingCapture?.id || 'N/A'}`);
				return c.json({
					success: true,
					status: 'COMPLETED',
					paypal_order_id,
					already_captured: true,
				});
			}

			// Check if order is cancelled or expired
			if (orderStatus === 'CANCELLED' || orderStatus === 'VOIDED') {
				if (c.req.addTraceLog) {
					c.req.addTraceLog(`Order is ${orderStatus}, cannot capture`);
				}
				console.error(`[payment-capture] Order is ${orderStatus}. Cannot capture.`);
				return c.json(
					{
						success: false,
						error: `Payment was ${orderStatus.toLowerCase()}. Please create a new payment and try again.`,
						current_status: orderStatus,
					},
					400,
				);
			}

			// Only proceed if order is APPROVED
			if (orderStatus !== 'APPROVED' && orderStatus !== 'CREATED') {
				console.error(`[payment-capture] Order not in APPROVED state. Current status: ${orderStatus}`);
				return c.json(
					{
						success: false,
						error: `Cannot capture payment. Order status is "${orderStatus}" (must be "APPROVED"). The order may have expired, been cancelled, or already processed. Please go back and create a new payment.`,
						current_status: orderStatus,
					},
					400,
				);
			}
		} catch (statusCheckError) {
			// If status check fails, log but continue with capture attempt
			console.warn(`[payment-capture] Failed to check order status:`, statusCheckError?.message);
			console.log(`[payment-capture] Proceeding with capture attempt anyway...`);
		}

		// Now attempt capture
		if (c.req.addTraceLog) {
			c.req.addTraceLog('Attempting to capture PayPal order');
		}
		console.log(`[payment-capture] Attempting to capture order: ${paypal_order_id}`);
		const res = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(paypal_order_id)}/capture`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
		});

		const data = await res.json().catch(() => ({}));

		// Log the response for debugging
		console.log('[payment-capture] PayPal capture response:', {
			http_status: res.status,
			http_statusText: res.statusText,
			paypal_order_id,
			response_status: data.status,
			response_name: data.name,
			response_message: data.message,
		});

		if (!res.ok) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog(`PayPal capture failed: ${data.message || res.status}`);
			}
			// Extract error details
			const errorDetails = data.details || [];
			const errorIssues = Array.isArray(errorDetails) ? errorDetails.map((d) => d.issue) : [];
			const errorDescriptions = Array.isArray(errorDetails) ? errorDetails.map((d) => d.description) : [];

			// Log the full PayPal error response for debugging
			console.error('[payment-capture] ❌ PayPal capture FAILED:', {
				http_status: res.status,
				http_statusText: res.statusText,
				paypal_order_id,
				error_name: data.name,
				error_message: data.message,
				error_issues: errorIssues,
				error_details: JSON.stringify(errorDetails, null, 2),
				order_status_before_capture: orderStatus,
				full_response: JSON.stringify(data, null, 2),
			});

			// Handle UNPROCESSABLE_ENTITY errors
			if (data.name === 'UNPROCESSABLE_ENTITY' || res.status === 422) {
				// Check for INSTRUMENT_DECLINED - payment method was declined
				if (errorIssues.includes('INSTRUMENT_DECLINED')) {
					console.error('[payment-capture] 💳 Payment instrument was declined by PayPal');
					return c.json(
						{
							success: false,
							error:
								'Your payment method was declined. This could be due to insufficient funds, card restrictions, or the payment method not being supported. Please try a different payment method.',
							paypal_error: 'INSTRUMENT_DECLINED',
							paypal_description: errorDescriptions.join(', '),
							sandbox_note:
								'If using PayPal Sandbox, try using a different test card or PayPal test account. Some test accounts are configured to decline for testing purposes.',
						},
						422,
					);
				}

				// Check if order was already completed
				console.log('[payment-capture] ⚠️ UNPROCESSABLE_ENTITY error. Checking if order is already completed...');
				try {
					const doubleCheckRes = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(paypal_order_id)}`, {
						method: 'GET',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${accessToken}`,
						},
					});

					const doubleCheckData = await doubleCheckRes.json().catch(() => ({}));
					const finalStatus = doubleCheckData.status;

					console.log(`[payment-capture] Order status after failed capture: ${finalStatus}`);

					// If order is now COMPLETED, treat as success (already captured)
					if (finalStatus === 'COMPLETED') {
						const existingCapture = doubleCheckData.purchase_units?.[0]?.payments?.captures?.[0];
						console.log('[payment-capture] ✅ Order is already COMPLETED. Treating as success.');
						return c.json({
							success: true,
							status: 'COMPLETED',
							paypal_order_id,
							already_captured: true,
							capture_id: existingCapture?.id,
						});
					}
				} catch (doubleCheckErr) {
					console.warn('[payment-capture] Failed to double-check order status:', doubleCheckErr?.message);
				}

				// Generic UNPROCESSABLE_ENTITY error
				const errorMsg = data.message || 'Failed to capture PayPal payment';
				console.error('[payment-capture] ⚠️ Order is not completed. Returning error.');
				return c.json(
					{
						success: false,
						error:
							'The payment could not be processed. This usually means the order has expired, was cancelled, or the payment method was declined. Please go back and create a new payment.',
						paypal_error: errorMsg,
						paypal_issues: errorIssues.join(', '),
						current_status: orderStatus,
						details: errorDescriptions.join(', '),
					},
					422,
				);
			}

			// For other errors, return them as-is
			const errorMsg = data.message || 'Failed to capture PayPal payment';
			return c.json(
				{
					success: false,
					error: errorMsg,
					paypal_error_name: data.name,
					details: errorDescriptions.join(', '),
				},
				res.status || 500,
			);
		}

		const status = data.status || 'UNKNOWN';
		console.log(`[payment-capture] Capture successful. Status: ${status}`);
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`PayPal payment captured successfully. Status: ${status}`);
		}

		return c.json({
			success: true,
			status,
			paypal_order_id,
		});
	} catch (err) {
		console.error('[payment-capture] Exception:', err?.message, err?.stack);
		return c.json({ success: false, error: err.message || 'Payment capture failed' }, 500);
	}
}

/**
 * POST /payment/webhook
 * Placeholder to receive PayPal webhooks (e.g. PAYMENT.CAPTURE.COMPLETED).
 * This should be configured in the PayPal developer dashboard with this endpoint URL.
 */
export async function paymentWebhookHandler(c) {
	// NOTE: In a real integration, verify the webhook signature using PayPal's headers.
	const event = await c.req.json().catch(() => ({}));

	// Only log event type and ID to avoid PII
	console.log('[payment-webhook]', {
		id: event.id,
		event_type: event.event_type,
		resource_type: event.resource_type,
	});

	return c.json({ received: true });
}
