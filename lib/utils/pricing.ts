/**
 * Format a KD price with exactly 3 decimal places.
 * formatKD(15.5) → "KD 15.500"
 */
export function formatKD(amount: number): string {
  return `KD ${Number(amount).toFixed(3)}`;
}

/**
 * Format a price range. When min === max, show single price.
 * formatPriceRange(10, 20) → "KD 10.000 – KD 20.000"
 * formatPriceRange(15, 15) → "KD 15.000"
 */
export function formatPriceRange(min: number, max: number): string {
  if (min === max) return formatKD(min);
  return `${formatKD(min)} – ${formatKD(max)}`;
}
