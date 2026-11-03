import { transpose_sharp_altitude } from "../environment/transpose_sharp_altitude.ts";
import { parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
import type {
  InputsOf,
  ModelInfo,
  ModelWarning,
  OutputsOf,
} from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { _valid_range } from "../_internal/validation.ts";
import { Postures, Standard } from "../utilities/options.ts";

const _ALT_RANGE = [0.0, 15.0, 30.0, 45.0, 60.0, 75.0, 90.0];
const _AZ_RANGE = [
  0.0, 15.0, 30.0, 45.0, 60.0, 75.0, 90.0, 105.0, 120.0, 135.0, 150.0, 165.0,
  180.0,
];

// fp is the projected area factor, standing/supine
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

// fp table, sitting
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

export const SOLAR_GAIN_INFO = deepFreeze({
  name: "solar_gain",
  label: "Solar gain on people",
  standards: [Standard.ashrae_55_2023],
  inputs: {
    sol_altitude: {
      kind: "numeric",
      unit: "°",
      applicability: { min: 0.0, max: 90.0 },
    },
    sharp: {
      kind: "numeric",
      unit: "°",
      applicability: { min: 0.0, max: 180.0 },
    },
    sol_radiation_dir: {
      kind: "numeric",
      unit: "W/m²",
      applicability: { min: 200, max: 1000 },
    },
    sol_transmittance: { kind: "numeric", unit: null },
    f_svv: { kind: "numeric", unit: null },
    f_bes: { kind: "numeric", unit: null },
    asw: {
      kind: "numeric",
      unit: null,
      applicability: { min: 0.2, max: 0.9 },
      default: 0.7,
    },
    posture: {
      kind: "choice",
      allowed: [Postures.standing, Postures.supine, Postures.sitting],
      default: Postures.sitting,
      message: "Posture has to be either 'standing', 'supine' or 'sitting'.",
    },
    floor_reflectance: { kind: "numeric", unit: null, default: 0.6 },
    round_output: { kind: "bool", default: true },
  },
  outputs: {
    erf: { kind: "numeric", nullable: true, unit: "W/m²" },
    delta_mrt: { kind: "numeric", nullable: true, unit: "°C" },
  },
} as const satisfies ModelInfo);

/** @interface */
export type SolarGainInputs = InputsOf<typeof SOLAR_GAIN_INFO>;

/**
 * Dataclass to represent the solar gain to the human body.
 *
 * @interface
 */
export type SolarGain = OutputsOf<typeof SOLAR_GAIN_INFO>;

/**
 * Calculate the solar gain to the human body using the Effective Radiant Field
 * (ERF) [55ASHRAE2023](../../docs/references.md#55ashrae2023). The ERF is a measure of the net energy flux to or from the
 * human body. ERF is expressed in W over human body surface area [W/m2]. In addition,
 * it calculates the delta mean radiant temperature. Which is the amount by which the
 * mean radiant temperature of the space should be increased if no solar radiation is
 * present.
 *
 * @param inputs
 * @param inputs.sol_altitude - Solar altitude, degrees from horizontal [deg]. Ranges between 0 and 90.
 * @param inputs.sharp - Solar horizontal angle relative to the front of the person (SHARP) [deg].
 * Ranges between 0 and 180 and is symmetrical on either side. Zero (0) degrees
 * represents direct-beam radiation from the front, 90 degrees represents
 * direct-beam radiation from the side, and 180 degrees represents direct-beam
 * radiation from the back. SHARP is the angle between the sun and the person
 * only. Orientation relative to compass or to room is not included in SHARP.
 * @param inputs.sol_radiation_dir - Direct-beam solar radiation, [W/m2]. Ranges between 200 and 1000. See Table
 * C-2 of ASHRAE 55 [55ASHRAE2023](../../docs/references.md#55ashrae2023).
 * @param inputs.sol_transmittance - Total solar transmittance, ranges from 0 to 1. The total solar
 * transmittance of window systems, including glazing unit, blinds, and other
 * façade treatments, shall be determined using one of the following methods:
 * i) Provided by manufacturer or from the National Fenestration Rating
 * Council approved Lawrence Berkeley National Lab International Glazing
 * Database.
 * ii) Glazing unit plus venetian blinds or other complex or unique shades
 * shall be calculated using National Fenestration Rating Council approved
 * software or Lawrence Berkeley National Lab Complex Glazing Database.
 * iii) Glazing unit plus interior fabric shade shall be calculated as the
 * product of glazing unit total solar transmittance (in item i) multiplied by
 * the shade openness factor.
 * @param inputs.f_svv - Fraction of sky-vault view fraction exposed to body, ranges from 0 to 1.
 * It can be calculated using the function
 * `f_svv`.
 * @param inputs.f_bes - Fraction of the possible body surface exposed to sun, ranges from 0 to 1.
 * See Figure C2-1 of ASHRAE 55 [55ASHRAE2023](../../docs/references.md#55ashrae2023).
 * @param inputs.asw - The average short-wave absorptivity of the occupant. It will range widely,
 * depending on the color of the skin of the occupant as well as the color and
 * amount of clothing covering the body. Defaults to 0.7.
 *
 * > [!NOTE]
 * > Short-wave absorptivity typically ranges from 0.57 to 0.84, depending
 * > on skin and clothing color. More information is available in Blum (1945).
 *
 * @param inputs.posture - Default 'sitting' list of available options 'standing', 'supine' or 'sitting'.
 * @param inputs.floor_reflectance - Floor reflectance. It is assumed to be constant and equal to 0.6. Defaults to 0.6.
 * @param inputs.round_output - If True, rounds output value. If False, it does not round it. Defaults to True.
 *
 * @returns A dataclass containing the solar gain to the human body and delta mean radiant temperature.
 * See {@link SolarGain} for more details.
 * To access the `erf` and `delta_mrt` values, use the corresponding attributes of the returned `SolarGain` instance, e.g., `result.erf`.
 *
 * - `erf` - Solar gain to the human body using the Effective Radiant Field [W/m2].
 * - `delta_mrt` - Delta mean radiant temperature. The amount by which the mean radiant
 *   temperature of the space should be increased if no solar radiation is present.
 *
 * @throws `TypeError` If the posture is not a string.
 * @throws `RangeError` If the posture is not one of 'standing', 'supine', or 'sitting'.
 *
 * @example
 * ```ts
 * import { solar_gain } from "jsthermalcomfort/models";
 *
 * const result = solar_gain({
 *   sol_altitude: 0,
 *   sharp: 120,
 *   sol_radiation_dir: 800,
 *   sol_transmittance: 0.5,
 *   f_svv: 0.5,
 *   f_bes: 0.5,
 *   asw: 0.7,
 *   posture: "sitting",
 * });
 * console.log(result.erf); // 43.3
 * console.log(result.delta_mrt); // 10.4
 * ```
 *
 * @remarks
 * This model is applicable under the following conditions:
 *
 * - Solar altitude (sol_altitude) must be between 0° and 90°.
 * - Solar horizontal angle (sharp) must be between 0° and 180°.
 * - Direct-beam solar radiation (sol_radiation_dir) should typically range from 200 to 1000 W/m², as per ASHRAE 55 Table C-2.
 * - Solar transmittance (sol_transmittance) must be between 0 and 1.
 * - Sky-vault view fraction (f_svv) and body surface exposure fraction (f_bes) must be between 0 and 1.
 * - Average short-wave absorptivity (asw) typically ranges from 0.57 to 0.84, depending on skin and clothing color.
 * - Posture must be one of 'standing', 'supine', or 'sitting'.
 * - Floor reflectance (floor_reflectance) is assumed constant at 0.6, but can vary.
 * - All inputs are in SI units (e.g., angles in degrees, radiation in W/m²).
 */
export function solar_gain(inputs: SolarGainInputs): SolarGain {
  // Validate inputs using the SolarGainInputs class
  let {
    sol_altitude,
    sharp,
    sol_radiation_dir,
    sol_transmittance,
    f_svv,
    f_bes,
    asw,
    posture,
    floor_reflectance,
    round_output,
  } = parseInputs(SOLAR_GAIN_INFO, inputs);

  const warnings: ModelWarning[] = [];
  // the fp lookup table only covers 0-90/0-180; outside that, _find_span
  // can't return a valid span at all, so clip to NaN (with a warning) here
  // rather than let the numba kernel silently wrap a -1 index
  sol_altitude = _valid_range(
    sol_altitude,
    SOLAR_GAIN_INFO.inputs.sol_altitude.applicability,
    "sol_altitude",
    "input",
    SOLAR_GAIN_INFO.inputs.sol_altitude.unit,
    warnings,
  );
  sharp = _valid_range(
    sharp,
    SOLAR_GAIN_INFO.inputs.sharp.applicability,
    "sharp",
    "input",
    SOLAR_GAIN_INFO.inputs.sharp.unit,
    warnings,
  );
  // ASHRAE 55 Table C-2's ranges, which upstream does not check (deviation solar_gain-3, deviation solar_gain-4).
  _valid_range(
    sol_radiation_dir,
    SOLAR_GAIN_INFO.inputs.sol_radiation_dir.applicability,
    "sol_radiation_dir",
    "input",
    SOLAR_GAIN_INFO.inputs.sol_radiation_dir.unit,
    warnings,
  );
  _valid_range(
    asw,
    SOLAR_GAIN_INFO.inputs.asw.applicability,
    "asw",
    "input",
    SOLAR_GAIN_INFO.inputs.asw.unit,
    warnings,
  );

  posture = posture.toLowerCase();

  let [erf, d_mrt] = _solar_gain_scalar(
    sol_altitude,
    sharp,
    sol_radiation_dir,
    sol_transmittance,
    f_svv,
    f_bes,
    asw,
    floor_reflectance,
    posture,
  );

  if (round_output) {
    erf = round(erf, 1);
    d_mrt = round(d_mrt, 1);
  }

  return buildOutputs(SOLAR_GAIN_INFO, { erf, delta_mrt: d_mrt }, warnings);
}

function _find_span(arr: readonly number[], x: number): number {
  // range(n - 1), not range(n): the original pure Python loop iterated
  // range(len(arr)) and relied on valid (in-range) inputs always matching
  // before the last iteration read arr[i + 1] one past the end - out of
  // range inputs would raise IndexError there. In the numba version this
  // is called from a prange-parallelized loop (_solar_gain_array), and
  // numba does not propagate exceptions raised inside prange loops, so an
  // out-of-bounds read there would silently return garbage rather than a
  // clean error. Stopping one iteration early avoids the out-of-bounds
  // read entirely; out-of-range inputs now return -1 (same as any other
  // unmatched span) instead of raising.
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    if ((arr[i + 1] ?? NaN) >= x && x >= (arr[i] ?? NaN)) {
      return i;
    }
  }
  return -1;
}

