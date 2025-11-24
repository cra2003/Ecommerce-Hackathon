<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import ImageGallery from '$lib/components/ImageGallery.svelte';
	import { isAuthed, accessToken } from '$lib/stores/auth.js';
	import { loadCart } from '$lib/stores/cart.js';
	import { onMount } from 'svelte';
	import { hasGuestSession, getGuestSessionId } from '$lib/utils/guest.js';
	import LoginModal from '$lib/components/LoginModal.svelte';
	
	const CART_API = import.meta.env.VITE_CART_API || 'https://cart-worker.aadhi18082003.workers.dev';
	
	let { data } = $props();
	const product = data.product;

	let selectedSize = $state(null);
	let activeTab = $state('details');
	let addToCartError = $state('');
	let isUserAuthed = $state(false);
	let authToken = $state('');
	let isAddingToCart = $state(false);
	let showNotification = $state(false);
	let notificationMessage = $state('');
	let notificationType = $state('success'); // 'success' | 'error' | 'warning'
	let showLoginModal = $state(false);
	let hasGuestSessionActive = $state(false); // Track if guest session was just created
	
	// Subscribe to auth state and token
	$effect(() => {
		const unsub1 = isAuthed.subscribe((v) => (isUserAuthed = v));
		const unsub2 = accessToken.subscribe((v) => (authToken = v || ''));
		
		// Check sessionStorage for guest session on mount/page load
		if (typeof window !== 'undefined') {
			const guestFlag = sessionStorage.getItem('guest_session_active') === 'true';
			if (guestFlag) {
				hasGuestSessionActive = true;
				console.log('[product-page] Restored guest session flag from sessionStorage');
			}
		}
		
		return () => { unsub1(); unsub2(); };
	});

	const sizes = product?.sizes ?? [];
	const stockBySize = product?.stockBySize ?? {};

	function selectSize(size) {
		const hasStock = (stockBySize?.[size] ?? 0) > 0;
		if (!hasStock) return;
		selectedSize = size;
		addToCartError = '';
	}

	function showNotif(message, type = 'success') {
		notificationMessage = message;
		notificationType = type;
		showNotification = true;
		
		// Auto-hide after 3 seconds
		setTimeout(() => {
			showNotification = false;
		}, 3000);
	}

	async function handleAddToCart(skipAuthCheck = false) {
		// Check if user is authenticated OR has guest session
		// skipAuthCheck is true when retrying after guest session creation
		if (!skipAuthCheck) {
			// Check if user is authenticated
			if (!isUserAuthed) {
				// If not authenticated, check for guest session (flag or sessionStorage)
				let isGuest = hasGuestSessionActive;
				
				// Also check sessionStorage for persistence across page interactions
				if (!isGuest && typeof window !== 'undefined') {
					isGuest = sessionStorage.getItem('guest_session_active') === 'true';
					if (isGuest) {
						hasGuestSessionActive = true; // Sync the state
					}
				}
				
				if (!isGuest) {
					// No auth and no guest - show login modal
					showLoginModal = true;
					return;
				}
			}
		}

		if (!selectedSize) {
			showNotif('Please select a size', 'warning');
			return;
		}

		// Show loading state
		isAddingToCart = true;
		addToCartError = '';

		const payload = {
			product_id: product.id,
			sku: product.sku,
			size: selectedSize,
			quantity: 1
		};

		try {
			// Wait for API call to complete
			// Use the API utility function which handles both auth and guest headers
			const token = (isUserAuthed && authToken) ? authToken : null;
			const response = await fetch(`${CART_API}/cart/add`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(token ? { 'Authorization': `Bearer ${token}` } : {}),
					...(!token && hasGuestSession() ? { 'X-Guest-Session-Id': getGuestSessionId() } : {})
				},
				body: JSON.stringify(payload),
				credentials: 'include' // Important for guest cookie
			});

			console.log('[add-to-cart] Response status:', response.status);

			const data = await response.json().catch(() => ({}));

			// Check if response is 200 OK
			if (response.ok && data.success) {
				// Show success notification
				showNotif('Product added to cart!', 'success');
				
				// Update cart count in navbar by reloading cart
				await loadCart();
			} else {
				// Show error if API call failed
				const errorMsg = data.error || data.message || 'Failed to add product to cart';
				
				// If error is about authentication, show login modal instead of error
				if (response.status === 401 && (errorMsg.includes('Authentication required') || errorMsg.includes('log in') || errorMsg.includes('guest'))) {
					showLoginModal = true;
					return;
				}
				
				showNotif(errorMsg, 'error');
				addToCartError = errorMsg;
			}
		} catch (err) {
			console.error('[add-to-cart] Error:', err);
			showNotif('Failed to add product to cart. Please try again.', 'error');
			addToCartError = err.message || 'Network error';
		} finally {
			// Always reset loading state
			isAddingToCart = false;
		}
	}
	
	function handleLoginModalLogin() {
		goto('/login');
	}
	
	function handleGuestSuccess() {
		console.log('[product-page] Guest session success handler called');
		// Guest session created - mark as active and retry add to cart
		hasGuestSessionActive = true;
		
		// Store in sessionStorage for persistence
		if (typeof window !== 'undefined') {
			sessionStorage.setItem('guest_session_active', 'true');
			console.log('[product-page] Guest session flag set in sessionStorage');
		}
		
		// Close modal first
		showLoginModal = false;
		
		// Wait a bit longer to ensure cookie is set and modal is fully closed
		// The cookie needs time to be set by the browser after the Set-Cookie header
		setTimeout(() => {
			console.log('[product-page] Retrying add to cart with skipAuthCheck=true');
			console.log('[product-page] Current state - hasGuestSessionActive:', hasGuestSessionActive);
			// Skip auth check since we just created the session
			// Cookie should be sent automatically with credentials: 'include'
			handleAddToCart(true);
		}, 500); // Increased delay to ensure cookie is set
	}

