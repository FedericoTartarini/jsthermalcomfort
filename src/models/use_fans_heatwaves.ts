import { round, validateInputs } from "../utilities/utilities.js";
import { two_nodes_gagge } from "./two_nodes_gagge.ts";
import { deepFreeze } from "./modelDocs.ts";
import { _check_params_object, _valid_range } from "../_internal/validation.ts";
import type { ApplicabilityWarning, ModelInfo } from "./modelDocs.ts";

// Renamed from HeatwaveReturnType to <Model>Result, the name every converted
// model's result has. A type alias, as the JSDoc typedef it replaces emitted,
// so the result stays assignable to Record<string, unknown>.
//
// The fields and their text are upstream's UseFansHeatwaves
// (pythermalcomfort/classes_return.py:632-686 at v4.6.2), in its order. The
// previous typedef listed e_diff, which neither upstream nor this function
// returns, and gave the flags as undefined where upstream masks them to NaN
// (ADR 0006).
/**
 * @typedef {Object} UseFansHeatwavesResult
 * @property {number} e_skin – Total rate of evaporative heat loss from skin, [W/m2]. Equal to e_rsw + e_diff.
 * @property {number} e_rsw – Rate of evaporative heat loss from sweat evaporation, [W/m2].
 * @property {number} e_max – Maximum rate of evaporative heat loss from skin, [W/m2].
 * @property {number} q_sensible – Sensible heat loss from skin, [W/m2].
 * @property {number} q_skin – Total rate of heat loss from skin, [W/m2]. Equal to q_sensible + e_skin.
 * @property {number} q_res – Total rate of heat loss through respiration, [W/m2].
 * @property {number} t_core – Core temperature, [°C].
 * @property {number} t_skin – Skin temperature, [°C].
 * @property {number} m_bl – Skin blood flow, [kg/h/m2].
 * @property {number} m_rsw – Rate at which regulatory sweat is generated, [mL/h/m2].
 * @property {number} w – Skin wettedness, adimensional. Ranges from 0 to 1.
 * @property {number} w_max – Skin wettedness (w) practical upper limit, adimensional. Ranges from 0 to 1.
 * @property {boolean|number} heat_strain – True if the model predicts that the person may be experiencing heat strain; NaN when `limit_inputs` returns NaN for the inputs.
 * @property {boolean|number} heat_strain_blood_flow – True if heat strain is caused by skin blood flow (m_bl) reaching its maximum value; NaN when `limit_inputs` returns NaN for the inputs.
 * @property {boolean|number} heat_strain_w – True if heat strain is caused by skin wettedness (w) reaching its maximum value; NaN when `limit_inputs` returns NaN for the inputs.
 * @property {boolean|number} heat_strain_sweating – True if heat strain is caused by regulatory sweating (m_rsw) reaching its maximum value; NaN when `limit_inputs` returns NaN for the inputs.
 * @property { ApplicabilityWarning[] } warnings - Applicability bounds the call broke, whatever `limit_inputs` is; see `ApplicabilityWarning`.
 * @public
 */
export type UseFansHeatwavesResult = {
  e_skin: number;
  e_rsw: number;
  e_max: number;
  q_sensible: number;
  q_skin: number;
  q_res: number;
  t_core: number;
  t_skin: number;
  m_bl: number;
  m_rsw: number;
  w: number;
  w_max: number;
  heat_strain: boolean | number;
  heat_strain_blood_flow: boolean | number;
  heat_strain_w: boolean | number;
  heat_strain_sweating: boolean | number;
  readonly warnings: ApplicabilityWarning[];
};

/**
 * The params of `use_fans_heatwaves`: upstream's keyword parameters,
 * quantities and switches alike, with upstream's defaults (ADR 0002).
 * Documented on the function's `params`.
 */
export interface UseFansHeatwavesParams {
  tdb: number;
  tr: number;
  v: number;
  rh: number;
  met: number;
  clo: number;
  wme?: number;
  body_surface_area?: number;
  p_atm?: number;
  // ADR 0007: upstream's lowercase spellings. Untyped JavaScript may pass
  // them in any case, as upstream accepts.
  position?: "sitting" | "standing" | "standing, forced convection";
  max_skin_blood_flow?: number;
  max_sweating?: number;
  limit_inputs?: boolean;
  round_output?: boolean;
}

