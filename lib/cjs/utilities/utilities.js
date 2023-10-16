"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clo_individual_garments = exports.clo_typical_ensembles = exports.met_typical_tasks = exports.valid_range = exports.f_svv = exports.running_mean_outdoor_temperature = exports.units_converter_array = exports.units_converter = exports.clo_dynamic_array = exports.clo_dynamic = exports.v_relative_array = exports.v_relative = exports.body_surface_area = exports.check_standard_compliance_array = exports.check_standard_compliance = exports.transpose_sharp_altitude = exports.round = void 0;
const p_sat_js_1 = require("../psychrometrics/p_sat.js");
const t_o_js_1 = require("../psychrometrics/t_o.js");
/**
 * Rounds a number to the given precision.
 *
 * @param {number} number - the number to round
 * @param {number} precision - the number of decimal places to round to
 * @returns {number} the rounded result
 */
function round(number, precision) {
    const smudge = Math.pow(10, precision);
    return Math.round(number * smudge) / smudge;
}
exports.round = round;
/**
 * @typedef {Object} ComplianceKwargs
 * @property {number} [met]
 * @property {number} [clo]
 * @property {number} [tdb]
 * @property {number} [tr]
 * @property {number} [v]
 * @property {number} [vr]
 * @property {number} [v_limited]
 * @property {number} [rh]
 */
/**
 * @typedef {Object} ComplianceKwargsArray
 * @property {number[]} [met]
 * @property {number[]} [clo]
 * @property {number[]} [tdb]
 * @property {number[]} [tr]
 * @property {number[]} [v]
 * @property {number[]} [v_limited]
 * @property {number[]} [rh]
 */
/**
 * @typedef {"ANKLE_DRAFT" | "ASHRAE" | "ISO" | "ISO7933"} Standard
 */
/**
 * Converts degrees to radians
 *
 * @param {number} degrees
 *
 * @returns {number} - radians
 */
function degrees_to_radians(degrees) {
    return degrees * (Math.PI / 180);
}
/**
 * Converts radians to degree unit
 *
 * @param {number} radians
 *
 * @returns {number} - degrees
 */
function radians_to_degrees(radians) {
    return radians * (180 / Math.PI);
}
/**
 * Converts sharp and altittude from radians to degree unit
 * @param {number} sharp
 * @param {number} altitude
 * @returns {[number, number]}
 */
function transpose_sharp_altitude(sharp, altitude) {
    const altitude_new = radians_to_degrees(Math.asin(Math.sin(degrees_to_radians(Math.abs(sharp - 90))) *
        Math.cos(degrees_to_radians(altitude))));
    sharp = radians_to_degrees(Math.atan(Math.sin(degrees_to_radians(sharp)) *
        Math.tan(degrees_to_radians(90 - altitude))));
    return [round(sharp, 3), round(altitude_new, 3)];
}
exports.transpose_sharp_altitude = transpose_sharp_altitude;
/**
 * Check that the values comply with the standard provided
 *
 * @param {Standard} standard
 * @param {ComplianceKwargs} kwargs
 *
 * @returns {string[]} strings with warnings emitted
 */
function check_standard_compliance(standard, kwargs) {
    switch (standard) {
        case "ANKLE_DRAFT":
            return _ankle_draft_compliance(kwargs);
        case "ASHRAE":
            return _ashrae_compliance(kwargs);
        case "ISO":
            return _iso_compliance(kwargs);
        case "ISO7933":
            return _iso7933_compliance(kwargs);
        default:
            throw new Error("Unknown standard");
    }
}
exports.check_standard_compliance = check_standard_compliance;
/**
 * @typedef {Object.<string, number[]>} CheckStandardComplianceResult
 * @property {number[]} tdb
 * @property {number[]} tr
 * @property {number[]} v
 * @property {number[]} [met]
 * @property {number[]} [clo]
 * @property {number[]} [rh]
 */
/**
 * Check that the values as an array comply with the standard provided and returns arrays where
 * the values that do not comply are NaN
 * @see {@link check_standard_compliance} for scalar variant that returns warnings
 *
 * @param {Standard | "FAN_HEATWAVES"} standard - standard to check compliance with
 * @param {ComplianceKwargsArray & {airspeed_control?: boolean}} kwargs - values to check compliance against
 *
 * @returns {CheckStandardComplianceResult} filtered arrays based on compliance limits
 */