</script>

{#if product}
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
		<div class="lg:col-span-7">
			<ImageGallery image={product.image} />
		</div>
		<div class="lg:col-span-5">
			<h1 class="text-2xl font-semibold">{product.name}</h1>

			<p class="mt-2 text-sm {product.inStock ? 'text-emerald-400' : 'text-red-400'}">
				{product.inStock ? 'In stock' : 'Out of stock'}
			</p>

			{#if product.isOnSale}
				<div class="mt-4 flex items-baseline gap-3">
					<p class="text-3xl font-bold text-emerald-300">
						₹ {product.price.toLocaleString('en-IN')}
					</p>
					<p class="text-sm text-white/50 line-through">
						₹ {product.base_price.toLocaleString('en-IN')}
					</p>
					{#if product.discountPercentage}
						<span class="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
							-{product.discountPercentage}%
						</span>
					{/if}
				</div>
			{:else}
				<p class="mt-4 text-3xl font-bold">
					₹ {product.price.toLocaleString('en-IN')}
				</p>
			{/if}

			<!-- Size selector -->
			<div class="mt-8">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium">Select Size</p>
						<p class="text-xs text-white/60 mt-1">
							Fits small; we recommend ordering half a size up
						</p>
					</div>
					<span class="text-xs text-white/60">Size Guide</span>
				</div>

				<div class="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
					{#each sizes as size}
						{@const hasStock = (stockBySize?.[size] ?? 0) > 0}
						<button
							type="button"
							class={`flex h-10 items-center justify-center rounded-lg border text-xs
							 ${hasStock ? 'border-white/40 hover:border-white' : 'border-white/10 text-white/40 cursor-not-allowed'}
							 ${selectedSize === size && hasStock ? 'bg-white text-neutral-900' : 'bg-transparent'}`}
							disabled={!hasStock}
							on:click={() => selectSize(size)}
						>
							UK {size}
						</button>
					{/each}
				</div>
			</div>

		<div class="mt-8">
			{#if addToCartError}
				<p class="mb-2 text-sm text-red-400">{addToCartError}</p>
			{/if}
			<div class="flex gap-3">
				<button
					class="flex-1 rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-900 hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-neutral-700"
					type="button"
					on:click={handleAddToCart}
					disabled={!selectedSize || !product.inStock || isAddingToCart}
				>
					{isAddingToCart ? 'Adding...' : 'Add to Bag'}
				</button>
				<a
					href="/products"
					class="rounded-full bg-white/10 px-6 py-3 text-sm hover:bg-white/20"
				>
					Back to products
				</a>
			</div>
		</div>

			<!-- Details / Materials / Features tabs -->
			<div class="mt-10 text-sm text-white/80">
				<div class="flex border-b border-white/10 gap-6">
					{#each ['details','materials','features'] as tab}
						<button
							type="button"
							class={`pb-3 text-xs uppercase tracking-wide ${
								activeTab === tab
									? 'border-b-2 border-white font-semibold text-white'
									: 'text-white/50 hover:text-white'
							}`}
							on:click={() => (activeTab = tab)}
						>
							{tab === 'details'
								? 'View Product Details'
								: tab === 'materials'
									? 'Materials'
									: 'Features'}
						</button>
					{/each}
				</div>

				{#if activeTab === 'details'}
					<div class="mt-4 space-y-3">
						{#if product.description}
							<p class="text-white/70 text-sm">{product.description}</p>
						{/if}
						<ul class="space-y-1 text-xs text-white/60">
							{#if product.category}<li><span class="font-semibold text-white/70">Category:</span> {product.category}</li>{/if}
							{#if product.brand}<li><span class="font-semibold text-white/70">Brand:</span> {product.brand}</li>{/if}
							{#if product.gender}<li><span class="font-semibold text-white/70">Gender:</span> {product.gender}</li>{/if}
							{#if product.target_audience}<li><span class="font-semibold text-white/70">For:</span> {product.target_audience}</li>{/if}
							{#if product.color_family}<li><span class="font-semibold text-white/70">Colour:</span> {product.color_family}</li>{/if}
						</ul>
					</div>
				{:else if activeTab === 'materials'}
					<div class="mt-4 space-y-1 text-xs text-white/60">
						{#if product.materials?.upper}<p><span class="font-semibold text-white/70">Upper material:</span> {product.materials.upper}</p>{/if}
						{#if product.materials?.sole}<p><span class="font-semibold text-white/70">Sole material:</span> {product.materials.sole}</p>{/if}
						{#if product.materials?.closure_type}<p><span class="font-semibold text-white/70">Closure:</span> {product.materials.closure_type}</p>{/if}
						{#if product.materials?.toe_style}<p><span class="font-semibold text-white/70">Toe style:</span> {product.materials.toe_style}</p>{/if}
						{#if product.materials?.heel_type}<p><span class="font-semibold text-white/70">Heel type:</span> {product.materials.heel_type}</p>{/if}
						{#if product.materials?.heel_height_cm != null}<p><span class="font-semibold text-white/70">Heel height:</span> {product.materials.heel_height_cm} cm</p>{/if}
						{#if product.materials?.weight_grams != null}<p><span class="font-semibold text-white/70">Weight:</span> {product.materials.weight_grams} g</p>{/if}
					</div>
				{:else if activeTab === 'features'}
					<div class="mt-4 space-y-2">
						<ul class="space-y-1 text-xs text-white/60">
							{#if product.flexibility}<li><span class="font-semibold text-white/70">Flexibility:</span> {product.flexibility}</li>{/if}
							{#if product.cushioning_level}<li><span class="font-semibold text-white/70">Cushioning:</span> {product.cushioning_level}</li>{/if}
							{#if product.water_resistance}<li><span class="font-semibold text-white/70">Water resistance:</span> {product.water_resistance}</li>{/if}
						</ul>
						{#if product.features && product.features.length}
							<ul class="mt-2 list-disc list-inside space-y-1 text-xs text-white/70">
								{#each product.features as feat}
									<li>{feat}</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<p>Product not found.</p>
{/if}

<!-- Simple Notification Banner -->
{#if showNotification}
	<div 
		class="fixed top-4 right-4 z-50 flex items-center gap-3 rounded-lg border p-4 shadow-lg max-w-md animate-fade-in
		{notificationType === 'success' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : ''}
		{notificationType === 'error' ? 'bg-red-500/20 border-red-500/40 text-red-300' : ''}
		{notificationType === 'warning' ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' : ''}"
		role="alert"
	>
		<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			{#if notificationType === 'success'}
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			{:else if notificationType === 'error'}
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			{:else}
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
			{/if}
		</svg>
		<p class="flex-1 text-sm font-medium">{notificationMessage}</p>
		<button
			type="button"
			class="ml-2 flex-shrink-0 rounded hover:bg-white/10 p-1 transition-colors"
			on:click={() => showNotification = false}
			aria-label="Close"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>
{/if}

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	.animate-fade-in {
		animation: fade-in 0.3s ease-out;
	}
</style>

<!-- Login Modal -->
<LoginModal 
	bind:open={showLoginModal}
	on:login={handleLoginModalLogin}
	on:guest-success={(e) => {
		console.log('[product-page] LoginModal guest-success event received');
		handleGuestSuccess();
	}}
/>

