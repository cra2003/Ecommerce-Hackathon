/**
 * Parse JSON field from database (handles TEXT fields storing JSON)
 */
export function parseJSON(field, fallback = []) {
  if (!field) return fallback;
  try {
    return typeof field === 'string' ? JSON.parse(field) : field;
  } catch (e) {
    console.error('JSON parse error:', e);
    return fallback;
  }
}