function check_standard_compliance_array(standard, kwargs) {
    const default_kwargs = { airspeed_control: true };
    kwargs = Object.assign(default_kwargs, kwargs);
    switch (standard) {
        case "ISO7933":
        case "ANKLE_DRAFT":
            throw new Error(`Unsupported standard ${standard}`);
        case "ASHRAE": {
            // based on table 7.3.4 ashrae 55 2020
            const tdb = valid_range(kwargs.tdb, [10.0, 40.0]);
            const tr = valid_range(kwargs.tr, [10.0, 40.0]);
            let original_v = kwargs.v || [];
            let v = valid_range(kwargs.v, [0.0, 2.0]);
            if (!kwargs.airspeed_control) {
                const met_aux = kwargs.met || [];
                const clo_aux = kwargs.clo || [];
                v = v.map((_v, index) => original_v[index] > 0.8 &&
                    clo_aux[index] < 0.7 &&
                    met_aux[index] < 1.3
                    ? NaN
                    : _v);
                const to = (0, t_o_js_1.t_o_array)(tdb, tr, original_v);
                v = v.map((_v, index) => {
                    const limit = 50.49 - 4.4047 * to[index] + 0.096425 * to[index] * to[index];
                    return (23 < to[index] &&
                        to[index] < 25.5 &&
                        original_v[index] > limit &&
                        clo_aux[index] < 0.7 &&
                        met_aux[index] < 1.3) ||
                        (to[index] <= 23 &&
                            original_v[index] > 0.2 &&
                            clo_aux[index] < 0.7 &&
                            met_aux[index] < 1.3)
                        ? NaN
                        : _v;
                });
            }
            if (kwargs.met !== undefined) {
                const met = valid_range(kwargs.met, [1.0, 4.0]);
                const clo = valid_range(kwargs.clo, [0.0, 1.5]);
                return { tdb, tr, v, met, clo };
            }
            return { tdb, tr, v };
        }
        case "FAN_HEATWAVES": {
            const tdb = valid_range(kwargs.tdb, [20.0, 50.0]);
            const tr = valid_range(kwargs.tr, [20.0, 50.0]);
            const v = valid_range(kwargs.v, [0.1, 4.5]);
            const rh = valid_range(kwargs.rh, [0, 100]);
            const met = valid_range(kwargs.met, [0.7, 2]);
            const clo = valid_range(kwargs.clo, [0.0, 1]);
            return { tdb, tr, v, rh, met, clo };
        }
        case "ISO": {
            // based on ISO 7730:2005 page 3
            const tdb = valid_range(kwargs.tdb, [10.0, 30.0]);
            const tr = valid_range(kwargs.tr, [10.0, 40.0]);
            const v = valid_range(kwargs.v, [0.0, 1.0]);
            const met = valid_range(kwargs.met, [0.8, 4.0]);
            const clo = valid_range(kwargs.clo, [0.0, 2]);
            return { tdb, tr, v, met, clo };
        }
    }
}
exports.check_standard_compliance_array = check_standard_compliance_array;
/**
 * @param {ComplianceKwargs} kwargs
 *
 * @returns {string[]} strings with warnings emitted
 */
function _ankle_draft_compliance(kwargs) {
    /** @type {string[]} */
    let warnings = [];
    for (const [key, value] of Object.entries(kwargs)) {
        if (value === undefined)
            continue;
        if (key === "met" && value > 1.3)
            warnings.push("The ankle draft model is only valid for met <= 1.3");
        if (key === "clo" && value > 0.7)
            warnings.push("The ankle draft model is only valid for clo <= 0.7");
    }
    return warnings;
}
/**
 * @param {ComplianceKwargs} kwargs
 *
 * @returns {string[]} strings with warnings emitted
 */
function _ashrae_compliance(kwargs) {
    /** @type {string[]} */
    let warnings = [];
    for (const [key, value] of Object.entries(kwargs)) {
        if (value === undefined)
            continue;
        switch (key) {
            case "tdb":
            case "tr":
                let parameter = key === "tdb" ? "dry-bulb" : "mean radiant";
                if (value > 40 || value < 10)
                    warnings.push(`ASHRAE ${parameter} temperature application limits between 10 and 40 ºC`);
                break;
            case "v":
            case "vr":
                if (value > 2 || value < 0)
                    warnings.push("ASHRAE air speed applicability limits between 0 and 2 m/s");
                break;
            case "met":
                if (value > 4 || value < 1)
                    warnings.push("ASHRAE met applicability limits between 1.0 and 4.0 met");
                break;
            case "clo":
                if (value > 1.5 || value < 0)
                    warnings.push("ASHRAE clo applicability limits between 0.0 and 1.5 clo");
                break;
            case "v_limited":
                if (value > 0.2)
                    throw new Error("This equation is only applicable for air speed lower than 0.2 m/s");
                break;
        }
    }
    return warnings;
}
/**
 * @param {ComplianceKwargs} kwargs
 *
 * @returns {string[]} strings with warnings emitted
 */
