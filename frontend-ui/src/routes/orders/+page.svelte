<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { accessToken, isAuthed } from '$lib/stores/auth.js';
	import { getOrders, cancelOrder } from '$lib/utils/api.js';
	import { saveRedirectBeforeLogin } from '$lib/utils/login-redirect.js';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Toast from '$lib/components/Toast.svelte';
	
	let orders = $state([]);
	let isLoading = $state(true);
	let error = $state('');
	let token = $state('');
	let userAuthed = $state(false);
	let cancellingOrderId = $state(null);
	let showCancelConfirm = $state(false);
	let pendingCancelOrderId = $state(null);
	let toastOpen = $state(false);
	let toastMessage = $state('');
	let toastType = $state('info');
	
	// Subscribe to access token and auth state
	$effect(() => {
		const u1 = accessToken.subscribe((v) => (token = v));
		const u2 = isAuthed.subscribe((v) => (userAuthed = v));
		return () => { u1(); u2(); };
	});
	
	onMount(async () => {
		if (!userAuthed || !token) {
			error = 'Please log in to view your orders.';
			isLoading = false;
			return;
		}
		
		try {
			console.log('[orders page] Fetching orders with token:', token ? 'present' : 'missing');
			const result = await getOrders(token);
			console.log('[orders page] Orders API response:', result);
			if (result.orders) {
				console.log('[orders page] Found orders:', result.orders.length);
				orders = result.orders;
			} else {
				console.log('[orders page] No orders array in response, setting empty');
				orders = [];
			}
		} catch (err) {
			console.error('[orders page] Error fetching orders:', err);
			error = err.message || 'Failed to load orders';
		} finally {
			isLoading = false;
		}
	});
	
	function parseJSON(field, fallback = null) {
		if (!field) return fallback;
		try {
			return typeof field === 'string' ? JSON.parse(field) : field;
		} catch {
			return fallback;
		}
	}
	
	function formatDate(dateString) {
		if (!dateString) return 'N/A';
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString('en-IN', { 
				year: 'numeric', 
				month: 'short', 
				day: 'numeric' 
			});
		} catch {
			return dateString;
		}
	}
	
	function getStatusColor(status) {
		switch (status?.toLowerCase()) {
			case 'pending':
				return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
			case 'confirmed':
			case 'processing':
				return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
			case 'shipped':
				return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
			case 'delivered':
			case 'completed':
				return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
			case 'cancelled':
				return 'bg-red-500/20 text-red-300 border-red-500/30';
			default:
				return 'bg-white/10 text-white/60 border-white/20';
		}
	}
	
	function getPaymentStatusColor(status) {
		switch (status?.toLowerCase()) {
			case 'paid':
			case 'completed':
				return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
			case 'pending':
				return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
			case 'failed':
			case 'refunded':
				return 'bg-red-500/20 text-red-300 border-red-500/30';
			default:
				return 'bg-white/10 text-white/60 border-white/20';
		}
	}
	
	function handleCancelOrderClick(orderId) {
		pendingCancelOrderId = orderId;
		showCancelConfirm = true;
	}
	
	async function handleCancelConfirm() {
		if (!pendingCancelOrderId || !token) {
			showCancelConfirm = false;
			pendingCancelOrderId = null;
			return;
		}
		
		const orderId = pendingCancelOrderId;
		cancellingOrderId = orderId;
		error = '';
		showCancelConfirm = false;
		
		try {
			await cancelOrder(token, orderId);
			// Remove order from local state
			orders = orders.filter(o => o.order_id !== orderId);
			// Show success toast
			toastMessage = 'Order cancelled successfully';
			toastType = 'success';
			toastOpen = true;
		} catch (err) {
			error = err.message || 'Failed to cancel order';
			toastMessage = error;
			toastType = 'error';
			toastOpen = true;
		} finally {
			cancellingOrderId = null;
			pendingCancelOrderId = null;
		}
	}
	
	function handleCancelDialogCancel() {
		showCancelConfirm = false;
		pendingCancelOrderId = null;
	}
</script>

