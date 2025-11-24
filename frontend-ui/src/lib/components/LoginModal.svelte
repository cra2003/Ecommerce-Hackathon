<script>
	import { createEventDispatcher } from 'svelte';
	import GuestForm from './GuestForm.svelte';
	
	const dispatch = createEventDispatcher();
	
	let { open = $bindable(false) } = $props();
	let showGuestForm = $state(false);
	
	function handleLogin() {
		dispatch('login');
		open = false;
	}
	
	function handleGuestClick() {
		showGuestForm = true;
	}
	
	function handleGuestSuccess() {
		console.log('[login-modal] Guest success handler called, dispatching guest-success event');
		dispatch('guest-success');
		open = false;
		showGuestForm = false;
	}
	
	function handleClose() {
		if (showGuestForm) {
			showGuestForm = false;
		} else {
			open = false;
		}
		dispatch('close');
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" on:click={handleClose}>
		<div class="relative max-w-md w-full mx-4 bg-neutral-900 rounded-2xl border border-white/10 shadow-xl" on:click|stopPropagation>
			{#if !showGuestForm}
				<!-- Login Options -->
				<div class="p-6">
					<div class="flex items-center justify-between mb-6">
						<h2 class="text-xl font-semibold">Sign In or Continue as Guest</h2>
						<button 
							type="button"
							class="text-white/60 hover:text-white transition-colors"
							on:click={handleClose}
							aria-label="Close"
						>
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
					
					<div class="space-y-3">
						<button
							type="button"
							class="w-full rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-900 hover:bg-white/90 transition-colors"
							on:click={handleLogin}
						>
							Login
						</button>
						
						<button
							type="button"
							class="w-full rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
							on:click={handleGuestClick}
						>
							Continue as Guest
						</button>
					</div>
					
					<p class="mt-4 text-xs text-white/50 text-center">
						By continuing, you agree to our Terms of Service
					</p>
				</div>
			{:else}
				<!-- Guest Form -->
				<div class="p-6">
					<div class="flex items-center justify-between mb-6">
						<h2 class="text-xl font-semibold">Guest Checkout</h2>
						<button 
							type="button"
							class="text-white/60 hover:text-white transition-colors"
							on:click={handleClose}
							aria-label="Close"
						>
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
					
					<GuestForm on:success={handleGuestSuccess} on:cancel={handleClose} />
				</div>
			{/if}
		</div>
	</div>
{/if}

