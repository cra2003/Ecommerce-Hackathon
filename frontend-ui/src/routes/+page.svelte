<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import ProductCard from '$lib/components/ProductCard.svelte';
	
	let { data } = $props();

	let showOrderMessage = $state(false);
	let orderId = $state('');
	let showLogoutMessage = $state(false);
	let mounted = $state(false);
	
	let featuredProducts = $derived(data.featuredProducts || []);
	let categories = $derived(data.categories || []);

	$effect(() => {
		const unsub = page.subscribe(($page) => {
			const params = $page.url.searchParams;
			const order = params.get('order');
			const oid = params.get('order_id');
			const logout = params.get('logout');
			showOrderMessage = order === 'success';
			orderId = oid || '';
			showLogoutMessage = logout === '1';
		});
		return unsub;
	});
	
	onMount(() => {
		mounted = true;
	});
	
	function scrollToSection(id) {
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
	}
</script>

{#if showOrderMessage}
	<div class="mb-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 animate-fade-in">
		<div class="flex items-center gap-2">
			<svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
			<span>Your order{orderId ? ` ${orderId}` : ''} has been placed successfully.</span>
		</div>
	</div>
{/if}

{#if showLogoutMessage}
	<div class="mb-4 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white/80 animate-fade-in">
		You have been signed out.
	</div>
{/if}

<!-- Hero Section -->
<section class="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-900 via-slate-900 to-zinc-900 p-8 sm:p-12 lg:p-16 backdrop-blur-sm">
	<div class="relative z-10">
		<div class="max-w-3xl">
			<h1 class="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
				<span class="block">Step Into</span>
				<span class="block bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
					Style & Comfort
				</span>
			</h1>
			<p class="mt-6 text-lg text-white/90 sm:text-xl max-w-2xl">
				Discover premium footwear crafted for every moment. From running trails to city streets, 
				find your perfect pair in our curated collection.
			</p>
			<div class="mt-8 flex flex-col gap-4 sm:flex-row sm:gap-4">
				<a 
					href="/products" 
					class="group inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-base font-semibold text-neutral-900 hover:bg-white/90 transition-all duration-200 hover:scale-105 hover:shadow-xl"
				>
					Browse Collection
					<svg class="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
					</svg>
				</a>
				<button
					onclick={() => scrollToSection('featured')}
					class="inline-flex items-center justify-center rounded-full border-2 border-white/30 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-all duration-200 hover:border-white/50"
				>
					View Featured
				</button>
			</div>
		</div>
	</div>
	
	<!-- Decorative elements -->
	<div class="absolute top-0 right-0 -mt-4 -mr-4 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl"></div>
	<div class="absolute bottom-0 left-0 -mb-8 -ml-8 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl"></div>
</section>

<!-- Categories Section -->
{#if categories.length > 0}
	<section class="mt-12">
		<div class="flex items-center justify-between mb-6">
			<h2 class="text-2xl font-semibold">Shop by Category</h2>
			<a href="/products" class="text-sm text-white/60 hover:text-white transition-colors">
				View all →
			</a>
		</div>
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
			{#each categories.slice(0, 4) as category}
				<a
					href="/products?category={encodeURIComponent(category)}"
					class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:border-white/20"
				>
					<div class="relative z-10">
						<h3 class="text-lg font-semibold mb-2">{category}</h3>
						<p class="text-sm text-white/60 group-hover:text-white/80 transition-colors">
							Explore →
						</p>
					</div>
					<div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
				</a>
			{/each}
		</div>
	</section>
{/if}

<!-- Featured Products Section -->
<section id="featured" class="mt-16 scroll-mt-8">
	<div class="flex items-center justify-between mb-8">
		<div>
			<h2 class="text-2xl font-semibold">Featured Products</h2>
			<p class="mt-2 text-sm text-white/60">Handpicked favorites from our collection</p>
		</div>
		<a href="/products" class="text-sm text-white/60 hover:text-white transition-colors hidden sm:block">
			View all →
		</a>
	</div>
	
	{#if featuredProducts.length === 0}
		<div class="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
			<p class="text-white/60">Loading featured products...</p>
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
			{#each featuredProducts as product, index (product.id)}
				<div class="transform transition-all duration-300 hover:scale-105 {mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}"
					style="transition-delay: {index * 50}ms;">
					<ProductCard {product} />
				</div>
			{/each}
		</div>
		<div class="mt-8 text-center">
			<a 
				href="/products" 
				class="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-white hover:bg-white/10 transition-all duration-200 hover:border-white/30 sm:hidden"
			>
				View All Products
				<svg class="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
				</svg>
			</a>
		</div>
	{/if}
</section>

<!-- Features Section -->
<section class="mt-20 rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-900/50 to-neutral-800/30 p-8 sm:p-12 lg:p-16">
	<div class="max-w-5xl mx-auto">
		<div class="text-center mb-12">
			<h2 class="text-3xl font-semibold mb-4">Why Choose Skyline?</h2>
			<p class="text-white/70 max-w-2xl mx-auto">
				Premium quality, exceptional comfort, and style that stands out. 
				Experience the difference in every step.
			</p>
		</div>
		
		<div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
			<div class="text-center sm:text-left">
				<div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/10 mb-4">
					<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
				</div>
				<h3 class="text-lg font-semibold mb-2">Premium Quality</h3>
				<p class="text-sm text-white/60">
					Crafted with the finest materials and attention to detail
				</p>
			</div>
			
			<div class="text-center sm:text-left">
				<div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/10 mb-4">
					<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
				</div>
				<h3 class="text-lg font-semibold mb-2">Fast Delivery</h3>
				<p class="text-sm text-white/60">
					Quick and reliable shipping to your doorstep
				</p>
			</div>
			
			<div class="text-center sm:text-left">
				<div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/10 mb-4">
					<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
					</svg>
				</div>
				<h3 class="text-lg font-semibold mb-2">Secure Shopping</h3>
				<p class="text-sm text-white/60">
					Your data and payments are always protected
				</p>
			</div>
		</div>
	</div>
</section>

<!-- Call to Action -->
<section class="mt-16 text-center">
	<div class="rounded-3xl border border-white/10 bg-gradient-to-r from-neutral-900/80 via-slate-900/70 to-zinc-900/80 p-8 sm:p-12 lg:p-16">
		<h2 class="text-2xl sm:text-3xl font-semibold mb-4">Ready to Find Your Perfect Pair?</h2>
		<p class="text-white/70 mb-8 max-w-2xl mx-auto">
			Explore our complete collection of premium footwear. Find the perfect style, 
			size, and fit for you.
		</p>
		<a 
			href="/products" 
			class="inline-flex items-center rounded-full bg-white px-8 py-4 text-base font-semibold text-neutral-900 hover:bg-white/90 transition-all duration-200 hover:scale-105 hover:shadow-xl"
		>
			Start Shopping
			<svg class="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
			</svg>
		</a>
	</div>
</section>

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(10px);
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
