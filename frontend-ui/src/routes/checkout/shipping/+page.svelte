<script>
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import { accessToken, isAuthed } from '$lib/stores/auth.js';
	import { hasGuestSession } from '$lib/utils/guest.js';
	import { saveShippingAddress, saveAddressToProfile, getCart } from '$lib/utils/api.js';
	import Toast from '$lib/components/Toast.svelte';
	
	let postalRef;
	let address = $state({
		line1: '',
		line2: '',
		city: '',
		state: '',
		postal_code: '',
		country: 'India'
	});
	
	let isSaving = $state(false);
	let isSavingToProfile = $state(false);
	let error = $state('');
	let token = $state('');
	let isUserAuthed = $state(false);
	let hasGuest = $state(false);
	let toastOpen = $state(false);
	let toastMessage = $state('');
	let toastType = $state('success');
	
	// Subscribe to access token and auth state
	$effect(() => {
		const unsub1 = accessToken.subscribe((v) => (token = v));
		const unsub2 = isAuthed.subscribe((v) => {
			isUserAuthed = v;
			hasGuest = hasGuestSession();
		});
		hasGuest = hasGuestSession();
		return () => { unsub1(); unsub2(); };
	});
	
	// Prefill from cart address if present
	$effect(async () => {
		// Check both authenticated and guest
		const authed = get(isAuthed);
		const guest = hasGuestSession();
		
		if (!authed && !guest) return;
		
		try {
			// Pass token only if authenticated (guests use cookie/header)
			const data = await getCart(authed ? token : null);
			if (data?.success && data.cart?.address) {
				const a = data.cart.address;
				address = {
					line1: a.line1 || '',
					line2: a.line2 || '',
					city: a.city || '',
					state: a.state || '',
					postal_code: a.postal_code || '',
					country: a.country || 'India',
					type: 'shipping'
				};
				if (postalRef) postalRef.value = address.postal_code;
			}
		} catch (e) {
			// ignore prefill errors
		}
	});
	
	function handleBack() {
		goto('/cart');
	}
	
	async function handleContinue() {
		// Check both authenticated and guest
		const authed = get(isAuthed);
		const guest = hasGuestSession();
		isUserAuthed = authed;
		hasGuest = guest;
		
		if (!authed && !guest) {
			error = 'Please log in or continue as guest';
			return;
		}
		
		isSaving = true;
		error = '';
		
		try {
			// Save shipping address to cart
			// Pass token only if authenticated (guests use cookie/header)
			await saveShippingAddress(authed ? token : null, address);
			// Redirect to order summary
			await goto('/checkout/summary');
		} catch (err) {
			console.error('[shipping] Failed to save address:', err);
			error = err.message || 'Failed to save shipping address';
		} finally {
			isSaving = false;
		}
	}
	
	async function handleSaveToProfile() {
		// This feature is only for authenticated users
		const authed = get(isAuthed);
		if (!authed) {
			error = 'Please log in to save address to your profile';
			toastMessage = error;
			toastType = 'error';
			toastOpen = true;
			return;
		}
		
		isSavingToProfile = true;
		error = '';
		
		try {
			await saveAddressToProfile(token, address);
			toastMessage = 'Address saved to your profile!';
			toastType = 'success';
			toastOpen = true;
		} catch (err) {
			error = err.message || 'Failed to save address to profile';
			toastMessage = error;
			toastType = 'error';
			toastOpen = true;
		} finally {
			isSavingToProfile = false;
		}
	}
</script>

<div class="mx-auto max-w-2xl">
	<h1 class="text-2xl font-semibold">Shipping Address</h1>
	
	<form class="mt-6 space-y-4" on:submit|preventDefault={handleContinue}>
		<div>
			<label class="block text-sm font-medium text-white/80 mb-2">Address Line 1</label>
			<input
				type="text"
				class="w-full rounded-lg border border-white/20 bg-neutral-900 px-4 py-2.5 text-sm focus:border-white/40 focus:outline-none"
				bind:value={address.line1}
				required
			/>
		</div>
		
		<div>
			<label class="block text-sm font-medium text-white/80 mb-2">Address Line 2 (Optional)</label>
			<input
				type="text"
				class="w-full rounded-lg border border-white/20 bg-neutral-900 px-4 py-2.5 text-sm focus:border-white/40 focus:outline-none"
				bind:value={address.line2}
			/>
		</div>
		
		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class="block text-sm font-medium text-white/80 mb-2">City</label>
				<input
					type="text"
					class="w-full rounded-lg border border-white/20 bg-neutral-900 px-4 py-2.5 text-sm focus:border-white/40 focus:outline-none"
					bind:value={address.city}
					required
				/>
			</div>
			
			<div>
				<label class="block text-sm font-medium text-white/80 mb-2">State</label>
				<input
					type="text"
					class="w-full rounded-lg border border-white/20 bg-neutral-900 px-4 py-2.5 text-sm focus:border-white/40 focus:outline-none"
					bind:value={address.state}
					required
				/>
			</div>
		</div>
		
		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class="block text-sm font-medium text-white/80 mb-2">Postal Code</label>
				<input
					type="text"
					bind:this={postalRef}
					class="w-full rounded-lg border border-white/20 bg-neutral-900 px-4 py-2.5 text-sm focus:border-white/40 focus:outline-none"
					bind:value={address.postal_code}
					required
					inputmode="numeric"
					maxlength="6"
					autocomplete="postal-code"
					on:input={(e) => {
						let cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
						address.postal_code = cleaned;
						if (postalRef) postalRef.value = cleaned;
					}}
				/>
			</div>

			
			<div>
				<label class="block text-sm font-medium text-white/80 mb-2">Country</label>
				<input
					type="text"
					class="w-full rounded-lg border border-white/20 bg-neutral-900 px-4 py-2.5 text-sm focus:border-white/40 focus:outline-none"
					bind:value={address.country}
					required
				/>
			</div>
		</div>
		
		{#if error}
			<div class="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
				{error}
			</div>
		{/if}
		
		<div class="flex gap-3">
			<button
				type="button"
				class="rounded-full bg-emerald-600/20 px-6 py-2.5 text-sm text-emerald-300 hover:bg-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-50"
				on:click={handleSaveToProfile}
				disabled={isSavingToProfile}
			>
				{isSavingToProfile ? 'Saving...' : 'Save my address'}
			</button>
		</div>
		
		<div class="flex gap-3 pt-2">
			<button
				type="button"
				class="flex-1 rounded-full bg-white/10 px-6 py-3 text-sm hover:bg-white/20"
				on:click={handleBack}
			>
				Back to Cart
			</button>
			<button
				type="submit"
				class="flex-1 rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-900 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
				disabled={isSaving}
			>
				{isSaving ? 'Saving...' : 'Continue to Summary'}
			</button>
		</div>
	</form>
</div>

<!-- Toast Notification -->
<Toast
	bind:open={toastOpen}
	message={toastMessage}
	type={toastType}
	duration={3000}
/>

