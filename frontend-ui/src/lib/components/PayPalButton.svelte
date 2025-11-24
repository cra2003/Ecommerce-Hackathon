<script>
	import { onMount, onDestroy } from 'svelte';
	import { createPayment } from '$lib/utils/api.js';
	
	let { 
		totalAmount, 
		currency = 'USD',
		returnUrl,
		cancelUrl,
		onSuccess,
		onError,
		disabled = false
	} = $props();
	
	let paymentState = $state('idle'); // 'idle' | 'creating' | 'waiting' | 'capturing' | 'success' | 'error'
	let errorMessage = $state('');
	let currentOrderId = $state(null);
	let checkReturnInterval = $state(null);
	
	// Monitor for payment completion when waiting
	onMount(() => {
		if (paymentState === 'waiting') {
			startMonitoringReturn();
		}
		
		return () => {
			if (checkReturnInterval) {
				clearInterval(checkReturnInterval);
			}
		};
	});
	
	onDestroy(() => {
		if (checkReturnInterval) {
			clearInterval(checkReturnInterval);
		}
	});
	
	function startMonitoringReturn() {
		if (checkReturnInterval) {
			clearInterval(checkReturnInterval);
		}
		
		checkReturnInterval = setInterval(() => {
			if (typeof sessionStorage !== 'undefined') {
				if (sessionStorage.getItem('paypal_payment_completed') === 'true') {
					clearInterval(checkReturnInterval);
					checkReturnInterval = null;
					
					// Get order ID if available
					const orderId = sessionStorage.getItem('paypal_order_id') || currentOrderId;
					
					// Clean up sessionStorage
					sessionStorage.removeItem('paypal_payment_completed');
					sessionStorage.removeItem('paypal_pending_order_id');
					sessionStorage.removeItem('paypal_approval_url');
					sessionStorage.removeItem('paypal_order_id');
					sessionStorage.removeItem('paypal_payment_success');
					
					// Show success state briefly, then redirect
					paymentState = 'success';
					
					// Call success callback
					if (onSuccess) {
						onSuccess({ orderID: orderId });
					}
					
					// Redirect to home page after showing success message
					setTimeout(() => {
						if (typeof window !== 'undefined') {
							window.location.href = `/?order=success&paid=online${orderId ? `&order_id=${encodeURIComponent(orderId)}` : ''}`;
						}
					}, 2000);
				} else if (sessionStorage.getItem('paypal_payment_failed') === 'true') {
					clearInterval(checkReturnInterval);
					checkReturnInterval = null;
					paymentState = 'error';
					errorMessage = sessionStorage.getItem('paypal_payment_error') || 'Payment failed';
					sessionStorage.removeItem('paypal_payment_failed');
					sessionStorage.removeItem('paypal_payment_error');
					sessionStorage.removeItem('paypal_pending_order_id');
					sessionStorage.removeItem('paypal_approval_url');
					if (onError) {
						onError(new Error(errorMessage));
					}
				}
			}
		}, 500); // Check every 500ms for faster response
		
		// Cleanup after 15 minutes
		setTimeout(() => {
			if (checkReturnInterval) {
				clearInterval(checkReturnInterval);
				checkReturnInterval = null;
			}
			if (paymentState === 'waiting') {
				paymentState = 'idle';
				if (typeof sessionStorage !== 'undefined') {
					sessionStorage.removeItem('paypal_pending_order_id');
					sessionStorage.removeItem('paypal_approval_url');
				}
			}
		}, 900000);
	}
	
	async function handlePayPalClick() {
		if (disabled || paymentState !== 'idle') {
			return;
		}
		
		paymentState = 'creating';
		errorMessage = '';
		
		try {
			console.log('[PayPalButton] Creating order...');
			
			const response = await createPayment(
				totalAmount,
				currency,
				'Order payment',
				returnUrl,
				cancelUrl
			);
			
			if (!response.success || !response.paypal_order_id || !response.approval_url) {
				throw new Error(response.error || 'Failed to create PayPal order');
			}
			
			currentOrderId = response.paypal_order_id;
			console.log('[PayPalButton] Order created:', currentOrderId);
			
			// Store order ID and approval URL in sessionStorage for return page
			if (typeof sessionStorage !== 'undefined') {
				sessionStorage.setItem('paypal_pending_order_id', currentOrderId);
				sessionStorage.setItem('paypal_approval_url', response.approval_url);
			}
			
			paymentState = 'waiting';
			startMonitoringReturn();
			
			// Open PayPal approval page in NEW TAB
			const newTab = window.open(response.approval_url, '_blank');
			
			if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
				// Popup blocked or failed - fall back to same window redirect
				console.warn('[PayPalButton] Popup blocked, redirecting in same window...');
				window.location.href = response.approval_url;
			} else {
				console.log('[PayPalButton] Opened PayPal in new tab. Waiting for return...');
			}
		} catch (err) {
			console.error('[PayPalButton] Failed to create order:', err);
			paymentState = 'error';
			errorMessage = err.message || 'Failed to create payment order';
			
			if (onError) {
				onError(err);
			}
		}
	}
