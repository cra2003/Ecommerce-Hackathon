export async function getAllProducts(db) {
	const { results } = await db.prepare('SELECT * FROM products').all();
	return results;
}

export async function getProductById(db, id) {
	const { results } = await db.prepare('SELECT * FROM products WHERE product_id = ?').bind(id).all();
	return results;
}

export async function insertProduct(db, payload) {
	// Build INSERT with only provided fields (excluding nulls)
	const columns = Object.keys(payload).filter((k) => payload[k] !== null && payload[k] !== undefined);
	const placeholders = columns.map(() => '?').join(', ');
	const values = columns.map((k) => payload[k]);

	const sql = `INSERT INTO products (${columns.join(', ')}) VALUES (${placeholders})`;
	await db
		.prepare(sql)
		.bind(...values)
		.run();
}

export async function updateProduct(db, id, updates) {
	// Add updated_at
	updates.updated_at = new Date().toISOString();
	const setClauses = Object.keys(updates)
		.map((k) => `${k} = ?`)
		.join(', ');
	const values = Object.keys(updates).map((k) => updates[k]);

	const sql = `UPDATE products SET ${setClauses} WHERE product_id = ?`;
	await db
		.prepare(sql)
		.bind(...values, id)
		.run();
}

export async function deleteProduct(db, id) {
	await db.prepare('DELETE FROM products WHERE product_id = ?').bind(id).run();
}
