import { $map } from "../../supa";
import { clo_area_factor } from "./clo_area_factor";

/**
 * Calculate total sensible thermal resistance (between the skin and ambient air).
 *
 * @param {number[]} hc - Convective heat transfer coefficient (hc) [W/(m2*K)].
 * @param {number[]} hr - Radiative heat transfer coefficient (hr) [W/(m2*K)].
 * @param {number[]} clo - Clothing insulation [clo].
 *
 * @returns {number[]} Total sensible thermal resistance between skin and ambient.
 */
export function dry_r(hc, hr, clo) {
  if (hc.some((x) => x < 0) || hr.some((x) => x < 0)) {
    throw new Error("Input parameters hc and hr must be non-negative.");
  }

  let fcl = clo_area_factor(clo);
  let r_a = $map([hc, hr], ([hc, hr]) => 1 / (hc + hr));
  let r_cl = clo.map((clo) => 0.155 * clo);
  return $map([r_a, fcl, r_cl], ([r_a, fcl, r_cl]) => r_a / fcl + r_cl);
}
