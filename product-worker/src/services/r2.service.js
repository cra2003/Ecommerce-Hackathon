export async function uploadProductImage(env, imageFile) {
	if (!imageFile || !imageFile.name) {
		return null;
	}
	const ext = imageFile.name.split('.').pop()
	const key = `product-${Date.now()}.${ext}`
	await env.PRODUCT_IMAGES.put(key, imageFile.stream())
	return `https://pub-c2b2c981bf6a41d68dfd6b55d2c90aa5.r2.dev/${key}`
}

export async function deleteProductImage(env, imageUrl) {
	if (!imageUrl) {
		return;
	}
	const key = imageUrl.split('/').pop()
	try {
		await env.PRODUCT_IMAGES.delete(key)
		console.log(`🗑️ Deleted image from R2: ${key}`)
	} catch (err) {
		console.warn(`⚠️ Failed to delete R2 image: ${key}`, err.message)
	}
}

