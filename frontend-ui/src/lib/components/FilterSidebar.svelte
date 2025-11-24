<script>
	import { goto } from '$app/navigation';
	import { page as currentPage } from '$app/stores';

	let { filters, activeFilters } = $props();

	let expandedFilters = $state({
		category: false,
		brand: false,
		closure_type: false,
		sole_material: false
	});

	function toggleFilter(key) {
		expandedFilters[key] = !expandedFilters[key];
	}

	function updateFilter(key, value) {
		// Get current URL parameters
		const searchParams = new URLSearchParams($currentPage.url.searchParams);
		
		if (value) {
			searchParams.set(key, value);
		} else {
			searchParams.delete(key);
		}
		searchParams.delete('page'); // Reset to page 1 when filtering
		
		// Build the new URL
		const newUrl = `${$currentPage.url.pathname}?${searchParams.toString()}`;
		
		goto(newUrl, { 
			replaceState: false,
			noScroll: false,
			keepFocus: false,
			invalidateAll: true
		});
	}


	function clearFilters() {
		// Get current URL parameters and clear all filters
		const searchParams = new URLSearchParams();
		
		// Build the new URL with no filters
		const newUrl = $currentPage.url.pathname;
		
		goto(newUrl, { 
			replaceState: false,
			noScroll: false,
			keepFocus: false,
			invalidateAll: true
		});
	}

	const hasActiveFilters = $derived(
		activeFilters.category || 
		activeFilters.brand || 
		activeFilters.closure_type || 
		activeFilters.sole_material
	);
</script>

