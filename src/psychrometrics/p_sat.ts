import { notOfType } from "../_internal/errors.ts";

const c_to_k = 273.15;

/**
 * Calculate vapour pressure of water at different temperatures.
 *
 * @param tdb - air temperature, [°C]
 * @returns saturation vapor pressure, [Pa]
 */
export function p_sat(tdb: number): number {
  if (typeof (tdb as unknown) !== "number") throw notOfType("tdb", "a number");
  // pre-calculated constants for p_sat
  const c1 = -5674.5359;
  const c2 = 6.3925247;
  const c3 = -0.9677843 * 1e-2;
  const c4 = 0.62215701 * 1e-6;
  const c5 = 0.20747825 * 1e-8;
  const c6 = -0.9484024 * 1e-12;
  const c7 = 4.1635019;
  const c8 = -5800.2206;
  const c9 = 1.3914993;
  const c10 = -0.048640239;
  const c11 = 0.41764768 * 1e-4;
  const c12 = -0.14452093 * 1e-7;
  const c13 = 6.5459673;

  const ta_k = tdb + c_to_k;
  // pre-calculate the value before passing it to .where
  const log_ta_k = Math.log(ta_k);
  return ta_k < c_to_k
    ? Math.exp(
        c1 / ta_k +
          c2 +
          ta_k * (c3 + ta_k * (c4 + ta_k * (c5 + c6 * ta_k))) +
          c7 * log_ta_k,
      )
    : Math.exp(
        c8 / ta_k +
          c9 +
          ta_k * (c10 + ta_k * (c11 + ta_k * c12)) +
          c13 * log_ta_k,
      );
}
