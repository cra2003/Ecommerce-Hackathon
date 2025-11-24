<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { get } from 'svelte/store';
	import { 
		cartItems, 
		cartTotal, 
		incrementQuantity,
		decrementQuantity, 
		removeFromCart, 
		clearCart,
		loadCart,
		verifyStock,
		isLoadingCart
	} from '$lib/stores/cart.js';
	import { isAuthed, accessToken } from '$lib/stores/auth.js';
	import { hasGuestSession } from '$lib/utils/guest.js';
	import { saveRedirectBeforeLogin } from '$lib/utils/login-redirect.js';
	import Toast from '$lib/components/Toast.svelte';
	
	let items = $state([]);
	let total = $state(0);
	let isUserAuthed = $state(false);
	let hasGuest = $state(false);
	let isVerifying = $state(false);
	let verifyError = $state('');
	let isLoading = $state(false);
	let isUpdating = $state(false); // For individual item updates
	let toastOpen = $state(false);
	let toastMessage = $state('');
	let toastType = $state('error');

	// Subscribe to stores
	$effect(() => {
		const u1 = cartItems.subscribe((v) => (items = v));
		const u2 = cartTotal.subscribe((v) => (total = v));
		const u3 = isAuthed.subscribe((v) => (isUserAuthed = v));
		const u4 = isLoadingCart.subscribe((v) => (isLoading = v));
		
		// Check for guest session - make it reactive
		hasGuest = hasGuestSession();
		
		return () => { u1(); u2(); u3(); u4(); };
	});
	
	// Update guest session status periodically and on focus
	$effect(() => {
		const checkGuest = () => {
			const guestExists = hasGuestSession();
			if (guestExists !== hasGuest) {
				hasGuest = guestExists;
				console.log('[cart] Guest session status updated:', guestExists);
			}
		};
		
		// Check immediately and on window focus (in case cookie was set in another tab)
		checkGuest();
		if (typeof window !== 'undefined') {
			window.addEventListener('focus', checkGuest);
			// Also check periodically (every 1 second) in case cookie was just set
			const interval = setInterval(checkGuest, 1000);
			return () => {
				window.removeEventListener('focus', checkGuest);
				clearInterval(interval);
			};
		}
	});

	// Load cart on mount if user is authenticated OR has guest session
	onMount(async () => {
		// Check if authenticated or guest
		const authed = get(isAuthed);
		const guest = hasGuestSession();
		
		isUserAuthed = authed;
		hasGuest = guest;
		
		// Always try to load cart - cookies are sent automatically
		// This allows guest sessions to work even if cookie isn't detected by frontend yet
		try {
			await loadCart();
			// After loading, re-check guest session (cart might have loaded via cookie)
			const updatedGuest = hasGuestSession();
			if (updatedGuest && !guest) {
				hasGuest = true;
				isUserAuthed = false;
				console.log('[cart] ✅ Guest session detected after loading cart');
			}
		} catch (err) {
			console.log('[cart] loadCart failed (might be expected):', err.message);
			// Don't show error - cart might just be empty or user needs to login
		}
		
		// Also subscribe to auth changes
		const unsub = isAuthed.subscribe((authed) => {
			isUserAuthed = authed;
			const guest = hasGuestSession();
			hasGuest = guest;
			if (authed || guest) {
				loadCart();
			}
		});
		return unsub;
	});

	async function incrementQty(item) {
		console.log('[cart] Increment clicked for item:', item);
		if (item.quantity >= 10) {
			console.log('[cart] Quantity already at max (10)');
			return;
		}
		if (isUpdating) {
			console.log('[cart] Already updating, skipping');
			return;
		}
		
		try {
			console.log('[cart] Starting increment for product_id:', item.id, 'size:', item.size);
			isUpdating = true;
			const result = await incrementQuantity(item.id, item.size);
			console.log('[cart] Increment successful:', result);
		} catch (err) {
			console.error('[cart] Failed to increment:', err);
			// Set toast state directly without triggering reactive updates
			const errorMsg = err.message || 'Failed to update quantity. Please try again.';
			toastMessage = errorMsg;
			toastType = 'error';
			// Use requestAnimationFrame to avoid infinite loop
			requestAnimationFrame(() => {
				toastOpen = true;
			});
		} finally {
			isUpdating = false;
		}
	}

	async function decrementQty(item) {
		console.log('[cart] Decrement clicked for item:', item);
		if (item.quantity <= 1) {
			console.log('[cart] Quantity already at min (1)');
			return;
		}
		if (isUpdating) {
			console.log('[cart] Already updating, skipping');
			return;
		}
		
		try {
			console.log('[cart] Starting decrement for product_id:', item.id, 'size:', item.size);
			isUpdating = true;
			const result = await decrementQuantity(item.id, item.size);
			console.log('[cart] Decrement successful:', result);
		} catch (err) {
			console.error('[cart] Failed to decrement:', err);
			toastMessage = err.message || 'Failed to update quantity. Please try again.';
			toastType = 'error';
			toastOpen = true;
		} finally {
			isUpdating = false;
		}
	}

	async function handleRemove(item) {
		try {
			isUpdating = true;
			await removeFromCart(item.id, item.size);
			console.log('[cart] Item removed successfully');
		} catch (err) {
			console.error('[cart] Failed to remove item:', err);
			toastMessage = err.message || 'Failed to remove item. Please try again.';
			toastType = 'error';
			toastOpen = true;
		} finally {
			isUpdating = false;
		}
	}

	async function handleProceedToCheckout() {
		console.log('[cart] 🚀 handleProceedToCheckout called');
		
		// Clear any previous errors
		verifyError = '';
		isVerifying = true;
		
		// Re-check guest session status
		const currentAuth = get(isAuthed);
		const token = get(accessToken);
		let currentGuest = hasGuestSession();
		
		console.log('[cart] Auth state:', { currentAuth, hasToken: !!token, currentGuest, isVerifying });
		
		// Don't block - let API call proceed (cookies sent automatically)
		try {
			console.log('[cart] 📞 Calling verifyStock()...');
			const result = await verifyStock();
			console.log('[cart] ✅ verifyStock result:', result);
			
			if (result && result.success) {
				// API succeeded = authentication is valid
				// If no token and not authenticated, then guest session MUST exist
				if (!token && !currentAuth) {
					hasGuest = true;
					isUserAuthed = false;
					console.log('[cart] ✅ API succeeded - guest session confirmed');
				}
				
				// Clear error immediately and redirect
				verifyError = '';
				console.log('[cart] Redirecting to /checkout/shipping...');
				await goto('/checkout/shipping');
				return;
			} else if (result.errors && result.errors.length > 0) {
				// Show stock errors
				verifyError = result.errors.map(e => `${e.name} (Size ${e.size}): ${e.message}`).join('; ');
			} else {
				verifyError = 'Stock verification failed. Please try again.';
			}
		} catch (err) {
			console.error('[cart] verifyStock error:', err);
			// Check if this is an auth error
			if (err.message && (err.message.includes('log in') || err.message.includes('authenticated'))) {
				// Re-check guest session - cookie might exist
				const updatedGuest = hasGuestSession();
				if (updatedGuest) {
					hasGuest = true;
					verifyError = '';
					console.log('[cart] Guest session detected, retrying verifyStock...');
					try {
						const retryResult = await verifyStock();
						if (retryResult.success) {
							hasGuest = true; // Ensure it's set
							await goto('/checkout/shipping');
							return;
						}
					} catch (retryErr) {
						console.error('[cart] Retry failed:', retryErr);
						verifyError = retryErr.message || 'Failed to verify stock';
					}
				} else {
					verifyError = 'Please log in or continue as guest to proceed to checkout.';
				}
			} else {
				verifyError = err.message || 'Failed to verify stock';
			}
		} finally {
			isVerifying = false;
		}
	}