/**
 * Return the projected area factor fp, interpolated from the posture's table.
 *
 * For a supine person the table is read with angles relative to the body. The rotated
 * angles stay inside this function, so callers only use the solar angles. Returns NaN
 * if the angles are outside the table's domain.
 */
function _projected_area_factor(
  sol_altitude: number,
  sharp: number,
  posture: string,
): number {
  const fp_table =
    posture === Postures.sitting ? _FP_TABLE_SITTING : _FP_TABLE_STANDING;

  if (posture === Postures.supine) {
    [sharp, sol_altitude] = transpose_sharp_altitude(sharp, sol_altitude);
  }

  const alt_i = _find_span(_ALT_RANGE, sol_altitude);
  const az_i = _find_span(_AZ_RANGE, sharp);
  if (alt_i === -1 || az_i === -1) {
    // angles out of the table's domain (0-90/0-180), or NaN (e.g. from
    // _valid_range clipping upstream); for supine these are the rotated
    // angles. -1 would otherwise wrap around to the last row/column instead
    // of failing, so bail out explicitly rather than returning a
    // plausible-looking wrong value.
    return NaN;
  }
  const fp11 = fp_table[az_i]?.[alt_i] ?? NaN;
  const fp12 = fp_table[az_i]?.[alt_i + 1] ?? NaN;
  const fp21 = fp_table[az_i + 1]?.[alt_i] ?? NaN;
  const fp22 = fp_table[az_i + 1]?.[alt_i + 1] ?? NaN;
  const az1 = _AZ_RANGE[az_i] ?? NaN;
  const az2 = _AZ_RANGE[az_i + 1] ?? NaN;
  const alt1 = _ALT_RANGE[alt_i] ?? NaN;
  const alt2 = _ALT_RANGE[alt_i + 1] ?? NaN;
  let fp = fp11 * (az2 - sharp) * (alt2 - sol_altitude);
  fp += fp21 * (sharp - az1) * (alt2 - sol_altitude);
  fp += fp12 * (az2 - sharp) * (sol_altitude - alt1);
  fp += fp22 * (sharp - az1) * (sol_altitude - alt1);
  return fp / ((az2 - az1) * (alt2 - alt1));
}

function _solar_gain_scalar(
  sol_altitude: number,
  sharp: number,
  sol_radiation_dir: number,
  sol_transmittance: number,
  f_svv: number,
  f_bes: number,
  asw: number,
  floor_reflectance: number,
  posture: string,
): [number, number] {
  const deg_to_rad = 0.0174532925;
  const hr = 6;
  const i_diff = 0.2 * sol_radiation_dir;

  const fp = _projected_area_factor(sol_altitude, sharp, posture);
  if (Number.isNaN(fp)) {
    return [NaN, NaN];
  }

  let f_eff = 0.725; // fraction of the body surface exposed to environmental radiation
  if (posture === Postures.sitting) {
    f_eff = 0.696;
  }

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

  return [erf, d_mrt];
}
