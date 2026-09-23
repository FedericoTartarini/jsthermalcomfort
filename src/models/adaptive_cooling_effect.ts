/**
 * Cooling effect of elevated air speed in the adaptive models, as
 * pythermalcomfort's private `_internal.adaptive_cooling_effect`. Non-zero
 * only when the operative temperature is at or above 25 °C and the air speed
 * is at least 0.6 m/s.
 *
 * Private: shared by `adaptive_ashrae` and `adaptive_en`, deliberately not
 * added to `src/models/index.js`.
 *
 * @param {number} v - air speed, [m/s]
 * @param {number} to - operative temperature, [°C]
 * @returns {number} cooling effect, [°C]
 */
export function adaptive_cooling_effect(v: number, to: number): number {
  // Written as upstream's `where(to >= 25.0, …, 0)`, so a NaN `to` gives 0.
  if (!(to >= 25.0)) return 0;
  if (v >= 1.2) return 2.2;
  if (v >= 0.9) return 1.8;
  if (v >= 0.6) return 1.2;
  return 0;
}