/**
 * Applicability limits of the fan-use model, in SI units.
 *
 * Upstream checks tdb, tr, v, rh, met and clo against these, inclusive
 * (use_fans_heatwaves.py:180-187 at v4.6.2), and masks the result for all of
 * them but rh, which it checks "for its side-effect warning" only
 * (:183-185). Frozen, referenced by identity from `USE_FANS_HEATWAVES_INFO`
 * and the `warnings` rows, and read by the gate below. Exported for that
 * identity test, deliberately not added to `src/models/index.js`.
 */
export const USE_FANS_HEATWAVES_LIMITS = Object.freeze({
  tdb: Object.freeze({ min: 20, max: 50 }),
  tr: Object.freeze({ min: 20, max: 50 }),
  v: Object.freeze({ min: 0.1, max: 4.5 }),
  rh: Object.freeze({ min: 0, max: 100 }),
  met: Object.freeze({ min: 0.7, max: 2 }),
  clo: Object.freeze({ min: 0, max: 1 }),
});

/**
 * Model metadata for the fan-use model.
 *
 * Experimental — the shape of `ModelInfo` may change before release.
 *
 * `standards` is empty: upstream names no standard for these limits, which
 * it calls "extended from ASHRAE 55 baseline" (use_fans_heatwaves.py:179 at
 * v4.6.2). `rh`'s 0 to 100 % is published although the result is not masked
 * for it, as upstream warns about it without masking (:183-185); its
 * `warnings` row carries that bound, as `solar_gain` publishes and reports
 * bounds it does not gate. The heat-strain flags are booleans, so they carry
 * no unit and no classifier.
 *
 * @public
 */
export const USE_FANS_HEATWAVES_INFO: ModelInfo = deepFreeze({
  name: "use_fans_heatwaves",
  label: "Use of fans during heatwaves",
  description:
    "Whether the conditions would cause heat strain, from Gagge's two-node model, with the heat losses and body temperatures behind it.",
  standards: [],
  inputs: {
    tdb: { unit: "°C", applicability: USE_FANS_HEATWAVES_LIMITS.tdb },
    tr: { unit: "°C", applicability: USE_FANS_HEATWAVES_LIMITS.tr },
    v: { unit: "m/s", applicability: USE_FANS_HEATWAVES_LIMITS.v },
    rh: { unit: "%", applicability: USE_FANS_HEATWAVES_LIMITS.rh },
    met: { unit: "met", applicability: USE_FANS_HEATWAVES_LIMITS.met },
    clo: { unit: "clo", applicability: USE_FANS_HEATWAVES_LIMITS.clo },
    wme: { unit: "met" },
  },
  outputs: {
    e_skin: { unit: "W/m²" },
    e_rsw: { unit: "W/m²" },
    e_max: { unit: "W/m²" },
    q_sensible: { unit: "W/m²" },
    q_skin: { unit: "W/m²" },
    q_res: { unit: "W/m²" },
    t_core: { unit: "°C" },
    t_skin: { unit: "°C" },
    m_bl: { unit: "kg/h/m²" },
    m_rsw: { unit: "mL/h/m²" },
    w: { unit: null },
    w_max: { unit: null },
    heat_strain: { unit: null },
    heat_strain_blood_flow: { unit: null },
    heat_strain_w: { unit: null },
    heat_strain_sweating: { unit: null },
  },
});

// A non-finite number throws a TypeError here (ADR 0001, reason three).
// Upstream raises StopIteration from two_nodes_gagge for most, but returns a
// result for a NaN or -inf v (NaN under limit_inputs), a non-finite
// max_skin_blood_flow, and a NaN or +inf max_sweating. A boolean quantity,
// which upstream reads as 0 or 1, and a null one throw a TypeError too:
// quantities are numbers (ADR 0005). limit_inputs is validated, as upstream
// gives it to UseFansHeatwavesInputs (use_fans_heatwaves.py:95-108). position
// and max_sweating are declared here and checked by two_nodes_gagge, with
// upstream's message for position, as upstream checks max_sweating only in
// GaggeTwoNodesInputs and position in both. round_output is declared but not
// validated: upstream does not give it to UseFansHeatwavesInputs and reads it
// with `if round_output:` (:197), so it is read with JavaScript's truth value,
// which differs from Python's on three values (ADR 0001): NaN is true in
// Python and false here, and an empty array or object is false in Python and
// true here.
const USE_FANS_HEATWAVES_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  v: { type: "number" },
  rh: { type: "number" },
  met: { type: "number" },
  clo: { type: "number" },
  wme: { type: "number" },
  body_surface_area: { type: "number" },
  p_atm: { type: "number" },
  position: {},
  max_skin_blood_flow: { type: "number" },
  max_sweating: {},
  limit_inputs: { type: "boolean" },
  round_output: {},
};

