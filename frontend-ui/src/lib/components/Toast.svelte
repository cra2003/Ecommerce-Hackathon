<script>
	import { onMount } from 'svelte';
	
	let { 
		message = '',
		type = 'info', // 'success' | 'error' | 'info' | 'warning'
		duration = 3000,
		open = $bindable(false)
	} = $props();
	
	let timeoutId = $state(null);
	
	$effect(() => {
		if (open && duration > 0) {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
			timeoutId = setTimeout(() => {
				open = false;
			}, duration);
		}
		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	});
	
	function handleClose() {
		open = false;
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
	}
	
	const typeStyles = $derived.by(() => {
		switch (type) {
			case 'success':
				return {
					bg: 'bg-emerald-500/20 border-emerald-500/40',
					text: 'text-emerald-300',
					icon: 'M5 13l4 4L19 7'
				};
			case 'error':
				return {
					bg: 'bg-red-500/20 border-red-500/40',
					text: 'text-red-300',
					icon: 'M6 18L18 6M6 6l12 12'
				};
			case 'warning':
				return {
					bg: 'bg-yellow-500/20 border-yellow-500/40',
					text: 'text-yellow-300',
					icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
				};
			default:
				return {
					bg: 'bg-blue-500/20 border-blue-500/40',
					text: 'text-blue-300',
					icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
				};
		}
	});
</script>

{#if open && message}
	<div 
		class="fixed top-4 right-4 z-50 flex items-center gap-3 rounded-lg border p-4 shadow-lg animate-fade-in {typeStyles.bg} {typeStyles.text} max-w-md"
		role="alert"
	>
		<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={typeStyles.icon} />
		</svg>
		<p class="flex-1 text-sm font-medium">{message}</p>
		<button
			type="button"
			class="ml-2 flex-shrink-0 rounded hover:bg-white/10 p-1 transition-colors"
			on:click={handleClose}
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

