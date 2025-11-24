<script>
	import ProductCard from './ProductCard.svelte';
	let { products = [] } = $props();
</script>

<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
	{#each products as p (p.id)}
		<ProductCard product={p} />
	{/each}
	{#if products.length === 0}
		<p class="col-span-full text-center text-white/60">No products found.</p>
	{/if}
</div>

