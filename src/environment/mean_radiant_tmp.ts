import { notOfType } from "../_internal/errors.ts";

const c_to_k = 273.15;
const cp_air = 1004;
const g = 9.81; // m/s2

/**
 * Convert the globe temperature reading into mean radiant temperature in accordance
 * with either the Mixed Convection developed by Teitelbaum E. et al. (2022) or the ISO
 * 7726:1998 Standard [7726ISO1998](../../docs/references.md#7726iso1998).
 *
 * @param tg - globe temperature, [°C]
 * @param tdb - air temperature, [°C]
 * @param v - air speed, [m/s]
 * @param d - diameter of the globe, [m] default 0.15 m
 * @param emissivity - emissivity of the globe temperature sensor, default 0.95
 * @param standard - Supported values are 'Mixed Convection' and 'ISO'. Defaults to 'Mixed Convection'.
 * either choose between the Mixed Convection and ISO formulations.
 * The Mixed Convection formulation has been proposed by Teitelbaum E. et al. (2022)
 * to better determine the free and forced convection coefficient used in the
 * calculation of the mean radiant temperature. They also showed that mean radiant
 * temperature measured with ping-pong ball-sized globe thermometers is not reliable
 * due to a stochastic convective bias [Teitelbaum2022](../../docs/references.md#teitelbaum2022). The Mixed Convection model has only
 * been validated for globe sensors with a diameter between 0.04 and 0.15 m.
 * @returns mean radiant temperature, [°C]
 * @throws `RangeError` If the standard is not recognized. Please choose either 'Mixed Convection' or 'ISO'.
 *
 * @example
 * ```ts
 * import { mean_radiant_tmp } from "jsthermalcomfort/environment";
 *
 * const tg = 53.2; // globe temperature in °C
 * const tdb = 30.0; // dry bulb temperature in °C
 * const v = 0.3; // air speed in m/s
 * const d = 0.1; // diameter of the globe in m
 * const tr = mean_radiant_tmp(tg, tdb, v, d, undefined, "ISO");
 * console.log(tr); // 74.8
 * ```
 */
export function mean_radiant_tmp(
  tg: number,
  tdb: number,
  v: number,
  d = 0.15,
  emissivity = 0.95,
  standard = "Mixed Convection",
): number {
  for (const [key, value] of Object.entries({ tg, tdb, v, d, emissivity })) {
    if (typeof (value as unknown) !== "number")
      throw notOfType(key, "a number");
  }
  if (typeof (standard as unknown) !== "string") {
    throw notOfType("standard", "a string");
  }
  standard = standard.toLowerCase();

  if (standard === "mixed convection") {
    const mu = 0.0000181; // Pa s
    const k_air = 0.02662; // W/m-K
    const beta = 0.0034; // 1/K
    const nu = 0.0000148; // m2/s
    const alpha = 0.00002591; // m2/s
    const pr = (cp_air * mu) / k_air; // Prandtl constants

    const o = 0.0000000567;
    const n = 1.27 * d + 0.57;

    const ra = (g * beta * Math.abs(tg - tdb) * d * d * d) / nu / alpha;
    const re = (v * d) / nu;

    const nu_natural =
      2 +
      (0.589 * Math.pow(ra, 1 / 4)) /
        Math.pow(1 + Math.pow(0.469 / pr, 9 / 16), 4 / 9);
    const nu_forced =
      2 +
      (0.4 * Math.pow(re, 0.5) + 0.06 * Math.pow(re, 2 / 3)) *
        Math.pow(pr, 0.4);

    const tr =
      Math.pow(
        Math.pow(tg + 273.15, 4) -
          (((Math.pow(Math.pow(nu_forced, n) + Math.pow(nu_natural, n), 1 / n) *
            k_air) /
            d) *
            (-tg + tdb)) /
            emissivity /
            o,
        0.25,
      ) - 273.15;

    // Out of range is NaN without upstream's UserWarning (deviation _shared-147).
    return d >= 0.04 && d <= 0.15 ? tr : NaN;
  }

  if (standard === "iso") {
    tg = tg + c_to_k;
    tdb = tdb + c_to_k;

    // calculate heat transfer coefficient
    const h_n = 1.4 * Math.pow(Math.abs(tg - tdb) / d, 0.25); // natural convection
    const h_f = (6.3 * Math.pow(v, 0.6)) / Math.pow(d, 0.4); // forced convection

    // get the biggest between the two coefficients
    const h = Math.max(h_f, h_n);

    return (
      Math.pow(
        Math.pow(tg, 4) + (h * (tg - tdb)) / (emissivity * (5.67 * 10 ** -8)),
        0.25,
      ) - c_to_k
    );
  }

  throw new RangeError(
    "Standard not recognized. Please choose either 'Mixed Convection' or 'ISO'.",
  );
}
