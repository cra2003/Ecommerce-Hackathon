<script>
	import { page as currentPage } from '$app/stores';
	
	let { page = 1, pages = 1 } = $props();
	
	function buildUrl(pageNum) {
		const searchParams = new URLSearchParams($currentPage.url.searchParams);
		
		if (pageNum === 1) {
			searchParams.delete('page');
		} else {
			searchParams.set('page', pageNum.toString());
		}
		
		const queryString = searchParams.toString();
		return queryString ? `/products?${queryString}` : '/products';
	}
</script>

{#if pages > 1}
	{@const startPage = Math.max(1, page - 2)}
	{@const endPage = Math.min(pages, page + 2)}
	
	<nav class="mt-8 flex items-center justify-center gap-2 flex-wrap">
		{#if page > 1}
			<a
				href={buildUrl(page - 1)}
				data-sveltekit-preload-data="off"
				class="rounded-full px-4 py-2 text-sm bg-white/10 text-white hover:bg-white/20 transition"
			>
				← Prev
			</a>
		{/if}
		
		{#if startPage > 1}
			<a
				href={buildUrl(1)}
				data-sveltekit-preload-data="off"
				class="rounded-full px-3 py-1 text-sm bg-white/10 text-white hover:bg-white/20 transition"
			>
				1
			</a>
			{#if startPage > 2}
				<span class="px-2 text-white/40">...</span>
			{/if}
		{/if}
		
		{#each Array(endPage - startPage + 1) as _, i}
			{@const pageNum = startPage + i}
			<a
				href={buildUrl(pageNum)}
				data-sveltekit-preload-data="off"
				class="rounded-full px-3 py-1 text-sm transition
				{page === pageNum ? 'bg-white text-neutral-900' : 'bg-white/10 text-white hover:bg-white/20'}">
				{pageNum}
			</a>
		{/each}
		
		{#if endPage < pages}
			{#if endPage < pages - 1}
				<span class="px-2 text-white/40">...</span>
			{/if}
			<a
				href={buildUrl(pages)}
				data-sveltekit-preload-data="off"
				class="rounded-full px-3 py-1 text-sm bg-white/10 text-white hover:bg-white/20 transition"
			>
				{pages}
			</a>
		{/if}
		
		{#if page < pages}
			<a
				href={buildUrl(page + 1)}
				data-sveltekit-preload-data="off"
				class="rounded-full px-4 py-2 text-sm bg-white/10 text-white hover:bg-white/20 transition"
			>
				Next →
			</a>
		{/if}
	</nav>
{/if}

