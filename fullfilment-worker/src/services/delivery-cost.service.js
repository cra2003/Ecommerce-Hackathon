/**
 * Fetch delivery costs for specific tiers
 */
export async function getDeliveryCostsForTiers(db, tiersUsed) {
	const tierPlaceholders = tiersUsed.map(() => '?').join(',');

	const { results: deliveryCosts } = await db
		.prepare(
			`
    SELECT 
      tier_name,
      tier_description,
      standard_delivery_cost,
      express_delivery_cost,
      free_delivery_threshold,
      currency
    FROM delivery_cost_config
    WHERE tier_name IN (${tierPlaceholders})
  `,
		)
		.bind(...tiersUsed)
		.all();

	return deliveryCosts || [];
}

/**
 * Map delivery costs to a map structure
 */
export function mapDeliveryCosts(deliveryCosts) {
	const deliveryCostMap = {};
	deliveryCosts.forEach((cost) => {
		deliveryCostMap[cost.tier_name] = {
			description: cost.tier_description,
			standard: parseFloat(cost.standard_delivery_cost),
			express: parseFloat(cost.express_delivery_cost),
			free_threshold: parseFloat(cost.free_delivery_threshold),
			currency: cost.currency,
		};
		console.log(`[fulfillment-check] ${cost.tier_name}: standard=₹${cost.standard_delivery_cost}, express=₹${cost.express_delivery_cost}`);
	});
	return deliveryCostMap;
}
