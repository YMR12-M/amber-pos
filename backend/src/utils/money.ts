/**
 * All money is handled as integer piastres (1 EGP = 100 piastres) to avoid
 * IEEE-754 drift. Floats are only used at the API boundary, where the value
 * has already been rounded to 2 decimals.
 *
 * Compare: 0.1 * 3 === 0.30000000000000004 (float)
 *          toPiastres(0.1) * 3 === 30 -> 0.30 (exact)
 */

/** "12.34" | 12.34 -> 1234 */
export function toPiastres(amount: string | number): number {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) throw new Error(`قيمة مالية غير صالحة: ${amount}`);
  return Math.round(n * 100);
}

/** 1234 -> 12.34 */
export function toEgp(piastres: number): number {
  return Math.round(piastres) / 100;
}

/** Percentage applied to an integer amount, rounded half-up to the piastre. */
export function applyRate(piastres: number, rate: number): number {
  return Math.round(piastres * rate);
}