<div class="w-full sm:w-64 space-y-0 sm:sticky sm:top-0 h-fit sm:max-h-screen overflow-y-auto pb-8 sm:pb-0">
	<div class="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
		<h2 class="text-lg font-semibold">Filters</h2>
		{#if hasActiveFilters}
			<button
				onclick={clearFilters}
				class="text-xs text-white/60 hover:text-white underline transition-colors"
			>
				Clear all
			</button>
		{/if}
	</div>

	<!-- Category Filter -->
	<div class="border-b border-white/10">
		<button
			onclick={() => toggleFilter('category')}
			class="w-full flex items-center justify-between py-4 text-left hover:text-white transition-colors"
		>
			<span class="text-sm font-medium text-white/90">
				Category
				{#if (filters.categories || []).length > 0}
					<span class="text-white/60 font-normal">({(filters.categories || []).length})</span>
				{/if}
			</span>
			<svg
				class="w-4 h-4 text-white/60 transition-transform {expandedFilters.category ? 'rotate-180' : ''}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
		{#if expandedFilters.category}
			<div class="pb-4 space-y-1 max-h-64 overflow-y-auto">
				{#each filters.categories || [] as cat}
					<label class="flex items-center gap-3 cursor-pointer group py-2 px-1 rounded-lg hover:bg-white/5 transition-colors">
						<input
							type="radio"
							name="category"
							value={cat}
							checked={activeFilters.category === cat}
							onchange={() => updateFilter('category', cat)}
							class="sr-only peer"
						/>
						<div class="relative flex items-center justify-center w-5 h-5 rounded-full border-2 border-white/30 peer-checked:border-white peer-checked:bg-white transition-all group-hover:border-white/50">
							{#if activeFilters.category === cat}
								<div class="w-2.5 h-2.5 rounded-full bg-neutral-900"></div>
							{/if}
						</div>
						<span class="text-sm text-white/80 group-hover:text-white peer-checked:text-white transition-colors flex-1">{cat}</span>
					</label>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Brand Filter -->
	<div class="border-b border-white/10">
		<button
			onclick={() => toggleFilter('brand')}
			class="w-full flex items-center justify-between py-4 text-left hover:text-white transition-colors"
		>
			<span class="text-sm font-medium text-white/90">
				Brand
				{#if (filters.brands || []).length > 0}
					<span class="text-white/60 font-normal">({(filters.brands || []).length})</span>
				{/if}
			</span>
			<svg
				class="w-4 h-4 text-white/60 transition-transform {expandedFilters.brand ? 'rotate-180' : ''}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
		{#if expandedFilters.brand}
			<div class="pb-4 space-y-1 max-h-64 overflow-y-auto">
				{#each filters.brands || [] as br}
					<label class="flex items-center gap-3 cursor-pointer group py-2 px-1 rounded-lg hover:bg-white/5 transition-colors">
						<input
							type="radio"
							name="brand"
							value={br}
							checked={activeFilters.brand === br}
							onchange={() => updateFilter('brand', br)}
							class="sr-only peer"
						/>
						<div class="relative flex items-center justify-center w-5 h-5 rounded-full border-2 border-white/30 peer-checked:border-white peer-checked:bg-white transition-all group-hover:border-white/50">
							{#if activeFilters.brand === br}
								<div class="w-2.5 h-2.5 rounded-full bg-neutral-900"></div>
							{/if}
						</div>
						<span class="text-sm text-white/80 group-hover:text-white peer-checked:text-white transition-colors flex-1">{br}</span>
					</label>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Closure Type Filter -->
	<div class="border-b border-white/10">
		<button
			onclick={() => toggleFilter('closure_type')}
			class="w-full flex items-center justify-between py-4 text-left hover:text-white transition-colors"
		>
			<span class="text-sm font-medium text-white/90">
				Closure Type
				{#if (filters.closure_types || []).length > 0}
					<span class="text-white/60 font-normal">({(filters.closure_types || []).length})</span>
				{/if}
			</span>
			<svg
				class="w-4 h-4 text-white/60 transition-transform {expandedFilters.closure_type ? 'rotate-180' : ''}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
		{#if expandedFilters.closure_type}
			<div class="pb-4 space-y-1 max-h-64 overflow-y-auto">
				{#if (filters.closure_types || []).length === 0}
					<p class="text-xs text-white/40 py-2 px-1">No options available</p>
				{:else}
					{#each filters.closure_types || [] as ct}
						<label class="flex items-center gap-3 cursor-pointer group py-2 px-1 rounded-lg hover:bg-white/5 transition-colors">
							<input
								type="radio"
								name="closure_type"
								value={ct}
								checked={activeFilters.closure_type === ct}
								onchange={() => updateFilter('closure_type', ct)}
								class="sr-only peer"
							/>
							<div class="relative flex items-center justify-center w-5 h-5 rounded-full border-2 border-white/30 peer-checked:border-white peer-checked:bg-white transition-all group-hover:border-white/50">
								{#if activeFilters.closure_type === ct}
									<div class="w-2.5 h-2.5 rounded-full bg-neutral-900"></div>
								{/if}
							</div>
							<span class="text-sm text-white/80 group-hover:text-white peer-checked:text-white transition-colors flex-1">{ct}</span>
						</label>
					{/each}
				{/if}
			</div>
		{/if}
	</div>

	<!-- Sole Material Filter -->
	<div class="border-b border-white/10">
		<button
			onclick={() => toggleFilter('sole_material')}
			class="w-full flex items-center justify-between py-4 text-left hover:text-white transition-colors"
		>
			<span class="text-sm font-medium text-white/90">
				Sole Material
				{#if (filters.sole_materials || []).length > 0}
					<span class="text-white/60 font-normal">({(filters.sole_materials || []).length})</span>
				{/if}
			</span>
			<svg
				class="w-4 h-4 text-white/60 transition-transform {expandedFilters.sole_material ? 'rotate-180' : ''}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
		{#if expandedFilters.sole_material}
			<div class="pb-4 space-y-1 max-h-64 overflow-y-auto">
				{#if (filters.sole_materials || []).length === 0}
					<p class="text-xs text-white/40 py-2 px-1">No options available</p>
				{:else}
					{#each filters.sole_materials || [] as sm}
						<label class="flex items-center gap-3 cursor-pointer group py-2 px-1 rounded-lg hover:bg-white/5 transition-colors">
							<input
								type="radio"
								name="sole_material"
								value={sm}
								checked={activeFilters.sole_material === sm}
								onchange={() => updateFilter('sole_material', sm)}
								class="sr-only peer"
							/>
							<div class="relative flex items-center justify-center w-5 h-5 rounded-full border-2 border-white/30 peer-checked:border-white peer-checked:bg-white transition-all group-hover:border-white/50">
								{#if activeFilters.sole_material === sm}
									<div class="w-2.5 h-2.5 rounded-full bg-neutral-900"></div>
								{/if}
							</div>
							<span class="text-sm text-white/80 group-hover:text-white peer-checked:text-white transition-colors flex-1">{sm}</span>
						</label>
					{/each}
				{/if}
			</div>
		{/if}
	</div>
</div>

