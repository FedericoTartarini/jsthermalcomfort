import { pmv_ppd_ashrae } from "./pmv_ppd_ashrae.js";

/**
 * @typedef {Object} VerTmpGradReturnType
 * @property {number|number[]} ppd_vg - Predicted percentage dissatisfied, [%].
 * @property {boolean|number|Array<boolean|number>} acceptability - Whether unrounded ppd_vg is at most 5%; NaN outside applicability limits.
 * @public
 */

/**
 * Calculate dissatisfaction due to the vertical temperature gradient between
 * feet and head, following ASHRAE 55-2023 and pythermalcomfort.
 * The logistic model subtracts a 34.5% baseline; negative results become zero.
 *
 * Scalars and one-element arrays broadcast over one-dimensional numeric arrays.
 * Other unequal array lengths raise RangeError. Inputs use SI units only.
 * Applicability bounds are inclusive, matching Python's implementation:
 * tdb/tr 10–40 °C, vr 0–0.2 m/s, met 1–4, clo 0–1.5.
 *
 * @public
 * @memberof models
 * @docname Vertical air temperature gradient
 * @param {number|number[]} tdb - Dry bulb air temperature, [°C]; average at 0.6 and 1.1 m for seated occupants, or 1.1 and 1.7 m for standing occupants.
 * @param {number|number[]} tr - Mean radiant temperature, [°C].
 * @param {number|number[]} vr - Relative air speed including body movement, [m/s].
 * @param {number|number[]} rh - Relative humidity, [%].
 * @param {number|number[]} met - Metabolic rate, [met].
 * @param {number|number[]} clo - Intrinsic clothing insulation, [clo].
 * @param {number|number[]} vertical_tmp_grad - Vertical temperature gradient, [°C/m].
 * @param {boolean} [round_output=true] - Round ppd_vg to one decimal using NumPy's ties-to-even rule; acceptability always uses the unrounded value.
 * @param {boolean} [limit_inputs=true] - Warn and return NaN for both fields outside applicability bounds. False bypasses this range check and mask.
 * @returns {VerTmpGradReturnType} Dissatisfaction and acceptability.
 * @example
 * vertical_tmp_grad_ppd(25, 25, 0.1, 50, 1.2, 0.5, 7);
 * // { ppd_vg: 12.6, acceptability: false }
 * @example
 * vertical_tmp_grad_ppd([24, 24, 25], [24, 24, 25], 0.1, 50, 1.2, 0.5, [1, 0, 7]);
 * // { ppd_vg: [0, 0, 12.6], acceptability: [true, true, false] }
 */
export function vertical_tmp_grad_ppd(
  tdb,
  tr,
  vr,
  rh,
  met,
  clo,
  vertical_tmp_grad,
  round_output = true,
  limit_inputs = true,
) {
  const inputs = { tdb, tr, vr, rh, met, clo, vertical_tmp_grad };
  for (const [name, input] of Object.entries(inputs)) {
    for (const value of Array.isArray(input) ? input : [input]) {
      if (typeof value !== "number") {
        throw new TypeError(
          `Parameter "${name}" must be a number or an array of numbers`,
        );
      }
    }
  }
  for (const [name, value] of Object.entries({ round_output, limit_inputs })) {
    if (typeof value !== "boolean")
      throw new TypeError(`Parameter "${name}" must be a boolean`);
  }
  const values = Object.values(inputs);
  const arrayOutput = values.some(Array.isArray);
  const arrays = values.map((value) =>
    Array.isArray(value) ? value : [value],
  );
  const lengths = new Set(arrays.map((a) => a.length).filter((n) => n !== 1));
  if (lengths.size > 1)
    throw new RangeError("Input arrays must have compatible lengths");
  const length = lengths.size ? lengths.values().next().value : 1;
  const results = Array.from({ length }, (_, i) => {
    const [ta, radiant, speed, humidity, activity, clothing, gradient] =
      arrays.map((a) => a[a.length === 1 ? 0 : i]);
    const ranges = [
      ["tdb", ta, 10, 40],
      ["tr", radiant, 10, 40],
      ["vr", speed, 0, 0.2],
      ["met", activity, 1, 4],
      ["clo", clothing, 0, 1.5],
    ];
    let valid = true;
    if (limit_inputs) {
      for (const [name, value, min, max] of ranges) {
        if (value < min || value > max) {
          console.warn(
            `${name} is outside the applicability limits [${min}, ${max}] and will be set to NaN.`,
          );
          valid = false;
        }
        if (Number.isNaN(value)) valid = false;
      }
    }
    if (!valid) return { ppd_vg: NaN, acceptability: NaN };
    // The underlying scalar JS PMV API rejects NaN, whereas Python propagates it.
    const pmvInputs = [ta, radiant, speed, humidity, activity, clothing];
    const tsv = pmvInputs.some(Number.isNaN)
      ? NaN
      : pmv_ppd_ashrae(ta, radiant, speed, humidity, activity, clothing, 0, {
          limit_inputs: false,
        }).pmv;
    const numerator = Math.exp(
      0.13 * (tsv - 1.91) ** 2 + 0.15 * gradient - 1.6,
    );
    let ppd_vg = Math.max((numerator / (1 + numerator) - 0.345) * 100, 0);
    const acceptability = ppd_vg <= 5;
    if (round_output) {
      const scaled = ppd_vg * 10;
      const lower = Math.floor(scaled);
      ppd_vg =
        (scaled - lower === 0.5
          ? lower % 2 === 0
            ? lower
            : lower + 1
          : Math.round(scaled)) / 10;
    }
    return { ppd_vg, acceptability };
  });
  return arrayOutput
    ? {
        ppd_vg: results.map((r) => r.ppd_vg),
        acceptability: results.map((r) => r.acceptability),
      }
    : results[0];
}
