/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
	try {
		const PRODUCTS_API = import.meta.env.VITE_PRODUCTS_API || 'https://products-worker.aadhi18082003.workers.dev';
		const PRICE_API = import.meta.env.VITE_PRICE_API || 'https://price-worker.aadhi18082003.workers.dev';
		const FULFILL_API = import.meta.env.VITE_FULFILLMENT_API || 'https://fullfilment-worker.aadhi18082003.workers.dev';

		// Fetch featured products (first 8 products)
		const [productsRes, categoriesRes] = await Promise.all([
			fetch(`${PRODUCTS_API.replace(/\/+$/, '')}/products?page=1&limit=8`, {
				cache: 'no-store',
				headers: { Accept: 'application/json' },
			}).catch(() => null),
			fetch(`${PRODUCTS_API.replace(/\/+$/, '')}/products/filters`, {
				cache: 'no-store',
				headers: { Accept: 'application/json' },
			}).catch(() => null),
		]);

		let featuredProducts = [];
		let categories = [];

		if (productsRes?.ok) {
			try {
				const productsData = await productsRes.json();
				const rawProducts = productsData.products || [];

				// Enrich products with price and stock data (parallel fetching)
				const enrichedProducts = await Promise.all(
					rawProducts.slice(0, 8).map(async product => {
						try {
							const id = product.product_id;
							const sku = product.sku;
							const name = product.name ?? 'Untitled';
							const image = product.primary_image_url ?? '';

							// Fetch price and stock data concurrently with timeouts
							const [priceRes, stockRes] = await Promise.all([
								(async () => {
									const controller = new AbortController();
									const timeoutId = setTimeout(() => controller.abort(), 3000);
									try {
										const res = await fetch(
											`${PRICE_API.replace(/\/+$/, '')}/api/price/${encodeURIComponent(sku)}?product_id=${encodeURIComponent(id)}`,
											{
												signal: controller.signal,
												headers: { Accept: 'application/json' },
											}
										);
										clearTimeout(timeoutId);
										return res;
									} catch {
										clearTimeout(timeoutId);
										return null;
									}
								})(),
								(async () => {
									const controller = new AbortController();
									const timeoutId = setTimeout(() => controller.abort(), 3000);
									try {
										const res = await fetch(`${FULFILL_API.replace(/\/+$/, '')}/api/stock/product/${encodeURIComponent(id)}`, {
											signal: controller.signal,
											headers: { Accept: 'application/json' },
										});
										clearTimeout(timeoutId);
										return res;
									} catch {
										clearTimeout(timeoutId);
										return null;
									}
								})(),
							]);

							let priceData = { price: 0 };
							let stockData = { success: false, total_stock: 0 };

							if (priceRes?.ok) {
								try {
									priceData = await priceRes.json();
								} catch {
									priceData = { price: 0 };
								}
							}

							if (stockRes?.ok) {
								try {
									stockData = await stockRes.json();
								} catch {
									stockData = { success: false, total_stock: 0 };
								}
							}

							const price = Number(priceData.price || 0);
							const inStock = stockData.success === true && stockData.total_stock > 0;

							return {
								id,
								name,
								image,
								price,
								inStock,
								category: product.category || '',
								brand: product.brand || '',
							};
						} catch (err) {
							console.error(`[HOME] Error enriching product ${product.product_id}:`, err);
							return null;
						}
					})
				);

				featuredProducts = enrichedProducts.filter(p => p !== null);
			} catch (err) {
				console.error('[HOME] Error parsing products:', err);
			}
		}

		if (categoriesRes?.ok) {
			try {
				const filtersData = await categoriesRes.json();
				categories = filtersData.filters?.categories || [];
			} catch (err) {
				console.error('[HOME] Error parsing categories:', err);
			}
		}

		return {
			featuredProducts,
			categories,
		};
	} catch (err) {
		console.error('[HOME] Error loading homepage:', err);
		return {
			featuredProducts: [],
			categories: [],
		};
	}
}
