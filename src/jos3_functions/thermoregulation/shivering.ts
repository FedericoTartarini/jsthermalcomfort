import { Default } from "../Default.ts";
import { error_signals } from "./error_signals.ts";
import { bsa_rate } from "../bsa_rate.ts";
import { full, key_error, np_average, py_max } from "../_numpy.ts";
import type { NumOrArray } from "../_numpy.ts";

/**
 * The options `shivering` reads, as `JOS3`'s `options` holds them.
 * `limit_dshiv/dt` is `true` for upstream's 0.0077 W/s, or a limit in W/s.
 */
export type ShiveringOptions = {
  shivering_threshold?: boolean;
  "limit_dshiv/dt"?: boolean | number;
  [key: string]: unknown;
};

// Upstream's module-level PRE_SHIV (thermoregulation.py:1135 at v4.6.2), the
// previous shivering thermogenesis [W]. An ES module cannot let a caller
// assign its export, so the jos3_functions namespace reaches it through
// get_pre_shiv and set_pre_shiv, as `thermoregulation.PRE_SHIV`.
let PRE_SHIV = 0;

/** The value of upstream's `PRE_SHIV`, the previous shivering thermogenesis [W]. */
export function get_pre_shiv(): number {
  return PRE_SHIV;
}

/**
 * Sets the value of PRE_SHIV.
 *
 * @param {number} value - the value to set PRE_SHIV to
 */
export function set_pre_shiv(value: number): void {
  PRE_SHIV = value;
}

// Upstream reads and updates PRE_SHIV only when options is truthy
// (thermoregulation.py:1206, :1223-1234 at v4.6.2), Python's truth value of a
// dict: not None and not empty. It used to update PRE_SHIV whatever the
// options, and had an unused `let x = q_shiv + 1`.
/**
 * Calculate local thermogenesis by shivering [W]
 * (`pythermalcomfort/jos3_functions/thermoregulation.py:1138-1257` at v4.6.2).
 *
 * @param {number[]} err_cr - Difference between set-point and body temperatures [°C]; only the first value is read.
 * @param {number | number[]} err_sk - Difference between set-point and body temperatures [°C].
 * @param {number[]} t_core - Core temperatures [°C]; only the first value is read.
 * @param {number[]} t_skin - Skin temperatures [°C], 17 values.
 * @param {number} height - Body height [m].
 * @param {number} weight - Body weight [kg].
 * @param {string} bsa_equation - The equation name (str) of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi".
 * @param {number} age - age [years].
 * @param {string} sex - Choose male or female.
 * @param {number} [dtime=60] - Interval of analysis time.
 * @param {ShiveringOptions | null} [options=null] - `JOS3`'s options; with
 * none, or an empty object, the thresholds are not applied and PRE_SHIV is
 * left as it is, as upstream.
 *
 * @returns {number[]} q_shiv - Local thermogenesis by shivering [W].
 */
export function shivering(
  err_cr: readonly number[],
  err_sk: NumOrArray,
  t_core: readonly number[],
  t_skin: readonly number[],
  height: number,
  weight: number,
  bsa_equation: string,
  age: number,
  sex: string,
  dtime: number = 60,
  options: ShiveringOptions | null = null,
): number[] {
  // Integrated error signal in the warm and cold receptors
  const { clds } = error_signals(err_sk);

  // Distribution coefficient of thermogenesis by shivering
  const shivf = [
    0.0339, 0.0436, 0.27394, 0.24102, 0.38754, 0.00243, 0.00137, 0.0002,
    0.00243, 0.00137, 0.0002, 0.0039, 0.00175, 0.00035, 0.0039, 0.00175,
    0.00035,
  ];
  // integrated error signal of shivering
  let sig_shiv = 24.36 * clds * -err_cr[0];
  sig_shiv = py_max(sig_shiv, 0);

  const has_options =
    options !== null &&
    options !== undefined &&
    Object.keys(options).length > 0;

  // Upstream's options[...] raises a KeyError for a missing key; its class
  // is the open question in ticket 25's Comments.
  const option = (key: string) => {
    if (!Object.prototype.hasOwnProperty.call(options, key)) {
      throw key_error(key);
    }
    return (options as ShiveringOptions)[key];
  };

  if (has_options) {
    if (option("shivering_threshold")) {
      // Asaka, 2016
      // Threshold of starting shivering
      const tskm = np_average(t_skin, Default.local_bsa); // Mean skin temp.
      let thres: number;
      if (tskm < 31) {
        thres = 36.6;
      } else if (sex === "male") {
        thres = -0.2436 * tskm + 44.1;
      } else {
        // sex == "female":
        thres = -0.225 * tskm + 43.05;
      }
      // Second threshold of starting shivering
      if (thres < t_core[0]) {
        sig_shiv = 0;
      }
    }

    const limit = option("limit_dshiv/dt");
    if (limit) {
      const dshiv = sig_shiv - PRE_SHIV; // Asaka, 2016 dshiv < 0.0077 [W/s]
      const limit_dshiv =
        limit === true
          ? 0.0077 * dtime // default is 0.0077 [W/s]
          : (limit as number) * dtime;
      if (dshiv > limit_dshiv) {
        sig_shiv = limit_dshiv + PRE_SHIV;
      } else if (dshiv < -limit_dshiv) {
        sig_shiv = -limit_dshiv + PRE_SHIV;
      }
    }
    PRE_SHIV = sig_shiv;
  }

  // Signal sd_shiv by aging
  let sd_shiv: number;
  if (age < 30) {
    sd_shiv = 1;
  } else if (age < 40) {
    sd_shiv = 0.97514;
  } else if (age < 50) {
    sd_shiv = 0.95028;
  } else if (age < 60) {
    sd_shiv = 0.92818;
  } else if (age < 70) {
    sd_shiv = 0.90055;
  } else if (age < 80) {
    sd_shiv = 0.86188;
  } else {
    // age >= 80
    sd_shiv = 0.82597;
  }
  // np.ones(17) * factor holds the factor in every element
  const sd = full(Default.num_body_parts, sd_shiv);

  // Ratio of body surface area to the standard body [-]
  const bsar = bsa_rate(height, weight, bsa_equation);

  // Local thermogenesis by shivering [W]
  return shivf.map((s, i) => s * bsar * sd[i] * sig_shiv);
}
