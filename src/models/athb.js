/**
 * Return the PMV value calculated with the Adaptive Thermal Heat Balance
 * Framework [27]_. The adaptive thermal heat balance (ATHB) framework
 * introduced a method to account for the three adaptive principals, namely
 * physiological, behavioral, and psychological adaptation, individually
 * within existing heat balance models. The objective is a predictive model of
 * thermal sensation applicable during the design stage or in international
 * standards without knowing characteristics of future occupants.
 *
 * This is a version that supports scalar arguments.
 * @see {@link athb_array} for a version that supports arrays.
 *
 * @param { number } tdb - dry bulb air temperature, in [°C]
 * @param { number } tr - mean radiant temperature, in [°C]
 * @param { number } vr - relative air speed, in [m/s]
 *
 * Note: vr is the relative air speed caused by body movement and not the air
 * speed measured by the air speed sensor. The relative air speed is the sum of the
 * average air speed measured by the sensor plus the activity-generated air speed
 * (Vag). Where Vag is the activity-generated air speed caused by motion of
 * individual body parts. vr can be calculated using the function
 * jsthermalcomfort.utilities.v_relative.
 *
 * @param { number } rh - relative humidity, [%]
 * @param { number } met - metabolic rate, [met]
 * @param { number } t_running_mean - running mean temperature, in [°C]
 *
 * The running mean temperature can be calculated using the function
 * jsthermalcomfort.utilities.running_mean_outdoor_temperature.
 *
 * @returns { number } athb_pmv - Predicted Mean Vote calculated with the Adaptive Thermal Heat Balance framework
 *
 * @example
 * // JavaScript code example
 *
 * // Import the athb function from the jsthermalcomfort module
 * import { athb } from "../../src/models/athb.js";
 *
 * // Calculate PMV with sample data when it is scalar arguments.
 * console.log(athb({ tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.1, t_running_mean: 20 }));
 * // Output: 0.2
 *
 */

export function athb(tdb, tr, vr, rh, met, t_running_mean) {
  const met_adapted = met - (0.234 * t_running_mean) / 58.2;

  const clo_adapted = Math.pow(
    10,
    -0.17168 -
      0.000485 * t_running_mean +
      0.08176 * met_adapted -
      0.00527 * t_running_mean * met_adapted,
  );

  const pmv_res = pmv_ppd_optimized(
    tdb,
    tr,
    vr,
    rh,
    met_adapted,
    clo_adapted,
    0,
  );
  const ts = 0.303 * Math.exp(-0.036 * met_adapted * 58.15) + 0.028;
  const l_adapted = pmv_res / ts;

  return parseFloat(
    (
      1.484 +
      0.0276 * l_adapted -
      0.9602 * met_adapted -
      0.0342 * t_running_mean +
      0.0002264 * l_adapted * t_running_mean +
      0.018696 * met_adapted * t_running_mean -
      0.0002909 * l_adapted * met_adapted * t_running_mean
    ).toFixed(3),
  );
}

/**
 * Return the PMV value calculated with the Adaptive Thermal Heat Balance
 * Framework [27]_. The adaptive thermal heat balance (ATHB) framework
 * introduced a method to account for the three adaptive principals, namely
 * physiological, behavioral, and psychological adaptation, individually
 * within existing heat balance models. The objective is a predictive model of
 * thermal sensation applicable during the design stage or in international
 * standards without knowing characteristics of future occupants.
 *
 * This is a version that supports arrays.
 * @see {@link athb} for a version that supports scalar arguments.
 *
 * @param { number[] } tdb - dry bulb air temperature, in [°C]
 * @param { number[] } tr - mean radiant temperature, in [°C]
 * @param { number[] } vr - relative air speed, in [m/s]
 *
 * Note: vr is the relative air speed caused by body movement and not the air
 * speed measured by the air speed sensor. The relative air speed is the sum of the
 * average air speed measured by the sensor plus the activity-generated air speed
 * (Vag). Where Vag is the activity-generated air speed caused by motion of
 * individual body parts. vr can be calculated using the function
 * jsthermalcomfort.utilities.v_relative.
 *
 * @param { number[] } rh - relative humidity, [%]
 * @param { number[] } met - metabolic rate, [met]
 * @param { number[] } t_running_mean - running mean temperature, in [°C]
 *
 * The running mean temperature can be calculated using the function
 * jsthermalcomfort.utilities.running_mean_outdoor_temperature.
 *
 * @returns { number[] } athb_pmv - Predicted Mean Vote calculated with the Adaptive Thermal Heat Balance framework
 *
 * @example
 * // JavaScript code example
 *
 * // Import the athb_array function from the jsthermalcomfort module
 * import { athb_array } from "../../src/models/athb.js";
 *
 * // Calculate PMV with sample data when it is arrays.
 * console.log(athb({ tdb: [25, 27], tr: [25, 25], vr: [0.1, 0.1], rh: [50, 50], met: [1.1, 1.1], t_running_mean: [20, 20] }));
 * // Output: [0.2, 0.209]
 */
