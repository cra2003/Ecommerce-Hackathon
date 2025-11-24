/**
 * Determine tier based on warehouse priority index
 * 1st warehouse = tier_1, 2nd = tier_2, rest = tier_3
 */
export function getTierForIndex(index) {
	if (index === 0) return 'tier_1';
	if (index === 1) return 'tier_2';
	return 'tier_3';
}

/**
 * Get estimated delivery days based on tier and delivery mode
 * Requirements:
 * - Tier 1: normal 2-3 days, express 1-2 days
 * - Tier 2: normal 3-4 days, express 2-3 days
 * - Tier 3: normal 4-5 days, express 2-3 days
 */
export function getEstimatedDaysForTier(tier, mode /* 'normal' | 'express' */) {
	if (tier === 'tier_1') {
		return mode === 'express' ? { min: 1, max: 2 } : { min: 2, max: 3 };
	}
	if (tier === 'tier_2') {
		return mode === 'express' ? { min: 2, max: 3 } : { min: 3, max: 4 };
	}
	// tier_3 or fallback
	return mode === 'express' ? { min: 2, max: 3 } : { min: 4, max: 5 };
}
