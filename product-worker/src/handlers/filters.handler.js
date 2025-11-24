/**
 * GET /products/filters
 * Returns available filter options (categories, brands, genders, target_audiences, closure_types, sole_materials)
 */
export async function getFiltersHandler(c) {
  try {
    // Run all filter queries in parallel for speed
    const [categories, brands, genders, targetAudiences, closureTypes, soleMaterials] = await Promise.all([
      c.env.DB.prepare(`
        SELECT DISTINCT category 
        FROM products 
        WHERE is_active = 1 AND category IS NOT NULL AND category != ''
        ORDER BY category
      `).all(),
      c.env.DB.prepare(`
        SELECT DISTINCT brand 
        FROM products 
        WHERE is_active = 1 AND brand IS NOT NULL AND brand != ''
        ORDER BY brand
      `).all(),
      c.env.DB.prepare(`
        SELECT DISTINCT gender 
        FROM products 
        WHERE is_active = 1 AND gender IS NOT NULL AND gender != ''
        ORDER BY gender
      `).all(),
      c.env.DB.prepare(`
        SELECT DISTINCT target_audience 
        FROM products 
        WHERE is_active = 1 AND target_audience IS NOT NULL AND target_audience != ''
        ORDER BY target_audience
      `).all(),
      c.env.DB.prepare(`
        SELECT DISTINCT closure_type 
        FROM products 
        WHERE is_active = 1 AND closure_type IS NOT NULL AND closure_type != ''
        ORDER BY closure_type
      `).all(),
      c.env.DB.prepare(`
        SELECT DISTINCT sole_material 
        FROM products 
        WHERE is_active = 1 AND sole_material IS NOT NULL AND sole_material != ''
        ORDER BY sole_material
      `).all()
    ]);
    
    return c.json({
      success: true,
      filters: {
        categories: (categories.results || []).map(r => r.category),
        brands: (brands.results || []).map(r => r.brand),
        genders: (genders.results || []).map(r => r.gender),
        target_audiences: (targetAudiences.results || []).map(r => r.target_audience),
        closure_types: (closureTypes.results || []).map(r => r.closure_type),
        sole_materials: (soleMaterials.results || []).map(r => r.sole_material)
      }
    });
  } catch (err) {
    console.error('Get filters error:', err);
    return c.json({ error: err.message }, 500);
  }
}

