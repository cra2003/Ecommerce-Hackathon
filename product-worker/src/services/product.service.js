import { toJsonText } from '../utils/json.util.js'
import { uploadProductImage, deleteProductImage } from './r2.service.js'
import { insertProduct, updateProduct, deleteProduct, getProductById } from '../models/product.model.js'
import { getCached, setCached, invalidateCache } from './cache.service.js'

export async function createProduct(c) {
	try {
		const contentType = c.req.header('Content-Type') || ''
		const product_id = crypto.randomUUID()

		// Common container for fields
		let payload = {
			product_id,
			sku: null,
			name: null,
			brand: null,
			description: null,
			category: null,
			gender: null,
			target_audience: null,
			upper_material: null,
			sole_material: null,
			closure_type: null,
			toe_style: null,
			heel_type: null,
			heel_height_cm: null,
			weight_grams: null,
			width_options: null, // JSON text
			arch_support: null,
			flexibility: null,
			cushioning_level: null,
			water_resistance: null,
			features: null, // JSON text
			season: null,
			pattern: null,
			color_family: null,
			available_sizes: null, // JSON text
			care_instructions: null,
			warranty_period: null,
			manufacturer_name: null,
			manufacturer_country: null,
			primary_image_url: null,
			meta_title: null,
			is_active: 1
		}

		if (contentType.includes('multipart/form-data')) {
			const formData = await c.req.formData()
			payload.name = formData.get('name') ?? null
			payload.sku = formData.get('sku') ?? null
			payload.brand = formData.get('brand') ?? null
			payload.description = formData.get('description') ?? null
			payload.category = formData.get('category') ?? null
			payload.gender = formData.get('gender') ?? null
			payload.target_audience = formData.get('target_audience') ?? null
			payload.upper_material = formData.get('upper_material') ?? null
			payload.sole_material = formData.get('sole_material') ?? null
			payload.closure_type = formData.get('closure_type') ?? null
			payload.toe_style = formData.get('toe_style') ?? null
			payload.heel_type = formData.get('heel_type') ?? null
			payload.heel_height_cm = formData.get('heel_height_cm') ? parseFloat(formData.get('heel_height_cm')) : null
			payload.weight_grams = formData.get('weight_grams') ? parseInt(formData.get('weight_grams')) : null
			payload.width_options = toJsonText(formData.get('width_options'))
			payload.arch_support = formData.get('arch_support') ?? null
			payload.flexibility = formData.get('flexibility') ?? null
			payload.cushioning_level = formData.get('cushioning_level') ?? null
			payload.water_resistance = formData.get('water_resistance') ?? null
			payload.features = toJsonText(formData.get('features'))
			payload.season = formData.get('season') ?? null
			payload.pattern = formData.get('pattern') ?? null
			payload.color_family = formData.get('color_family') ?? null
			payload.available_sizes = toJsonText(formData.get('available_sizes'))
			payload.care_instructions = formData.get('care_instructions') ?? null
			payload.warranty_period = formData.get('warranty_period') ?? null
			payload.manufacturer_name = formData.get('manufacturer_name') ?? null
			payload.manufacturer_country = formData.get('manufacturer_country') ?? null
			payload.meta_title = formData.get('meta_title') ?? null
			payload.is_active = formData.get('is_active') != null ? parseInt(formData.get('is_active')) : 1

			const imageFile = formData.get('image')
			if (imageFile && imageFile.name) {
				payload.primary_image_url = await uploadProductImage(c.env, imageFile)
			} else {
				payload.primary_image_url = formData.get('primary_image_url') ?? null
			}
		} else {
			const body = await c.req.json()
			for (const k of Object.keys(payload)) {
				if (k in body) payload[k] = body[k]
			}
			// coerce json-ish fields
			payload.width_options = toJsonText(body.width_options ?? payload.width_options)
			payload.features = toJsonText(body.features ?? payload.features)
			payload.available_sizes = toJsonText(body.available_sizes ?? payload.available_sizes)
			if (typeof body.heel_height_cm === 'string') payload.heel_height_cm = parseFloat(body.heel_height_cm)
			if (typeof body.weight_grams === 'string') payload.weight_grams = parseInt(body.weight_grams)
		}

		// Validate required fields per schema
		if (!payload.name || !payload.color_family || !payload.available_sizes || !payload.primary_image_url) {
			return c.json({ error: 'Missing required fields: name, color_family, available_sizes, primary_image_url' }, 400)
		}

		await insertProduct(c.env.DB, payload)
		await invalidateCache(c, ['product:list'])

		return c.json({
			message: 'Product created successfully',
			product_id: payload.product_id,
			primary_image_url: payload.primary_image_url
		}, 201)
	} catch (err) {
		console.error(err)
		return c.json({ error: err.message }, 500)
	}
}