// ADR 0013. Upstream's docstring gives the limit_inputs ranges as strict
// ("20 < tdb [°C] < 50", use_fans_heatwaves.py:71-72); the code's bounds are
// inclusive (_valid_range, _internal/validation.py:47), and rh is checked
// without being masked (:183-185). It documents max_sweating in [kg/h/m2]
// (:75-76), where two_nodes_gagge caps m_rsw, in [mL/h/m2], at it
// (two_nodes_gagge.py:388; classes_return.py:523); and max_skin_blood_flow
// without a unit (:65-66), where m_bl, in [kg/h/m2], is compared with it
// (:155-159). It does not say that limit_inputs False with round_output True
// raises (:195-198).
/**
 *
 * Estimate if the conditions you have selected would cause heat strain.
 * This occurs when either the following variables reaches its maximum value:
 *
 *  - m_rsw Rate at which regulatory sweat is generated, [mL/h/m2]
 *  - w : Skin wettedness, adimensional. Ranges from 0 and 1.
 *  - m_bl : Skin blood flow [kg/h/m2]
 *
 * @public
 * @memberof models
 * @docname Use Fans During Heatwaves
 *
 * @param {Object} params - the model's parameters, named as in pythermalcomfort.
 * @param {number} params.tdb - Dry bulb air temperature, [°C].
 * @param {number} params.tr - Mean radiant temperature, [°C].
 * @param {number} params.v - Air speed, [m/s].
 * @param {number} params.rh - Relative humidity, [%].
 * @param {number} params.met - Metabolic rate, [met].
 * @param {number} params.clo - Clothing insulation, [clo].
 * @param {number} [params.wme=0] - External work, [met]. Defaults to 0.
 * @param {number} [params.body_surface_area=1.8258] - Body surface area, default value 1.8258 [m2]. Defaults to 1.8258.
 *
 * Note: The body surface area can be calculated using the function {@link #body_surface_area|body_surface_area}.
 *
 * @param {number} [params.p_atm=101325] - Atmospheric pressure, default value 101325 [Pa]. Defaults to 101325.
 * @param {"sitting" | "standing" | "standing, forced convection"} [params.position="standing"] - Select either "sitting" or "standing". Defaults to "standing".
 * @param {number} [params.max_skin_blood_flow=80] - Maximum blood flow from the core to the skin, [kg/h/m2]. Defaults to 80.
 * @param {number} [params.max_sweating=500] - Maximum rate at which regulatory sweat is generated, [mL/h/m2]. Defaults to 500.
 * @param {boolean} [params.limit_inputs=true] - By default, if the inputs are outside the standard applicability limits the
 * function returns nan. If False, returns values even if input values are outside the applicability limits of the
 * model, and `round_output` must then be False, as upstream raises otherwise. Defaults to True. The applicability limits
 * are 20 <= tdb [°C] <= 50, 20 <= tr [°C] <= 50, 0.1 <= v [m/s] <= 4.5, 0.7 <= met [met] <= 2, and 0 <= clo [clo] <= 1.
 * An rh outside 0 <= rh [%] <= 100 is reported in `warnings` but does not return nan.
 * @param {boolean} [params.round_output=true] - If True, rounds output value. If False, it does not round it. Defaults to True.
 *
 * @returns {UseFansHeatwavesResult} object with results of use fans during heatwave
 *
 * @example
 * const results = use_fans_heatwaves({ tdb: 35, tr: 35, v: 1.0, rh: 50, met: 1.2, clo: 0.5 });
 * console.log(results.e_skin); // 63.0
 */