</script>

<div class="w-full">
	{#if paymentState === 'creating'}
		<div class="flex items-center justify-center gap-2 py-3 text-sm text-white/80">
			<div class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
			<span>Creating order...</span>
		</div>
	{:else if paymentState === 'waiting'}
		<div class="flex items-center justify-center gap-2 py-3 text-sm text-white/80">
			<div class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
			<span>Complete payment in the PayPal tab...</span>
		</div>
	{:else if paymentState === 'capturing'}
		<div class="flex items-center justify-center gap-2 py-3 text-sm text-white/80">
			<div class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
			<span>Finalizing your payment...</span>
		</div>
	{:else if paymentState === 'success'}
		<div class="flex items-center justify-center gap-2 py-3 text-sm text-emerald-400">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
			<span>Payment successful!</span>
		</div>
	{:else if paymentState === 'error'}
		<div class="rounded-lg border border-red-500/30 bg-red-500/10 p-3 mb-3">
			<p class="text-sm text-red-300">{errorMessage || 'Payment failed. Please try again.'}</p>
		</div>
	{/if}
	
	<button
		type="button"
		class="w-full rounded-lg bg-[#FFC439] hover:bg-[#FFB300] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#FFC439] py-3 px-4 font-semibold text-[#001A6E] flex items-center justify-center gap-2"
		on:click={handlePayPalClick}
		disabled={disabled || paymentState !== 'idle'}
	>
		<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M7.403 4.459c-.1.631-.422 1.158-.963 1.577-.54.42-1.245.63-2.11.63h-.28c-.092 0-.17.028-.237.085a.247.247 0 0 0-.093.19v.134c0 .05.018.093.056.13a.179.179 0 0 0 .13.056h.28c1.134 0 2.002.278 2.603.833.6.556.9 1.345.9 2.367 0 .885-.254 1.592-.762 2.12-.508.528-1.229.793-2.16.793H5.05c-.092 0-.17.029-.236.085a.247.247 0 0 0-.093.19v.134c0 .05.018.092.055.13a.179.179 0 0 0 .131.055h.175c1.134 0 2.002.279 2.603.834.6.555.9 1.344.9 2.366 0 1.096-.388 1.938-1.163 2.525-.776.586-1.822.88-3.138.88H3.15c-.092 0-.17.028-.237.085a.247.247 0 0 0-.093.19V18c0 .05.018.092.056.13a.179.179 0 0 0 .13.056h3.518c1.134 0 2.002-.28 2.602-.835.601-.556.902-1.345.902-2.367 0-.884.254-1.591.762-2.12.508-.527 1.23-.792 2.16-.792h.28c.092 0 .17-.028.236-.085a.247.247 0 0 0 .093-.19v-.134c0-.05-.018-.092-.055-.13a.179.179 0 0 0-.131-.055h-.28c-1.134 0-2.002-.279-2.603-.834-.6-.556-.9-1.345-.9-2.367 0-1.096.388-1.938 1.163-2.525.776-.586 1.822-.88 3.138-.88h3.518c.092 0 .17-.028.237-.085a.247.247 0 0 0 .093-.19v-.134c0-.05-.018-.092-.056-.13a.179.179 0 0 0-.13-.055H9.9c-1.116 0-2.067.293-2.852.88-.786.586-1.263 1.429-1.432 2.529z" fill="currentColor"/>
		</svg>
		<span>Pay with PayPal</span>
	</button>
</div>

