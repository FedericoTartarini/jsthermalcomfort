import JOS3Defaults from "../JOS3Defaults";
import { clo_area_factor } from "./clo_area_factor";
import { $map } from "../../supa";

/**
 * Calculate total evaporative thermal resistance (between the skin and ambient air).
 *
 * @param {number[]} hc - Convective heat transfer coefficient (hc) [W/(m2*K)].
 * @param {number[]} clo - Clothing insulation [clo].
 * @param {number[]} [i_clo=0.45] - Clothing vapor permeation efficiency [-].
 * @param {number} [lewis_rate=16.5] - Lewis rate [K/kPa].
 *
 * @returns {number[]} r_et - Total evaporative thermal resistance.
 */
export function wet_r(
  hc,
  clo,
  i_clo = JOS3Defaults.clothing_vapor_permeation_efficiency,
  lewis_rate = JOS3Defaults.lewis_rate,
) {
  if (hc.some((hc) => hc < 0)) {
    throw new Error("Input parameter hc must be non-negative.");
  }

  let fcl = clo_area_factor(clo);
  let r_cl = clo.map((clo) => 0.155 * clo);
  let r_ea = hc.map((hc) => 1 / (lewis_rate * hc));
  let r_ecl = $map(
    [r_cl, i_clo],
    ([r_cl, i_clo]) => r_cl / (lewis_rate * i_clo),
  );
  return $map([r_ea, fcl, r_ecl], ([r_ea, fcl, r_ecl]) => r_ea / fcl + r_ecl);
}
