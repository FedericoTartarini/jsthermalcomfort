/**
 * Calculate clothing area factor
 *
 * @param {number[]} clo - Clothing insulation.
 *
 * @returns {number[]} clothing area factor.
 */
export function clo_area_factor(clo) {
  return clo.map((clo) => (clo < 0.5 ? clo * 0.2 + 1 : clo * 0.1 + 1.05));
}
