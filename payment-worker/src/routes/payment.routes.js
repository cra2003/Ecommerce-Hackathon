import { createPaymentHandler, capturePaymentHandler, paymentWebhookHandler } from '../handlers/payment.handler.js';

export function registerPaymentRoutes(app) {
	app.post('/payment/create', createPaymentHandler);
	app.post('/payment/capture', capturePaymentHandler);
	app.post('/payment/webhook', paymentWebhookHandler);
}

