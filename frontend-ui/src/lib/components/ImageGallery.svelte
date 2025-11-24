<script>
	let { image } = $props();
</script>

<!--
	Standardized image container so portrait + landscape photos look consistent.
	We use an aspect ratio and object-contain so the entire shoe is always visible.
-->
<div class="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
	<div class="aspect-[4/3] w-full bg-neutral-900 flex items-center justify-center">
		<img
			class="max-h-full max-w-full object-contain"
			src={image}
			alt="Product image"
			loading="lazy"
		/>
	</div>
</div>

