/**
 * Parse JSON field from database
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

