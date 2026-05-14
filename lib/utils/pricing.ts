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

/**
 * Format a nullable service price range for the My Services screen.
 * Returns "Price on request" when both values are null/undefined.
 * formatServicePriceRange(5, 15) → "KD 5.000 – KD 15.000"
 * formatServicePriceRange(null, null) → "Price on request"
 */
export function formatServicePriceRange(
  min: number | null | undefined,
  max: number | null | undefined,
): string {
  if (min == null && max == null) return 'Price on request';
  if (min != null && max != null) {
    if (min === max) return formatKD(min);
    return `${formatKD(min)} – ${formatKD(max)}`;
  }
  if (min != null) return `From ${formatKD(min)}`;
  return `Up to ${formatKD(max!)}`;
}
