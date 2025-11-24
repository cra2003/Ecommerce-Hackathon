<script>
	import { goto } from '$app/navigation';
	let { product } = $props();
</script>

<a class="group block overflow-hidden rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
	href={`/products/${product.id}`}
	data-sveltekit-preload-data="off"
	data-sveltekit-preload-code="off">
	<div class="aspect-square overflow-hidden bg-neutral-900">
		<img src={product.image} alt={product.name} class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
	</div>
	<div class="p-4">
		<h3 class="line-clamp-1 text-sm font-medium">{product.name}</h3>
		<p class="mt-1 text-xs {product.inStock ? 'text-emerald-400' : 'text-red-400'}">
			{product.inStock ? 'In stock' : 'Out of stock'}
		</p>
		<p class="mt-2 text-base font-semibold">₹ {product.price.toLocaleString('en-IN')}</p>
		<button type="button" class="mt-3 w-full rounded-full bg-white/90 px-4 py-2 text-sm text-neutral-900 hover:bg-white"
			on:click|preventDefault={() => goto(`/products/${product.id}`)}>
			View Product
		</button>
	</div>
</a>

