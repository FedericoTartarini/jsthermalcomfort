"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pmv_array = exports.pmv = void 0;
const pmv_ppd_js_1 = require("./pmv_ppd.js");
/**
 * @typedef {Object} PmvKwargs
 * @property {'SI'|'IP'} units - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @property {boolean} limit_inputs - Default is True. By default, if the inputs are outside the standard applicability
 *    limits the function returns NaN. If false, returns pmv and ppd values even if input values are outside
 *    the applicability limits of the model.
 *    The ASHRAE 55 2020 limits are 10 < tdb [°C] < 40, 10 < tr [°C] < 40,
 *    0 < vr [m/s] < 2, 1 < met [met] < 4, and 0 < clo [clo] < 1.5.
 *    The ISO 7730 2005 limits are 10 < tdb [°C] < 30, 10 < tr [°C] < 40,
 *    0 < vr [m/s] < 1, 0.8 < met [met] < 4, 0 < clo [clo] < 2, and -2 < PMV < 2.
 * @property {boolean} airspeed_control - This only applies if standard = "ASHRAE".
 *    Default is True. By default, it is assumed that the occupant has control over the airspeed.
 *    In this case, the ASHRAE 55 Standard does not impose any airspeed limits.
 *    On the other hand, if the occupant has no control over the airspeed,
 *    the ASHRAE 55 imposes an upper limit for v which varies as a function of
 *    the operative temperature, for more information please consult the Standard.
 * @public
 */
/**
 * Returns Predicted Mean Vote ( {@link https://en.wikipedia.org/wiki/Thermal_comfort#PMV/PPD_method|PMV} ) calculated
 * in accordance with main thermal comfort Standards.
 *
 * The {@link https://en.wikipedia.org/wiki/Thermal_comfort#PMV/PPD_method|PMV} is an index that predicts the
 * mean value of the thermal sensation votes (self-reported perceptions) of a large group of people on a sensation
 * scale expressed from –3 to +3 corresponding to the categories: cold, cool, slightly cool, neutral, slightly warm,
 * warm, and hot. {@link #ref_1|[1]}
 *
 * While the PMV equation is the same for both the ISO and ASHRAE standards, in the ASHRAE 55 PMV equation, the SET is
 * used to calculate the cooling effect first, this is then subtracted from both the air and mean radiant temperatures,
 * and the differences are used as input to the PMV model, while the airspeed is set to 0.1m/s. Please read more in the
 * Note below.
 *
 * Notes:
 * You can use this function to calculate the {@link https://en.wikipedia.org/wiki/Thermal_comfort#PMV/PPD_method|PMV}
 * {@link #ref_1|[1]} {@link #ref_2|[2]}
 *
 * _Addendum C to Standard 55-2020:
 * {@link https://www.ashrae.org/file%20library/technical%20resources/standards%20and%20guidelines/standards%20addenda/55_2020_c_20210430.pdf}
 *
 * This is a version that supports scalar arguments.
 * @see {@link pmv_array} for a version that supports arrays.
 *
 * @public
 * @memberof models
 * @docname Predicted Mean Vote (PMV)
 *
 * @param {number} tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} vr - relative air speed, default in [m/s] in [fps] if `units` = 'IP'
 * @param {number} rh - relative humidity, [%]
 * @param {number} met - metabolic rate
 * @param {number} clo - clothing insulation
 * @param {number} [wme=0] - external work, default is 0
 * @param {"ISO"|"ASHRAE"} [standard="ISO"] - comfort standard used for calculation
 * @param {PmvKwargs} kwargs - additional arguments
 *
 * @returns {number} pmv - Predicted Mean Vote
 *
 * @example
 * const tdb = 25;
 * const tr = 25;
 * const rh = 50;
 * const v = 0.1;
 * const met = 1.4;
 * const clo = 0.5;
 *
 * // calculate relative air speed
 * const v_r = v_relative(v, met);
 * // calculate dynamic clothing
 * const clo_d = clo_dynamic(clo, met);
 *
 * const results = pmv(tdb, tr, v_r, rh, met, clo_d);
 * console.log(results); // 0.06
 */
