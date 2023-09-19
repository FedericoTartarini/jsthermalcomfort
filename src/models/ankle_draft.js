import { pmv } from "./pmv.js";
import {
  units_converter,
  check_standard_compliance,
  round,
} from "../utilities/utilities.js";

/**
 * @public
 * @typedef {Object} Ankle_draft_ret
 * @property {number} PPD_ad - redicted Percentage of Dissatisfied occupants with ankle draft, [%]
 * @property {boolean} Acceptability - The ASHRAE 55 2020 standard defines that the value of air speed at the ankle level is acceptable if PPD_ad is lower or equal than 20%
 */

/**
 * Calculates the percentage of thermally dissatisfied people with the ankle draft (0.1 m) above floor level {@link #ref_23|[23]}.
    This equation is only applicable for vr < 0.2 m/s (40 fps).
 * @public
 * @memberof models
 * @docname Ankle draft
 * 
 * @param {number} tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'   
 * 
        Note: The air temperature is the average value over two heights: 0.6 m (24 in.)
        and 1.1 m (43 in.) for seated occupants
        and 1.1 m (43 in.) and 1.7 m (67 in.) for standing occupants.

 * @param {number} tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'

 * @param {number} vr - relative air speed, default in [m/s] in [fps] if `units` = 'IP'   

        Note: vr is the relative air speed caused by body movement and not the air
        speed measured by the air speed sensor. The relative air speed is the sum of the
        average air speed measured by the sensor plus the activity-generated air speed
        (Vag). Where Vag is the activity-generated air speed caused by motion of
        individual body parts. vr can be calculated using the function v_relative in utilities.js.

 * @param {number} rh - relative humidity, [%]

 * @param {number} met - metabolic rate, [met]

 * @param {number} clo - clothing insulation, [clo]
        
        Note: The activity as well as the air speed modify the insulation characteristics
        of the clothing and the adjacent air layer. Consequently, the ISO 7730 states that
        the clothing insulation shall be corrected {@link #ref_2|[2]}. The ASHRAE 55 Standard corrects
        for the effect of the body movement for met equal or higher than 1.2 met using
        the equation clo = Icl × (0.6 + 0.4/met) The dynamic clothing insulation, clo,
        can be calculated using the function clo_dynamic in utilities.js.

 * @param {number} v_ankle - air speed at the 0.1 m (4 in.) above the floor, default in [m/s] in [fps] if
        `units` = 'IP'

 * @param {string} units - select the SI (International System of Units) or the IP (Imperial Units) system.     
 * @returns {Ankle_draft_ret} - Returns {"PPD_ad": ppd_val, "Acceptability": acceptability}
 * 
 * @example
 * results = ankle_draft(25, 25, 0.2, 50, 1.2, 0.5, 0.3, "SI")
 * console.log(results) // expected result is {PPD_ad: 18.5, Acceptability: true}
 * 
 */
export function ankle_draft(tdb, tr, vr, rh, met, clo, v_ankle, units = "SI") {
  let kwargs = {};
  if (units.toLowerCase() == "ip") {
    kwargs = {
      tdb: tdb,
      tr: tr,
      v: vr,
      vel: v_ankle,
    };
    const ret = units_converter(kwargs);
    tdb = ret["tdb"];
    tr = ret["tr"];
    vr = ret["v"];
    v_ankle = ret["vel"];
  }

  kwargs = { tdb: tdb, tr: tr, v_limited: vr, rh: rh, met: met, clo: clo };
  check_standard_compliance("ASHRAE", kwargs);

  const tsv = pmv(tdb, tr, vr, rh, met, clo, 0, "ASHRAE");
  const ppd_val = round(
    (Math.exp(-2.58 + 3.05 * v_ankle - 1.06 * tsv) /
      (1 + Math.exp(-2.58 + 3.05 * v_ankle - 1.06 * tsv))) *
      100,
    1,
  );
  const acceptability = ppd_val <= 20;
  return { PPD_ad: ppd_val, Acceptability: acceptability };
}