function _iso_compliance(kwargs) {
    /** @type {string[]} */
    let warnings = [];
    for (const [key, value] of Object.entries(kwargs)) {
        if (value === undefined)
            continue;
        if (key === "tdb" && (value > 30 || value < 10))
            warnings.push("ISO air temperature applicability limits between 10 and 30 ºC");
        if (key === "tr" && (value > 40 || value < 10))
            warnings.push("ISO mean radiant temperature applicability limits between 10 and 40 ºC");
        if (key === "v" || (key === "vr" && (value > 1 || value < 0)))
            warnings.push("ISO air speed applicability limits between 0 and 1 m/s");
        if (key === "met" && (value > 4 || value < 0))
            warnings.push("ISO met applicability limits between 0.8 and 4.0 met");
        if (key === "clo" && (value > 2 || value < 0))
            warnings.push("ISO clo applicability limits between 0.0 and 2 clo");
    }
    return warnings;
}
/**
 * @param {ComplianceKwargs} kwargs
 *
 * @returns {string[]} strings with warnings emitted
 */
function _iso7933_compliance(kwargs) {
    if (kwargs.tdb === undefined ||
        kwargs.rh === undefined ||
        kwargs.tr === undefined ||
        kwargs.v === undefined ||
        kwargs.met === undefined ||
        kwargs.clo === undefined) {
        throw new Error(`Missing arguments for ISO7933 compliance check, got: ${kwargs} and requires tdb, rh, tr, v, met and clo`);
    }
    /** @type {string[]} */
    let warnings = [];
    if (kwargs.tdb > 50 || kwargs.tdb < 15)
        warnings.push("ISO 7933:2004 air temperature applicability limits between 15 and 50 ºC");
    const p_sat_result = (0, p_sat_js_1.p_sat)(kwargs.tdb);
    const p_a = ((p_sat_result / 1000) * kwargs.rh) / 100;
    const rh_max = (4.5 * 100 * 1000) / p_sat_result;
    if (p_a > rh_max || p_a < 0)
        warnings.push(`ISO 7933:2004 rh applicability limits between 0 and ${rh_max} %`);
    if (kwargs.tr - kwargs.tdb > 60 || kwargs.tr - kwargs.tdb < 0)
        warnings.push("ISO 7933:2004 t_r - t_db applicability limits between 0 and 60 ºC");
    if (kwargs.v > 3 || kwargs.v < 0)
        warnings.push("ISO 7933:2004 air speed applicability limits between 0 and 3 m/s");
    if (kwargs.met > 450 || kwargs.met < 100)
        warnings.push("ISO 7933:2004 met applicability limits between 100 and 450 met");
    if (kwargs.clo > 1 || kwargs.clo < 0.1)
        warnings.push("ISO 7933:2004 clo applicability limits between 0.1 and 1 clo");
    return warnings;
}
/**
 * Returns the body surface area in square meters
 *
 * @public
 * @memberof utilities
 * @docname Body Surface Area
 *
 * @param {number} weight - body weight, [kg]
 * @param {number} height - height, [m]
 * @param {("dubois" | "takahira" | "fujimoto" | "kurazumi")} [formula="dubois"] - formula used to calculate the body surface area. default="dubois"
 * @returns {number} body surface area, [m2]
 *
 * @category Utilities
 */
function body_surface_area(weight, height, formula = "dubois") {
    if (formula === "dubois")
        return 0.202 * Math.pow(weight, 0.425) * Math.pow(height, 0.725);
    if (formula === "takahira")
        return 0.2042 * Math.pow(weight, 0.425) * Math.pow(height, 0.725);
    if (formula === "fujimoto")
        return 0.1882 * Math.pow(weight, 0.444) * Math.pow(height, 0.663);
    if (formula === "kurazumi")
        return 0.244 * Math.pow(weight, 0.383) * Math.pow(height, 0.693);
    throw new Error(`This ${formula} to calculate the body_surface_area does not exists.`);
}
exports.body_surface_area = body_surface_area;
/**
 * Estimates the relative air speed which combines the average air speed of the
 * space plus the relative air speed caused by the body movement. Vag is assumed
 * to be 0 for metabolic rates equal and lower than 1 met and otherwise equal to
 * Vag = 0.3 (M - 1) (m/s)
 *
 * @public
 * @memberof utilities
 * @docname Relative air speed
 *
 * @see {@link v_relative_array} for a version that supports array arguments
 *
 * @param {number} v - air spped measured by the sensor, [m/s]
 * @param {number} met - metabolic rate, [met]
 * @returns {number} relative air speed, [m/s]
 */
