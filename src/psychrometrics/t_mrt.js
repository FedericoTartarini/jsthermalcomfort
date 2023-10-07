import { valid_range, round } from "../utilities/utilities.js";

const g = 9.81;
const c_to_k = 273.15;
const cp_air = 1004;
const mu = 0.0000181; // Pa s
const k_air = 0.02662; // W/m-K
const beta = 0.0034; // 1/K
const nu = 0.0000148; // m2/s
const alpha = 0.00002591; // m2/s
const pr = (cp_air * mu) / k_air; // Prandtl constants, number
const o = 0.0000000567;

/**
 * Converts globe temperature reading into mean radiant temperature in accordance with either the Mixed Convection
 * developed by Teitelbaum E. et al. (2022) or the ISO 7726:1998 Standard {@link #ref_5|[5]}.
 *
 * @public
 * @memberof psychrometrics
 *
 * @see {@link t_mrt_array} for a version that supports arrays
 *
 * @param {number} tg - globe temperature, [°C]
 * @param {number} tdb - air temperature, [°C]
 * @param {number} v - air speed, [m/s]
 * @param {number} d - diameter of the globe, [m] default 0.15 m
 * @param {number} emissivity - emissivity of the globe temperature sensor, default 0.95
 * @param {"Mixed Convection" | "ISO"} standard - either choose between the Mixed Convection and ISO formulations.
 *      The Mixed Convection formulation has been proposed by Teitelbaum E. et al. (2022)
 *      to better determine the free and forced convection coefficient used in the
 *      calculation of the mean radiant temperature. They also showed that mean radiant
 *      temperature measured with ping-pong ball-sized globe thermometers is not reliable
 *      due to a stochastic convective bias {@link #ref_22|[22]}. The Mixed Convection model has only
 *      been validated for globe sensors with a diameter between 0.04 and 0.15 m.
 * @returns {number}
 */
export function t_mrt(
  tg,
  tdb,
  v,
  d = 0.15,
  emissivity = 0.95,
  standard = "Mixed Convection",
) {
  standard = standard.toLowerCase();
  let tr = 0;
  if (standard === "mixed convection") {
    tr = get_tr_mixed_convection(tg, tdb, v, d, emissivity);
    return d >= 0.04 && d <= 0.15 ? round(tr, 1) : NaN;
  }

  if (standard === "iso") {
    return get_tr_iso(tg, tdb, v, d, emissivity);
  }
  throw new Error(
    "No standard found, please choose standard from ISO and Mixed Convectioin",
  );
}

/**
 * Converts globe temperature reading into mean radiant temperature in accordance with either the Mixed Convection
 * developed by Teitelbaum E. et al. (2022) or the ISO 7726:1998 Standard {@link #ref_5|[5]}.
 *
 * @public
 * @memberof psychrometrics
 *
 * @see {@link t_mrt} for scalar arguments. Accepts array arguments.
 *
 * @param {number[]} tg - globe temperature, [°C]
 * @param {number[]} tdb - air temperature, [°C]
 * @param {number[]} v - air speed, [m/s]
 * @param {number[]} d - diameter of the globe, [m] default 0.15 m
 * @param {number[]} emissivity - emissivity of the globe temperature sensor, default 0.95
 * @param {"Mixed Convection" | "ISO"} standard - either choose between the Mixed Convection and ISO formulations. Refer to the {@link #t_mrt|t_mrt} function for more information
 * @returns {number[]}
 */

export function t_mrt_array(
  tg,
  tdb,
  v,
  d,
  emissivity,
  standard = "Mixed Convection",
) {
  // the array version of t_mrt, we assume all paramaters have the same length
  standard = standard.toLowerCase();
  let tr_array = 0;
  if (standard === "mixed convection") {
    tr_array = tg.map((_tg, i) => {
      return get_tr_mixed_convection(_tg, tdb[i], v[i], d[i], emissivity[i]);
    });
    const d_valid = valid_range(d, [0.04, 0.15]);
    const trResult = d_valid.map((_d_valid, i) =>
      !isNaN(_d_valid) ? round(tr_array[i], 1) : NaN,
    );
    return trResult;
  }

  if (standard === "iso") {
    tr_array = tg.map((_tg, i) => {
      return get_tr_iso(_tg, tdb[i], v[i], d[i], emissivity[i]);
    });
    return tr_array;
  }
  throw new Error(
    "No standard found, please choose standard from ISO and Mixed Convectioin",
  );
}

function get_tr_mixed_convection(_tg, _tdb, _v, _d, _emissivity) {
  const ra = (g * beta * Math.abs(_tg - _tdb) * _d * _d * _d) / nu / alpha;
  const re = (_v * _d) / nu;
  const n = 1.27 * _d + 0.57;

  const nu_natural =
    2 +
    (0.589 * Math.pow(ra, 1 / 4)) /
      Math.pow(1 + Math.pow(0.469 / pr, 9 / 16), 4 / 9);
  const nu_forced =
    2 +
    (0.4 * Math.pow(re, 0.5) + 0.06 * Math.pow(re, 2 / 3)) * Math.pow(pr, 0.4);

  const tr =
    Math.pow(
      Math.pow(_tg + 273.15, 4) -
        (((Math.pow(Math.pow(nu_forced, n) + Math.pow(nu_natural, n), 1 / n) *
          k_air) /
          _d) *
          (-_tg + _tdb)) /
          _emissivity /
          o,
      0.25,
    ) - 273.15;
  return tr;
}

function get_tr_iso(_tg, _tdb, _v, _d, _emissivity) {
  _tg += c_to_k;
  _tdb += c_to_k;

  // calculate heat transfer coefficient
  const h_n = Math.pow(1.4 * (Math.abs(_tg - _tdb) / _d), 0.25); // natural convection
  const h_f = (6.3 * Math.pow(_v, 0.6)) / Math.pow(_d, 0.4); // forced convection

  // get the biggest between the two coefficients
  const h = Math.max(h_f, h_n);

  const tr =
    Math.pow(
      Math.pow(_tg, 4) + (h * (_tg - _tdb)) / (_emissivity * (5.67 * 10 ** -8)),
      0.25,
    ) - c_to_k;

  return round(tr, 1);
}
