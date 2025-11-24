export function rootHandler(c) {
	return c.json({
		service: 'payment-worker',
		status: 'online',
		version: '1.0.0',
	});
}

export function healthHandler(c) {
	return c.json({
		service: 'payment-worker',
		status: 'online',
		version: '1.0.0',
	});
}
