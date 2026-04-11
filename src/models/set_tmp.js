import { two_nodes } from "../models/two_nodes.js";
import {
  check_standard_compliance_array,
  round,
  units_converter,
  validateInputs,
} from "../utilities/utilities.js";

/**
 * @typedef {Object} SetTmpResult
 * @property {number} set - Standard effective temperature in array, [°C]
 * @public
 */

/**
 * @typedef {Object} SetTmpKwargs - a keywords argument set containing the additional arguments for Standard Effective Temperature calculation
 * @property {boolean} [round=true] - round the result of the SET
 * @property {boolean} [calculate_ce=false] - select if SET is used to calculate Cooling Effect
 * @public
 */

/**
 * @typedef {Object} SetTmpKwargsRequired
 * @property {boolean} round
 * @property {boolean} calculate_ce
 */
/**
 * Calculates the Standard Effective Temperature (SET). The SET is the
 * temperature of a hypothetical isothermal environment at 50% (rh),
 * <0.1 m/s (20 fpm) average air speed (v), and tr = tdb, in which the
 * total heat loss from the skin of an imaginary occupant wearing
 * clothing, standardized for the activity concerned is the same as
 * that from a person in the actual environment with actual clothing
 * and activity level {@link #ref_10|[10]}.
 * @public
 * @memberof models
 * @docname Standard Effective Temperature (SET)
 *
 *
 * @param {number} tdb Dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'.
 * @param {number} tr Mean radiant temperature, default in [°C]
 * @param {number} v Air speed, default in [m/s]
 * @param {number} rh Relative humidity, [%].
 * @param {number} met Metabolic rate, [W/(m2)]
 * @param {number} clo Clothing insulation, [clo]
 * @param {number} [wme=0] External work, [W/(m2)] default 0
 * @param {number} [body_surface_area] Body surface area, default value 1.8258 [m2] in [ft2] if units = ‘IP’
 * @param {number} [p_atm] Atmospheric pressure, default value 101325 [Pa] in [atm] if units = ‘IP’
 * @param {"standing" | "sitting"} [body_position="standing"] Select either “sitting” or “standing”
 * @param {"SI" | "IP"} [units="SI"] Select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {boolean} [limit_inputs=true] By default, if the inputs are outsude the following limits the function returns nan. If False returns values regardless of the input values.
 * @param {SetTmpKwargs} [kwargs]
 * @returns {SetTmpResult} set containing results for the model
 *
 * @example
 * const set = set_tmp(25, 25, 0.1, 50, 1.2, 0.5); // returns {set: 24.3}
 */
const SET_TMP_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  v: { type: "number" },
  rh: { type: "number" },
  met: { type: "number" },
  clo: { type: "number" },
  wme: { type: "number" },
  body_surface_area: { type: "number", required: false },
  p_atm: { type: "number", required: false },
  body_position: { enum: ["sitting", "standing"] },
  units: { enum: ["SI", "IP"] },
  limit_inputs: { type: "boolean" },
  calculate_ce: { type: "boolean", required: false },
  round: { type: "boolean", required: false },
};

export function set_tmp(
  tdb,
  tr,
  v,
  rh,
  met,
  clo,
  wme = 0,
  body_surface_area,
  p_atm,
  body_position = "standing",
  units = "SI",
  limit_inputs = true,
  kwargs = {},
) {
  const defaults_kwargs = {
    calculate_ce: false,
    round: true,
  };

  let joint_kwargs = Object.assign(defaults_kwargs, kwargs);

  validateInputs(
    {
      tdb,
      tr,
      v,
      rh,
      met,
      clo,
      wme,
      body_surface_area,
      p_atm,
      body_position,
      units,
      limit_inputs,
      calculate_ce: joint_kwargs.calculate_ce,
      round: joint_kwargs.round,
    },
    SET_TMP_SCHEMA,
  );

  if (body_surface_area === undefined)
    body_surface_area = units === "SI" ? 1.8258 : 19.65;
  if (p_atm === undefined) p_atm = units === "SI" ? 101325 : 1;

  if (units === "IP") {
    const unit_convert = units_converter(
      {
        tdb: tdb,
        tr: tr,
        v: v,
        area: body_surface_area,
        pressure: p_atm,
      },
      "IP",
    );
    tdb = unit_convert.tdb;
    tr = unit_convert.tr;
    v = unit_convert.v;
    body_surface_area = unit_convert.area;
    p_atm = unit_convert.pressure;
  }

  let set_tmp = two_nodes(
    tdb,
    tr,
    v,
    rh,
    met,
    clo,
    wme,
    body_surface_area,
    p_atm,
    body_position,
    undefined,
    { round: false, calculate_ce: joint_kwargs.calculate_ce },
  ).set;

  if (units === "IP") {
    ({ tmp: set_tmp } = units_converter({ tmp: set_tmp }, "SI"));
  }

  if (limit_inputs) {
    const {
      tdb: tdb_valid,
      tr: tr_valid,
      v: v_valid,
      met: met_valid,
      clo: clo_valid,
    } = check_standard_compliance_array("ASHRAE", {
      tdb: [tdb],
      tr: [tr],
      v: [v],
      met: [met],
      clo: [clo],
    });

    if (
      isNaN(tdb_valid[0]) ||
      isNaN(tr_valid[0]) ||
      isNaN(v_valid[0]) ||
      isNaN(met_valid[0]) ||
      isNaN(clo_valid[0])
    ) {
      set_tmp = NaN;
    }
  }

  if (joint_kwargs.round) {
    set_tmp = round(set_tmp, 1);
  }
  return { set: set_tmp };
}
