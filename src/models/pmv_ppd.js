import {
  check_standard_compliance_array,
  units_converter,
} from "../utilities/utilities.js";
import { valid_range } from "../utilities/utilities.js";
import { cooling_effect } from "./cooling_effect.js";

/**
 * Returns Predicted Mean Vote (`PMV`) and Predicted Percentage of
 * Dissatisfied (`PPD`) calculated in accordance with main thermal comfort
 * Standards. The PMV is an index that predicts the mean value of the thermal
 * sensation votes (self-reported perceptions) of a large group of people on a
 * sensation scale expressed from –3 to +3 corresponding to the categories:
 * cold, cool, slightly cool, neutral, slightly warm, warm, and hot. [1]
 *
 * While the PMV equation is the same for both the ISO and ASHRAE standards, in the
 * ASHRAE 55 PMV equation, the SET is used to calculate the cooling effect first,
 * this is then subtracted from both the air and mean radiant temperatures, and the
 * differences are used as input to the PMV model, while the airspeed is set to 0.1m/s.
 * Please read more in the Note below.
 *
 * @param {number|number[]} tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number|number[]} tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number|number[]} vr - relative air speed, default in [m/s] in [fps] if `units` = 'IP'
 *
 * Note: vr is the relative air speed caused by body movement and not the air
 * speed measured by the air speed sensor. The relative air speed is the sum of the
 * average air speed measured by the sensor plus the activity-generated air speed
 * (Vag). Where Vag is the activity-generated air speed caused by motion of
 * individual body parts. vr can be calculated using the function `v_relative` which is in .utilities.js.
 * @param {number|number[]} rh - relative humidity, [%]
 * @param {number|number[]} met - metabolic rate, [met]
 * @param {number|number[]} clo - clothing insulation, [clo]
 *
 * Note: The activity as well as the air speed modify the insulation characteristics
 * of the clothing and the adjacent air layer. Consequently, the ISO 7730 states that
 * the clothing insulation shall be corrected [2]. The ASHRAE 55 Standard corrects
 * for the effect of the body movement for met equal or higher than 1.2 met using
 * the equation clo = Icl × (0.6 + 0.4/met) The dynamic clothing insulation, clo,
 * can be calculated using the function `clo_dynamic` which is in .utilities.js.
 * @param {number|number[]} wme - external work, [met] default 0
 * @param {"ISO"|"ASHRAE"} standard - comfort standard used for calculation
 *
 * - If "ISO", then the ISO Equation is used
 * - If "ASHRAE", then the ASHRAE Equation is used
 *
 * Note: While the PMV equation is the same for both the ISO and ASHRAE standards,
 * the ASHRAE Standard Use of the PMV model is limited to air speeds below 0.10m/s (20 fpm).
 * When air speeds exceed 0.10 m/s (20 fpm), the comfort zone boundaries are adjusted based on the SET model.
 * This change was introduced by the `Addendum C to Standard 55-2020`_
 * @param kwargs
 *
 * Other Parameters:
 * {'SI','IP'} units - select the SI (International System of Units) or the IP (Imperial Units) system.
 * {boolean Ture} limit_inputs - By default, if the inputs are outside the standard applicability
 *    limits the function returns NaN. If false, returns pmv and ppd values even if input values are outside
 *    the applicability limits of the model.
 *
 *    The ASHRAE 55 2020 limits are 10 < tdb [°C] < 40, 10 < tr [°C] < 40,
 *    0 < vr [m/s] < 2, 1 < met [met] < 4, and 0 < clo [clo] < 1.5.
 *    The ISO 7730 2005 limits are 10 < tdb [°C] < 30, 10 < tr [°C] < 40,
 *    0 < vr [m/s] < 1, 0.8 < met [met] < 4, 0 < clo [clo] < 2, and -2 < PMV < 2.
 * {boolean Ture} airspeed_control - This only applies if standard = "ASHRAE".
 *    By default, it is assumed that the occupant has control over the airspeed.
 *    In this case, the ASHRAE 55 Standard does not impose any airspeed limits.
 *    On the other hand, if the occupant has no control over the airspeed,
 *    the ASHRAE 55 imposes an upper limit for v which varies as a function of
 *    the operative temperature, for more information please consult the Standard.
 *
 // * @returns {number|number[]} pmv - Predicted Mean Vote
 // * @returns {number|number[]} ppd - Predicted Percentage of Dissatisfied occupants, [%]
 *
 * Notes:
 * You can use this function to calculate the `PMV` and `PPD` in accordance with
 * either the ASHRAE 55 2020 Standard [1] or the ISO 7730 Standard [2].
 *
 * _PMV:
 * @see {@link https://en.wikipedia.org/wiki/Thermal_comfort#PMV/PPD_method|PMV}
 * _PPD:
 * @see {@link https://en.wikipedia.org/wiki/Thermal_comfort#PMV/PPD_method|PPD}
 * _Addendum C to Standard 55-2020:
 * @see {@link https://www.ashrae.org/file%20library/technical%20resources/standards%20and%20guidelines/standards%20addenda/55_2020_c_20210430.pdf|Addendum C to Standard 55-2020}
 *
 * @example
 * ```javascript
 *
 * import {pmv_pdd} from "./models.js";
 * import {v_relative, clo_dynamic} from "./utilities.js"
 *
 * const tdb = 25;
 * const tr = 25;
 * const rh = 50;
 * const v = 0.1;
 * const met = 1.4;
 * const clo = 0.5;
 * // Calculate relative air speed
 * const v_r = v_relative(v, met);
 * // Calculate dynamic clothing
 * const clo_d = clo_dynamic(clo, met);
 * const results = pmv_ppd({ tdb: tdb, tr: tr, vr: v_r, rh: rh, met: met, clo: clo_d });
 * console.log(results);
 * // Output: { pmv: 0.06, ppd: 5.1 }
 * console.log(results.pmv);
 * // Output: -0.06
 *
 * // You can also pass an array-like of inputs
 * const arrayResults = pmv_ppd({ tdb: [22, 25], tr: tr, vr: v_r, rh: rh, met: met, clo: clo_d });
 * console.log(arrayResults);
 * // Output: { pmv: [-0.47, 0.06], ppd: [9.6, 5.1] }
 *
 * //@throws {StopIteration} Raised if the number of iterations exceeds the threshold
 * //@throws {ValueError} The 'standard' function input parameter can only be 'ISO' or 'ASHRAE'
 * ```
 */
