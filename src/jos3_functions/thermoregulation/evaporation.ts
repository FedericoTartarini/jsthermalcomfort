import { Default } from "../Default.ts";
import { error_signals } from "./error_signals.ts";
import { bsa_rate } from "../bsa_rate.ts";
import { antoine } from "../../psychrometrics/antoine.ts";
import { ewa, full, py_max } from "../../_internal/numpy.ts";
import type { NumOrArray } from "../../_internal/numpy.ts";

/**
 * Local skin wettedness [-], the evaporative heat loss at the skin by
 * sweating and diffusion [W], the maximum evaporative heat loss at the skin
 * [W] and the evaporative heat loss at the skin by sweating only [W].
 */
export type EvaporationResult = [
  wet: number[],
  e_sk: number[],
  e_max: number[],
  e_sweat: number[],
];

// jos3 D8: upstream returns a plain tuple (thermoregulation.py:675 at
// v4.6.2), an array here, in upstream's order, typed as a labelled tuple.
// The sweat is distributed element by element, as upstream's
// `skin_sweat * sig_sweat * sd_sweat * 2 ** (err_sk / 10)`
// (thermoregulation.py:670 at v4.6.2); mathjs's multiply of the two vectors
// was a dot product, which gave every segment the whole-body sweat signal.
// antoine moved to src/psychrometrics/antoine.ts, upstream's home.
/**
 * Calculate evaporative heat loss
 * (`pythermalcomfort/jos3_functions/thermoregulation.py:555-675` at v4.6.2).
 *
 * @param {number[]} err_cr - Difference between set-point and body temperatures [°C]; only the first value is read.
 * @param {number | number[]} err_sk - Difference between set-point and body temperatures [°C].
 * @param {number | number[]} t_skin - Skin temperatures [°C].
 * @param {number | number[]} tdb - Air temperatures at local body segments [°C].
 * @param {number | number[]} rh - Relative humidity at local body segments [%].
 * @param {number | number[]} ret - Total evaporative thermal resistances [m2.K/W].
 * @param {number} height - Body height [m].
 * @param {number} weight - Body weight [kg].
 * @param {string} bsa_equation - The equation name (str) of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi".
 * @param {number} age - age [years].
 *
 * @returns {[number[], number[], number[], number[]]} wet, e_sk, e_max,
 * e_sweat: local skin wettedness [-], evaporative heat loss at the skin by
 * sweating and diffusion [W], maximum evaporative heat loss at the skin [W],
 * and evaporative heat loss at the skin by sweating only [W].
 */
export function evaporation(
  err_cr: readonly number[],
  err_sk: NumOrArray,
  t_skin: NumOrArray,
  tdb: NumOrArray,
  rh: NumOrArray,
  ret: NumOrArray,
  height: number,
  weight: number,
  bsa_equation: string,
  age: number,
): EvaporationResult {
  const [wrms, clds] = error_signals(err_sk); // Thermoregulation signals
  const bsar = bsa_rate(height, weight, bsa_equation); // bsa rate
  const bsa = Default.local_bsa.map((x) => x * bsar); // bsa
  // Saturated vapor pressure of ambient [kPa]
  const p_a = ewa((a, h) => (a * h) / 100, antoine(tdb), rh);
  const p_sk_s = antoine(t_skin); // Saturated vapor pressure at the skin [kPa]

  // Maximum evaporative heat loss; a zero becomes 0.001, as upstream replaces
  // it to avoid dividing by 0
  const e_max = ewa(
    (s, a, r, b) => {
      const e = ((s - a) / r) * b;
      return e === 0 ? 0.001 : e;
    },
    p_sk_s,
    p_a,
    ret,
    bsa,
  );

  // SKINS
  const skin_sweat = [
    0.064, 0.017, 0.146, 0.129, 0.206, 0.051, 0.026, 0.0155, 0.051, 0.026,
    0.0155, 0.073, 0.036, 0.0175, 0.073, 0.036, 0.0175,
  ];

  let sig_sweat = 371.2 * err_cr[0] + 33.64 * (wrms - clds);
  sig_sweat = py_max(sig_sweat, 0);
  sig_sweat *= bsar;

  // Signal decrement by aging
  const sd_sweat =
    age < 60
      ? full(Default.num_body_parts, 1)
      : [
          0.69, 0.69, 0.59, 0.52, 0.4, 0.75, 0.75, 0.75, 0.75, 0.75, 0.75, 0.4,
          0.4, 0.4, 0.4, 0.4, 0.4,
        ];
  let e_sweat = ewa(
    (k, d, e) => k * sig_sweat * d * 2 ** (e / 10),
    skin_sweat,
    sd_sweat,
    err_sk,
  );
  // np.minimum(wet, 1): Wettedness' upper limit
  const wet = ewa((s, m) => Math.min(0.06 + 0.94 * (s / m), 1), e_sweat, e_max);
  const e_sk = ewa((w, m) => w * m, wet, e_max);
  e_sweat = ewa((w, m) => ((w - 0.06) / 0.94) * m, wet, e_max); // Effective sweating
  return [wet, e_sk, e_max, e_sweat];
}
