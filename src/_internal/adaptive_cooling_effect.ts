/**
 * Return the adaptive cooling effect for an air speed and operative temperature.
 *
 * The cooling effect is non-zero only when operative temperature is at or
 * above 25 °C **and** air speed meets the minimum threshold (0.6 m/s).
 *
 * @param v - Air speed, [m/s].
 * @param to - Operative temperature, [°C].
 * @returns Cooling effect magnitude, [°C].
 */
export function adaptive_cooling_effect(v: number, to: number): number {
  const magnitude = v >= 1.2 ? 2.2 : v >= 0.9 ? 1.8 : v >= 0.6 ? 1.2 : 0.0;
  return to >= 25.0 ? magnitude : 0.0;
}
