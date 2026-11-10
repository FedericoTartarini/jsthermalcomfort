import type { ClassifierBins } from "../_internal/classifierBins.ts";
import { BASE_INPUTS_UNITS, parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
import type {
  InputsOf,
  ModelInfo,
  ModelWarning,
  OutputsOf,
} from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { _mapping, _valid_range } from "../_internal/validation.ts";
import { Units } from "../utilities/options.ts";
import { units_converter } from "../utilities/units_converter.ts";

/** Thermal stress category of each UTCI range, [°C]. Bins include their upper edge. */
const STRESS_CATEGORIES = deepFreeze({
  edges: [-40.0, -27.0, -13.0, 0.0, 9.0, 26.0, 32.0, 38.0, 46.0, 1000.0],
  labels: [
    "extreme cold stress",
    "very strong cold stress",
    "strong cold stress",
    "moderate cold stress",
    "slight cold stress",
    "no thermal stress",
    "moderate heat stress",
    "strong heat stress",
    "very strong heat stress",
    "extreme heat stress",
  ],
  right: true,
} as const satisfies ClassifierBins);

export const UTCI_INFO = deepFreeze({
  name: "utci",
  label: "UTCI",
  standards: [],
  inputs: {
    tdb: {
      kind: "numeric",
      unit: "°C",
      applicability: { min: -50.0, max: 50.0 },
    },
    tr: { kind: "numeric", unit: "°C" },
    v: { kind: "numeric", unit: "m/s", applicability: { min: 0.5, max: 17.0 } },
    rh: {
      kind: "numeric",
      unit: "%",
      applicability: { min: 0.0, max: 100.0 },
    },
    units: BASE_INPUTS_UNITS,
    limit_inputs: { kind: "bool", default: true },
    round_output: { kind: "bool", default: true },
  },
  outputs: {
    utci: { kind: "numeric", nullable: true, unit: "°C" },
    stress_category: {
      kind: "label",
      nullable: true,
      unit: null,
      classifier: STRESS_CATEGORIES,
    },
  },
  derived: {
    "tr - tdb": {
      unit: "°C",
      applicability: { min: -30.0, max: 70.0 },
    },
    "pa (kPa)": { unit: "kPa", applicability: { min: 0.0, max: 5.0 } },
  },
} as const satisfies ModelInfo);

/** @interface */
export type UTCIInputs = InputsOf<typeof UTCI_INFO>;

/**
 * Dataclass to represent the Universal Thermal Climate Index (UTCI).
 *
 * @interface
 */
export type UTCI = OutputsOf<typeof UTCI_INFO>;

/**
 * Calculate the Universal Thermal Climate Index (UTCI).
 *
 * The UTCI is the equivalent
 * temperature for the environment derived from a reference environment. It is defined
 * as the air temperature of the reference environment which produces the same strain
 * index value in comparison with the reference individual's response to the real
 * environment. It is regarded as one of the most comprehensive indices for calculating
 * heat stress in outdoor spaces. The parameters that are taken into account for
 * calculating UTCI involve dry bulb temperature, mean radiation temperature, the
 * pressure of water vapor or relative humidity, and wind speed (at the elevation of 10
 * m above the ground). [Zare2018](../../docs/references.md#zare2018)
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature. Default in [°C] in [°F] if `units` = 'IP'.
 * @param inputs.tr - Mean radiant temperature. Default in [°C] in [°F] if `units` = 'IP'.
 * @param inputs.v - Wind speed 10m above ground level. Default in [m/s] in [fps] if `units` = 'IP'.
 * @param inputs.rh - Relative humidity, [%].
 * @param inputs.units - Select the SI (International System of Units) or the IP (Imperial Units) system. Defaults to 'SI'.
 * @param inputs.limit_inputs - By default, if the inputs are outside the standard applicability limits the
 * function returns nan. If False, returns UTCI values even if input values are
 * outside the applicability limits of the model. The valid input ranges are
 * -50 <= tdb [°C] <= 50, -30 <= tr - tdb [°C] <= 70,
 * 0.5 <= v [m/s] <= 17.0, 0 <= rh [%] <= 100, and water vapour pressure
 * between 0 and 5 kPa (inclusive). Defaults to True.
 * @param inputs.round_output - If True, rounds output value. If False, it does not round it. Defaults to True.
 *
 * @returns A dataclass containing the Universal Thermal Climate Index and stress category.
 * See {@link UTCI} for more details. To access the
 * `utci` and `stress_category` values, use the corresponding attributes of the
 * returned `UTCI` instance, e.g., `result.utci`.
 *
 * - `utci` - Universal Thermal Climate Index, [°C] or in [°F].
 * - `stress_category` - UTCI categorized in terms of thermal stress [Blazejczyk2013](../../docs/references.md#blazejczyk2013).
 *
 * @remarks
 * All four applicability limits applied when ``limit_inputs=True`` (air temperature,
 * ``tr - tdb``, wind speed and humidity) are the input checks of the official UTCI
 * program, ``UTCI_a002.f90`` (version a 0.002, October 2009), available at
 * https://utci.org/resources/UTCI%20Program%20Code.zip. That program accepts wind
 * speeds up to 30 m/s, but its documentation and input prompt give 17 m/s, the limit
 * used here.
 * High relative humidity can exceed the vapour-pressure limit even when air
 * temperature is within range. Setting ``limit_inputs=False`` permits polynomial
 * extrapolation, which can produce unrealistic temperatures and stress categories.
 * The original approximation can also have a non-monotonic wind-speed response;
 * this function does not alter the polynomial to enforce monotonicity.
 *
 * @example
 * ```ts
 * import { utci } from "jsthermalcomfort/models";
 *
 * const result = utci({ tdb: 25, tr: 25, v: 1.0, rh: 50 });
 * console.log(result.utci); // 24.6
 * console.log(result.stress_category); // "no thermal stress"
 *
 * const values = [25, 40].map((tdb) => utci({ tdb, tr: 25, v: 1.0, rh: 50 }).utci);
 * console.log(values); // [24.6, 40.4]
 * ```
 */
export function utci(inputs: UTCIInputs): UTCI {
  // Validate inputs using the UTCIInputs class
  let { tdb, tr, v, rh, units, limit_inputs, round_output } = parseInputs(
    UTCI_INFO,
    inputs,
  );

  if (units.toUpperCase() === Units.IP) {
    ({ tdb, tr, v } = units_converter(Units.IP, { tdb, tr, v }));
  }

  function exponential(t_db: number): number {
    const g = [
      -2836.5744,
      -6028.076559,
      19.54263612,
      -0.02737830188,
      0.000016261698,
      7.0229056 * Math.pow(10.0, -10),
      -1.8680009 * Math.pow(10.0, -13),
    ];
    const tk = t_db + 273.15; // air temp in K
    let es = 2.7150305 * Math.log(tk);
    for (const [count, i] of g.entries()) {
      // numpy's power gives tk to the -1 as 1 / tk does, where Math.pow can differ by an ulp.
      es = es + i * (count - 2 === -1 ? 1 / tk : Math.pow(tk, count - 2));
    }
    es = Math.exp(es) * 0.01; // convert Pa to hPa
    return es;
  }

  const eh_pa = exponential(tdb) * (rh / 100.0);
  const delta_t_tr = tr - tdb;
  const pa = eh_pa / 10.0; // convert vapour pressure to kPa

  let utci_approx = _utci_optimized(tdb, v, delta_t_tr, pa);

  // Checks that inputs are within the bounds accepted by the model if not return nan
  const warnings: ModelWarning[] = [];
  const tdb_valid = _valid_range(
    tdb,
    UTCI_INFO.inputs.tdb.applicability,
    "tdb",
    "input",
    UTCI_INFO.inputs.tdb.unit,
    warnings,
  );
  const diff_valid = _valid_range(
    tr - tdb,
    UTCI_INFO.derived["tr - tdb"].applicability,
    "tr - tdb",
    "derived",
    UTCI_INFO.derived["tr - tdb"].unit,
    warnings,
  );
  const v_valid = _valid_range(
    v,
    UTCI_INFO.inputs.v.applicability,
    "v",
    "input",
    UTCI_INFO.inputs.v.unit,
    warnings,
  );
  const pa_valid = _valid_range(
    pa,
    UTCI_INFO.derived["pa (kPa)"].applicability,
    "pa (kPa)",
    "derived",
    UTCI_INFO.derived["pa (kPa)"].unit,
    warnings,
  );
  const rh_valid = _valid_range(
    rh,
    UTCI_INFO.inputs.rh.applicability,
    "rh",
    "input",
    UTCI_INFO.inputs.rh.unit,
    warnings,
  );
  const all_valid = !(
    Number.isNaN(tdb_valid) ||
    Number.isNaN(diff_valid) ||
    Number.isNaN(v_valid) ||
    Number.isNaN(pa_valid) ||
    Number.isNaN(rh_valid)
  );
  utci_approx = limit_inputs && !all_valid ? NaN : utci_approx;

  // Stress-category thresholds are in °C; keep the SI value before IP conversion.
  let utci_si = utci_approx;

  if (units.toUpperCase() === Units.IP) {
    ({ tmp: utci_approx } = units_converter(Units.SI, { tmp: utci_approx }));
  }

  if (round_output) {
    utci_approx = round(utci_approx, 1);
    utci_si = round(utci_si, 1);
  }

  return buildOutputs(
    UTCI_INFO,
    {
      utci: utci_approx,
      stress_category: _mapping(
        utci_si,
        UTCI_INFO.outputs.stress_category.classifier,
      ),
    },
    warnings,
  );
}

export function _utci_optimized(
  tdb: number,
  v: number,
  delta_t_tr: number,
  pa: number,
): number {
  // CPython folds each (c * (10 ** (-k))) into one constant before numba compiles the kernel,
  // so 10 to the -k is the literal 1e-k, where Math.pow(10, -4) and Math.pow(10, -5) are an ulp
  // low on Node 22.13.0 and 22.23.4.
  return (
    tdb +
    0.607562052 +
    -0.0227712343 * tdb +
    8.06470249 * 1e-4 * tdb * tdb +
    -1.54271372 * 1e-4 * tdb * tdb * tdb +
    -3.24651735 * 1e-6 * tdb * tdb * tdb * tdb +
    7.32602852 * 1e-8 * tdb * tdb * tdb * tdb * tdb +
    1.35959073 * 1e-9 * tdb * tdb * tdb * tdb * tdb * tdb +
    -2.2583652 * v +
    0.0880326035 * tdb * v +
    0.00216844454 * tdb * tdb * v +
    -1.53347087 * 1e-5 * tdb * tdb * tdb * v +
    -5.72983704 * 1e-7 * tdb * tdb * tdb * tdb * v +
    -2.55090145 * 1e-9 * tdb * tdb * tdb * tdb * tdb * v +
    -0.751269505 * v * v +
    -0.00408350271 * tdb * v * v +
    -5.21670675 * 1e-5 * tdb * tdb * v * v +
    1.94544667 * 1e-6 * tdb * tdb * tdb * v * v +
    1.14099531 * 1e-8 * tdb * tdb * tdb * tdb * v * v +
    0.158137256 * v * v * v +
    -6.57263143 * 1e-5 * tdb * v * v * v +
    2.22697524 * 1e-7 * tdb * tdb * v * v * v +
    -4.16117031 * 1e-8 * tdb * tdb * tdb * v * v * v +
    -0.0127762753 * v * v * v * v +
    9.66891875 * 1e-6 * tdb * v * v * v * v +
    2.52785852 * 1e-9 * tdb * tdb * v * v * v * v +
    4.56306672 * 1e-4 * v * v * v * v * v +
    -1.74202546 * 1e-7 * tdb * v * v * v * v * v +
    -5.91491269 * 1e-6 * v * v * v * v * v * v +
    0.398374029 * delta_t_tr +
    1.83945314 * 1e-4 * tdb * delta_t_tr +
    -1.7375451 * 1e-4 * tdb * tdb * delta_t_tr +
    -7.60781159 * 1e-7 * tdb * tdb * tdb * delta_t_tr +
    3.77830287 * 1e-8 * tdb * tdb * tdb * tdb * delta_t_tr +
    5.43079673 * 1e-10 * tdb * tdb * tdb * tdb * tdb * delta_t_tr +
    -0.0200518269 * v * delta_t_tr +
    8.92859837 * 1e-4 * tdb * v * delta_t_tr +
    3.45433048 * 1e-6 * tdb * tdb * v * delta_t_tr +
    -3.77925774 * 1e-7 * tdb * tdb * tdb * v * delta_t_tr +
    -1.69699377 * 1e-9 * tdb * tdb * tdb * tdb * v * delta_t_tr +
    1.69992415 * 1e-4 * v * v * delta_t_tr +
    -4.99204314 * 1e-5 * tdb * v * v * delta_t_tr +
    2.47417178 * 1e-7 * tdb * tdb * v * v * delta_t_tr +
    1.07596466 * 1e-8 * tdb * tdb * tdb * v * v * delta_t_tr +
    8.49242932 * 1e-5 * v * v * v * delta_t_tr +
    1.35191328 * 1e-6 * tdb * v * v * v * delta_t_tr +
    -6.21531254 * 1e-9 * tdb * tdb * v * v * v * delta_t_tr +
    -4.99410301 * 1e-6 * v * v * v * v * delta_t_tr +
    -1.89489258 * 1e-8 * tdb * v * v * v * v * delta_t_tr +
    8.15300114 * 1e-8 * v * v * v * v * v * delta_t_tr +
    7.5504309 * 1e-4 * delta_t_tr * delta_t_tr +
    -5.65095215 * 1e-5 * tdb * delta_t_tr * delta_t_tr +
    -4.52166564 * 1e-7 * tdb * tdb * delta_t_tr * delta_t_tr +
    2.46688878 * 1e-8 * tdb * tdb * tdb * delta_t_tr * delta_t_tr +
    2.42674348 * 1e-10 * tdb * tdb * tdb * tdb * delta_t_tr * delta_t_tr +
    1.5454725 * 1e-4 * v * delta_t_tr * delta_t_tr +
    5.2411097 * 1e-6 * tdb * v * delta_t_tr * delta_t_tr +
    -8.75874982 * 1e-8 * tdb * tdb * v * delta_t_tr * delta_t_tr +
    -1.50743064 * 1e-9 * tdb * tdb * tdb * v * delta_t_tr * delta_t_tr +
    -1.56236307 * 1e-5 * v * v * delta_t_tr * delta_t_tr +
    -1.33895614 * 1e-7 * tdb * v * v * delta_t_tr * delta_t_tr +
    2.49709824 * 1e-9 * tdb * tdb * v * v * delta_t_tr * delta_t_tr +
    6.51711721 * 1e-7 * v * v * v * delta_t_tr * delta_t_tr +
    1.94960053 * 1e-9 * tdb * v * v * v * delta_t_tr * delta_t_tr +
    -1.00361113 * 1e-8 * v * v * v * v * delta_t_tr * delta_t_tr +
    -1.21206673 * 1e-5 * delta_t_tr * delta_t_tr * delta_t_tr +
    -2.1820366 * 1e-7 * tdb * delta_t_tr * delta_t_tr * delta_t_tr +
    7.51269482 * 1e-9 * tdb * tdb * delta_t_tr * delta_t_tr * delta_t_tr +
    9.79063848 *
      1e-11 *
      tdb *
      tdb *
      tdb *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr +
    1.25006734 * 1e-6 * v * delta_t_tr * delta_t_tr * delta_t_tr +
    -1.81584736 * 1e-9 * tdb * v * delta_t_tr * delta_t_tr * delta_t_tr +
    -3.52197671 * 1e-10 * tdb * tdb * v * delta_t_tr * delta_t_tr * delta_t_tr +
    -3.3651463 * 1e-8 * v * v * delta_t_tr * delta_t_tr * delta_t_tr +
    1.35908359 * 1e-10 * tdb * v * v * delta_t_tr * delta_t_tr * delta_t_tr +
    4.1703262 * 1e-10 * v * v * v * delta_t_tr * delta_t_tr * delta_t_tr +
    -1.30369025 * 1e-9 * delta_t_tr * delta_t_tr * delta_t_tr * delta_t_tr +
    4.13908461 *
      1e-10 *
      tdb *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr +
    9.22652254 *
      1e-12 *
      tdb *
      tdb *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr +
    -5.08220384 * 1e-9 * v * delta_t_tr * delta_t_tr * delta_t_tr * delta_t_tr +
    -2.24730961 *
      1e-11 *
      tdb *
      v *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr +
    1.17139133 *
      1e-10 *
      v *
      v *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr +
    6.62154879 *
      1e-10 *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr +
    4.0386326 *
      1e-13 *
      tdb *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr +
    1.95087203 *
      1e-12 *
      v *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr +
    -4.73602469 *
      1e-12 *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr +
    5.12733497 * pa +
    -0.312788561 * tdb * pa +
    -0.0196701861 * tdb * tdb * pa +
    9.9969087 * 1e-4 * tdb * tdb * tdb * pa +
    9.51738512 * 1e-6 * tdb * tdb * tdb * tdb * pa +
    -4.66426341 * 1e-7 * tdb * tdb * tdb * tdb * tdb * pa +
    0.548050612 * v * pa +
    -0.00330552823 * tdb * v * pa +
    -0.0016411944 * tdb * tdb * v * pa +
    -5.16670694 * 1e-6 * tdb * tdb * tdb * v * pa +
    9.52692432 * 1e-7 * tdb * tdb * tdb * tdb * v * pa +
    -0.0429223622 * v * v * pa +
    0.00500845667 * tdb * v * v * pa +
    1.00601257 * 1e-6 * tdb * tdb * v * v * pa +
    -1.81748644 * 1e-6 * tdb * tdb * tdb * v * v * pa +
    -1.25813502 * 1e-3 * v * v * v * pa +
    -1.79330391 * 1e-4 * tdb * v * v * v * pa +
    2.34994441 * 1e-6 * tdb * tdb * v * v * v * pa +
    1.29735808 * 1e-4 * v * v * v * v * pa +
    1.2906487 * 1e-6 * tdb * v * v * v * v * pa +
    -2.28558686 * 1e-6 * v * v * v * v * v * pa +
    -0.0369476348 * delta_t_tr * pa +
    0.00162325322 * tdb * delta_t_tr * pa +
    -3.1427968 * 1e-5 * tdb * tdb * delta_t_tr * pa +
    2.59835559 * 1e-6 * tdb * tdb * tdb * delta_t_tr * pa +
    -4.77136523 * 1e-8 * tdb * tdb * tdb * tdb * delta_t_tr * pa +
    8.6420339 * 1e-3 * v * delta_t_tr * pa +
    -6.87405181 * 1e-4 * tdb * v * delta_t_tr * pa +
    -9.13863872 * 1e-6 * tdb * tdb * v * delta_t_tr * pa +
    5.15916806 * 1e-7 * tdb * tdb * tdb * v * delta_t_tr * pa +
    -3.59217476 * 1e-5 * v * v * delta_t_tr * pa +
    3.28696511 * 1e-5 * tdb * v * v * delta_t_tr * pa +
    -7.10542454 * 1e-7 * tdb * tdb * v * v * delta_t_tr * pa +
    -1.243823 * 1e-5 * v * v * v * delta_t_tr * pa +
    -7.385844 * 1e-9 * tdb * v * v * v * delta_t_tr * pa +
    2.20609296 * 1e-7 * v * v * v * v * delta_t_tr * pa +
    -7.3246918 * 1e-4 * delta_t_tr * delta_t_tr * pa +
    -1.87381964 * 1e-5 * tdb * delta_t_tr * delta_t_tr * pa +
    4.80925239 * 1e-6 * tdb * tdb * delta_t_tr * delta_t_tr * pa +
    -8.7549204 * 1e-8 * tdb * tdb * tdb * delta_t_tr * delta_t_tr * pa +
    2.7786293 * 1e-5 * v * delta_t_tr * delta_t_tr * pa +
    -5.06004592 * 1e-6 * tdb * v * delta_t_tr * delta_t_tr * pa +
    1.14325367 * 1e-7 * tdb * tdb * v * delta_t_tr * delta_t_tr * pa +
    2.53016723 * 1e-6 * v * v * delta_t_tr * delta_t_tr * pa +
    -1.72857035 * 1e-8 * tdb * v * v * delta_t_tr * delta_t_tr * pa +
    -3.95079398 * 1e-8 * v * v * v * delta_t_tr * delta_t_tr * pa +
    -3.59413173 * 1e-7 * delta_t_tr * delta_t_tr * delta_t_tr * pa +
    7.04388046 * 1e-7 * tdb * delta_t_tr * delta_t_tr * delta_t_tr * pa +
    -1.89309167 * 1e-8 * tdb * tdb * delta_t_tr * delta_t_tr * delta_t_tr * pa +
    -4.79768731 * 1e-7 * v * delta_t_tr * delta_t_tr * delta_t_tr * pa +
    7.96079978 * 1e-9 * tdb * v * delta_t_tr * delta_t_tr * delta_t_tr * pa +
    1.62897058 * 1e-9 * v * v * delta_t_tr * delta_t_tr * delta_t_tr * pa +
    3.94367674 * 1e-8 * delta_t_tr * delta_t_tr * delta_t_tr * delta_t_tr * pa +
    -1.18566247 *
      1e-9 *
      tdb *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr *
      pa +
    3.34678041 *
      1e-10 *
      v *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr *
      pa +
    -1.15606447 *
      1e-10 *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr *
      pa +
    -2.80626406 * pa * pa +
    0.548712484 * tdb * pa * pa +
    -0.0039942841 * tdb * tdb * pa * pa +
    -9.54009191 * 1e-4 * tdb * tdb * tdb * pa * pa +
    1.93090978 * 1e-5 * tdb * tdb * tdb * tdb * pa * pa +
    -0.308806365 * v * pa * pa +
    0.0116952364 * tdb * v * pa * pa +
    4.95271903 * 1e-4 * tdb * tdb * v * pa * pa +
    -1.90710882 * 1e-5 * tdb * tdb * tdb * v * pa * pa +
    0.00210787756 * v * v * pa * pa +
    -6.98445738 * 1e-4 * tdb * v * v * pa * pa +
    2.30109073 * 1e-5 * tdb * tdb * v * v * pa * pa +
    4.1785659 * 1e-4 * v * v * v * pa * pa +
    -1.27043871 * 1e-5 * tdb * v * v * v * pa * pa +
    -3.04620472 * 1e-6 * v * v * v * v * pa * pa +
    0.0514507424 * delta_t_tr * pa * pa +
    -0.00432510997 * tdb * delta_t_tr * pa * pa +
    8.99281156 * 1e-5 * tdb * tdb * delta_t_tr * pa * pa +
    -7.14663943 * 1e-7 * tdb * tdb * tdb * delta_t_tr * pa * pa +
    -2.66016305 * 1e-4 * v * delta_t_tr * pa * pa +
    2.63789586 * 1e-4 * tdb * v * delta_t_tr * pa * pa +
    -7.01199003 * 1e-6 * tdb * tdb * v * delta_t_tr * pa * pa +
    -1.06823306 * 1e-4 * v * v * delta_t_tr * pa * pa +
    3.61341136 * 1e-6 * tdb * v * v * delta_t_tr * pa * pa +
    2.29748967 * 1e-7 * v * v * v * delta_t_tr * pa * pa +
    3.04788893 * 1e-4 * delta_t_tr * delta_t_tr * pa * pa +
    -6.42070836 * 1e-5 * tdb * delta_t_tr * delta_t_tr * pa * pa +
    1.16257971 * 1e-6 * tdb * tdb * delta_t_tr * delta_t_tr * pa * pa +
    7.68023384 * 1e-6 * v * delta_t_tr * delta_t_tr * pa * pa +
    -5.47446896 * 1e-7 * tdb * v * delta_t_tr * delta_t_tr * pa * pa +
    -3.5993791 * 1e-8 * v * v * delta_t_tr * delta_t_tr * pa * pa +
    -4.36497725 * 1e-6 * delta_t_tr * delta_t_tr * delta_t_tr * pa * pa +
    1.68737969 * 1e-7 * tdb * delta_t_tr * delta_t_tr * delta_t_tr * pa * pa +
    2.67489271 * 1e-8 * v * delta_t_tr * delta_t_tr * delta_t_tr * pa * pa +
    3.23926897 *
      1e-9 *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr *
      delta_t_tr *
      pa *
      pa +
    -0.0353874123 * pa * pa * pa +
    -0.22120119 * tdb * pa * pa * pa +
    0.0155126038 * tdb * tdb * pa * pa * pa +
    -2.63917279 * 1e-4 * tdb * tdb * tdb * pa * pa * pa +
    0.0453433455 * v * pa * pa * pa +
    -0.00432943862 * tdb * v * pa * pa * pa +
    1.45389826 * 1e-4 * tdb * tdb * v * pa * pa * pa +
    2.1750861 * 1e-4 * v * v * pa * pa * pa +
    -6.66724702 * 1e-5 * tdb * v * v * pa * pa * pa +
    3.3321714 * 1e-5 * v * v * v * pa * pa * pa +
    -0.00226921615 * delta_t_tr * pa * pa * pa +
    3.80261982 * 1e-4 * tdb * delta_t_tr * pa * pa * pa +
    -5.45314314 * 1e-9 * tdb * tdb * delta_t_tr * pa * pa * pa +
    -7.96355448 * 1e-4 * v * delta_t_tr * pa * pa * pa +
    2.53458034 * 1e-5 * tdb * v * delta_t_tr * pa * pa * pa +
    -6.31223658 * 1e-6 * v * v * delta_t_tr * pa * pa * pa +
    3.02122035 * 1e-4 * delta_t_tr * delta_t_tr * pa * pa * pa +
    -4.77403547 * 1e-6 * tdb * delta_t_tr * delta_t_tr * pa * pa * pa +
    1.73825715 * 1e-6 * v * delta_t_tr * delta_t_tr * pa * pa * pa +
    -4.09087898 * 1e-7 * delta_t_tr * delta_t_tr * delta_t_tr * pa * pa * pa +
    0.614155345 * pa * pa * pa * pa +
    -0.0616755931 * tdb * pa * pa * pa * pa +
    0.00133374846 * tdb * tdb * pa * pa * pa * pa +
    0.00355375387 * v * pa * pa * pa * pa +
    -5.13027851 * 1e-4 * tdb * v * pa * pa * pa * pa +
    1.02449757 * 1e-4 * v * v * pa * pa * pa * pa +
    -0.00148526421 * delta_t_tr * pa * pa * pa * pa +
    -4.11469183 * 1e-5 * tdb * delta_t_tr * pa * pa * pa * pa +
    -6.80434415 * 1e-6 * v * delta_t_tr * pa * pa * pa * pa +
    -9.77675906 * 1e-6 * delta_t_tr * delta_t_tr * pa * pa * pa * pa +
    0.0882773108 * pa * pa * pa * pa * pa +
    -0.00301859306 * tdb * pa * pa * pa * pa * pa +
    0.00104452989 * v * pa * pa * pa * pa * pa +
    2.47090539 * 1e-4 * delta_t_tr * pa * pa * pa * pa * pa +
    0.00148348065 * pa * pa * pa * pa * pa * pa
  );
}
