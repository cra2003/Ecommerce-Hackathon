<script>
	import { navigating } from '$app/stores';
	import ProductGrid from '$lib/components/ProductGrid.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import FilterSidebar from '$lib/components/FilterSidebar.svelte';
	
	let { data } = $props();
	
	let products = $derived(data.products || []);
	let currentPage = $derived(data.pagination?.page || 1);
	let totalPages = $derived(data.pagination?.totalPages || 1);
	let total = $derived(data.pagination?.total || 0);
	let filters = $derived(data.filters || { categories: [], brands: [], closure_types: [], sole_materials: [] });
	let activeFilters = $derived(data.activeFilters || {});
	
	let isLoading = $derived($navigating !== null);
	
	// Log the clean format for debugging
	$effect(() => {
		console.log('Products Data:', {
			products: products,
			pagination: {
				page: currentPage,
				totalPages: totalPages,
				total: total,
				hasNext: data.pagination?.hasNext || false,
				hasPrev: data.pagination?.hasPrev || false
			},
			filters: filters,
			activeFilters: activeFilters
		});
	});
</script>

<div class="flex flex-col sm:flex-row gap-4 sm:gap-6">
	<!-- Filters Sidebar - Left Side -->
	<aside class="w-full sm:w-64 flex-shrink-0">
		<FilterSidebar {filters} {activeFilters} />
	</aside>
	
	<!-- Main Content Area -->
	<div class="flex-1 min-w-0">
		<div class="mb-6">
			<h1 class="text-2xl font-semibold mb-2">Products</h1>
			{#if total > 0}
				<p class="text-sm text-white/60">
					Showing {products.length} of {total} products
				</p>
			{/if}
		</div>
		
		{#if isLoading}
			<!-- Loading Overlay -->
			<div class="relative">
				<div class="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg min-h-[400px]">
					<div class="flex flex-col items-center gap-3">
						<div class="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
						<p class="text-white/80 text-sm">Loading products...</p>
					</div>
				</div>
				<!-- Show existing content with reduced opacity during loading -->
				<div class="opacity-50 pointer-events-none">
					{#if products.length === 0}
						<div class="text-center py-12">
							<p class="text-white/60 mb-4">No products found</p>
						</div>
					{:else}
						<ProductGrid {products} />
						{#if totalPages > 1}
							<div class="mt-8">
								<Pagination page={currentPage} pages={totalPages} />
							</div>
						{/if}
					{/if}
				</div>
			</div>
		{:else if products.length === 0}
			<div class="text-center py-12">
				<p class="text-white/60 mb-4">No products found</p>
				<p class="text-white/40 text-sm">
					{#if activeFilters.category || activeFilters.brand || activeFilters.closure_type || activeFilters.sole_material}
						Try adjusting your filters
					{:else}
						No products available
					{/if}
				</p>
			</div>
		{:else}
			<ProductGrid {products} />
			{#if totalPages > 1}
				<div class="mt-8">
					<Pagination page={currentPage} pages={totalPages} />
				</div>
			{/if}
		{/if}
	</div>
</div>
