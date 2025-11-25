import { getAllPostalMappings, findMatchedMapping, getPriorityWarehouses } from '../services/postal-map.service.js';
import { getInventoryByProductAndWarehouses, parseInventoryToStockMap } from '../services/inventory.service.js';
import { allocateQuantityAcrossWarehouses, determineHighestTier } from '../services/fulfillment.service.js';
import { getDeliveryCostsForTiers, mapDeliveryCosts } from '../services/delivery-cost.service.js';
import { getEstimatedDaysForTier } from '../utils/delivery-tier.util.js';
import { addDaysToDate } from '../utils/date.util.js';
import { logEvent, logError } from '../services/log.service.js';

/**
 * POST /api/fulfillment/check
 * Complex fulfillment logic:
 * - Find warehouses for postal code
 * - Check product availability
 * - Allocate quantity across warehouses
 * - Determine delivery tiers and costs
 * - Check express eligibility
 */
export async function fulfillmentCheckHandler(c) {
	let body = {};
	try {
		if (c.req.addTraceLog) {
			c.req.addTraceLog('Starting fulfillment check');
		}
		body = await c.req.json();
		const { postal_code, product_id, size, quantity } = body;

		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Postal: ${postal_code}, Product: ${product_id}, Size: ${size}, Qty: ${quantity}`);
		}
		console.log(`[fulfillment-check] START: postal_code=${postal_code}, product_id=${product_id}, size=${size}, qty=${quantity}`);
		await logEvent(c.env, 'fulfillment_check_started', { postal_code, product_id, size, quantity });

		// Validation
		if (!postal_code || !product_id || !size || !quantity) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog('Validation failed: Missing required fields');
			}
			console.log(`[fulfillment-check] ERROR: Missing required fields`);
			return c.json(
				{
					success: false,
					error: 'Missing required fields: postal_code, product_id, size, quantity',
				},
				400,
			);
		}

		if (quantity <= 0) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog(`Validation failed: Invalid quantity: ${quantity}`);
			}
			console.log(`[fulfillment-check] ERROR: Invalid quantity: ${quantity}`);
			return c.json(
				{
					success: false,
					error: 'Quantity must be greater than 0',
				},
				400,
			);
		}

		// STEP 1: Find warehouses for postal code
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Finding warehouses for postal code: ${postal_code}`);
		}
		console.log(`[fulfillment-check] STEP 1: Finding warehouses for postal code ${postal_code}`);
		const postalMappings = await getAllPostalMappings(c.env.DB);

		console.log(`[fulfillment-check] Found ${postalMappings.length} postal code mappings`);

		const matchedMapping = findMatchedMapping(postalMappings, postal_code);

		if (!matchedMapping) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog(`No warehouse coverage for postal code: ${postal_code}`);
			}
			console.log(`[fulfillment-check] ERROR: No warehouse coverage for postal code ${postal_code}`);
			return c.json(
				{
					success: false,
					error: 'No warehouse coverage for this postal code',
					postal_code,
					message: 'Delivery not available to this area',
				},
				404,
			);
		}

		console.log(
			`[fulfillment-check] Matched postal range: ${matchedMapping.start_postal_code}-${matchedMapping.end_postal_code}, region: ${matchedMapping.region_name}`,
		);

		const priorityWarehouses = getPriorityWarehouses(matchedMapping);
		console.log(
			`[fulfillment-check] Priority warehouses (${priorityWarehouses.length}): ${priorityWarehouses.map((w) => w.warehouse_id).join(', ')}`,
		);

		if (priorityWarehouses.length === 0) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog('No warehouses configured for region');
			}
			console.log(`[fulfillment-check] ERROR: No warehouses configured for region`);
			return c.json(
				{
					success: false,
					error: 'No warehouses configured for this region',
				},
				500,
			);
		}

		// STEP 2: Fetch product inventory for priority warehouses
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Fetching inventory for product ${product_id}, size ${size} in ${priorityWarehouses.length} warehouse(s)`);
		}
		console.log(`[fulfillment-check] STEP 2: Fetching inventory for product ${product_id}, size ${size} in warehouses`);
		const warehouseIds = priorityWarehouses.map((wh) => wh.warehouse_id);

		const inventoryResults = await getInventoryByProductAndWarehouses(
			c.env.DB,
			product_id,
			warehouseIds,
			size,
			priorityWarehouses, // Pass priority warehouses to get warehouse names
		);

		console.log(`[fulfillment-check] Found inventory in ${inventoryResults?.length || 0} warehouses`);

		if (!inventoryResults || inventoryResults.length === 0) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog('Product not available in any warehouse');
			}
			console.log(`[fulfillment-check] ERROR: Product not available in any warehouse`);
			return c.json(
				{
					success: false,
					available: false,
					error: 'Product not available in any warehouse serving this area',
					postal_code,
					product_id,
					size,
				},
				404,
			);
		}

		// STEP 3: Build warehouse inventory map
		console.log(`[fulfillment-check] STEP 3: Building inventory map for size ${size}`);
		const inventoryMap = parseInventoryToStockMap(inventoryResults, size);

		// STEP 4: Get SKU ID for lock lookup (format: "P0001-10")
		// Get SKU from inventory results
		const skuId = inventoryResults.length > 0 && inventoryResults[0].sku ? inventoryResults[0].sku : null; // Will be null if SKU not available, locks will be skipped

		console.log(`[fulfillment-check] SKU ID for locks: ${skuId || 'NOT AVAILABLE (locks will be skipped)'}`);

		// STEP 5: Allocate quantity across warehouses based on priority (with lock awareness)
		if (c.req.addTraceLog) {
			c.req.addTraceLog(
				`Allocating ${quantity} units across warehouses${skuId ? ` (checking locks for SKU: ${skuId})` : ' (locks disabled - SKU not found)'}`,
			);
		}
		console.log(
			`[fulfillment-check] STEP 4: Allocating ${quantity} units across warehouses${skuId ? ` (checking locks for SKU: ${skuId})` : ' (locks disabled - SKU not found)'}`,
		);
		const kv = c.env.LOCKS; // Get KV namespace for locks
		const { allocations, remainingQuantity, anyExpressAvailable } = await allocateQuantityAcrossWarehouses(
			priorityWarehouses,
			inventoryMap,
			size,
			quantity,
			kv || null, // Pass KV if available
			skuId || null, // Pass SKU ID if available
		);

		// STEP 5: Check if we could fulfill the full quantity
		if (remainingQuantity > 0) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog(
					`Insufficient stock. Requested: ${quantity}, Fulfilled: ${quantity - remainingQuantity}, Short: ${remainingQuantity}`,
				);
			}
			console.log(
				`[fulfillment-check] ERROR: Insufficient stock. Requested ${quantity}, fulfilled ${quantity - remainingQuantity}, short ${remainingQuantity}`,
			);
			return c.json(
				{
					success: false,
					available: false,
					error: 'Insufficient stock',
					requested_quantity: quantity,
					available_quantity: quantity - remainingQuantity,
					message: `Only ${quantity - remainingQuantity} units available. ${remainingQuantity} units short.`,
					partial_allocations: allocations,
				},
				400,
			);
		}

		// STEP 6: Fetch delivery costs for each tier
		console.log(`[fulfillment-check] STEP 5: Fetching delivery costs`);
		const tiersUsed = [...new Set(allocations.map((a) => a.tier))];
		console.log(`[fulfillment-check] Tiers used: ${tiersUsed.join(', ')}`);

		const deliveryCosts = await getDeliveryCostsForTiers(c.env.DB, tiersUsed);

		console.log(`[fulfillment-check] Found delivery costs for ${deliveryCosts.length} tiers`);

		const deliveryCostMap = mapDeliveryCosts(deliveryCosts);

		// STEP 7: Calculate delivery costs based on highest tier used
		// The highest tier (tier_3 > tier_2 > tier_1) determines the cost
		console.log(`[fulfillment-check] STEP 6: Determining highest tier`);
		const highestTier = determineHighestTier(allocations);
		console.log(`[fulfillment-check] Highest tier: ${highestTier}`);

		const deliveryCost = deliveryCostMap[highestTier] || {
			description: 'Unknown tier',
			standard: 0,
			express: 0,
			free_threshold: 0,
			currency: 'INR',
		};

		// STEP 8: Calculate estimated delivery days for normal and express
		console.log(`[fulfillment-check] STEP 7: Calculating delivery estimates for ${highestTier}`);
		const estimatedNormal = getEstimatedDaysForTier(highestTier, 'normal');
		const estimatedExpress = getEstimatedDaysForTier(highestTier, 'express');
		console.log(`[fulfillment-check] Normal delivery: ${estimatedNormal.min}-${estimatedNormal.max} days`);
		console.log(`[fulfillment-check] Express delivery: ${estimatedExpress.min}-${estimatedExpress.max} days`);

		const estimatedNormalDate = addDaysToDate(estimatedNormal.max);
		const estimatedExpressDate = addDaysToDate(estimatedExpress.max);
		console.log(`[fulfillment-check] Estimated dates: Normal=${estimatedNormalDate}, Express=${estimatedExpressDate}`);

		// STEP 9: Build response
		console.log(`[fulfillment-check] STEP 8: Building response`);
		console.log(
			`[fulfillment-check] SUCCESS: Product available, tier=${highestTier}, express=${anyExpressAvailable}, standard_cost=₹${deliveryCost.standard}, express_cost=₹${deliveryCost.express}`,
		);

		await logEvent(c.env, 'fulfillment_check_success', {
			postal_code,
			product_id,
			size,
			quantity,
			highest_tier: highestTier,
			express_available: anyExpressAvailable,
			warehouses_used: allocations.length,
			tiers_used: tiersUsed,
		});

		if (c.req.addTraceLog) {
			c.req.addTraceLog(
				`Fulfillment check completed. Tier: ${highestTier}, Express: ${anyExpressAvailable}, Warehouses: ${allocations.length}`,
			);
		}

		return c.json({
			success: true,
			available: true,
			fulfillment: {
				product_id,
				size,
				requested_quantity: quantity,
				fulfilled_quantity: quantity,
				allocations,
			},
			delivery: {
				postal_code,
				region: matchedMapping.region_name,
				state: matchedMapping.state,
				highest_tier: highestTier,
				tier_description: deliveryCost.description,
				standard_delivery_cost: deliveryCost.standard,
				express_delivery_cost: deliveryCost.express,
				express_available: anyExpressAvailable,
				free_delivery_threshold: deliveryCost.free_threshold,
				currency: deliveryCost.currency,
				// Backwards-compatible field (normal delivery)
				estimated_days: estimatedNormal,
				// New fields for normal vs express estimates
				estimated_days_normal: estimatedNormal,
				estimated_days_express: estimatedExpress,
				estimated_delivery_date_normal: estimatedNormalDate,
				estimated_delivery_date_express: estimatedExpressDate,
			},
			warehouses_used: allocations.length,
			tiers_used: tiersUsed,
		});
	} catch (error) {
		console.error('Error in fulfillment check:', error);
		await logError(c.env, 'fulfillment_check_failed', {
			postal_code: body?.postal_code,
			product_id: body?.product_id,
			message: error.message,
			stack: error.stack,
		});
		return c.json(
			{
				success: false,
				error: 'Failed to process fulfillment check',
				message: error.message,
			},
			500,
		);
	}
}