<div class="mx-auto max-w-6xl">
	<h1 class="text-2xl font-semibold mb-6">My Orders</h1>
	
	{#if !userAuthed}
		<div class="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
			<p class="text-white/60 mb-4">Please log in to view your orders</p>
			<a 
				href="/login" 
				class="inline-block rounded-full bg-white px-6 py-2 text-sm font-semibold text-neutral-900 hover:bg-white/90"
				on:click={(e) => {
					const currentUrl = $page.url.pathname + $page.url.search;
					saveRedirectBeforeLogin(currentUrl);
				}}
			>
				Log In
			</a>
		</div>
	{:else if isLoading}
		<p class="text-white/60">Loading orders...</p>
	{:else if error}
		<div class="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
			{error}
		</div>
	{:else if orders.length === 0}
		<div class="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
			<p class="text-white/60 mb-4">You haven't placed any orders yet.</p>
			<a href="/products" class="inline-block rounded-full bg-white px-6 py-2 text-sm font-semibold text-neutral-900 hover:bg-white/90">
				Browse Products
			</a>
		</div>
	{:else}
		<div class="space-y-4">
			{#each orders as order}
				{@const orderProducts = parseJSON(order.products, [])}
				{@const orderAddress = parseJSON(order.address, null)}
				<div class="rounded-2xl border border-white/10 bg-white/5 p-6">
					<div class="flex items-start justify-between mb-4">
						<div>
							<h3 class="text-lg font-semibold mb-1">Order #{order.order_id}</h3>
							<p class="text-xs text-white/60">Placed on {formatDate(order.created_at)}</p>
						</div>
						<div class="text-right">
							<p class="text-lg font-bold mb-1">₹ {Number(order.total || 0).toLocaleString('en-IN')}</p>
							<div class="flex flex-col gap-1 items-end">
								<div class="flex gap-2">
									<span class="px-2 py-1 rounded text-xs border {getStatusColor(order.status)}">
										Order: {order.status || 'Pending'}
									</span>
									<span class="px-2 py-1 rounded text-xs border {getPaymentStatusColor(order.payment_status)}">
										Payment: {order.payment_status || 'Pending'}
									</span>
								</div>
							</div>
						</div>
					</div>
					
					{#if orderProducts.length > 0}
						<div class="mb-4">
							<p class="text-sm font-medium text-white/80 mb-2">Items ({orderProducts.length}):</p>
							<div class="space-y-2">
								{#each orderProducts as item}
									<div class="flex items-center gap-3 text-sm">
										{#if item.image}
											<img src={item.image} alt={item.name} class="h-12 w-12 rounded-lg object-cover" />
										{/if}
										<div class="flex-1">
											<p class="font-medium">{item.name || 'Unknown Product'}</p>
											<p class="text-xs text-white/60">Size: UK {item.size} • Qty: {item.quantity}</p>
										</div>
										<p class="font-semibold">₹ {((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}</p>
									</div>
								{/each}
							</div>
						</div>
					{/if}
					
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
						<div>
							<p class="text-white/60 mb-1">Delivery Mode</p>
							<p class="font-medium">{order.delivery_mode === 'express' ? 'Express' : 'Standard'}</p>
						</div>
						{#if order.estimated_delivery_date}
							<div>
								<p class="text-white/60 mb-1">Estimated Delivery</p>
								<p class="font-medium">{order.estimated_delivery_date}</p>
							</div>
						{/if}
					</div>
					
					{#if orderAddress}
						<div class="mt-4 pt-4 border-t border-white/10">
							<p class="text-sm text-white/60 mb-1">Shipping Address</p>
							<p class="text-sm text-white/80">
								{orderAddress.line1}
								{#if orderAddress.line2}, {orderAddress.line2}{/if}
								<br />
								{orderAddress.city}, {orderAddress.state} {orderAddress.postal_code}
								<br />
								{orderAddress.country}
							</p>
						</div>
					{/if}
					
					<div class="mt-4 pt-4 border-t border-white/10">
						<button
							class="rounded-full bg-red-500/20 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
							on:click={() => handleCancelOrderClick(order.order_id)}
							disabled={cancellingOrderId === order.order_id}
						>
							{cancellingOrderId === order.order_id ? 'Cancelling...' : 'Cancel Order'}
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
	
	<!-- Cancel Order Confirmation Dialog -->
	<ConfirmDialog
		bind:open={showCancelConfirm}
		title="Cancel Order"
		message="Are you sure you want to cancel this order? This action cannot be undone."
		confirmText="Cancel Order"
		cancelText="Keep Order"
		confirmColor="danger"
		onConfirm={handleCancelConfirm}
		onCancel={handleCancelDialogCancel}
	/>
	
	<!-- Toast Notification -->
	<Toast
		bind:open={toastOpen}
		message={toastMessage}
		type={toastType}
		duration={4000}
	/>
</div>

