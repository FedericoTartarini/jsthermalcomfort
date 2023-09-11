import {
  round,
  check_standard_compliance_array,
  units_converter,
  valid_range,
  units_converter_array,
} from "../utilities/utilities";
import { t_o, t_o_array } from "../psychrometrics/t_o";
import { get_ce } from "./adaptive_en";

/**
 * @typedef {object} AdaptiveAshraeResult
 * @property {number} tmp_cmf - Comfort temperature a that specific running mean temperature, default in [°C] or in [°F]
 * @property {number} tmp_cmf_80_low - Lower acceptable comfort temperature for 80% occupants, default in [°C] or in [°F]
 * @property {number} tmp_cmf_80_up - Upper acceptable comfort temperature for 80% occupants, default in [°C] or in [°F]
 * @property {number} tmp_cmf_90_low - Lower acceptable comfort temperature for 90% occupants, default in [°C] or in [°F]
 * @property {number} tmp_cmf_90_up - Upper acceptable comfort temperature for 90% occupants, default in [°C] or in [°F]
 * @property {boolean} acceptability_80 - Acceptability for 80% occupants
 * @property {boolean} acceptability_90 - Acceptability for 90% occupants
 * @public
 */

/**
 * Determines the adaptive thermal comfort based on ASHRAE 55. The adaptive
 * model relates indoor design temperatures or acceptable temperature ranges
 * to outdoor meteorological or climatological parameters. The adaptive model
 * can only be used in occupant-controlled naturally conditioned spaces that
 * meet all the following criteria:
 *
 * - There is no mechianical cooling or heating system in operation
 * - Occupants have a metabolic rate between 1.0 and 1.5 met
 * - Occupants are free to adapt their clothing within a range as wide as 0.5 and 1.0 clo
 * - The prevailing mean (runnin mean) outdoor temperature is between 10 and 33.5 °C
 *
 * @see {@link adaptive_ashrae_array} for a version that supports array arguments
 *
 * @public
 * @memberof models
 * @docname Adaptive ASHRAE
 *
 * @param {number} tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} t_running_mean - running mean temperature, default in [°C] in [°C] in [°F] if `units` = 'IP'
 * The running mean temperature can be calculated using the function {@link #running_mean_outdoor_temperature|running_mean_outdoor_temperature}
 * @param {number} v - air speed, default in [m/s] in [fps] if `units` = 'IP'
 * @param {"SI" | "IP"} units - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {boolean} limit_inputs - By default, if the inputs are outsude the standard applicability limits the
 * function returns nan. If False returns pmv and ppd values even if input values are
 * outside the applicability limits of the model.
 *
 * The ASHRAE 55 2020 limits are 10 < tdb [°C] < 40, 10 < tr [°C] < 40,
 * 0 < vr [m/s] < 2, 10 < t running mean [°C] < 33.5
 *
 * You can use this function to calculate if your conditions are within the `adaptive thermal comfort region`.
 * Calculations with comply with the ASHRAE 55 2020 Standard {@link #ref_1|[1]}.
 *
 * @example
 * import { adaptive_ashrae } from "jsthermalcomfort/models";
 * const results = adaptive_ashrae(25, 25, 20, 0.1);
 * console.log(results);
 * // {tmp_cmf: 24.0, tmp_cmf_80_low: 20.5, tmp_cmf_80_up: 27.5,
 * //   tmp_cmf_90_low: 21.5, tmp_cmf_90_up: 26.5, acceptability_80: true,
 * //   acceptability_90: true}
 * console.log(results.acceptability_80);
 * // true
 *
 * @example
 * import { adaptive_ashrae } from "jsthermalcomfort/models";
 * // For users who want to use the IP system
 * const results = adaptive_ashrae(77, 77, 68, 0.3, 'IP');
 * console.log(results);
 * // {tmp_cmf: 75.2, tmp_cmf_80_low: 68.9, tmp_cmf_80_up: 81.5,
 * //  tmp_cmf_90_low: 70.7, tmp_cmf_90_up: 79.7, acceptability_80: true,
 * //  acceptability_90: true}
 *
 * @example
 * import { adaptive_ashrae } from "jsthermalcomfort/models";
 * const results = adaptive_ashrae(25, 25, 9, 0.1);
 * console.log(results);
 * // {tmp_cmf: NaN, tmp_cmf_80_low: NaN, ...}
 * // The adaptive thermal comfort model can only be used
 * // if the running mean temperature is higher than 10°C
 */