function v_relative(v, met) {
    if (met <= 1)
        return v;
    return _v_relative_single(v, met);
}
exports.v_relative = v_relative;
/**
 * Estimates the relative air speed which combines the average air speed of the
 * space plus the relative air speed caused by the body movement. Vag is assumed
 * to be 0 for metabolic rates equal and lower than 1 met and otherwise equal to
 * Vag = 0.3 (M - 1) (m/s)
 *
 * @public
 * @memberof utilities
 * @docname Relative air speed (array version)
 *
 * @see {@link v_relative} for a version that supports scalar arguments
 *
 * @param {number[]} v - air spped measured by the sensor, [m/s]
 * @param {number[]} met - metabolic rate, [met]
 * @returns {number[]} relative air speed, [m/s]
 */
function v_relative_array(v, met) {
    if (met <= 1)
        return v;
    return v.map((_v, index) => _v_relative_single(_v, met[index]));
}
exports.v_relative_array = v_relative_array;
/**
 * @param {number} v
 * @param {number} met
 * @returns {number}
 */
function _v_relative_single(v, met) {
    return Math.round((v + 0.3 * (met - 1) + Number.EPSILON) * 1000) / 1000;
}
/**
 * Estimates the dynamic clothing insulation of a moving occupant. The activity as
 * well as the air speed modify the insulation characteristics of the clothing and the
 * adjacent air layer. Consequently, the ISO 7730 states that the clothing insulation
 * shall be corrected {@link #ref_2|[2]}. The ASHRAE 55 Standard corrects for the effect
 * of the body movement for met equal or higher than 1.2 met using the equation
 * clo = Icl × (0.6 + 0.4/met)
 *
 * @public
 * @memberof utilities
 * @docname Dynamic clothing
 *
 * @see {@link clo_dynamic_array} for a version that supports array arguments
 *
 * @param {number} clo - clothing insulation, [clo]
 * @param {number} met - metabolic rate, [met]
 * @param {("ASHRAE" | "ISO")} [standard="ASHRAE"] - If "ASHRAE", uses Equation provided in Section 5.2.2.2 of ASHRAE 55 2020
 * @returns {number} dunamic clothing insulation, [clo]
 */
function clo_dynamic(clo, met, standard = "ASHRAE") {
    if (standard !== "ASHRAE" && standard !== "ISO")
        throw new Error("only the ISO 7730 and ASHRAE 55 2020 models have been implemented");
    if ((standard === "ASHRAE" && met <= 1.2) || (standard === "ISO" && met <= 1))
        return clo;
    return _clo_dynamic_single(clo, met);
}
exports.clo_dynamic = clo_dynamic;
/**
 * Estimates the dynamic clothing insulation of a moving occupant. The activity as
 * well as the air speed modify the insulation characteristics of the clothing and the
 * adjacent air layer. Consequently, the ISO 7730 states that the clothing insulation
 * shall be corrected {@link #ref_2|[2]}. The ASHRAE 55 Standard corrects for the effect
 * of the body movement for met equal or higher than 1.2 met using the equation
 * clo = Icl × (0.6 + 0.4/met)
 *
 * @public
 * @memberof utilities
 * @docname Dynamic clothing (array version)
 *
 * @see {@link clo_dynamic} for a version that supports scalar arguments
 *
 * @param {number[]} clo - clothing insulation, [clo]
 * @param {number[]} met - metabolic rate, [met]
 * @param {("ASHRAE" | "ISO")} [standard="ASHRAE"] - If "ASHRAE", uses Equation provided in Section 5.2.2.2 of ASHRAE 55 2020
 * @returns {number[]} dunamic clothing insulation, [clo]
 */
function clo_dynamic_array(clo, met, standard = "ASHRAE") {
    if (standard === "ASHRAE")
        return met.map((_met, index) => _met > 1.2 ? _clo_dynamic_single(clo[index], _met) : clo[index]);
    if (standard === "ISO")
        return met.map((_met, index) => _met > 1 ? _clo_dynamic_single(clo[index], _met) : clo[index]);
    throw new Error("only the ISO 7730 and ASHRAE 55 2020 models have been implemented");
}
exports.clo_dynamic_array = clo_dynamic_array;
/**
 * @param {number} clo
 * @param {number} met
 * @returns {number}
 */
function _clo_dynamic_single(clo, met) {
    return Math.round((clo * (0.6 + 0.4 / met) + Number.EPSILON) * 1000) / 1000;
}
/**
 * Converts IP values to SI units
 *
 * @memberof utilities
 * @docname Units converter
 * @public
 *
 * @template {Object.<string, number>} T
 * @param {T} kwargs - [t, v] units to convert
 * @param {"IP" | "SI"} [from_units="IP"] - specify system to convert from
 * @returns {T} converted values in SI units
 *
 * @see {@link units_converter_array} for a version that supports array parameters
 */
