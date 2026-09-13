/**
 * Calculates the relative humidity from the wet-bulb temperature.
 *
 * Numeric inverse of {@link t_wb}: bisection on the Stull equation
 * {@link #ref_6|[6]} before its 0.1 °C rounding. The Stull fit takes no
 * atmospheric pressure, so neither does this function.
 *
 * The fit is not monotonic in `rh` at low `tdb` (it dips before it rises, and
 * below about −20 °C it never rises). Only the rising branch is inverted:
 * a wet-bulb at or above the fit's value at 100 % reads 100, and one at or
 * below the fit's minimum reads 0.
 *
 * @public
 * @memberof psychrometrics
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
  // Stull's fit as evaluated by t_wb, before rounding.
  const stull = (rh: number): number =>
    tdb * Math.atan(0.151977 * Math.pow(rh + 8.313659, 0.5)) +
    Math.atan(tdb + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035;

  if (t_wb >= stull(100)) return 100;

  // Start the bracket at the fit's lowest whole percent so that the bisection
  // sees a single, rising crossing.
  let lo = 0;
  for (let rh = 1; rh <= 100; rh += 1) {
    if (stull(rh) < stull(lo)) lo = rh;
  }
  if (t_wb <= stull(lo)) return 0;

  let hi = 100;
  for (let i = 0; i < 64; i += 1) {
    const mid = (lo + hi) / 2;
    if (stull(mid) < t_wb) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}
