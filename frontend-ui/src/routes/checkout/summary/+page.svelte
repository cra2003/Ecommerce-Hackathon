<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { accessToken } from '$lib/stores/auth.js';
	import { isAuthed } from '$lib/stores/auth.js';
	import { hasGuestSession } from '$lib/utils/guest.js';
	import { cartItems } from '$lib/stores/cart.js';
	import { getOrderSummary, placeOrder } from '$lib/utils/api.js';
	import PayPalButton from '$lib/components/PayPalButton.svelte';
	import { get } from 'svelte/store';
	
	let summary = $state(null);
	let isLoading = $state(true);
	let error = $state('');
	let token = $state('');
	let isUserAuthed = $state(false);
	let hasGuest = $state(false);
	let selectedDeliveryMode = $state('normal'); // 'normal' or 'express'
	let placing = $state(false);
	let paymentMethod = $state('cod'); // 'cod' or 'online'
	
	// Subscribe to access token and auth state
	$effect(() => {
		const unsub1 = accessToken.subscribe((v) => (token = v));
		const unsub2 = isAuthed.subscribe((v) => (isUserAuthed = v));
		hasGuest = hasGuestSession();
		return () => { unsub1(); unsub2(); };
	});
	
	let isDeliverable = $state(true);
	let allocationErrors = $state(null);

	onMount(async () => {
		try {
			// Check if authenticated or guest
			const authed = get(isAuthed);
			const guest = hasGuestSession();
			isUserAuthed = authed;
			hasGuest = guest;
			
			if (!authed && !guest) {
				error = 'You need to sign in or continue as guest to view your order summary.';
				isLoading = false;
				return;
			}
			
			// Pass token only if authenticated (guests will use cookie/header)
			const result = await getOrderSummary(token || null);
			if (result.success) {
				summary = result.summary;
				// Check if products are deliverable
				isDeliverable = result.summary.deliverable !== false && result.summary.delivery !== null;
				allocationErrors = result.summary.allocation_errors || null;
				if (!isDeliverable) {
					if (allocationErrors && allocationErrors.length > 0) {
						const errorNames = allocationErrors.map(e => `${e.name} (Size ${e.size})`).join(', ');
						error = `Stock allocation not possible for: ${errorNames}. Please try a different address or remove these items.`;
					} else {
						error = 'Products are not deliverable to this location. Please try a different address.';
					}
				}
			} else {
				error = result.error || 'Failed to load order summary';
				// If we got a summary object even with success=false, use it
				if (result.summary) {
					summary = result.summary;
					isDeliverable = false;
					allocationErrors = result.summary.allocation_errors || null;
					if (allocationErrors && allocationErrors.length > 0) {
						const errorNames = allocationErrors.map(e => `${e.name} (Size ${e.size})`).join(', ');
						error = `Stock allocation not possible for: ${errorNames}. Please try a different address or remove these items.`;
					}
				}
			}
		} catch (err) {
			error = err.message || 'Failed to load order summary';
		} finally {
			isLoading = false;
		}
	});
	
	function getTotalAmount() {
		if (!summary) return 0;
		const deliveryCost = selectedDeliveryMode === 'express' 
			? (summary.delivery?.express_delivery_cost || 0)
			: (summary.delivery?.standard_delivery_cost || 0);
		return summary.subtotal + deliveryCost;
	}
	
	async function handlePlaceOrder() {
		if (!isUserAuthed && !hasGuest) {
			error = 'You need to sign in or continue as guest to place an order.';
			return;
		}
		if (paymentMethod !== 'cod') {
			error = 'Select Cash on Delivery to place order directly, or use Pay Now for online payment.';
			return;
		}
		error = '';
		placing = true;
		try {
			// Pass token only if authenticated (guests will use cookie/header)
			const res = await placeOrder(token || null, selectedDeliveryMode === 'express' ? 'express' : 'standard');
			// Clear local cart state and redirect home with success flag
			cartItems.set([]);
			goto(`/?order=success&order_id=${encodeURIComponent(res.order.order_id)}`);
		} catch (err) {
			error = err.message || 'Failed to place order';
		} finally {
			placing = false;
		}
	}

</script>

