import {
	createProduct,
	listAllProducts,
	listProducts,
	getProduct,
	updateProductService,
	deleteProductService,
} from '../services/product.service.js';

export async function createProductHandler(c) {
	return await createProduct(c);
}

export async function listAllProductsHandler(c) {
	return await listAllProducts(c);
}

export async function listProductsHandler(c) {
	return await listProducts(c);
}

export async function getProductHandler(c) {
	return await getProduct(c);
}

export async function updateProductHandler(c) {
	return await updateProductService(c);
}

export async function deleteProductHandler(c) {
	return await deleteProductService(c);
}
