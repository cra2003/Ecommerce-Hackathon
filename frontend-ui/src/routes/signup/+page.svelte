<script>
	import { register, loadProfile } from '$lib/stores/auth.js';
	import { loadCart } from '$lib/stores/cart.js';
	import { goto } from '$app/navigation';
	let first_name = '';
	let last_name = '';
	let email = '';
	let password = '';
	let error = '';
	async function onSubmit(e) {
		e.preventDefault();
		error = '';
		try {
			await register({ first_name, last_name, email, password });
			// Profile is loaded inside register() function now
			// Load cart after successful registration
			await loadCart();
			goto('/products');
		} catch (err) {
			error = err.message || 'Registration failed';
		}
	}
</script>

<div class="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
	<h1 class="text-xl font-semibold">Create account</h1>
	<form class="mt-6 space-y-4" on:submit={onSubmit}>
		<div class="grid grid-cols-2 gap-3">
			<input placeholder="First name" class="rounded-xl bg-neutral-900 px-3 py-2 text-sm" bind:value={first_name} required />
			<input placeholder="Last name" class="rounded-xl bg-neutral-900 px-3 py-2 text-sm" bind:value={last_name} required />
		</div>
		<input type="email" placeholder="Email" class="w-full rounded-xl bg-neutral-900 px-3 py-2 text-sm" bind:value={email} required />
		<input type="password" placeholder="Password" class="w-full rounded-xl bg-neutral-900 px-3 py-2 text-sm" bind:value={password} required />
		<button class="w-full rounded-full bg-white px-4 py-2 text-neutral-900 hover:bg-white/90">Create account</button>
	</form>
	{#if error}<p class="mt-3 text-sm text-red-400">{error}</p>{/if}
	<p class="mt-4 text-sm text-white/60">Have an account? <a class="text-white underline" href="/login">Sign in</a></p>
</div>

