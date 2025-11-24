/**
 * Check if postal code falls within a range
 */
export function isPostalCodeInRange(postalCode, startCode, endCode) {
	const code = postalCode.toString().padStart(6, '0');
	const start = startCode.toString().padStart(6, '0');
	const end = endCode.toString().padStart(6, '0');
	return code >= start && code <= end;
}
