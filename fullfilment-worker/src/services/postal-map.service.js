import { parseJSON } from '../utils/json.util.js';
import { isPostalCodeInRange } from '../utils/postal.util.js';

/**
 * Fetch all postal code warehouse mappings
 */
export async function getAllPostalMappings(db) {
	const { results: postalMappings } = await db
		.prepare(
			`
    SELECT 
      mapping_id,
      start_postal_code,
      end_postal_code,
      state,
      region_name,
      warehouses
    FROM postal_code_warehouse_map
  `,
		)
		.all();

	return postalMappings || [];
}

/**
 * Find matched mapping for a postal code
 */
export function findMatchedMapping(postalMappings, postal_code) {
	for (const mapping of postalMappings) {
		if (isPostalCodeInRange(postal_code, mapping.start_postal_code, mapping.end_postal_code)) {
			return mapping;
		}
	}
	return null;
}

/**
 * Get priority warehouses from matched mapping
 */
export function getPriorityWarehouses(matchedMapping) {
	if (!matchedMapping) return [];
	return parseJSON(matchedMapping.warehouses, []);
}
