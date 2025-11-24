// Helpers to coerce JSON-ish inputs to string for TEXT columns storing JSON
export function toJsonText(value) {
	try {
		if (value == null || value === '') return null
		if (typeof value === 'string') {
			// if it's already a JSON array or object, keep as-is; otherwise, wrap single values
			const trimmed = value.trim()
			if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
				return trimmed
			}
			// fallback: treat as plain string
			return JSON.stringify([value])
		}
		return JSON.stringify(value)
	} catch {
		return null
	}
}

