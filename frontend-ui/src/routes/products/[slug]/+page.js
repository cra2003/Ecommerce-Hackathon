/** @type {import('./$types').PageLoad} */
export async function load({ fetch, params }) {
	const PRODUCTS_API = import.meta.env.VITE_PRODUCTS_API || 'https://products-worker.aadhi18082003.workers.dev';
	const PRICE_API = import.meta.env.VITE_PRICE_API || 'https://price-worker.aadhi18082003.workers.dev';
	const FULFILL_API = import.meta.env.VITE_FULFILLMENT_API || 'https://fullfilment-worker.aadhi18082003.workers.dev';
	const id = params.slug;

	// Allow caching for product detail page (backend has KV cache)
	const res = await fetch(`${PRODUCTS_API.replace(/\/+$/, '')}/products/${id}`);
	if (!res.ok) {
		return { product: null };
	}
	const row = await res.json();

	const productId = row.product_id ?? id;

	// Parse available sizes
	let sizes = [];
	try {
		if (Array.isArray(row.available_sizes)) {
			sizes = row.available_sizes;
		} else if (typeof row.available_sizes === 'string') {
			const parsed = JSON.parse(row.available_sizes);
			if (Array.isArray(parsed)) sizes = parsed;
		}
	} catch {
		sizes = [];
	}
	if (!sizes.length) {
		sizes = ['7', '8', '9', '10', '11'];
	}

	// Parse features JSON (row.features can be a JSON string)
	let features = [];
	try {
		if (Array.isArray(row.features)) {
			features = row.features;
		} else if (typeof row.features === 'string') {
			const parsed = JSON.parse(row.features);
			if (Array.isArray(parsed)) {
				features = parsed;
			} else if (parsed) {
				features = [String(parsed)];
			}
		}
	} catch {
		if (typeof row.features === 'string' && row.features.trim()) {
			features = [row.features.trim()];
		}
	}

	// Fetch stock map from fulfillment-worker
	let stockBySize = {};
	let inStock = true;
	try {
		const stockRes = await fetch(`${FULFILL_API.replace(/\/+$/, '')}/api/stock/product/${encodeURIComponent(productId)}`, {
			cache: 'no-store',
		});
		if (stockRes.ok) {
			const stockData = await stockRes.json();
			if (stockData?.success === false) {
				inStock = false;
			} else {
				stockBySize = stockData.sizes || {};
				const total =
					typeof stockData.total_stock === 'number'
						? stockData.total_stock
						: Object.values(stockBySize).reduce((s, v) => s + Number(v || 0), 0);
				inStock = total > 0;
			}
		}
	} catch {
		inStock = true;
		stockBySize = {};
	}

	// Fetch price from price-worker
	let price = 0;
	let basePrice = 0;
	let isOnSale = false;
	let discountPercentage = null;
	try {
		if (row.sku) {
			const priceRes = await fetch(
				`${PRICE_API.replace(/\/+$/, '')}/api/price/${encodeURIComponent(row.sku)}?product_id=${encodeURIComponent(productId)}`
			);
			if (priceRes.ok) {
				const priceData = await priceRes.json();
				if (priceData?.success) {
					price = Number(priceData.price ?? 0) || 0;
					basePrice = Number(priceData.base_price ?? price) || price;
					isOnSale = !!priceData.is_on_sale;
					if (priceData.discount_percentage != null) {
						discountPercentage = Number(priceData.discount_percentage);
					}
				}
			}
		}
	} catch {
		// keep default 0 price on failure
	}

	if (!Number.isFinite(price)) {
		price = 0;
	}
	if (!Number.isFinite(basePrice)) {
		basePrice = price;
	}

	const product = {
		id: productId,
		name: row.name ?? 'Untitled',
		image: row.primary_image_url ?? '',
		price,
		base_price: basePrice,
		isOnSale,
		discountPercentage,
		inStock,
		sizes,
		stockBySize,
		sku: row.sku ?? null,
		// additional details for product page
		description: row.description ?? '',
		category: row.category ?? '',
		gender: row.gender ?? '',
		color_family: row.color_family ?? '',
		features,
		materials: {
			upper: row.upper_material ?? '',
			sole: row.sole_material ?? '',
			closure_type: row.closure_type ?? '',
			toe_style: row.toe_style ?? '',
			heel_type: row.heel_type ?? '',
			heel_height_cm: row.heel_height_cm ?? null,
			weight_grams: row.weight_grams ?? null,
		},
		brand: row.brand ?? '',
		target_audience: row.target_audience ?? '',
		flexibility: row.flexibility ?? '',
		cushioning_level: row.cushioning_level ?? '',
		water_resistance: row.water_resistance ?? '',
	};

	return { product };
}
