import {
  round,
  check_standard_compliance,
  units_converter,
} from "../utilities/utilities.js";
import { pmv } from "../models/pmv.js";

/**
 * @typedef {Object} VerTmpGradReturnType - a result set containing the predicted precentage of dissatisfied and the acceptability
 * @property {number} PPD_vg – Predicted Percentage of Dissatisfied occupants with vertical temperature gradient, [%]
 * @property {boolean} Acceptability – The ASHRAE 55 2020 standard defines that the value of air speed at the ankle level
 * is acceptable if PPD_ad is lower or equal than 5 %
 * @public
 */

/**
 * Calculates the percentage of thermally dissatisfied people with a vertical temperature gradient between feet and head [1].
 * This equation is only applicable for vr < 0.2 m/s (40 fps).
 *
 * @public
 * @memberof models
 * @docname Vertical air temperature gradient
 *
 * @param {number} tdb Dry bulb air temperature, default in [°C] in [°F] if "units" = 'IP'.
 * @param {number} tr Mean radiant temperature, default in [°C]
 * @param {number} vr Relative air speed, default in [m/s] in [fps] if "units" = "IP"
 * @param {number} rh Relative humidity, [%].
 * @param {number} met Metabolic rate, [W/(m2)]
 * @param {number} clo Clothing insulation, [clo]
 * @param {number} vertical_tmp_grad Vertical temperature gradient between the feet and the head, default in [°C/m]
 * @param {"SI" | "IP"} [units="SI"] - Select the SI (International System of Units) or the IP (Imperial Units) system.
 *
 * @returns {VerTmpGradReturnType} Object with results of the PPD with vertical temprature gradident.
 *
 * @example
 * const hi = vertical_tmp_grad_ppd(25, 25, 0.1, 50, 1.2, 0.5, 7); // returns {'PPD_vg': 12.6, 'Acceptability': false}
 */
export function vertical_tmp_grad_ppd(
  tdb,
  tr,
  vr,
  rh,
  met,
  clo,
  vertical_tmp_grad,
  units = "SI",
) {
  if (units === "IP") {
    ({
      tdb: tdb,
      tr: tr,
      vr: vr,
    } = units_converter({ tdb: tdb, tr: tr, vr: vr }, "IP"));

    vertical_tmp_grad = (vertical_tmp_grad / 1.8) * 3.28;
  }
  const warnings = check_standard_compliance("ASHRAE", {
    tdb: tdb,
    tr: tr,
    v_limited: vr,
    rh: rh,
    met: met,
    clo: clo,
  });
  warnings.forEach((warning) => console.warn(warning));

  const tsv = pmv(tdb, tr, vr, rh, met, clo, 0, "ASHRAE");
  const ppd_vg = calculate_ppd_vg(tsv, vertical_tmp_grad);
  const acceptability = check_acceptability(ppd_vg);

  return {
    PPD_vg: ppd_vg,
    Acceptability: acceptability,
  };
}

/**
 * Calculate Predicted Percentage of Dissatisfied (PPD) based on tsv and vertical temperature gradient.
 *
 * @param {number} tsv - PMV in ashrae standard
 * @param {number} vertical_tmp_grad - Vertical temperature gradient between the feet and the head
 * @returns {number} Predicted Percentage of Dissatisfied occupants with vertical temperature gradient
 */
function calculate_ppd_vg(tsv, vertical_tmp_grad) {
  const numerator = Math.exp(
    0.13 * (tsv - 1.91) ** 2 + 0.15 * vertical_tmp_grad - 1.6,
  );
  const ppd_vg = round((numerator / (1 + numerator) - 0.345) * 100, 1);
  return ppd_vg;
}

/**
 * Check the acceptability based on ppd_vg
 *
 * @param {number} ppd_vg - PPD based on Vertical temperature gradient
 * @returns {boolean} Acceptability
 */
function check_acceptability(ppd_vg) {
  return ppd_vg <= 5;
}
