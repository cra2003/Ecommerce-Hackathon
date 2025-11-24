<script>
	import { createEventDispatcher } from 'svelte';
	import { setGuestSessionCookie } from '$lib/utils/guest.js';
	
	const dispatch = createEventDispatcher();
	
	let name = $state('');
	let email = $state('');
	let phone = $state('');
	let error = $state('');
	let isLoading = $state(false);
	
	const AUTH_API = import.meta.env.VITE_AUTH_API || 'https://auth-worker.aadhi18082003.workers.dev';
	
	async function handleSubmit(e) {
		e.preventDefault();
		error = '';
		
		if (!name.trim() || !email.trim()) {
			error = 'Name and email are required';
			return;
		}
		
		// Basic email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			error = 'Please enter a valid email address';
			return;
		}
		
		isLoading = true;
		
		try {
			const response = await fetch(`${AUTH_API}/api/guest/init`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: name.trim(),
					email: email.trim().toLowerCase(),
					phone: phone.trim() || null
				}),
				credentials: 'include' // Important for cookies
			});
			
			const data = await response.json();
			
			if (response.ok && data.success) {
				// Success - store guest_session_id in cookie
				const guestSessionId = data.guest_session_id;
				console.log('[guest] Guest session initialized:', guestSessionId);
				
				// Store in cookie (from frontend domain)
				if (typeof window !== 'undefined' && guestSessionId) {
					setGuestSessionCookie(guestSessionId);
				}
				
				console.log('[guest] Dispatching success event');
				dispatch('success');
			} else {
				error = data.error || 'Failed to initialize guest session. Please try again.';
			}
		} catch (err) {
			console.error('[guest] Error initializing guest session:', err);
			error = 'Network error. Please check your connection and try again.';
		} finally {
			isLoading = false;
		}
	}
</script>

<form on:submit={handleSubmit} class="space-y-4">
	<div>
		<label for="guest-name" class="block text-sm font-medium mb-1">Full Name *</label>
		<input
			id="guest-name"
			type="text"
			required
			bind:value={name}
			placeholder="John Doe"
			class="w-full rounded-xl bg-neutral-800 px-4 py-2 text-sm border border-white/10 focus:border-white/30 focus:outline-none"
			disabled={isLoading}
		/>
	</div>
	
	<div>
		<label for="guest-email" class="block text-sm font-medium mb-1">Email *</label>
		<input
			id="guest-email"
			type="email"
			required
			bind:value={email}
			placeholder="john@example.com"
			class="w-full rounded-xl bg-neutral-800 px-4 py-2 text-sm border border-white/10 focus:border-white/30 focus:outline-none"
			disabled={isLoading}
		/>
	</div>
	
	<div>
		<label for="guest-phone" class="block text-sm font-medium mb-1">Phone (Optional)</label>
		<input
			id="guest-phone"
			type="tel"
			bind:value={phone}
			placeholder="+1 234 567 8900"
			class="w-full rounded-xl bg-neutral-800 px-4 py-2 text-sm border border-white/10 focus:border-white/30 focus:outline-none"
			disabled={isLoading}
		/>
	</div>
	
	{#if error}
		<p class="text-sm text-red-400">{error}</p>
	{/if}
	
	<div class="flex gap-3 pt-2">
		<button
			type="button"
			class="flex-1 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 transition-colors disabled:opacity-50"
			on:click={() => dispatch('cancel')}
			disabled={isLoading}
		>
			Cancel
		</button>
		
		<button
			type="submit"
			class="flex-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			disabled={isLoading}
		>
			{isLoading ? 'Initializing...' : 'Continue'}
		</button>
	</div>
</form>