function pmv(tdb, tr, vr, rh, met, clo, wme = 0, standard = "ISO", kwargs = {}) {
    const default_kwargs = {
        units: "SI",
        limit_inputs: true,
        airspeed_control: true,
    };
    kwargs = Object.assign(default_kwargs, kwargs);
    const pmv_ppdValue = (0, pmv_ppd_js_1.pmv_ppd)(tdb, tr, vr, rh, met, clo, wme, standard, kwargs);
    if (!pmv_ppdValue.hasOwnProperty("pmv")) {
        throw new Error("pmv property not found in pmv_ppdValue");
    }
    return pmv_ppdValue.pmv;
}
exports.pmv = pmv;
/**
 * Returns Predicted Mean Vote ( {@link https://en.wikipedia.org/wiki/Thermal_comfort#PMV/PPD_method|PMV} ) calculated
 * in accordance with main thermal comfort Standards.
 *
 * The {@link https://en.wikipedia.org/wiki/Thermal_comfort#PMV/PPD_method|PMV} is an index that predicts the
 * mean value of the thermal sensation votes (self-reported perceptions) of a large group of people on a sensation
 * scale expressed from –3 to +3 corresponding to the categories: cold, cool, slightly cool, neutral, slightly warm,
 * warm, and hot. {@link #ref_1|[1]}
 *
 * While the PMV equation is the same for both the ISO and ASHRAE standards, in the ASHRAE 55 PMV equation, the SET is
 * used to calculate the cooling effect first, this is then subtracted from both the air and mean radiant temperatures,
 * and the differences are used as input to the PMV model, while the airspeed is set to 0.1m/s. Please read more in the
 * Note below.
 *
 * Notes:
 * You can use this function to calculate the {@link https://en.wikipedia.org/wiki/Thermal_comfort#PMV/PPD_method|PMV}
 * {@link #ref_1|[1]} {@link #ref_2|[2]}
 *
 * _Addendum C to Standard 55-2020:
 * {@link https://www.ashrae.org/file%20library/technical%20resources/standards%20and%20guidelines/standards%20addenda/55_2020_c_20210430.pdf}
 *
 * This is a version that supports arrays.
 * @see {@link pmv} for a version that supports scalar arguments.
 *
 * @public
 * @memberof models
 * @docname Predicted Mean Vote (PMV) (array version)
 *
 * @param {number[]} tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number[]} tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number[]} vr - relative air speed, default in [m/s] in [fps] if `units` = 'IP'
 * @param {number[]} rh - relative humidity, [%]
 * @param {number[]} met - metabolic rate, [met]
 * @param {number[]} clo - clothing insulation, [clo]
 * @param {number[]} wme - external work, default is array of 0
 * @param {"ISO"|"ASHRAE"} [standard="ISO"] - comfort standard used for calculation
 * @param {PmvKwargs} kwargs - additional arguments
 *
 * @returns {number[]} pmv - Predicted Mean Vote
 *
 * @example
 * const tdb = [22, 25];
 * const tr = [25, 25];
 * const rh = [50, 50];
 * const v = [0.1, 0.1];
 * const met = [1.4, 1.4];
 * const clo = [0.5, 0.5];
 *
 * // calculate relative air speed
 * const v_r = v_relative_array(v, met);
 * // calculate dynamic clothing
 * const clo_d = clo_dynamic_array(clo, met);
 *
 * const results = pmv_array(tdb, tr, v_r, rh, met, clo_d);
 * console.log(results); // [-0.47, 0.06]
 */
function pmv_array(tdb, tr, vr, rh, met, clo, wme, standard = "ISO", kwargs = {}) {
    const default_kwargs = {
        units: "SI",
        limit_inputs: true,
        airspeed_control: true,
    };
    kwargs = Object.assign(default_kwargs, kwargs);
    const pmv_ppd_arrayValue = (0, pmv_ppd_js_1.pmv_ppd_array)(tdb, tr, vr, rh, met, clo, wme, standard, kwargs);
    if (!pmv_ppd_arrayValue.hasOwnProperty("pmv")) {
        throw new Error("pmv property not found in pmv_ppd_arrayValue");
    }
    return pmv_ppd_arrayValue.pmv;
}
exports.pmv_array = pmv_array;
