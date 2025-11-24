<script>
	import { cartCount, loadCart } from '$lib/stores/cart.js';
	import { isAuthed, tryRefresh, logout, profile, loadProfile } from '$lib/stores/auth.js';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { saveRedirectBeforeLogin } from '$lib/utils/login-redirect.js';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	
	let showLogoutConfirm = $state(false);
	
	// Attempt a silent refresh once on client boot
	onMount(async () => {
		try {
			const refreshResult = await tryRefresh();
			if (refreshResult?.accessToken) {
				// Load minimal profile (only username) for header display
				await loadProfile(null, true); // minimal=true
				// Load cart after successful auth
				await loadCart();
			}
		} catch (err) {
			// Silent fail - user needs to login
			console.log('[auth] No valid session on page load');
		}
	});
	
	function nav(to) { goto(to); }
	
	function handleLogoutClick() {
		showLogoutConfirm = true;
	}
	
	async function handleLogoutConfirm() {
		await logout();
	}
</script>

<header class="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/80 backdrop-blur">
	<div class="w-full flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8 xl:px-12">
		<button class="text-xl font-semibold tracking-wide" on:click={() => nav('/')}>Skyline</button>
		<nav class="flex items-center gap-6 text-sm">
			<a href="/products" class="text-white/80 hover:text-white">Products</a>
			<a href="/cart" class="text-white/80 hover:text-white">Cart <span class="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-xs">{$cartCount}</span></a>
			{#if $isAuthed}
				<a href="/orders" class="text-white/80 hover:text-white">Orders</a>
				<span class="text-white/90 font-medium">
					Hi{$profile?.first_name ? `, ${$profile.first_name}` : $profile ? ' (loading...)' : ' (no user)'}!
				</span>
				<button class="rounded-full bg-white/10 px-4 py-1.5 hover:bg-white/20" on:click={handleLogoutClick}>Logout</button>
			{:else}
				<a 
					href="/login" 
					class="text-white/80 hover:text-white"
					on:click={(e) => {
						saveRedirectBeforeLogin();
					}}
				>Login</a>
				<a href="/signup" class="text-white/80 hover:text-white">Sign up</a>
			{/if}
		</nav>
	</div>
	
	<!-- Logout Confirmation Dialog -->
	<ConfirmDialog
		bind:open={showLogoutConfirm}
		title="Log Out"
		message="Are you sure you want to log out?"
		confirmText="Log Out"
		cancelText="Cancel"
		confirmColor="primary"
		onConfirm={handleLogoutConfirm}
	/>
</header>

