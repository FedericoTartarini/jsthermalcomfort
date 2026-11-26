import { notOfType } from "../_internal/errors.ts";
import { wet_bulb_tmp } from "./wet_bulb_tmp.ts";

/**
 * Calculates the relative humidity from the wet-bulb temperature.
 *
 * Numeric inverse of {@link wet_bulb_tmp}: bisection on the Stull equation
 * [Stull2011](../../docs/references.md#stull2011). The Stull fit takes no atmospheric pressure, so neither
 * does this function.
 *
 * The fit is not monotonic in `rh` at low `tdb` (it dips before it rises, and
 * below about −20 °C it never rises). Only the rising branch is inverted:
 * a wet-bulb at or above the fit's value at 100 % reads 100, and one at or
 * below the fit's minimum reads 0.
 *
 * @param {number} t_wb - wet-bulb temperature, [°C]
 * @param {number} tdb - dry bulb air temperature, [°C]
 * @returns {number} - relative humidity, [%]
 *
 * @example
 * import { rh_from_wet_bulb } from "jsthermalcomfort";
 * const rh = rh_from_wet_bulb(15.4, 21);
 * console.log(rh); // 55.9...
 */
export function rh_from_wet_bulb(t_wb: number, tdb: number): number {
  for (const [key, value] of Object.entries({ t_wb, tdb })) {
    if (typeof (value as unknown) !== "number")
      throw notOfType(key, "a number");
  }
  if (t_wb >= wet_bulb_tmp(tdb, 100)) return 100;

  // Start the bracket at the fit's lowest whole percent so that the bisection
  // sees a single, rising crossing.
  let lo = 0;
  for (let rh = 1; rh <= 100; rh += 1) {
    if (wet_bulb_tmp(tdb, rh) < wet_bulb_tmp(tdb, lo)) lo = rh;
  }
  if (t_wb <= wet_bulb_tmp(tdb, lo)) return 0;

  let hi = 100;
  for (let i = 0; i < 64; i += 1) {
    const mid = (lo + hi) / 2;
    if (wet_bulb_tmp(tdb, mid) < t_wb) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}