export function pmv_ppd(
  tdb,
  tr,
  vr,
  rh,
  met,
  clo,
  wme = 0,
  standard = "ISO",
  kwargs = {},
) {
  const default_kwargs = {
    units: "SI",
    limit_inputs: true,
    airspeed_control: true,
  };
  kwargs = Object.assign(default_kwargs, kwargs);

  if (kwargs.units === "IP") {
    // Conversion from IP to SI units
    ({ tdb, tr, vr } = units_converter({ tdb, tr, vr }, "IP"));
  }

  tdb = Array.isArray(tdb) ? tdb : [tdb];
  tr = Array.isArray(tr) ? tr : [tr];
  vr = Array.isArray(vr) ? vr : [vr];
  met = Array.isArray(met) ? met : [met];
  clo = Array.isArray(clo) ? clo : [clo];
  wme = Array.isArray(wme) ? wme : [wme];

  standard = standard.toLowerCase();
  if (standard !== "iso" && standard !== "ashrae") {
    throw new Error(
      "PMV calculations can only be performed in compliance with ISO or ASHRAE Standards",
    );
  }

  const {
    tdb: tdb_valid,
    tr: tr_valid,
    v: v_valid,
    met: met_valid,
    clo: clo_valid,
  } = check_standard_compliance_array(standard, {
    tdb,
    tr,
    v: vr,
    met,
    clo,
    airspeed_control: kwargs.airspeed_control,
  });

  let ce = 0;
  if (standard === "ashrae") {
    ce = vr.map((vrValue) => {
      //if v_r is higher than 0.1 follow methodology ASHRAE Appendix H, H3
      return vrValue >= 0.1
        ? cooling_effect(tdb, tr, vrValue, rh, met, clo, wme)
        : 0;
    });
  }
  // if (standard === "ashrae") {
  //   if (vr >= 0.1) { //if v_r is higher than 0.1 follow methodology ASHRAE Appendix H, H3
  //     ce = cooling_effect(tdb, tr, vr, rh, met, clo, wme);
  //   } else {
  //     ce = 0.0;
  //   }
  // }

  // tdb = tdb - ce
  for (let i = 0; i < tdb.length; i++) {
    tdb[i] -= ce;
  }

  // tr = tr - ce
  for (let i = 0; i < tr.length; i++) {
    tr[i] -= ce;
  }

  // vr = ce > 0 ? 0.1 : vr
  for (let i = 0; i < vr.length; i++) {
    if (ce > 0) {
      vr[i] = 0.1;
    }
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

  let pmv_array = tdb.map((item, i) =>
    pmv_ppd_optimized(item, tr[i], vr[i], rh, met[i], clo[i], wme[i]),
  );

  pmv_array = Array.isArray(pmv_array) ? pmv_array : [pmv_array];

  const ppd_array = pmv_array.map((pmvValue) => {
    return (
      100 -
      95 *
        Math.exp(
          -0.03353 * Math.pow(pmvValue, 4) - 0.2179 * Math.pow(pmvValue, 2),
        )
    );
  });

  // Checks that inputs are within the bounds accepted by the model if not return NaN
  if (kwargs.limit_inputs) {
    const pmv_valid =
      standard === "ashrae"
        ? pmv_array.map((pmvValue) => valid_range([pmvValue], [-100, 100]))
        : pmv_array.map((pmvValue) => valid_range([pmvValue], [-2, 2])); // this is the ISO limit

    const all_valid = pmv_valid.every((valid, index) => {
      return (
        valid &&
        tdb_valid[index] &&
        tr_valid[index] &&
        v_valid[index] &&
        met_valid[index] &&
        clo_valid[index]
      );
    });

    for (let i = 0; i < pmv_array.length; i++) {
      if (!all_valid || isNaN(pmv_array[i])) {
        pmv_array[i] = NaN;
        ppd_array[i] = NaN;
      }
    }
  }

  return {
    pmv: pmv_array.map((value) => Math.round(value * 10) / 10), //pmv is number[]
    ppd: ppd_array.map((value) => Math.round(value * 10) / 10), //ppd is number[]
  };
}