export function athb_array(tdb, tr, vr, rh, met, t_running_mean) {
  tdb = Array.isArray(tdb) ? tdb : [tdb];
  tr = Array.isArray(tr) ? tr : [tr];
  vr = Array.isArray(vr) ? vr : [vr];
  met = Array.isArray(met) ? met : [met];
  rh = Array.isArray(rh) ? rh : [rh];
  t_running_mean = Array.isArray(t_running_mean)
    ? t_running_mean
    : [t_running_mean];

  //assume all parameters have same length, and it should have same length when use this function
  const met_adapted = met.map(
    (metValue, index) => metValue - (0.234 * t_running_mean[index]) / 58.2,
  );

  const clo_adapted = met_adapted.map((metValue, index) =>
    Math.pow(
      10,
      -0.17168 -
        0.000485 * t_running_mean[index] +
        0.08176 * metValue -
        0.00527 * t_running_mean[index] * metValue,
    ),
  );

  const pmv_res = tdb.map((tdbValue, i) =>
    pmv_ppd_optimized(
      tdbValue,
      tr[i],
      vr[i],
      rh[i],
      met_adapted[i],
      clo_adapted[i],
      0,
    ),
  );

  const ts = met_adapted.map(
    (metValue) => 0.303 * Math.exp(-0.036 * metValue * 58.15) + 0.028,
  );

  const l_adapted = pmv_res.map((pmv_res_Value, i) => pmv_res_Value / ts[i]);

  return l_adapted.map((lValue, index) =>
    parseFloat(
      (
        1.484 +
        0.0276 * lValue -
        0.9602 * met_adapted[index] -
        0.0342 * t_running_mean[index] +
        0.0002264 * lValue * t_running_mean[index] +
        0.018696 * met_adapted[index] * t_running_mean[index] -
        0.0002909 * lValue * met_adapted[index] * t_running_mean[index]
      ).toFixed(3),
    ),
  );
}

function pmv_ppd_optimized(tdb, tr, vr, rh, met, clo, wme) {
  const pa = rh * 10 * Math.exp(16.6536 - 4030.183 / (tdb + 235));

  const icl = 0.155 * clo; //thermal insulation of the clothing in M2K/W
  const m = met * 58.15; //metabolic rate in W/M2
  const w = wme * 58.15; //external work in W/M2
  const mw = m - w; //internal heat production in the human body

  //calculation of the clothing area factor
  let f_cl;
  if (icl <= 0.078) {
    f_cl = 1 + 1.29 * icl; // ratio of surface clothed body over nude body
  } else {
    f_cl = 1.05 + 0.645 * icl;
  }

  //heat transfer coefficient by forced convection
  const hcf = 12.1 * Math.sqrt(vr);
  let hc = hcf;

  const taa = tdb + 273;
  const tra = tr + 273;
  const t_cla = taa + (35.5 - tdb) / (3.5 * icl + 0.1);

  const p1 = icl * f_cl;
  const p2 = p1 * 3.96;
  const p3 = p1 * 100;
  const p4 = p1 * taa;
  const p5 = 308.7 - 0.028 * mw + p2 * Math.pow(tra / 100.0, 4);
  let xn = t_cla / 100;
  let xf = t_cla / 50;
  const eps = 0.00015;

  let n = 0;

  while (Math.abs(xn - xf) > eps) {
    xf = (xf + xn) / 2;
    let hcn = 2.38 * Math.pow(Math.abs(100.0 * xf - taa), 0.25);
    if (hcf > hcn) {
      hc = hcf;
    } else {
      hc = hcn;
    }
    xn = (p5 + p4 * hc - p2 * Math.pow(xf, 4)) / (100 + p3 * hc);
    n += 1;
    if (n > 150) {
      throw new Error("Max iterations exceeded");
    }
  }

  const tcl = 100 * xn - 273;
  //heat loss diff. through skin
  const hl1 = 3.05 * 0.001 * (5733 - 6.99 * mw - pa);
  //heat loss by sweating
  let hl2;
  if (mw > 58.15) {
    hl2 = 0.42 * (mw - 58.15);
  } else {
    hl2 = 0;
  }
  //latent respiration heat loss
  const hl3 = 1.7 * 0.00001 * m * (5867 - pa);
  //dry respiration heat loss
  const hl4 = 0.0014 * m * (34 - tdb);
  //heat loss by radiation
  const hl5 = 3.96 * f_cl * (Math.pow(xn, 4) - Math.pow(tra / 100.0, 4));
  //heat loss by convection
  const hl6 = f_cl * hc * (tcl - tdb);

  const ts = 0.303 * Math.exp(-0.036 * m) + 0.028;

  let _pmv = ts * (mw - hl1 - hl2 - hl3 - hl4 - hl5 - hl6);
  _pmv = Array.isArray(_pmv) ? _pmv : [_pmv];

  return _pmv;
}