</script>

<div class="mx-auto max-w-4xl">
	<h1 class="text-2xl font-semibold">Your Cart</h1>

	{#if isLoading}
		<p class="mt-6 text-white/60">Loading cart...</p>
	{:else if items.length === 0 && !isUserAuthed && !hasGuest}
		<div class="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
			<p class="text-white/60">Please log in or continue as guest to view your cart</p>
			<a 
				href="/login" 
				class="mt-4 inline-block rounded-full bg-white px-6 py-2 text-sm font-semibold text-neutral-900 hover:bg-white/90"
				on:click={(e) => {
					const currentUrl = $page.url.pathname + $page.url.search;
					saveRedirectBeforeLogin(currentUrl);
				}}
			>
				Log In
			</a>
		</div>
	{:else if items.length === 0}
		<p class="mt-6 text-white/60">Your cart is empty.</p>
	{:else}
		<div class="mt-6 space-y-4">
			{#each items as item (item.id + '-' + item.size)}
				<div class="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
					<img src={item.image} alt="" class="h-20 w-20 rounded-xl object-cover" />
					<div class="flex-1">
						<p class="text-sm font-medium">{item.name}</p>
						<p class="text-xs text-white/60 mt-1">Size: UK {item.size}</p>
						<p class="text-xs text-white/60">₹ {item.price.toLocaleString('en-IN')} each</p>
					</div>
					<div class="flex items-center gap-3">
						<div class="flex items-center gap-2 rounded-lg border border-white/20 bg-neutral-900">
							<button
								class="px-3 py-1 text-lg hover:text-white disabled:text-white/30 disabled:cursor-not-allowed transition-colors"
								on:click={() => decrementQty(item)}
								disabled={item.quantity <= 1 || isUpdating}
								type="button"
							>
								−
							</button>
							<span class="w-8 text-center text-sm">{item.quantity}</span>
							<button
								class="px-3 py-1 text-lg hover:text-white disabled:text-white/30 disabled:cursor-not-allowed transition-colors"
								on:click={() => incrementQty(item)}
								disabled={item.quantity >= 10 || isUpdating}
								type="button"
							>
								+
							</button>
						</div>
						<button
							class="rounded-lg bg-red-500/20 px-3 py-2 text-xs text-red-300 hover:bg-red-500/30"
							on:click={() => handleRemove(item)}
						>
							Remove
						</button>
					</div>
				</div>
			{/each}
		</div>

		{#if verifyError}
			<div class="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
				<p class="font-semibold mb-2">⚠️ Stock verification failed</p>
				<p>{verifyError}</p>
				<p class="mt-2 text-xs text-red-200">Please remove unavailable items or reduce quantities before proceeding to checkout.</p>
			</div>
		{/if}

		<div class="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-white/60">Subtotal ({items.reduce((s, it) => s + it.quantity, 0)} items)</p>
					<p class="text-2xl font-bold">₹ {total.toLocaleString('en-IN')}</p>
				</div>
				<div class="flex gap-3">
					<button
						class="rounded-full bg-white/10 px-5 py-2.5 text-sm hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
						on:click={async () => {
							if (confirm('Are you sure you want to clear your cart?')) {
								try {
									isUpdating = true;
									await clearCart();
									console.log('[cart] Cart cleared successfully');
								} catch (err) {
									console.error('[cart] Failed to clear cart:', err);
									toastMessage = err.message || 'Failed to clear cart. Please try again.';
									toastType = 'error';
									toastOpen = true;
								} finally {
									isUpdating = false;
								}
							}
						}}
						disabled={isUpdating}
					>
						Clear Cart
					</button>
					<button
						class="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/40"
						on:click={(e) => {
							console.log('[cart] 🔘 Button clicked! isVerifying:', isVerifying);
							e.preventDefault();
							handleProceedToCheckout();
						}}
						disabled={isVerifying}
					>
						{isVerifying ? 'Verifying...' : 'Proceed to Checkout'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Toast Notification -->
<Toast
	bind:open={toastOpen}
	message={toastMessage}
	type={toastType}
	duration={4000}
/>

