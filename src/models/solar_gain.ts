import {
  round,
  transpose_sharp_altitude,
  validateInputs,
} from "../utilities/utilities.js";
import { deepFreeze } from "./modelDocs.ts";
import { _check_params_object, _valid_range } from "../_internal/validation.ts";
import type { ApplicabilityWarning, ModelInfo } from "./modelDocs.ts";

// avoid reallocating these arrays accross function calls
const _ALT_RANGE = [0, 15, 30, 45, 60, 75, 90];
const _AZ_RANGE = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180];

// avoid reallocating these table across function calls
const _FP_TABLE_SITTING = [
  [0.29, 0.324, 0.305, 0.303, 0.262, 0.224, 0.177],
  [0.292, 0.328, 0.294, 0.288, 0.268, 0.227, 0.177],
  [0.288, 0.332, 0.298, 0.29, 0.264, 0.222, 0.177],
  [0.274, 0.326, 0.294, 0.289, 0.252, 0.214, 0.177],
  [0.254, 0.308, 0.28, 0.276, 0.241, 0.202, 0.177],
  [0.23, 0.282, 0.262, 0.26, 0.233, 0.193, 0.177],
  [0.216, 0.26, 0.248, 0.244, 0.22, 0.186, 0.177],
  [0.234, 0.258, 0.236, 0.227, 0.208, 0.18, 0.177],
  [0.262, 0.26, 0.224, 0.208, 0.196, 0.176, 0.177],
  [0.28, 0.26, 0.21, 0.192, 0.184, 0.17, 0.177],
  [0.298, 0.256, 0.194, 0.174, 0.168, 0.168, 0.177],
  [0.306, 0.25, 0.18, 0.156, 0.156, 0.166, 0.177],
  [0.3, 0.24, 0.168, 0.152, 0.152, 0.164, 0.177],
];

const _FP_TABLE_STANDING = [
  [0.35, 0.35, 0.314, 0.258, 0.206, 0.144, 0.082],
  [0.342, 0.342, 0.31, 0.252, 0.2, 0.14, 0.082],
  [0.33, 0.33, 0.3, 0.244, 0.19, 0.132, 0.082],
  [0.31, 0.31, 0.275, 0.228, 0.175, 0.124, 0.082],
  [0.283, 0.283, 0.251, 0.208, 0.16, 0.114, 0.082],
  [0.252, 0.252, 0.228, 0.188, 0.15, 0.108, 0.082],
  [0.23, 0.23, 0.214, 0.18, 0.148, 0.108, 0.082],
  [0.242, 0.242, 0.222, 0.18, 0.153, 0.112, 0.082],
  [0.274, 0.274, 0.245, 0.203, 0.165, 0.116, 0.082],
  [0.304, 0.304, 0.27, 0.22, 0.174, 0.121, 0.082],
  [0.328, 0.328, 0.29, 0.234, 0.183, 0.125, 0.082],
  [0.344, 0.344, 0.304, 0.244, 0.19, 0.128, 0.082],
  [0.347, 0.347, 0.308, 0.246, 0.191, 0.128, 0.082],
];

// Renamed from SolarGainReturnType to <Model>Result, the name every converted
// model's result has. A type alias, as the JSDoc typedef it replaces emitted,
// so documentation.js keeps naming it from the typedef line.
/**
 * @typedef {object} SolarGainResult
 * @property {number} erf - Solar gain to the human body using the Effective Radiant Field [W/m2]
 * @property {number} delta_mrt - Delta mean radiant temperature. The amount by which the mean radiant
 * temperature of the space should be increased if no solar radiation is present.
 * @property { ApplicabilityWarning[] } warnings - Applicability bounds the call broke; see `ApplicabilityWarning`.
 * @public
 */
export type SolarGainResult = {
  erf: number;
  delta_mrt: number;
  readonly warnings: ApplicabilityWarning[];
};

/**
 * The params of `solar_gain`: upstream's keyword parameters, quantities and
 * switches alike, with upstream's defaults (ADR 0002). Documented on the
 * function's `params`.
 */
export interface SolarGainParams {
  sol_altitude: number;
  sharp: number;
  sol_radiation_dir: number;
  sol_transmittance: number;
  f_svv: number;
  f_bes: number;
  asw?: number;
  posture?: "sitting" | "standing" | "supine";
  floor_reflectance?: number;
  round_output?: boolean;
}

