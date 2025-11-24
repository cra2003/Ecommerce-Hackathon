<script>
	import { onMount } from 'svelte';
	import { capturePayment, placeOrder } from '$lib/utils/api.js';
	import { accessToken } from '$lib/stores/auth.js';
	import { hasGuestSession } from '$lib/utils/guest.js';
	import { cartItems } from '$lib/stores/cart.js';

	let status = $state('processing'); // 'processing' | 'success' | 'error'
	let message = $state('Finalizing your payment...');
	let token = $state('');
	let error = $state('');

	$effect(() => {
		const unsub = accessToken.subscribe((v) => (token = v));
		return unsub;
	});
	
	// This page should only be visible briefly - it processes payment and closes

	onMount(async () => {
		// Prevent duplicate processing if component mounts multiple times
		if (status !== 'processing') {
			return; // Already processed
		}

		try {
			status = 'capturing';
			message = 'Finalizing your payment...';

			const url = new URL(window.location.href);
			const paypalOrderId = url.searchParams.get('token'); // PayPal returns ?token=ORDER_ID
			const payerId = url.searchParams.get('PayerID'); // PayPal also returns PayerID
			
			console.log('[paypal-return] Processing return from PayPal:', {
				paypalOrderId,
				payerId,
				fullUrl: url.href
			});
			
			if (!paypalOrderId) {
				status = 'error';
				message = 'Missing PayPal order token.';
				error = 'No order ID received from PayPal. Please try again.';
				
				// Notify parent window/tab if it exists
				if (typeof sessionStorage !== 'undefined') {
					sessionStorage.setItem('paypal_payment_failed', 'true');
					sessionStorage.setItem('paypal_payment_error', error);
				}
				return;
			}

			// Capture payment via payment-worker
			console.log('[paypal-return] Attempting to capture payment:', paypalOrderId);
			let captureResult;
			let paymentSuccessful = false;
			
			try {
				captureResult = await capturePayment(paypalOrderId);
				
				// Check if capture succeeded (either just now or already captured)
				if (captureResult?.success) {
					paymentSuccessful = true;
					if (captureResult?.already_captured) {
						console.log('[paypal-return] Payment already captured, proceeding with order placement');
					} else {
						console.log('[paypal-return] Payment captured successfully');
					}
				}
			} catch (captureErr) {
				// If capture fails but message indicates it's already paid, treat as success
				const errMsg = captureErr.message || '';
				console.log('[paypal-return] Capture error:', errMsg);
				
				if (errMsg.includes('already') || 
				    errMsg.includes('already been paid') || 
				    errMsg.includes('already captured') ||
				    errMsg.includes('COMPLETED')) {
					console.log('[paypal-return] Payment was already captured (detected from error message), proceeding...');
					paymentSuccessful = true;
					captureResult = { success: true, already_captured: true };
				} else {
					// Re-throw other errors
					throw captureErr;
				}
			}

			// Only proceed to place order if payment was successful (captured or already captured)
			if (!paymentSuccessful) {
				throw new Error('Payment capture failed');
			}

			// Notify parent window/tab that payment is completed
			if (typeof sessionStorage !== 'undefined') {
				sessionStorage.setItem('paypal_payment_completed', 'true');
			}

			// Check if user is authenticated OR has guest session
			const isAuthenticated = !!token;
			const hasGuest = hasGuestSession();
			
			if (!isAuthenticated && !hasGuest) {
				status = 'error';
				message = 'You need to be signed in or continue as guest to place the order.';
				error = 'Authentication required. Please log in or continue as guest and try again.';
				
				if (typeof sessionStorage !== 'undefined') {
					sessionStorage.setItem('paypal_payment_failed', 'true');
					sessionStorage.setItem('paypal_payment_error', error);
				}
				return;
			}

			console.log('[paypal-return] Placing order...', {
				isAuthenticated,
				hasGuest,
				willUseToken: isAuthenticated ? 'yes' : 'no (guest session)'
			});
			
			try {
				// Pass token only if authenticated, null for guests (placeOrder handles guest sessions via cookies/headers)
				const res = await placeOrder(isAuthenticated ? token : null, 'standard', 'paid');
				cartItems.set([]);
				
				// Store success data in sessionStorage for parent page
				if (typeof sessionStorage !== 'undefined') {
					sessionStorage.setItem('paypal_payment_completed', 'true');
					sessionStorage.setItem('paypal_order_id', res.order?.order_id || '');
					sessionStorage.setItem('paypal_payment_success', 'true');
				}
				
				status = 'success';
				message = 'Payment successful! Closing window...';

				// Close this tab immediately - parent page will handle the success message
				setTimeout(() => {
					window.close();
					// If close fails (some browsers block it), try to redirect parent
					if (!document.hidden) {
						// Fallback: redirect parent window if we can access it
						try {
							if (window.opener && !window.opener.closed) {
								window.opener.location.href = `/?order=success&paid=online&order_id=${encodeURIComponent(res.order?.order_id || '')}`;
							}
						} catch (e) {
							// Cross-origin or other error - just close
						}
					}
				}, 500);
			} catch (orderErr) {
				// If order placement fails, check if it's because order already exists
				const orderErrMsg = orderErr.message || '';
				if (orderErrMsg.includes('already') || orderErrMsg.includes('duplicate')) {
					// Order already placed - still show success since payment was successful
					cartItems.set([]);
					
					if (typeof sessionStorage !== 'undefined') {
						sessionStorage.setItem('paypal_payment_completed', 'true');
						sessionStorage.setItem('paypal_payment_success', 'true');
					}
					
					status = 'success';
					message = 'Payment successful! Closing window...';
					
					setTimeout(() => {
						window.close();
					}, 500);
				} else {
					// Re-throw other order placement errors
					throw orderErr;
				}
			}
		} catch (err) {
			status = 'error';
			const errorMessage = err.message || 'Failed to complete payment or place order.';
			error = errorMessage;
			
			console.error('[paypal-return] Error:', {
				message: errorMessage,
				error: err,
				stack: err.stack
			});
			
			// Notify parent window/tab about failure
			if (typeof sessionStorage !== 'undefined') {
				sessionStorage.setItem('paypal_payment_failed', 'true');
				sessionStorage.setItem('paypal_payment_error', errorMessage);
			}
			
			// Check for specific PayPal error types
			if (errorMessage.includes('declined') || errorMessage.includes('INSTRUMENT_DECLINED')) {
				message = 'Payment Method Declined';
				error = 'Your payment method was declined by the bank or processor. If you\'re using PayPal Sandbox, try using a different test card or PayPal test account. Some test accounts are configured to decline for testing purposes.';
			} else if (errorMessage.includes('semantically incorrect') || 
			    errorMessage.includes('business validation') ||
			    errorMessage.includes('already been paid') ||
			    errorMessage.includes('expired') ||
			    errorMessage.includes('cancelled')) {
				message = 'Payment validation failed. The requested action could not be performed, semantically incorrect, or failed business validation.';
				// Provide helpful context
				if (errorMessage.includes('already') || errorMessage.includes('already been paid')) {
					error = 'This order has already been paid. Please check your orders page. If you were charged, the payment was successful.';
				} else if (errorMessage.includes('expired') || errorMessage.includes('not in APPROVED state')) {
					error = 'The payment was cancelled or expired. Please go back and create a new payment.';
				} else {
					error = 'The payment could not be processed. Please go back to the summary page and try again.';
				}
			} else {
				message = 'Something went wrong while completing your payment.';
			}
		}
	});
</script>

<div class="mx-auto max-w-xl py-16 text-center">
	{#if status === 'processing' || status === 'capturing'}
		<div class="flex flex-col items-center gap-4">
			<div class="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
			<p class="text-lg text-white/80">{message}</p>
			<p class="text-sm text-white/50">Please wait, do not close this window.</p>
		</div>
	{:else if status === 'success'}
		<div class="flex flex-col items-center gap-4">
			<svg class="w-16 h-16 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
			<p class="text-2xl font-semibold text-emerald-300">Payment Successful!</p>
			<p class="text-sm text-white/70">Closing this window...</p>
		</div>
	{:else}
		<div class="flex flex-col items-center gap-4">
			<svg class="w-16 h-16 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
			<p class="text-2xl font-semibold text-red-300">Payment Failed</p>
			<p class="text-sm text-white/70 mb-2">{message}</p>
			{#if error}
				<p class="text-xs text-white/50 mt-1">{error}</p>
			{/if}
			<button
				class="mt-6 rounded-full bg-white/10 px-6 py-2.5 text-sm hover:bg-white/20"
				on:click={() => window.close()}
			>
				Close Window
			</button>
		</div>
	{/if}
</div>


