<script>
	import { onMount } from 'svelte';
	import { login, loadProfile } from '$lib/stores/auth.js';
	import { loadCart } from '$lib/stores/cart.js';
	import { goto } from '$app/navigation';
	import { getRedirectFromCookie, deleteRedirectCookie } from '$lib/utils/login-redirect.js';
	
	let email = '';
	let password = '';
	let error = '';
	
	async function onSubmit(e) {
		e.preventDefault();
		error = '';
		try {
			await login({ email, password });
			// Profile is loaded inside login() function now
			// Load cart after successful login
			await loadCart();
			
			// Read redirect URL from cookie
			const redirectUrl = getRedirectFromCookie();
			
			// Delete the cookie
			deleteRedirectCookie();
			
			// Redirect to the original page or default to home
			const targetUrl = redirectUrl || '/';
			console.log('[login] Redirecting to:', targetUrl);
			goto(targetUrl);
		} catch (err) {
			error = err.message || 'Login failed';
		}
	}
</script>

<div class="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
	<h1 class="text-xl font-semibold">Login</h1>
	<form class="mt-6 space-y-4" on:submit={onSubmit}>
		<input type="email" placeholder="Email" class="w-full rounded-xl bg-neutral-900 px-3 py-2 text-sm" bind:value={email} required />
		<input type="password" placeholder="Password" class="w-full rounded-xl bg-neutral-900 px-3 py-2 text-sm" bind:value={password} required />
		<button class="w-full rounded-full bg-white px-4 py-2 text-neutral-900 hover:bg-white/90">Sign in</button>
	</form>
	{#if error}<p class="mt-3 text-sm text-red-400">{error}</p>{/if}
	<p class="mt-4 text-sm text-white/60">No account? <a class="text-white underline" href="/signup">Create one</a></p>
	</div>