function units_converter(kwargs, from_units = "IP") {
    let result = Object.assign({}, kwargs);
    if (from_units === "IP") {
        for (const [key, value] of Object.entries(result)) {
            if (key.includes("tmp") || key === "tr" || key === "tdb")
                result[key] = _temp_ip_to_si(value);
            else if (key === "v" || key === "vr" || key === "vel")
                result[key] = _vel_ip_to_si(value);
            else if (key === "area")
                result[key] = _area_ip_to_si(value);
            else if (key === "pressure")
                result[key] = _pressure_ip_to_si(value);
        }
    }
    else if (from_units === "SI") {
        for (const [key, value] of Object.entries(result)) {
            if (key.includes("tmp") || key === "tr" || key === "tdb")
                result[key] = _temp_si_to_ip(value);
            else if (key === "v" || key === "vr" || key === "vel")
                result[key] = _vel_si_to_ip(value);
            else if (key === "area")
                result[key] = _area_si_to_ip(value);
            else if (key === "pressure")
                result[key] = _pressure_si_to_ip(value);
        }
    }
    else {
        throw new Error(`Unknown system ${from_units}`);
    }
    return result;
}
exports.units_converter = units_converter;
/**
 * Converts IP values to SI units
 *
 * @memberof utilities
 * @docname Units converter (array version)
 * @public
 *
 * @template {Object.<string, number[]>} T
 * @param {T} kwargs - [t, v] units to convert
 * @param {"IP" | "SI"} [from_units="IP"] - specify system to convert from
 * @returns {T} converted values in SI units
 *
 * @see {@link units_converter} for a version that supports scalar parameters
 */
function units_converter_array(kwargs, from_units = "IP") {
    let result = {};
    if (from_units === "IP") {
        for (const [key, value] of Object.entries(kwargs)) {
            if (key.includes("tmp") || key === "tr" || key === "tdb")
                result[key] = value.map(_temp_ip_to_si);
            else if (key === "v" || key === "vr" || key === "vel")
                result[key] = value.map(_vel_ip_to_si);
            else if (key === "area")
                result[key] = value.map(_area_ip_to_si);
            else if (key === "pressure")
                result[key] = value.map(_pressure_ip_to_si);
        }
    }
    else if (from_units === "SI") {
        for (const [key, value] of Object.entries(kwargs)) {
            if (key.includes("tmp") || key === "tr" || key === "tdb")
                result[key] = value.map(_temp_si_to_ip);
            else if (key === "v" || key === "vr" || key === "vel")
                result[key] = value.map(_vel_si_to_ip);
            else if (key === "area")
                result[key] = value.map(_area_si_to_ip);
            else if (key === "pressure")
                result[key] = value.map(_pressure_si_to_ip);
        }
    }
    else {
        throw new Error(`Unknown system ${from_units}`);
    }
    return result;
}
exports.units_converter_array = units_converter_array;
/**
 * @param {number} pressure
 * @returns {number}
 */
function _pressure_ip_to_si(pressure) {
    return pressure * 101325;
}
/**
 * @param {number} pressure
 * @returns {number}
 */
function _pressure_si_to_ip(pressure) {
    return pressure / 101325;
}
/**
 * @param {number} area
 * @returns {number}
 */
function _area_ip_to_si(area) {
    return area / 10.764;
}
/**
 * @param {number} area
 * @returns {number}
 */
function _area_si_to_ip(area) {
    return area * 10.764;
}
/**
 * @param {number} vel
 * @returns {number}
 */
function _vel_ip_to_si(vel) {
    return vel / 3.281;
}
/**
 * @param {number} vel
 * @returns {number}
 */
function _vel_si_to_ip(vel) {
    return vel * 3.281;
}
/**
 * @param {number} temp
 * @returns {number}
 */
function _temp_ip_to_si(temp) {
    return ((temp - 32) * 5) / 9;
}
/**
 * @param {number} temp
 * @returns {number}
 */
function _temp_si_to_ip(temp) {
    return (temp * 9) / 5 + 32;
}
// FIXME: find how to write math notation inside JSDocs
/**
 * Estimates the running mean temperature also known as prevailing mean outdoor temperature
 *
 * @public
 * @memberof utilities
 * @docname Running mean outdoor temperature
 *
 * @param {number[]} temp_array - array containing the mean daily temperature in descending order (i.e. from
 * newest/yestedayr to oldest) :math:`[t_{day-1}, t_{day-2}, ... , t_{day-n}]`,
 * Where :math:`t_{day-1}` is yesterday's daily mean temperature. The EN
 * 16798-1 2019 {@link #ref_3|[3]} states that n should be equal to 7
 *
 * @param {number} [alpha=0.8] - constant between 0 and 1. The EN 16798-1 2019 {@link #ref_3|[3]} recommends a value of 0.8,
 * while the ASHRAE 55 2020 recommends to choose values between 0.9 and 0.6,
 * corresponding to a slow- and fast- response running mean, respectively.
 * Adaptive comfort theory suggest that a slow-response running mean (alpha = 0.9)
 * could be more appropriate for climates in which synoptic-scale (day-to-day)
 * temperature dynamics are relatively minor, sich as the humid tropics.
 *
 * @param {"IP" | "SI"} [units="SI"] - select the SI (International System of Units) or the IP (Imperial Units) system.
 *
 * @returns {number} running mean outdoor temperature
 */