export function adaptive_ashrae(
  tdb,
  tr,
  t_running_mean,
  v,
  units = "SI",
  limit_inputs = true,
) {
  const standard = "ASHRAE";
  if (units === "IP") {
    ({
      tdb,
      tr,
      tmp_running_mean: t_running_mean,
      v,
    } = units_converter({
      tdb,
      tr,
      tmp_running_mean: t_running_mean,
      v,
    }));
  }
  const to = t_o(tdb, tr, v, standard);
  // calculate cooling effect (ce) of elevated air speed when top > 25 degC.
  const ce = get_ce(v, to);
  // Relation between comfort and outdoor temperature
  let t_cmf = 0.31 * t_running_mean + 17.8;

  if (limit_inputs) {
    const {
      tdb: tdb_valid,
      tr: tr_valid,
      v: v_valid,
    } = check_standard_compliance_array(standard, {
      tdb: [tdb],
      tr: [tr],
      v: [v],
    });
    const trm_valid =
      t_running_mean >= 10.0 && t_running_mean <= 33.5 ? t_running_mean : NaN;
    if (
      isNaN(tdb_valid[0]) ||
      isNaN(tr_valid[0]) ||
      isNaN(v_valid[0]) ||
      isNaN(trm_valid)
    )
      t_cmf = NaN;
  }

  t_cmf = round(t_cmf, 1);

  let tmp_cmf_80_low = t_cmf - 3.5;
  let tmp_cmf_90_low = t_cmf - 2.5;
  let tmp_cmf_80_up = t_cmf + 3.5 + ce;
  let tmp_cmf_90_up = t_cmf + 2.5 + ce;

  const acceptability_80 = tmp_cmf_80_low <= to && to <= tmp_cmf_80_up;
  const acceptability_90 = tmp_cmf_90_low <= to && to <= tmp_cmf_90_up;

  if (units === "IP") {
    ({
      tmp_cmf: t_cmf,
      tmp_cmf_80_low,
      tmp_cmf_80_up,
      tmp_cmf_90_low,
      tmp_cmf_90_up,
    } = units_converter(
      {
        tmp_cmf: t_cmf,
        tmp_cmf_80_low,
        tmp_cmf_80_up,
        tmp_cmf_90_low,
        tmp_cmf_90_up,
      },
      "SI",
    ));
  }

  return {
    tmp_cmf: t_cmf,
    tmp_cmf_80_low,
    tmp_cmf_80_up,
    tmp_cmf_90_low,
    tmp_cmf_90_up,
    acceptability_80,
    acceptability_90,
  };
}

/**
 * @typedef {object} AdaptiveAshraeArrayResult
 * @property {number[]} tmp_cmf - Comfort temperature a that specific running mean temperature, default in [°C] or in [°F]
 * @property {number[]} tmp_cmf_80_low - Lower acceptable comfort temperature for 80% occupants, default in [°C] or in [°F]
 * @property {number[]} tmp_cmf_80_up - Upper acceptable comfort temperature for 80% occupants, default in [°C] or in [°F]
 * @property {number[]} tmp_cmf_90_low - Lower acceptable comfort temperature for 90% occupants, default in [°C] or in [°F]
 * @property {number[]} tmp_cmf_90_up - Upper acceptable comfort temperature for 90% occupants, default in [°C] or in [°F]
 * @property {boolean[]} acceptability_80 - Acceptability for 80% occupants
 * @property {boolean[]} acceptability_90 - Acceptability for 90% occupants
 * @public
 */

