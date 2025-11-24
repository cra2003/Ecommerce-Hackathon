/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch, url }) {
	try {
		const PRODUCTS_API = import.meta.env.VITE_PRODUCTS_API || 'https://products-worker.aadhi18082003.workers.dev';
		const PRICE_API = import.meta.env.VITE_PRICE_API || 'https://price-worker.aadhi18082003.workers.dev';
		const FULFILL_API = import.meta.env.VITE_FULFILLMENT_API || 'https://fullfilment-worker.aadhi18082003.workers.dev';

		// Read filter parameters from URL
		const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
		const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '12', 10));
		const category = url.searchParams.get('category') || null;
		const brand = url.searchParams.get('brand') || null;
		const closure_type = url.searchParams.get('closure_type') || null;
		const sole_material = url.searchParams.get('sole_material') || null;

		// Fetch filter options and products in parallel
		const [filtersRes, productsRes] = await Promise.all([
			fetch(`${PRODUCTS_API.replace(/\/+$/, '')}/products/filters`, {
				cache: 'no-store',
				headers: { Accept: 'application/json' },
			}).catch(() => null),
			(async () => {
				// Build products URL with filters
				const productsUrl = new URL(`${PRODUCTS_API.replace(/\/+$/, '')}/products`);
				productsUrl.searchParams.set('page', page.toString());
				productsUrl.searchParams.set('limit', limit.toString());
				if (category) productsUrl.searchParams.set('category', category);
				if (brand) productsUrl.searchParams.set('brand', brand);
				if (closure_type) productsUrl.searchParams.set('closure_type', closure_type);
				if (sole_material) productsUrl.searchParams.set('sole_material', sole_material);

				return fetch(productsUrl.toString(), {
					cache: 'no-store',
					headers: { Accept: 'application/json' },
				});
			})(),
		]);

		// Parse filter options
		let filterOptions = {
			categories: [],
			brands: [],
			closure_types: [],
			sole_materials: [],
		};

		if (filtersRes?.ok) {
			try {
				const filtersData = await filtersRes.json();
				if (filtersData.filters) {
					filterOptions = {
						categories: filtersData.filters.categories || [],
						brands: filtersData.filters.brands || [],
						closure_types: filtersData.filters.closure_types || [],
						sole_materials: filtersData.filters.sole_materials || [],
					};
				}
				console.log('[SERVER] Filter options loaded:', {
					categories: filterOptions.categories.length,
					brands: filterOptions.brands.length,
					closure_types: filterOptions.closure_types.length,
					sole_materials: filterOptions.sole_materials.length,
				});
			} catch (err) {
				console.error('[SERVER] Error parsing filter options:', err);
			}
		} else {
			console.warn('[SERVER] Filters API request failed:', filtersRes?.status);
		}

		if (!productsRes.ok) {
			console.error(`Products API error: ${productsRes.status} ${productsRes.statusText}`);
			return {
				products: [],
				pagination: { page: 1, totalPages: 1, total: 0, hasNext: false, hasPrev: false },
				filters: filterOptions,
				activeFilters: { category, brand, closure_type, sole_material },
			};
		}

		const productsData = await productsRes.json();
		const rawProducts = productsData.products || [];
		const pagination = productsData.pagination || {
			page: 1,
			totalPages: 1,
			total: 0,
			hasNext: false,
			hasPrev: false,
		};

		// Enrich products with price and stock data (async calls in parallel)
		const enrichedProducts = await Promise.all(
			rawProducts.map(async product => {
				try {
					const id = product.product_id;
					const sku = product.sku;
					const name = product.name ?? 'Untitled';
					const image = product.primary_image_url ?? '';

					// Parse sizes safely
					let sizes = [];
					try {
						sizes = Array.isArray(product.available_sizes) ? product.available_sizes : JSON.parse(product.available_sizes || '[]');
					} catch {
						sizes = [];
					}

					// Fetch price and stock data concurrently (async calls in load function)
					const [priceData, stockData] = await Promise.all([
						fetchPriceData(fetch, PRICE_API, sku, id),
						fetchStockData(fetch, FULFILL_API, id),
					]);

					const price = Number(priceData.price || 0);
					const isOnSale = !!priceData.is_on_sale;
					const discountPercentage = priceData.discount_percentage != null ? Number(priceData.discount_percentage) : null;
					const inStock = stockData.success === true && stockData.total_stock > 0;

					return {
						id,
						name,
						image,
						price,
						base_price: price,
						inStock,
						isOnSale,
						discountPercentage,
						sizes,
					};
				} catch (err) {
					console.error(`[SERVER] Error enriching product ${product.product_id}:`, err);
					return {
						id: product.product_id,
						name: product.name ?? 'Untitled',
						image: product.primary_image_url ?? '',
						price: 0,
						base_price: 0,
						inStock: false,
						isOnSale: false,
						discountPercentage: null,
						sizes: [],
					};
				}
			})
		);

		return {
			products: enrichedProducts,
			pagination,
			filters: filterOptions,
			activeFilters: { category, brand, closure_type, sole_material },
		};
	} catch (err) {
		console.error('[SERVER] Error loading products page:', err);
		return {
			products: [],
			pagination: { page: 1, totalPages: 1, total: 0, hasNext: false, hasPrev: false },
			filters: { categories: [], brands: [], closure_types: [], sole_materials: [] },
			activeFilters: {},
		};
	}
}

/**
 * Fetch price data for a product (SSR)
 */
async function fetchPriceData(fetchFn, PRICE_API, sku, productId) {
	try {
		const priceUrl = `${PRICE_API.replace(/\/+$/, '')}/api/price/${encodeURIComponent(sku)}?product_id=${encodeURIComponent(productId)}`;
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

		const res = await fetchFn(priceUrl, {
			signal: controller.signal,
			headers: {
				Accept: 'application/json',
			},
		});

		clearTimeout(timeoutId);

		if (!res.ok) {
			return { price: 0, is_on_sale: false, discount_percentage: null };
		}

		const data = await res.json();
		return {
			price: data.price ?? 0,
			is_on_sale: !!data.is_on_sale,
			discount_percentage: data.discount_percentage ?? null,
		};
	} catch (err) {
		if (err.name !== 'AbortError') {
			console.error(`[SERVER] Price fetch error for SKU ${sku}:`, err.message);
		}
		return { price: 0, is_on_sale: false, discount_percentage: null };
	}
}

/**
 * Fetch stock data for a product (SSR)
 */
async function fetchStockData(fetchFn, FULFILL_API, productId) {
	try {
		const stockUrl = `${FULFILL_API.replace(/\/+$/, '')}/api/stock/product/${encodeURIComponent(productId)}`;
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

		const res = await fetchFn(stockUrl, {
			signal: controller.signal,
			headers: {
				Accept: 'application/json',
			},
		});

		clearTimeout(timeoutId);

		if (!res.ok) {
			return { success: false, total_stock: 0 };
		}

		const data = await res.json();
		return {
			success: data.success === true,
			total_stock: data.total_stock ?? 0,
		};
	} catch (err) {
		if (err.name !== 'AbortError') {
			console.error(`[SERVER] Stock fetch error for product ${productId}:`, err.message);
		}
		return { success: false, total_stock: 0 };
	}
}
