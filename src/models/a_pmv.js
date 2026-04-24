import { validateInputs, round } from "../utilities/utilities.js";
import { pmv } from "./pmv.js";

/**
 * @typedef {object} APmvResult
 * @property {number} a_pmv - Predicted Mean Vote
 * @public
 */

/**
 * @typedef {Object} A_pmvKwargs
 * @property {'SI'|'IP'} units - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @property { boolean } limit_inputs - Default is True. By default, if the inputs are outside the standard applicability
 *    limits the function returns NaN. If false, returns pmv and ppd values even if input values are outside
 *    the applicability limits of the model.
 *
 *    The ISO 7730 2005 limits are 10 < tdb [°C] < 30, 10 < tr [°C] < 40,
 *    0 < vr [m/s] < 1, 0.8 < met [met] < 4, 0 < clo [clo] < 2, and -2 < PMV < 2.
 * @public
 */

/**
 * Returns Adaptive Predicted Mean Vote (aPMV) {@link #ref_25|[25]}.
 * This index was developed by Yao, R. et al. (2009). The model takes into account factors
 * such as culture, climate, social, psychological and behavioral adaptations, which have
 * an impact on the senses used to detect thermal comfort. This model uses an adaptive
 * coefficient (λ) representing the adaptive factors that affect the sense of thermal comfort.
 *
 * This is a version that supports scalar arguments.
 *
 * @public
 * @memberof models
 * @docname Adaptive Predicted Mean Vote (aPMV)
 *
 * @param {number} tdb - Dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} tr - Mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} vr - Relative air speed, default in [m/s] in [fps] if `units` = 'IP'
 *
 *   Note: vr is the relative air speed caused by body movement and not the air
 *   speed measured by the air speed sensor. The relative air speed is the sum of the
 *   average air speed measured by the sensor plus the activity-generated air speed
 *   (Vag). Where Vag is the activity-generated air speed caused by motion of
 *   individual body parts. vr can be calculated using the function v_relative in utilities.js.
 * @param {number} rh - Relative humidity, [%]
 * @param {number} met - Metabolic rate, [met]
 * @param {number} clo - Clothing insulation, [clo]
 *
 *   Note: The activity as well as the air speed modify the insulation characteristics
 *   of the clothing and the adjacent air layer. Consequently, the ISO 7730 states that
 *   the clothing insulation shall be corrected {@link #ref_2|[2]}. The ASHRAE 55 Standard corrects
 *   for the effect of the body movement for met equal or higher than 1.2 met using
 *   the equation clo = Icl × (0.6 + 0.4/met) The dynamic clothing insulation, clo,
 *   can be calculated using the function clo_dynamic in utilities.js.
 * @param {number} a_coefficient - Adaptive coefficient
 * @param {number} [wme=0] - External work
 * @param {A_pmvKwargs} kwargs - additional arguments
 *
 * @returns {APmvResult} set containing results for the model
 *
 * @example
 * const tdb = 24,
 * const tr = 30,
 * const vr = 0.22,
 * const rh = 50,
 * const met = 1.4,
 * const clo = 0.5,
 * const a_coefficient = 0.293,
 * const wme = undefined,
 *
 * const result = a_pmv(tdb, tr, vr, rh, met, clo, a_coefficient, wme);
 * console.log(result) //output { a_pmv: 0.48 }
 */
const A_PMV_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  vr: { type: "number" },
  rh: { type: "number" },
  met: { type: "number" },
  clo: { type: "number" },
  a_coefficient: { type: "number" },
  wme: { type: "number" },
  units: { enum: ["SI", "IP"] },
  limit_inputs: { type: "boolean", required: false },
};

export function a_pmv(
  tdb,
  tr,
  vr,
  rh,
  met,
  clo,
  a_coefficient,
  wme = 0,
  kwargs = {},
) {
  validateInputs(
    {
      tdb,
      tr,
      vr,
      rh,
      met,
      clo,
      a_coefficient,
      wme,
      units: (kwargs.units ?? "SI").toUpperCase(),
      limit_inputs: kwargs.limit_inputs,
    },
    A_PMV_SCHEMA,
  );

  const default_kwargs = {
    units: "SI",
    limit_inputs: true,
  };

  kwargs = Object.assign(default_kwargs, kwargs);

  let _pmv = pmv(tdb, tr, vr, rh, met, clo, wme, "ISO", kwargs);
  _pmv = round(_pmv / (1 + a_coefficient * _pmv), 2);

  return { a_pmv: _pmv };
}