/**
 * Determines the adaptive thermal comfort based on ASHRAE 55. The adaptive
 * model relates indoor design temperatures or acceptable temperature ranges
 * to outdoor meteorological or climatological parameters. The adaptive model
 * can only be used in occupant-controlled naturally conditioned spaces that
 * meet all the following criteria:
 *
 * - There is no mechianical cooling or heating system in operation
 * - Occupants have a metabolic rate between 1.0 and 1.5 met
 * - Occupants are free to adapt their clothing within a range as wide as 0.5 and 1.0 clo
 * - The prevailing mean (runnin mean) outdoor temperature is between 10 and 33.5 °C
 *
 * @see {@link adaptive_ashrae} for a version that supports scalar arguments
 *
 * @public
 * @memberof models
 * @docname Adaptive ASHRAE (array version)
 *
 * @param {number[]} tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number[]} tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number[]} t_running_mean - running mean temperature, default in [°C] in [°C] in [°F] if `units` = 'IP'
 * The running mean temperature can be calculated using the function {@link #running_mean_outdoor_temperature|running_mean_outdoor_temperature}
 * @param {number[]} v - air speed, default in [m/s] in [fps] if `units` = 'IP'
 * @param {"SI" | "IP"} units - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {boolean} limit_inputs - By default, if the inputs are outsude the standard applicability limits the
 * function returns nan. If False returns pmv and ppd values even if input values are
 * outside the applicability limits of the model.
 *
 * The ASHRAE 55 2020 limits are 10 < tdb [°C] < 40, 10 < tr [°C] < 40,
 * 0 < vr [m/s] < 2, 10 < t running mean [°C] < 33.5
 *
 * You can use this function to calculate if your conditions are within the `adaptive thermal comfort region`.
 * Calculations with comply with the ASHRAE 55 2020 Standard {@link #ref_1|[1]}.
 *
 * @example
 * import { adaptive_ashrae_array } from "jsthermalcomfort/models";
 * const results = adaptive_ashrae_array([25], [25], [20], [0.1]);
 * console.log(results);
 * // {tmp_cmf: [24.0], tmp_cmf_80_low: [20.5], tmp_cmf_80_up: [27.5],
 * //   tmp_cmf_90_low: [21.5], tmp_cmf_90_up: [26.5], acceptability_80: [true],
 * //   acceptability_90: [true]}
 * console.log(results.acceptability_80);
 * // [true]
 *
 * @example
 * import { adaptive_ashrae_array } from "jsthermalcomfort/models";
 * // For users who want to use the IP system
 * const results = adaptive_ashrae_array([77], [77], [68], [0.3], 'IP');
 * console.log(results);
 * // {tmp_cmf: [75.2], tmp_cmf_80_low: [68.9], tmp_cmf_80_up: [81.5],
 * //  tmp_cmf_90_low: [70.7], tmp_cmf_90_up: [79.7], acceptability_80: [true],
 * //  acceptability_90: [true]}
 *
 * @example
 * import { adaptive_ashrae_array } from "jsthermalcomfort/models";
 * const results = adaptive_ashrae_array([25], [25], [9], [0.1]);
 * console.log(results);
 * // {tmp_cmf: [NaN], tmp_cmf_80_low: [NaN], ...}
 * // The adaptive thermal comfort model can only be used
 * // if the running mean temperature is higher than 10°C
 */
export function adaptive_ashrae_array(
  tdb,
  tr,
  t_running_mean,
  v,
  units = "SI",
  limit_inputs = true,
) {
  const standard = "ASHRAE";
  if (units === "IP") {
    ({
      tdb,
      tr,
      tmp_running_mean: t_running_mean,
      v,
    } = units_converter_array({
      tdb,
      tr,
      tmp_running_mean: t_running_mean,
      v,
    }));
  }
  const to = t_o_array(tdb, tr, v, standard);
  // calculate cooling effect (ce) of elevated air speed when top > 25 degC.
  const ce = v.map((_v, index) => get_ce(_v, to[index]));
  // Relation between comfort and outdoor temperature
  let t_cmf = t_running_mean.map((_t) => 0.31 * _t + 17.8);

  if (limit_inputs) {
    const {
      tdb: tdb_valid,
      tr: tr_valid,
      v: v_valid,
    } = check_standard_compliance_array(standard, {
      tdb,
      tr,
      v,
    });
    const trm_valid = valid_range(t_running_mean, [10.0, 33.5]);
    for (let i = 0; i < t_cmf.length; ++i) {
      if (
        isNaN(tdb_valid[i]) ||
        isNaN(tr_valid[i]) ||
        isNaN(v_valid[i]) ||
        isNaN(trm_valid[i])
      )
        t_cmf[i] = NaN;
    }
  }

  for (let i = 0; i < t_cmf.length; ++i) {
    t_cmf[i] = round(t_cmf[i], 1);
  }

  let tmp_cmf_80_low = t_cmf.map((_t) => _t - 3.5);
  let tmp_cmf_90_low = t_cmf.map((_t) => _t - 2.5);
  let tmp_cmf_80_up = t_cmf.map((_t, i) => _t + 3.5 + ce[i]);
  let tmp_cmf_90_up = t_cmf.map((_t, i) => _t + 2.5 + ce[i]);

  const acceptability_80 = tmp_cmf_80_low.map(
    (_low, index) => _low <= to[index] && to[index] <= tmp_cmf_80_up[index],
  );
  const acceptability_90 = tmp_cmf_90_low.map(
    (_low, index) => _low <= to[index] && to[index] <= tmp_cmf_90_up[index],
  );

  if (units === "IP") {
    ({
      tmp_cmf: t_cmf,
      tmp_cmf_80_low,
      tmp_cmf_80_up,
      tmp_cmf_90_low,
      tmp_cmf_90_up,
    } = units_converter_array(
      {
        tmp_cmf: t_cmf,
        tmp_cmf_80_low,
        tmp_cmf_80_up,
        tmp_cmf_90_low,
        tmp_cmf_90_up,
      },
      "SI",
    ));
  }

  return {
    tmp_cmf: t_cmf,
    tmp_cmf_80_low,
    tmp_cmf_80_up,
    tmp_cmf_90_low,
    tmp_cmf_90_up,
    acceptability_80,
    acceptability_90,
  };
}