export async function listAllProducts(c) {
    try {
      // Get pagination parameters - CRITICAL: These must come from query string
      const pageParam = c.req.query('page');
      const limitParam = c.req.query('limit');
      
      console.log('🔍 Received params:', { page: pageParam, limit: limitParam });
      
      // Parse and validate
      const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
      const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10)), 100) : 12;
      
      console.log('🔍 Using pagination:', { page, limit });
      
      // Get total count
      const countResult = await c.env.DB.prepare(`
        SELECT COUNT(*) as total FROM products WHERE is_active = 1
      `).first();
      const total = countResult?.total || 0;
      
      // Calculate pagination
      const offset = (page - 1) * limit;
      const totalPages = Math.ceil(total / limit);
      
      console.log('🔍 Pagination calc:', { total, offset, totalPages });
      
      // Fetch ONLY the products for this page
      const products = await c.env.DB.prepare(`
        SELECT 
          product_id, sku, name, brand, category, gender, target_audience,
          primary_image_url, available_sizes, is_active, created_at, updated_at
        FROM products 
        WHERE is_active = 1
        ORDER BY created_at ASC, product_id ASC
        LIMIT ? OFFSET ?
      `).bind(limit, offset).all();
      
      const productList = products.results || [];
      
      console.log('✅ Returning', productList.length, 'products for page', page);
      
      // Return paginated response
      return c.json({
        success: true,
        products: productList,
        pagination: {
          page: page,
          totalPages: totalPages,
          total: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
      
    } catch (err) {
      console.error('❌ List all products error:', err);
      return c.json({ 
        success: false,
        error: err.message,
        products: [],
        pagination: {
          page: 1,
          totalPages: 0,
          total: 0,
          hasNext: false,
          hasPrev: false
        }
      }, 500);
    }
  }

export async function listProducts(c) {
  try {
    // Parse query parameters - support both page/limit and direct offset
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = parseInt(c.req.query('limit') || '12', 10);
    const offsetParam = c.req.query('offset');
    const category = c.req.query('category');
    const brand = c.req.query('brand');
    const gender = c.req.query('gender');
    const target_audience = c.req.query('target_audience');
    const closure_type = c.req.query('closure_type');
    const sole_material = c.req.query('sole_material');
    
    // Use offset if provided, otherwise calculate from page
    const offset = offsetParam ? parseInt(offsetParam, 10) : (page - 1) * limit;
    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100); // Max 100 per page
    
    // Build WHERE clause for filters
    const conditions = ['is_active = 1'];
    const params = [];
    
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (brand) {
      conditions.push('brand = ?');
      params.push(brand);
    }
    if (gender) {
      conditions.push('gender = ?');
      params.push(gender);
    }
    if (target_audience) {
      conditions.push('target_audience = ?');
      params.push(target_audience);
    }
    if (closure_type) {
      conditions.push('closure_type = ?');
      params.push(closure_type);
    }
    if (sole_material) {
      conditions.push('sole_material = ?');
      params.push(sole_material);
    }
    
    const whereClause = conditions.join(' AND ');
    
    // Get total count
    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM products WHERE ${whereClause}
    `).bind(...params).first();
    const total = countResult?.total || 0;
    
    // Get paginated products - ordered by created_at ASC (database order)
    const products = await c.env.DB.prepare(`
      SELECT 
        product_id, sku, name, brand, category, gender, target_audience,
        primary_image_url, available_sizes, is_active, created_at, updated_at
      FROM products 
      WHERE ${whereClause}
      ORDER BY created_at ASC, product_id ASC
      LIMIT ? OFFSET ?
    `).bind(...params, validLimit, offset).all();
    
    const totalPages = Math.ceil(total / validLimit);
    
    return c.json({
      products: products.results || [],
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages,
        hasNext: validPage < totalPages,
        hasPrev: validPage > 1
      }
    });
  } catch (err) {
    console.error('List products error:', err);
    return c.json({ error: err.message }, 500);
  }
}

export async function getProduct(c) {
  try {
    const id = c.req.param('id')
	const cacheKey = `product:${id}`

    const cached = await getCached(c, cacheKey)
    if (cached) return c.json(cached)
    const results = await getProductById(c.env.DB, id)

    if (results.length === 0) {
      return c.json({ error: 'Product not found' }, 404)
    }

	await setCached(c, cacheKey, results[0])
    return c.json(results[0])
  } catch (err) {
    return c.json({ error: err.message }, 500)
  }
}

export async function updateProductService(c) {
	try {
		const id = c.req.param('id')
		const contentType = c.req.header('Content-Type') || ''

		// Load existing to support partial updates and image cleanup
		const existingResults = await getProductById(c.env.DB, id)
		const existing = existingResults[0]
		if (!existing) {
			return c.json({ error: 'Product not found' }, 404)
		}

		// Collect updates
		let updates = {}

		if (contentType.includes('multipart/form-data')) {
			const formData = await c.req.formData()
			for (const key of [
				'sku','name','brand','description','category','gender','target_audience',
				'upper_material','sole_material','closure_type','toe_style','heel_type',
				'arch_support','flexibility','cushioning_level','water_resistance',
				'season','pattern','color_family','care_instructions','warranty_period',
				'manufacturer_name','manufacturer_country','meta_title'
			]) {
				if (formData.get(key) != null) updates[key] = formData.get(key)
			}
			if (formData.get('heel_height_cm') != null) updates.heel_height_cm = parseFloat(formData.get('heel_height_cm'))
			if (formData.get('weight_grams') != null) updates.weight_grams = parseInt(formData.get('weight_grams'))
			if (formData.get('is_active') != null) updates.is_active = parseInt(formData.get('is_active'))
			if (formData.get('width_options') != null) updates.width_options = toJsonText(formData.get('width_options'))
			if (formData.get('features') != null) updates.features = toJsonText(formData.get('features'))
			if (formData.get('available_sizes') != null) updates.available_sizes = toJsonText(formData.get('available_sizes'))

			const imageFile = formData.get('image')
			if (imageFile && imageFile.name) {
				if (existing.primary_image_url) {
					await deleteProductImage(c.env, existing.primary_image_url)
				}
				updates.primary_image_url = await uploadProductImage(c.env, imageFile)
			} else if (formData.get('primary_image_url') != null) {
				updates.primary_image_url = formData.get('primary_image_url')
			}
		} else {
			const body = await c.req.json()
			for (const key of Object.keys(body)) {
				updates[key] = body[key]
			}
			if ('width_options' in updates) updates.width_options = toJsonText(updates.width_options)
			if ('features' in updates) updates.features = toJsonText(updates.features)
			if ('available_sizes' in updates) updates.available_sizes = toJsonText(updates.available_sizes)
		}

		// Ensure there is something to update
		const keys = Object.keys(updates)
		if (keys.length === 0) {
			return c.json({ message: 'No changes provided' })
		}

		await updateProduct(c.env.DB, id, updates)
		await invalidateCache(c, ['product:list', `product:${id}`])

		return c.json({ message: 'Product updated successfully' })
	} catch (err) {
		console.error(err)
		return c.json({ error: err.message }, 500)
	}
}

export async function deleteProductService(c) {
	try {
	  const id = c.req.param('id')
  
	  // 1️⃣ Check if product exists
	  const productResults = await getProductById(c.env.DB, id)
	  const product = productResults[0]
  
	  if (!product) {
		return c.json({ error: 'Product not found' }, 404)
	  }
  
	  // 2️⃣ If product has an image, delete it from R2
	  if (product.primary_image_url) {
		await deleteProductImage(c.env, product.primary_image_url)
	  }
  
	  // 3️⃣ Delete product record from D1
	  await deleteProduct(c.env.DB, id)
	  await invalidateCache(c, ['product:list', `product:${id}`])
	  return c.json({ message: 'Product and associated image deleted successfully' })
	} catch (err) {
	  console.error(err)
	  return c.json({ error: err.message }, 500)
	}
}

