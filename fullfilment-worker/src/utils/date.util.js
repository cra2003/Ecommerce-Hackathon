/**
 * Add days to a date and return ISO string (date-only portion)
 */
export function addDaysToDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