function running_mean_outdoor_temperature(temp_array, alpha = 0.8, units = "SI") {
    if (units === "IP")
        temp_array = temp_array.map((tdb) => units_converter({ tdb }).tdb);
    let coeff = temp_array.map((_tdb, index) => Math.pow(alpha, index));
    let summ_t_rm = temp_array.reduce((acum, curr, index) => acum + curr * coeff[index]);
    let summ_coeff = coeff.reduce((acum, curr) => acum + curr);
    let t_rm = summ_t_rm / summ_coeff;
    if (units === "IP")
        t_rm = units_converter({ tmp: t_rm }, "SI").tmp;
    return Math.round(t_rm * 10 + Number.EPSILON) / 10;
}
exports.running_mean_outdoor_temperature = running_mean_outdoor_temperature;
/**
 * Calculates the sky-vault view fraction
 *
 * @public
 * @memberof utilities
 * @docname Sky-vault view fraction
 *
 * @param {number} w - width of the window, [m]
 * @param {number} h - height of the window, [m]
 * @param {number} d - distance between the occupant and the window, [m]
 *
 * @returns {number} sky-vault view faction ranges between 0 and 1
 */
function f_svv(w, h, d) {
    let h_degrees = Math.atan(h / (2 * d)) * (180 / Math.PI);
    let w_degrees = Math.atan(w / (2 * d)) * (180 / Math.PI);
    return (h_degrees * w_degrees) / 16200;
}
exports.f_svv = f_svv;
/**
 * Filter values based on a valid range (It turns the filtered values to NaNs)
 *
 * @param {number[]} [range] - the range to limit
 * @param {[number, number]} valid - the [min, max] to constrian the range to
 * @returns {number[]} the constrained range with NaNs for values that are outside the min, max range
 */
function valid_range(range, [min, max]) {
    if (range === undefined)
        return [];
    return range.map((n) => (n >= min && n <= max ? n : NaN));
}
exports.valid_range = valid_range;
/**
 * Met values of typical tasks.
 * @public
 * @memberof reference_values
 * @docname Met typical tasks, [met]
 * @constant
 * @type {Object}
 * @property {number} Sleeping - 0.7
 * @property {number} Reclining - 0.8
 * @property {number} Seated_Cquiet - 1.0
 * @property {number} Reading_seated - 1.0
 * @property {number} Writing - 1.0
 * @property {number} Reading_seatedTyping - 1.1
 * @property {number} Standing_relaxed - 1.2
 * @property {number} Filing_seated - 1.2
 * @property {number} Flying_aircraft_routine - 1.2
 * @property {number} Filing_standing - 1.4
 * @property {number} Driving_a_car - 1.5
 * @property {number} Walking_about - 1.7
 * @property {number} Cooking - 1.8
 * @property {number} Table_sawing - 1.8
 * @property {number} Walking_2mph_3_2kmh - 2.0
 * @property {number} Lifting_packing - 2.1
 * @property {number} Seated_heavy_limb_movement - 2.2
 * @property {number} Light_machine_work - 2.2
 * @property {number} Flying_aircraft_combat - 2.4
 * @property {number} Walking_3mph_4_8kmh - 2.6
 * @property {number} House_cleaning - 2.7
 * @property {number} Driving_heavy_vehicle - 3.2
 * @property {number} Dancing - 3.4
 * @property {number} Calisthenics - 3.5
 * @property {number} Walking_4mph_6_4kmh - 3.8
 * @property {number} Tennis - 3.8
 * @property {number} Heavy_machine_work - 4.0
 * @property {number} Handling_100lb_45_kg_bags - 4.0
 * @property {number} Pick_and_shovel_work - 4.4
 * @property {number} Basketball - 6.3
 * @property {number} Wrestling - 7.8
 * @example
 * import { met_typical_tasks } from "jsthermalcomfort/utilities"; //The path to utilities
 * console.log(met_typical_tasks['Seated_Cquiet']);
 * // output 1.0
 */