/**
 * Applicability limits of `solar_gain`, in SI units, inclusive at both ends
 * as upstream's `_valid_range`.
 *
 * `sol_altitude` and `sharp` are the ranges upstream's code checks: outside
 * them the fp table has no span, and upstream returns NaN for both outputs.
 *
 * `sol_radiation_dir` and `asw` are ASHRAE 55-2023 Normative Appendix C
 * Table C-2's "Allowable Range of Inputs". Upstream's code does not check
 * them: its docstring says only that `sol_radiation_dir` "should typically"
 * range from 200 to 1000 W/m², and gives 0.57 to 0.84 as typical for `asw`.
 * They are the library's first published ranges that upstream does not
 * enforce. They are published because the procedure's diffuse approximation
 * (0.2 × the direct beam) holds for the cloudless sky of Table C-4 and not
 * for an overcast one, and because the app treats applicability as a gate.
 * Outside them the result is still upstream's number, with a `warnings` row
 * (ADR 0001): there is no `limit_inputs` until upstream has one.
 *
 * The three fractions carry no limit: their 0 to 1 is definitional.
 *
 * Same arrangement as `UTCI_LIMITS`: frozen, referenced by identity from
 * `SOLAR_GAIN_INFO` and read by `solar_gain`, so the metadata and the rows
 * cannot disagree. Exported for that identity test, deliberately not added
 * to `src/models/index.js`.
 */
export const SOLAR_GAIN_LIMITS = Object.freeze({
  sol_altitude: Object.freeze({ min: 0, max: 90 }),
  sharp: Object.freeze({ min: 0, max: 180 }),
  sol_radiation_dir: Object.freeze({ min: 200, max: 1000 }),
  asw: Object.freeze({ min: 0.2, max: 0.9 }),
});

/**
 * Model metadata for the solar gain on people.
 *
 * Experimental — the shape of `ModelInfo` may change before release.
 *
 * `posture` is a choice, not a quantity, so it is not an input here, as
 * switches are not. `floor_reflectance` is ASHRAE 55's fixed 0.6 and carries
 * no applicability, nor do the three fractions, whose 0 to 1 is
 * definitional.
 *
 * @public
 */
export const SOLAR_GAIN_INFO: ModelInfo = deepFreeze({
  name: "solar_gain",
  label: "Solar gain on people",
  description:
    "Solar gain on an occupant as the Effective Radiant Field, and the mean radiant temperature increase it is equivalent to (ASHRAE 55 Normative Appendix C).",
  standards: [],
  inputs: {
    sol_altitude: {
      unit: "°",
      applicability: SOLAR_GAIN_LIMITS.sol_altitude,
    },
    sharp: { unit: "°", applicability: SOLAR_GAIN_LIMITS.sharp },
    sol_radiation_dir: {
      unit: "W/m²",
      applicability: SOLAR_GAIN_LIMITS.sol_radiation_dir,
    },
    sol_transmittance: { unit: null },
    f_svv: { unit: null },
    f_bes: { unit: null },
    asw: { unit: null, applicability: SOLAR_GAIN_LIMITS.asw },
    floor_reflectance: { unit: null },
  },
  outputs: {
    erf: { unit: "W/m²" },
    delta_mrt: { unit: "°C" },
  },
});

