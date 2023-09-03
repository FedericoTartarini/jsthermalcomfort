import { valid_range, round } from "../utilities/utilities.js";

const g = 9.81;
const c_to_k = 273.15;
const cp_air = 1004;

/**
 * Converts globe temperature reading into mean radiant temperature in accordance with either the Mixed Convection developed by Teitelbaum E. et al. (2022) or the ISO 7726:1998 Standard [5]_.
 * @param {number | number[]} tg - globe temperature, [°C]
 * @param {number | number[]} tdb - air temperature, [°C]
 * @param {number | number[]} v - air speed, [m/s]
 * @param {number | number[]} d - diameter of the globe, [m] default 0.15 m
 * @param {number | number[]} emissivity - emissivity of the globe temperature sensor, default 0.95
* @param {"Mixed Convection" | "ISO"} standard - {"Mixed Convection", "ISO"} either choose between the Mixed Convection and ISO formulations.
        The Mixed Convection formulation has been proposed by Teitelbaum E. et al. (2022)
        to better determine the free and forced convection coefficient used in the
        calculation of the mean radiant temperature. They also showed that mean radiant
        temperature measured with ping-pong ball-sized globe thermometers is not reliable
        due to a stochastic convective bias [22]_. The Mixed Convection model has only
        been validated for globe sensors with a diameter between 0.04 and 0.15 m.
* @returns {number[]}
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
  tg = Array.isArray(tg) ? tg : [tg];
  if (
    tg.length === 1 &&
    (arg_len_larger1(tdb) ||
      arg_len_larger1(v) ||
      arg_len_larger1(d) ||
      arg_len_larger1(emissivity))
  ) {
    throw new Error(
      "Your paramater tg is a number, your other paramaters can only be number",
    );
  }
  if (tg.length > 1) {
    const tg_len = tg.length;
    if (
      !arg_len_equal_n(tdb, tg_len) ||
      !arg_len_equal_n(v, tg_len) ||
      !arg_len_equal_n(d, tg_len) ||
      !arg_len_equal_n(emissivity, tg_len)
    ) {
      throw new Error(
        "Your paramater tg is an array that have length > 1, your other paramaters can only be either number or array with the same length as tg",
      );
    }
  }

  v = Array.isArray(v) ? v : [v];
  d = Array.isArray(d) ? d : [d];
  tdb = Array.isArray(tdb) ? tdb : [tdb];
  emissivity = Array.isArray(emissivity) ? emissivity : [emissivity];

  if (standard === "mixed convection") {
    return t_mrt_mixed_convection(tg, tdb, v, d, emissivity);
  }

  if (standard === "iso") {
    return t_mrt_iso(tg, tdb, v, d, emissivity);
  }
}

function t_mrt_mixed_convection(tg, tdb, v, d, emissivity) {
  if (tg.length != d.length) {
    throw new Error(
      "You are using mixed convection standard, tg and d should all be number or in same length",
    );
  }
  let tr = 0;
  const mu = 0.0000181; // Pa s
  const k_air = 0.02662; // W/m-K
  const beta = 0.0034; // 1/K
  const nu = 0.0000148; // m2/s
  const alpha = 0.00002591; // m2/s
  const pr = (cp_air * mu) / k_air; // Prandtl constants, number

  const o = 0.0000000567;
  const n = d.map((_d) => 1.27 * _d + 0.57); //size same as tg

  const v_len1 = v.length === 1;
  const tdb_len1 = tdb.length === 1;
  const emissivity_len1 = emissivity.length === 1;

  const ra = tg.map((_tg, i) => {
    const _tdb = tdb_len1 ? tdb[0] : tdb[i];
    return (g * beta * Math.abs(_tg - _tdb) * d[i] * d[i] * d[i]) / nu / alpha;
  }); //tg size

  const re = d.map((_d, i) => {
    const _v = v_len1 ? v[0] : v[i];
    return (_v * _d) / nu; //size tg
  });

  const nu_natural = ra.map((_ra) => {
    return (
      2 +
      (0.589 * Math.pow(_ra, 1 / 4)) /
        Math.pow(1 + Math.pow(0.469 / pr, 9 / 16), 4 / 9)
    );
  }); //arr type, size same as tg

  const nu_forced = re.map((_re) => {
    return (
      2 +
      (0.4 * Math.pow(_re, 0.5) + 0.06 * Math.pow(_re, 2 / 3)) *
        Math.pow(pr, 0.4)
    );
  }); //arr, size same as tg

  tr = tg.map((_tg, i) => {
    const _tdb = tdb_len1 ? tdb[0] : tdb[i];
    const _emissivity = emissivity_len1 ? emissivity[0] : emissivity[i];
    //console.log(_tdb, _nu_forced, _n,_d, _emissivity)
    return (
      Math.pow(
        Math.pow(_tg + 273.15, 4) -
          (((Math.pow(
            Math.pow(nu_forced[i], n[i]) + Math.pow(nu_natural[i], n[i]),
            1 / n[i],
          ) *
            k_air) /
            d[i]) *
            (-_tg + _tdb)) /
            _emissivity /
            o,
        0.25,
      ) - 273.15
    );
  });

  const d_valid = valid_range(d, [0.04, 0.15]);
  const trResult = d_valid.map((_d_valid, i) =>
    !isNaN(_d_valid) ? round(tr[i], 1) : NaN,
  );
  return trResult;
}

function t_mrt_iso(tg, tdb, v, d, emissivity) {
  let tr = 0;
  const d_len1 = d.length === 1;
  const v_len1 = v.length === 1;
  const tdb_len1 = tdb.length === 1;
  const emissivity_len1 = emissivity.length === 1;
  tg = tg.map((_tg) => _tg + c_to_k);
  tdb = tdb.map((_tdb) => _tdb + c_to_k);

  // calculate heat transfer coefficient
  const h_n = tg.map((_tg, i) => {
    const _tdb = tdb_len1 ? tdb[0] : tdb[i];
    const _d = d_len1 ? d[0] : d[i];
    return Math.pow(1.4 * (Math.abs(_tg - _tdb) / _d), 0.25);
  }); // natural convection same size as tg

  const h_f =
    d.length >= v.length
      ? d.map((_d, i) => {
          // forced convection
          const _v = v_len1 ? v[0] : v[i];
          return (6.3 * Math.pow(_v, 0.6)) / Math.pow(_d, 0.4); //size d
        })
      : v.map((_v) => (6.3 * Math.pow(_v, 0.6)) / Math.pow(d[0], 0.4)); //size v
  const h_f_len1 = h_f.length === 1;

  // get the biggest between the two coefficients
  const h = h_n.map((_h_n, i) => {
    // h_f.length <= h_n
    const _h_f = h_f_len1 ? h_f[0] : h_f[i];
    return Math.max(_h_n, _h_f);
  }); // same size as tg

  tr = tg.map((_tg, i) => {
    const _tdb = tdb_len1 ? tdb[0] : tdb[i];
    const _emissivity = emissivity_len1 ? emissivity[0] : emissivity[i];
    return round(
      Math.pow(
        Math.pow(_tg, 4) +
          (h[i] * (_tg - _tdb)) / (_emissivity * (5.67 * Math.pow(10, -8))),
        0.25,
      ) - c_to_k,
      1,
    );
  });

  return tr;
}

function arg_len_larger1(arg) {
  // if arg is an array and the array length is larger than 1, return true
  return Array.isArray(arg) && arg.length > 1;
}

function arg_len_equal_n(arg, n) {
  //if arg is a number or arg is an array and its length equals to n, return true
  return typeof arg == "number" || (Array.isArray(arg) && arg.length === n);
}