exports.met_typical_tasks = {
    Sleeping: 0.7,
    Reclining: 0.8,
    Seated_Cquiet: 1.0,
    Reading_seated: 1.0,
    Writing: 1.0,
    Typing: 1.1,
    Standing_relaxed: 1.2,
    Filing_seated: 1.2,
    Flying_aircraft_routine: 1.2,
    Filing_standing: 1.4,
    Driving_a_car: 1.5,
    Walking_about: 1.7,
    Cooking: 1.8,
    Table_sawing: 1.8,
    Walking_2mph_3_2kmh: 2.0,
    Lifting_packing: 2.1,
    Seated_heavy_limb_movement: 2.2,
    Light_machine_work: 2.2,
    Flying_aircraft_combat: 2.4,
    Walking_3mph_4_8kmh: 2.6,
    House_cleaning: 2.7,
    Driving_heavy_vehicle: 3.2,
    Dancing: 3.4,
    Calisthenics: 3.5,
    Walking_4mph_6_4kmh: 3.8,
    Tennis: 3.8,
    Heavy_machine_work: 4.0,
    Handling_100lb_45_kg_bags: 4.0,
    Pick_and_shovel_work: 4.4,
    Basketball: 6.3,
    Wrestling: 7.8,
};
/**
 * Total Clothing insulation of typical ensembles
 * @public
 * @memberof reference_values
 * @docname Typical ensembles insulation, [clo]
 *
 * @param {"Walking shorts, short-sleeve shirt" | "Typical summer indoor clothing" |
 * "Knee-length skirt, short-sleeve shirt, sandals, underwear" | "Trousers, long-sleeve shirt" |
 * "Knee-length skirt, long-sleeve shirt, full slip" | "Sweat pants, long-sleeve sweatshirt" |
 * "Jacket, Trousers, long-sleeve shirt" | "Typical winter indoor clothing"} ensembles - Typical ensembles. One of:
 *   - "Walking shorts, short-sleeve shirt"
 *   - "Typical summer indoor clothing"
 *   - "Knee-length skirt, short-sleeve shirt, sandals, underwear"
 *   - "Trousers, short-sleeve shirt, socks, shoes, underwear"
 *   - "Trousers, long-sleeve shirt"
 *   - "Knee-length skirt, long-sleeve shirt, full slip"
 *   - "Sweat pants, long-sleeve sweatshirt"
 *   - "Jacket, Trousers, long-sleeve shirt"
 *   - "Typical winter indoor clothing"
 *
 * @returns {number} - Clothing insulation of the given ensembles
 * @example
 * const result = clo_typical_ensembles("Trousers, long-sleeve shirt"); // returns 0.61
 */
function clo_typical_ensembles(ensembles) {
    switch (ensembles) {
        case "Walking shorts, short-sleeve shirt":
            return 0.36;
        case "Typical summer indoor clothing":
            return 0.5;
        case "Knee-length skirt, short-sleeve shirt, sandals, underwear":
            return 0.54;
        case "Trousers, short-sleeve shirt, socks, shoes, underwear":
            return 0.57;
        case "Trousers, long-sleeve shirt":
            return 0.61;
        case "Knee-length skirt, long-sleeve shirt, full slip":
            return 0.67;
        case "Sweat pants, long-sleeve sweatshirt":
            return 0.74;
        case "Jacket, Trousers, long-sleeve shirt":
            return 0.96;
        case "Typical winter indoor clothing":
            return 1.0;
        default:
            throw new Error("No such ensemble");
    }
}
exports.clo_typical_ensembles = clo_typical_ensembles;
/**
 * Clo values of individual clothing elements. To calculate the total clothing insulation you need to add these values together.
 * @public
 * @memberof reference_values
 * @docname Insulation of individual garments, [clo]
 * @constant
 * @type {Object}
 * @property {number} Metal_chair - 0.0
 * @property {number} Bra - 0.01
 * @property {number} Wooden_stool - 0.01
 * @property {number} Ankle_socks - 0.02
 * @property {number} Shoes_or_sandals - 0.02
 * @property {number} Slippers - 0.03
 * @property {number} Panty_hose - 0.02
 * @property {number} Calf_length_socks - 0.03
 * @property {number} Women_underwear - 0.03
 * @property {number} Men_underwear - 0.04
 * @property {number} Knee_socks_thick - 0.06
 * @property {number} Short_shorts - 0.06
 * @property {number} Walking_shorts: 0.08,
 * @property {number} T_shirt - 0.08
 * @property {number} Standard_office_chair - 0.1
 * @property {number} Executive_chair - 0.15
 * @property {number} Boots - 0.1
 * @property {number} Sleeveless_scoop_neck_blouse - 0.12
 * @property {number} Half_slip - 0.14
 * @property {number} Long_underwear_bottoms - 0.15
 * @property {number} Full_slip - 0.16
 * @property {number} Short_sleeve_knit_shirt - 0.17
 * @property {number} Sleeveless_vest_thin - 0.1
 * @property {number} Sleeveless_vest_thick - 0.17
 * @property {number} Sleeveless_short_gown_thin - 0.18
 * @property {number} Short_sleeve_dress_shirt - 0.19
 * @property {number} Sleeveless_long_gown_thin - 0.2
 * @property {number} Long_underwear_top - 0.2
 * @property {number} Thick_skirt - 0.23
 * @property {number} Long_sleeve_dress_shirt - 0.25
 * @property {number} Long_sleeve_flannel_shirt - 0.34
 * @property {number} Long_sleeve_sweat_shirt - 0.34
 * @property {number} Short_sleeve_hospital_gown - 0.31
 * @property {number} Short_sleeve_short_robe_thin - 0.34
 * @property {number} Short_sleeve_pajamas - 0.42
 * @property {number} Long_sleeve_long_gown - 0.46
 * @property {number} Long_sleeve_short_wrap_robe_thick - 0.48
 * @property {number} Long_sleeve_pajamas_thick - 0.57
 * @property {number} Long_sleeve_long_wrap_robe_thick - 0.69
 * @property {number} Thin_trousers - 0.15
 * @property {number} Thick_trousers - 0.24
 * @property {number} Sweatpants - 0.28
 * @property {number} Overalls - 0.3
 * @property {number} Coveralls - 0.49
 * @property {number} Thin_skirt - 0.14
 * @property {number} Long_sleeve_shirt_dress_thin - 0.33
 * @property {number} Long_sleeve_shirt_dress_thick - 0.47
 * @property {number} Short_sleeve_shirt_dress - 0.29
 * @property {number} Sleeveless_scoop_neck_shirt_thin - 0.23
 * @property {number} Sleeveless_scoop_neck_shirt_thick - 0.27
 * @property {number} Long_sleeve_shirt_thin - 0.25
 * @property {number} Long_sleeve_shirt_thick - 0.36
 * @property {number} Single_breasted_coat_thin - 0.36
 * @property {number} Single_breasted_coat_thick - 0.44
 * @property {number} Double_breasted_coat_thin - 0.42
 * @property {number} Double_breasted_coat_thick - 0.48
 * @example
 * import { clo_individual_garments } from "jsthermalcomfort/utilities"; //The path to utilities
 * console.log(clo_individual_garments['Metal_chair']);
 * // output 0.0
 */