/**
 * Calculates the solar gain to the human body using the Effective Radiant
 * Field ( ERF) {@link #ref_1|[1]}. The ERF is a measure of the net energy flux to or from
 * the human body. ERF is expressed in W over human body surface area [w/m2].
 *
 * In addition, it calculates the delta mean radiant temperature. Which is the
 * amount by which the mean radiant temperature of the space should be
 * increased if no solar radiation is present.
 *
 * More information on the calculation procedure can be found in Appendix C of {@link #ref_1|[1]}.
 *
 * @memberof models
 * @public
 * @docname Solar gain on people
 *
 * @param {Object} params - the model's parameters, named as in pythermalcomfort.
 * @param {number} params.sol_altitude - Solar altitude, degrees from horizontal [deg]. Ranges between 0 and 90.
 * @param {number} params.sharp - Solar horizontal angle relative to the front of the person (SHARP) [deg].
 * Ranges between 0 and 180 and is symmetrical on either side. Zero (0) degrees
 * represents direct-beam radiation from the front, 90 degrees represents
 * direct-beam radiation from the side, and 180 degrees rep- resent direct-beam
 * radiation from the back. SHARP is the angle between the sun and the person
 * only. Orientation relative to compass or to room is not included in SHARP.
 * @param {number} params.sol_radiation_dir - Direct-beam solar radiation, [W/m2]. Ranges between 200 and 1000. See Table C2-3 of ASHRAE 55 2020 {@link #ref_1|[1]}.
 * @param {number} params.sol_transmittance - Total solar transmittance, ranges from 0 to 1. The total solar
 * transmittance of window systems, including glazing unit, blinds, and other
 * façade treatments, shall be determined using one of the following methods:
 * - i) Provided by manufacturer or from the National Fenestration Rating Council approved Lawrence Berkeley National Lab International Glazing Database.
 * - ii) Glazing unit plus venetian blinds or other complex or unique shades shall be calculated using National Fenestration Rating Council approved software or Lawrence Berkeley National Lab Complex Glazing Database.
 * @param {number} params.f_svv - Fraction of sky-vault view fraction exposed to body, ranges from 0 to 1. It can be calculated using the function {@link #f_svv|f_svv} in utilities.
 * @param {number} params.f_bes - Fraction of the possible body surface exposed to sun, ranges from 0 to 1. See Table C2-2 and equation C-7 ASHRAE 55 2020 {@link #ref_1|[1]}.
 * @param {number} [params.asw=0.7] - The average short-wave absorptivity of the occupant. It will range widely,
 * depending on the color of the occupant’s skin as well as the color and
 * amount of clothing covering the body.
 *
 * A value of 0.7 shall be used unless more specific information about the
 * clothing or skin color of the occupants is available.
 * Note: Short-wave absorptivity typically ranges from 0.57 to 0.84, depending
 * on skin and clothing color. More information is available in Blum (1945).
 * @param {"standing" | "supine" | "sitting"} [params.posture="sitting"] - Default 'sitting' list of available options 'standing', 'supine' or 'sitting'
 * @param {number} [params.floor_reflectance=0.6] - Floor refectance. It is assumed to be constant and equal to 0.6.
 * @param {boolean} [params.round_output=true] - If True, rounds output value. If False, it does not round it.
 *
 * @returns {SolarGainResult}
 *
 * @example
 * import {solar_gain} from "jsthermalcomfort/models";
 * const results = solar_gain({ sol_altitude: 0, sharp: 120, sol_radiation_dir: 800, sol_transmittance: 0.5, f_svv: 0.5, f_bes: 0.5, asw: 0.7, posture: "sitting" });
 * console.log(results); // {erf: 43.3, delta_mrt: 10.4, warnings: []}
 */
// A non-finite number throws a TypeError here, where upstream lets it
// propagate (ADR 0001, reason three). round_output is not validated, as
// upstream's SolarGainInputs is not given it; posture is checked below with
// upstream's message.
const SOLAR_GAIN_SCHEMA = {
  sol_altitude: { type: "number" },
  sharp: { type: "number" },
  sol_radiation_dir: { type: "number" },
  sol_transmittance: { type: "number" },
  f_svv: { type: "number" },
  f_bes: { type: "number" },
  asw: { type: "number" },
  floor_reflectance: { type: "number" },
};

const _POSTURES = ["standing", "supine", "sitting"];