export function use_fans_heatwaves(
  params: UseFansHeatwavesParams,
): UseFansHeatwavesResult {
  // Every argument was positional before v2 (ADR 0002); a call still written
  // that way fails here, naming the shape it should have. So does an unknown
  // key, such as the removed units (ADR 0008).
  _check_params_object(params, "use_fans_heatwaves", USE_FANS_HEATWAVES_SCHEMA);
  const { tdb, tr, v, rh, met, clo } = params;
  // Destructuring defaults also apply to a default passed as undefined.
  const {
    wme = 0,
    body_surface_area = 1.8258,
    p_atm = 101325,
    position = "standing",
    max_skin_blood_flow = 80,
    max_sweating = 500,
    limit_inputs = true,
    round_output = true,
  } = params;
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
      max_skin_blood_flow,
      limit_inputs,
    },
    USE_FANS_HEATWAVES_SCHEMA,
  );

  const output = two_nodes_gagge({
    tdb,
    tr,
    v,
    rh,
    met,
    clo,
    wme,
    body_surface_area,
    p_atm,
    position,
    max_skin_blood_flow,
    round_output: false,
    max_sweating,
  });

  // Exact equality, as upstream's (use_fans_heatwaves.py:155-165): m_rsw is
  // capped at max_sweating and then back-computed from e_rsw = 0.68 * m_rsw
  // (two_nodes_gagge.py:388-389, :415-417), so a capped m_rsw can miss
  // max_sweating (0.68 * 100 / 0.68 is 99.99999999999999) and leave
  // heat_strain_sweating false.
  const heat_strain_blood_flow = output.m_bl === max_skin_blood_flow;
  const heat_strain_w = output.w === output.w_max;
  const heat_strain_sweating = output.m_rsw === max_sweating;

  let result: Omit<UseFansHeatwavesResult, "warnings"> = {
    e_skin: output.e_skin,
    e_rsw: output.e_rsw,
    e_max: output.e_max,
    q_sensible: output.q_sensible,
    q_skin: output.q_skin,
    q_res: output.q_res,
    t_core: output.t_core,
    t_skin: output.t_skin,
    m_bl: output.m_bl,
    m_rsw: output.m_rsw,
    w: output.w,
    w_max: output.w_max,
    heat_strain:
      heat_strain_blood_flow || heat_strain_w || heat_strain_sweating,
    heat_strain_blood_flow,
    heat_strain_w,
    heat_strain_sweating,
  };

  // The rows are the channel for upstream's UserWarning, which JavaScript has
  // no warnings filter for (ADR 0001). Upstream checks only under
  // limit_inputs; the rows are built on every call, so with the gate off they
  // say what the numbers were computed despite. The gate reads the rows,
  // all but rh's, which upstream leaves out of all_valid (:183-194).
  const warnings: ApplicabilityWarning[] = [];
  _valid_range(warnings, "tdb", "input", tdb, USE_FANS_HEATWAVES_LIMITS.tdb);
  _valid_range(warnings, "tr", "input", tr, USE_FANS_HEATWAVES_LIMITS.tr);
  _valid_range(warnings, "v", "input", v, USE_FANS_HEATWAVES_LIMITS.v);
  _valid_range(warnings, "rh", "input", rh, USE_FANS_HEATWAVES_LIMITS.rh);
  _valid_range(warnings, "met", "input", met, USE_FANS_HEATWAVES_LIMITS.met);
  _valid_range(warnings, "clo", "input", clo, USE_FANS_HEATWAVES_LIMITS.clo);
  // ADR 0006: upstream's np.where(all_valid, ..., np.nan) masks the flags to
  // NaN as well (:195).
  if (limit_inputs && warnings.some((row) => row.key !== "rh")) {
    result = Object.fromEntries(
      Object.keys(result).map((key) => [key, NaN]),
    ) as typeof result;
  }

  if (round_output) {
    // ADR 0012: throw where upstream raises. Without limit_inputs the flags
    // are still boolean arrays, which np.around cannot round (:197-198); the
    // message is numpy's, as upstream raises it.
    if (!limit_inputs) {
      throw new TypeError(
        "Cannot cast ufunc 'multiply' output from dtype('float64') to dtype('bool') with casting rule 'same_kind'",
      );
    }
    // np.around(x, 1) (:197-198): round is half to even. A flag is a
    // boolean in range and NaN once masked, which rounding leaves as it is.
    for (const key of Object.keys(result) as (keyof typeof result)[]) {
      const value = result[key];
      if (typeof value === "number") {
        (result as Record<string, number | boolean>)[key] = round(value, 1);
      }
    }
  }

  return { ...result, warnings };
}
