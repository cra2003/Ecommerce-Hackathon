<script>
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/Header.svelte';
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-neutral-950 text-white">
	<Header />
	<main class="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
		{@render children()}
	</main>
</div>