export function solar_gain(params: SolarGainParams): SolarGainResult {
  // Every argument was positional before v2 (ADR 0002); a call still written
  // that way fails here, naming the shape it should have.
  _check_params_object(params, "solar_gain");
  let { sol_altitude, sharp } = params;
  const { sol_radiation_dir, sol_transmittance, f_svv, f_bes } = params;
  // Destructuring defaults also apply to a default passed as undefined.
  const { asw = 0.7, floor_reflectance = 0.6, round_output = true } = params;
  validateInputs(
    {
      sol_altitude,
      sharp,
      sol_radiation_dir,
      sol_transmittance,
      f_svv,
      f_bes,
      asw,
      floor_reflectance,
    },
    SOLAR_GAIN_SCHEMA,
  );

  // The rows are the channel for upstream's UserWarning, which JavaScript has
  // no warnings filter for (ADR 0001). sol_altitude and sharp are what
  // upstream sets to NaN; sol_radiation_dir and asw are Table C-2's ranges,
  // reported and not gated (see SOLAR_GAIN_LIMITS).
  const warnings: ApplicabilityWarning[] = [];
  const sol_altitude_in_table = _valid_range(
    warnings,
    "sol_altitude",
    "input",
    sol_altitude,
    SOLAR_GAIN_LIMITS.sol_altitude,
  );
  const sharp_in_table = _valid_range(
    warnings,
    "sharp",
    "input",
    sharp,
    SOLAR_GAIN_LIMITS.sharp,
  );
  _valid_range(
    warnings,
    "sol_radiation_dir",
    "input",
    sol_radiation_dir,
    SOLAR_GAIN_LIMITS.sol_radiation_dir,
  );
  _valid_range(warnings, "asw", "input", asw, SOLAR_GAIN_LIMITS.asw);

  const posture = (params.posture ?? "sitting").toLowerCase();
  if (!_POSTURES.includes(posture)) {
    throw new Error(
      "Posture has to be either 'standing', 'supine' or 'sitting'.",
    );
  }

  if (!sol_altitude_in_table || !sharp_in_table) {
    return { erf: NaN, delta_mrt: NaN, warnings };
  }

  const deg_to_rad = 0.0174532925;
  const hr = 6;
  const i_diff = 0.2 * sol_radiation_dir;

  // fp is the projected area factor
  const fp_table =
    posture === "sitting" ? _FP_TABLE_SITTING : _FP_TABLE_STANDING;

  if (posture === "supine") {
    [sharp, sol_altitude] = transpose_sharp_altitude(sharp, sol_altitude);
  }

  const alt_i = _find_span(_ALT_RANGE, sol_altitude);
  const az_i = _find_span(_AZ_RANGE, sharp);
  if (alt_i === -1 || az_i === -1) {
    // As upstream: a -1 span must not index the table.
    return { erf: NaN, delta_mrt: NaN, warnings };
  }
  const fp11 = fp_table[az_i][alt_i];
  const fp12 = fp_table[az_i][alt_i + 1];
  const fp21 = fp_table[az_i + 1][alt_i];
  const fp22 = fp_table[az_i + 1][alt_i + 1];
  const az1 = _AZ_RANGE[az_i];
  const az2 = _AZ_RANGE[az_i + 1];
  const alt1 = _ALT_RANGE[alt_i];
  const alt2 = _ALT_RANGE[alt_i + 1];
  let fp = fp11 * (az2 - sharp) * (alt2 - sol_altitude);
  fp += fp21 * (sharp - az1) * (alt2 - sol_altitude);
  fp += fp12 * (az2 - sharp) * (sol_altitude - alt1);
  fp += fp22 * (sharp - az1) * (sol_altitude - alt1);
  fp /= (az2 - az1) * (alt2 - alt1);

  const f_eff = posture === "sitting" ? 0.696 : 0.725; // fraction of the body surface exposed to environmental radiation

  const sw_abs = asw;
  const lw_abs = 0.95;

  const e_diff = f_eff * f_svv * 0.5 * sol_transmittance * i_diff;
  const e_direct = f_eff * fp * sol_transmittance * f_bes * sol_radiation_dir;
  const e_reflected =
    f_eff *
    f_svv *
    0.5 *
    sol_transmittance *
    (sol_radiation_dir * Math.sin(sol_altitude * deg_to_rad) + i_diff) *
    floor_reflectance;

  const e_solar = e_diff + e_direct + e_reflected;
  const erf = e_solar * (sw_abs / lw_abs);
  const d_mrt = erf / (hr * f_eff);

  return {
    erf: round_output ? round(erf, 1) : erf,
    delta_mrt: round_output ? round(d_mrt, 1) : d_mrt,
    warnings,
  };
}

// Upstream's _find_span: the first span [arr[i], arr[i + 1]] that holds x,
// inclusive at both ends, or -1 for a value outside the table or NaN.
function _find_span(arr: readonly number[], x: number): number {
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i + 1] >= x && x >= arr[i]) {
      return i;
    }
  }
  return -1;
}