<div class="mx-auto max-w-4xl">
	<h1 class="text-2xl font-semibold mb-6">Order Summary</h1>
	
	{#if isLoading}
		<p class="text-white/60">Loading order summary...</p>
	{:else if summary}
		<!-- Error message for non-deliverable products or allocation failures -->
		{#if !isDeliverable || error}
			<div class="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
				<p class="font-semibold mb-2">{error || 'Products are not deliverable to this location. Please try a different address.'}</p>
				{#if allocationErrors && allocationErrors.length > 0}
					<ul class="list-disc list-inside mt-2 space-y-1 text-xs text-red-200">
						{#each allocationErrors as err}
							<li>{err.name} (Size {err.size}) - Quantity: {err.quantity}</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Left: Products & Address -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Shipping Address -->
				<div class="rounded-2xl border border-white/10 bg-white/5 p-6">
					<h2 class="text-lg font-semibold mb-4">Shipping Address</h2>
					{#if summary.address}
						<div class="text-sm text-white/80 space-y-1">
							<p>{summary.address.line1}</p>
							{#if summary.address.line2}<p>{summary.address.line2}</p>{/if}
							<p>{summary.address.city}, {summary.address.state} {summary.address.postal_code}</p>
							<p>{summary.address.country}</p>
						</div>
					{:else}
						<p class="text-sm text-white/60">No address provided</p>
					{/if}
				</div>
				
				<!-- Products -->
				<div class="rounded-2xl border border-white/10 bg-white/5 p-6">
					<h2 class="text-lg font-semibold mb-4">Items ({summary.item_count})</h2>
					<div class="space-y-4">
						{#each summary.products as item}
							<div class="flex items-center gap-4">
								<img src={item.image} alt={item.name} class="h-16 w-16 rounded-lg object-cover" />
								<div class="flex-1">
									<p class="text-sm font-medium">{item.name}</p>
									<p class="text-xs text-white/60">Size: UK {item.size} • Qty: {item.quantity}</p>
								</div>
								<p class="text-sm font-semibold">₹ {(item.price * item.quantity).toLocaleString('en-IN')}</p>
							</div>
						{/each}
					</div>
				</div>
				
				<!-- Delivery Options -->
				{#if summary.delivery && isDeliverable && !allocationErrors}
					<div class="rounded-2xl border border-white/10 bg-white/5 p-6">
						<h2 class="text-lg font-semibold mb-4">Delivery Options</h2>
						
						<!-- Normal Delivery -->
						<label class="flex items-center gap-4 rounded-lg border border-white/20 p-4 cursor-pointer hover:border-white/40 mb-3">
							<input
								type="radio"
								name="delivery"
								value="normal"
								bind:group={selectedDeliveryMode}
								class="w-4 h-4"
								disabled={!isDeliverable}
							/>
							<div class="flex-1">
								<p class="text-sm font-medium">Standard Delivery</p>
								<p class="text-xs text-white/60">
									{summary.delivery.estimated_days_normal?.min}-{summary.delivery.estimated_days_normal?.max} days
									• Estimated by {summary.delivery.estimated_delivery_date_normal}
								</p>
							</div>
							<p class="text-sm font-semibold">₹ {summary.delivery.standard_delivery_cost.toLocaleString('en-IN')}</p>
						</label>
						
						<!-- Express Delivery -->
						{#if summary.delivery.express_available}
							<label class="flex items-center gap-4 rounded-lg border border-white/20 p-4 cursor-pointer hover:border-white/40">
								<input
									type="radio"
									name="delivery"
									value="express"
									bind:group={selectedDeliveryMode}
									class="w-4 h-4"
									disabled={!isDeliverable}
								/>
								<div class="flex-1">
									<p class="text-sm font-medium">Express Delivery</p>
									<p class="text-xs text-white/60">
										{summary.delivery.estimated_days_express?.min}-{summary.delivery.estimated_days_express?.max} days
										• Estimated by {summary.delivery.estimated_delivery_date_express}
									</p>
								</div>
								<p class="text-sm font-semibold">₹ {summary.delivery.express_delivery_cost.toLocaleString('en-IN')}</p>
							</label>
						{:else}
							<p class="text-xs text-white/50 mt-2">Express delivery not available for this order</p>
						{/if}
					</div>
				{:else if !isDeliverable || allocationErrors}
					<div class="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
						<h2 class="text-lg font-semibold mb-2 text-red-300">Delivery Not Available</h2>
						{#if allocationErrors && allocationErrors.length > 0}
							<p class="text-sm text-red-200 mb-2">Stock allocation is not possible for some items at this location.</p>
							<p class="text-xs text-red-200">Please try a different address or remove the affected items from your cart.</p>
						{:else}
							<p class="text-sm text-red-200">Products in your cart are not deliverable to this location. Please try a different address.</p>
						{/if}
					</div>
				{/if}
			</div>
			
			<!-- Right: Order Total -->
			<div class="lg:col-span-1">
				<div class="rounded-2xl border border-white/10 bg-white/5 p-6 sticky top-4 space-y-4">
					<h2 class="text-lg font-semibold mb-4">Order Total</h2>
					
					<div class="space-y-3 text-sm">
						<div class="flex justify-between">
							<span class="text-white/60">Subtotal</span>
							<span>₹ {summary.subtotal.toLocaleString('en-IN')}</span>
						</div>
						
						{#if summary.delivery}
							<div class="flex justify-between">
								<span class="text-white/60">
									{selectedDeliveryMode === 'express' ? 'Express' : 'Standard'} Delivery
								</span>
								<span>
									₹ {(selectedDeliveryMode === 'express' 
										? summary.delivery.express_delivery_cost 
										: summary.delivery.standard_delivery_cost
									).toLocaleString('en-IN')}
								</span>
							</div>
						{/if}
						
						<div class="border-t border-white/10 pt-3 flex justify-between text-lg font-bold">
							<span>Total</span>
							<span>₹ {getTotalAmount().toLocaleString('en-IN')}</span>
						</div>
					</div>

					<!-- Payment Method -->
					<div class="mt-6">
						<p class="text-white/70 font-medium mb-4">Payment Method</p>
						<div class="space-y-3">
							<label class="block cursor-pointer {isDeliverable ? '' : 'cursor-not-allowed opacity-50'}">
								<input
									type="radio"
									name="payment_method"
									value="cod"
									bind:group={paymentMethod}
									class="sr-only peer"
									disabled={!isDeliverable}
								/>
								<div class="rounded-xl border-2 border-white/20 bg-white/5 p-4 transition-all peer-checked:border-white peer-checked:bg-white/10 hover:border-white/40 peer-disabled:hover:border-white/20">
									<div class="flex items-center gap-3">
										<div class="w-5 h-5 rounded-full border-2 border-white/40 peer-checked:border-white peer-checked:bg-white flex items-center justify-center transition-all">
											{#if paymentMethod === 'cod'}
												<div class="w-2.5 h-2.5 rounded-full bg-neutral-900"></div>
											{/if}
										</div>
										<div class="flex-1">
											<p class="font-semibold text-sm">Cash on Delivery</p>
											<p class="text-xs text-white/60 mt-0.5">Pay when you receive</p>
										</div>
									</div>
								</div>
							</label>
							
							<label class="block cursor-pointer {isDeliverable ? '' : 'cursor-not-allowed opacity-50'}">
								<input
									type="radio"
									name="payment_method"
									value="online"
									bind:group={paymentMethod}
									class="sr-only peer"
									disabled={!isDeliverable}
								/>
								<div class="rounded-xl border-2 border-white/20 bg-white/5 p-4 transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-500/10 hover:border-white/40 peer-disabled:hover:border-white/20">
									<div class="flex items-center gap-3">
										<div class="w-5 h-5 rounded-full border-2 border-white/40 peer-checked:border-emerald-500 peer-checked:bg-emerald-500 flex items-center justify-center transition-all">
											{#if paymentMethod === 'online'}
												<div class="w-2.5 h-2.5 rounded-full bg-white"></div>
											{/if}
										</div>
										<div class="flex-1">
											<p class="font-semibold text-sm">Pay Online</p>
											<p class="text-xs text-white/60 mt-0.5">PayPal Sandbox</p>
										</div>
										<div class="text-xs text-emerald-400 font-medium">
											Secure
										</div>
									</div>
								</div>
							</label>
						</div>
					</div>

					<button
						class="mt-4 w-full rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-900 hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed"
						on:click={handlePlaceOrder}
						disabled={placing || paymentMethod !== 'cod' || !isDeliverable}
					>
						{placing ? 'Placing...' : 'Place Order'}
					</button>

					{#if paymentMethod === 'online'}
						<div class="mt-3">
							<PayPalButton
								totalAmount={getTotalAmount()}
								currency="USD"
								returnUrl={typeof window !== 'undefined' ? `${window.location.origin}/checkout/paypal-return` : undefined}
								cancelUrl={typeof window !== 'undefined' ? `${window.location.origin}/checkout/summary` : undefined}
								disabled={!isDeliverable || placing}
								onSuccess={async (data) => {
									console.log('[summary] PayPal payment successful:', data);
									// The return page will handle order placement
								}}
								onError={(err) => {
									console.error('[summary] PayPal payment error:', err);
									error = err.message || 'Payment failed';
								}}
							/>
						</div>
					{/if}

					<button
						class="mt-3 w-full rounded-full bg-white/10 px-6 py-2.5 text-sm hover:bg-white/20"
						on:click={() => goto('/checkout/shipping')}
					>
						Edit Address
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

