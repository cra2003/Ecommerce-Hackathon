<script>
	let { 
		open = $bindable(false),
		title = 'Confirm',
		message = 'Are you sure?',
		confirmText = 'Confirm',
		cancelText = 'Cancel',
		confirmColor = 'primary', // 'primary' | 'danger' | 'warning'
		onConfirm,
		onCancel
	} = $props();
	
	function handleConfirm() {
		open = false;
		if (onConfirm) {
			onConfirm();
		}
	}
	
	function handleCancel() {
		open = false;
		if (onCancel) {
			onCancel();
		}
	}
	
	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			handleCancel();
		}
	}
	
	// Handle ESC key
	$effect(() => {
		if (!open) return;
		
		function handleKeyDown(e) {
			if (e.key === 'Escape') {
				handleCancel();
			}
		}
		
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});
	
	const confirmButtonClass = $derived.by(() => {
		switch (confirmColor) {
			case 'danger':
				return 'bg-red-500 hover:bg-red-600 text-white';
			case 'warning':
				return 'bg-yellow-500 hover:bg-yellow-600 text-white';
			default:
				return 'bg-white hover:bg-white/90 text-neutral-900';
		}
	});
</script>

{#if open}
	<!-- Backdrop -->
	<div 
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
		on:click={handleBackdropClick}
		on:keydown={(e) => e.key === 'Escape' && handleCancel()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="dialog-title"
		aria-describedby="dialog-message"
	>
		<!-- Dialog -->
		<div 
			class="mx-4 w-full max-w-md rounded-2xl border border-white/20 bg-neutral-900 p-6 shadow-2xl transform transition-all"
			on:click|stopPropagation
		>
			<!-- Title -->
			<h2 id="dialog-title" class="text-xl font-semibold mb-3">
				{title}
			</h2>
			
			<!-- Message -->
			<p id="dialog-message" class="text-white/80 mb-6">
				{message}
			</p>
			
			<!-- Actions -->
			<div class="flex gap-3 justify-end">
				<button
					type="button"
					class="rounded-full bg-white/10 px-6 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition-colors"
					on:click={handleCancel}
				>
					{cancelText}
				</button>
				<button
					type="button"
					class="rounded-full px-6 py-2.5 text-sm font-semibold transition-colors {confirmButtonClass}"
					on:click={handleConfirm}
				>
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}

