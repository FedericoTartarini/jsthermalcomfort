import JOS3Defaults from "../JOS3Defaults";
import { error_signals } from "./error_signals";
import { bsa_rate } from "../bsa_rate";
import { $map, $max, $min, $array } from "../../supa";

/**
 * Calculate evaporative heat loss.
 *
 * @param {Array} err_cr, err_sk - Difference between set-point and body temperatures [°C].
 * @param {Array} t_skin - Skin temperatures [°C].
 * @param {Array} tdb - Air temperatures at local body segments [°C].
 * @param {Array} rh - Relative humidity at local body segments [%].
 * @param {Array} ret - Total evaporative thermal resistances [m2.K/W].
 * @param {number} [height=1.72] - Body height [m].
 * @param {number} [weight=74.43] - Body weight [kg].
 * @param {string} [bsa_equation="dubois"] - The equation name (str) of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi".
 * @param {number} [age=20] - age [years].
 *
 * @returns {Object} An object containing:
 *                       - wet (Array): Local skin wettedness [-].
 *                       - e_sk (Array): Evaporative heat loss at the skin by sweating and diffuse [W].
 *                       - e_max (Array): Maximum evaporative heat loss at the skin [W].
 *                       - e_sweat (TYPE): Evaporative heat loss at the skin by only sweating [W].
 */
export function evaporation(
  err_cr,
  err_sk,
  t_skin,
  tdb,
  rh,
  ret,
  height = JOS3Defaults.height,
  weight = JOS3Defaults.weight,
  bsa_equation = JOS3Defaults.bsa_equation,
  age = JOS3Defaults.age,
) {
  const antoine = (x) => Math.E ** (16.6536 - 4030.183 / (x + 235));

  let { wrms, clds } = error_signals(err_sk);
  let bsar = bsa_rate(height, weight, bsa_equation);
  let bsa = JOS3Defaults.local_bsa.map((local_bsa) => local_bsa * bsar);
  let p_a = $map([tdb, rh], ([tdb, rh]) => (antoine(tdb) * rh) / 100);
  let p_sk_s = t_skin.map(antoine);

  let e_max = $map(
    [p_sk_s, p_a, ret, bsa],
    ([p_sk_s, p_a, ret, bsa]) => ((p_sk_s - p_a) / ret) * bsa,
  );
  e_max = e_max.map((e_max) => (e_max === 0 ? 0.001 : e_max));

  let skin_sweat = [
    0.064, 0.017, 0.146, 0.129, 0.206, 0.051, 0.026, 0.0155, 0.051, 0.026,
    0.0155, 0.073, 0.036, 0.0175, 0.073, 0.036, 0.0175,
  ];

  let sig_sweat = 371.2 * err_cr[0] + 33.64 * (wrms - clds);
  sig_sweat = sig_sweat > 0 ? sig_sweat : 0;
  sig_sweat *= bsar;

  let sd_sweat =
    age < 60
      ? $array(17, 1)
      : [
          0.69, 0.69, 0.59, 0.52, 0.4, 0.75, 0.75, 0.75, 0.75, 0.75, 0.75, 0.4,
          0.4, 0.4, 0.4, 0.4, 0.4,
        ];

  let e_sweat = $map(
    [skin_sweat, sd_sweat, err_sk],
    ([skin_sweat, sd_sweat, err_sk]) =>
      skin_sweat * sig_sweat * sd_sweat * 2 ** (err_sk / 10),
  );

  let wet = $map(
    [e_sweat, e_max],
    ([e_sweat, e_max]) => 0.06 + 0.94 * (e_sweat / e_max),
  );
  wet = $min(wet, 1);

  let e_sk = $map([wet, e_max], ([wet, e_max]) => wet * e_max);
  e_sweat = $map([wet, e_max], ([wet, e_max]) => ((wet - 0.06) / 0.94) * e_max);

  return { wet, e_sk, e_max, e_sweat };
}