exports.clo_individual_garments = {
    Metal_chair: 0.0,
    Bra: 0.01,
    Wooden_stool: 0.01,
    Ankle_socks: 0.02,
    Shoes_or_sandals: 0.02,
    Slippers: 0.03,
    Panty_hose: 0.02,
    Calf_length_socks: 0.03,
    Women_underwear: 0.03,
    Men_underwear: 0.04,
    Knee_socks_thick: 0.06,
    Short_shorts: 0.06,
    Walking_shorts: 0.08,
    T_shirt: 0.08,
    Standard_office_chair: 0.1,
    Executive_chair: 0.15,
    Boots: 0.1,
    Sleeveless_scoop_neck_blouse: 0.12,
    Half_slip: 0.14,
    Long_underwear_bottoms: 0.15,
    Full_slip: 0.16,
    Short_sleeve_knit_shirt: 0.17,
    Sleeveless_vest_thin: 0.1,
    Sleeveless_vest_thick: 0.17,
    Sleeveless_short_gown_thin: 0.18,
    Short_sleeve_dress_shirt: 0.19,
    Sleeveless_long_gown_thin: 0.2,
    Long_underwear_top: 0.2,
    Thick_skirt: 0.23,
    Long_sleeve_dress_shirt: 0.25,
    Long_sleeve_flannel_shirt: 0.34,
    Long_sleeve_sweat_shirt: 0.34,
    Short_sleeve_hospital_gown: 0.31,
    Short_sleeve_short_robe_thin: 0.34,
    Short_sleeve_pajamas: 0.42,
    Long_sleeve_long_gown: 0.46,
    Long_sleeve_short_wrap_robe_thick: 0.48,
    Long_sleeve_pajamas_thick: 0.57,
    Long_sleeve_long_wrap_robe_thick: 0.69,
    Thin_trousers: 0.15,
    Thick_trousers: 0.24,
    Sweatpants: 0.28,
    Overalls: 0.3,
    Coveralls: 0.49,
    Thin_skirt: 0.14,
    Long_sleeve_shirt_dress_thin: 0.33,
    Long_sleeve_shirt_dress_thick: 0.47,
    Short_sleeve_shirt_dress: 0.29,
    Sleeveless_scoop_neck_shirt_thin: 0.23,
    Sleeveless_scoop_neck_shirt_thick: 0.27,
    Long_sleeve_shirt_thin: 0.25,
    Long_sleeve_shirt_thick: 0.36,
    Single_breasted_coat_thin: 0.36,
    Single_breasted_coat_thick: 0.44,
    Double_breasted_coat_thin: 0.42,
    Double_breasted_coat_thick: 0.48,
};
