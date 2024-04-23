"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaporation = exports.antoine = void 0;
const JOS3Defaults_js_1 = __importDefault(require("../JOS3Defaults.js"));
const error_signals_js_1 = require("./error_signals.js");
const bsa_rate_js_1 = require("../bsa_rate.js");
const math = __importStar(require("mathjs"));
/**
 * Calculates the Antoine equation for a given temperature value.
 *
 * @param {number} x - The temperature value in Kelvin.
 * @returns {number} - The vapor pressure calculated using the Antoine equation.
 */
const antoine = (x) => Math.pow(Math.E, (16.6536 - 4030.183 / (x + 235)));
exports.antoine = antoine;
/**
 * @typedef EvaporationResult
 * @type {object}
 * @property {math.MathCollection} wet - Local skin wettedness [-].
 * @property {math.MathCollection} e_sk - Evaporative heat loss at the skin by sweating and diffuse [W].
 * @property {math.MathCollection} e_max - Maximum evaporative heat loss at the skin [W].
 * @property {math.MathCollection} e_sweat - Evaporative heat loss at the skin by only sweating [W].
 */
/**
 * Calculate evaporative heat loss.
 *
 * @param {math.MathCollection} err_cr - Difference between set-point and body temperatures [°C].
 * @param {math.MathCollection} err_sk - Difference between set-point and body temperatures [°C].
 * @param {math.MathCollection} t_skin - Skin temperatures [°C].
 * @param {math.MathCollection} tdb - Air temperatures at local body segments [°C].
 * @param {math.MathCollection} rh - Relative humidity at local body segments [%].
 * @param {math.MathCollection} ret - Total evaporative thermal resistances [m2.K/W].
 * @param {number} [height=1.72] - Body height [m].
 * @param {number} [weight=74.43] - Body weight [kg].
 * @param {string} [bsa_equation="dubois"] - The equation name (str) of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi".
 * @param {number} [age=20] - age [years].
 *
 * @returns {EvaporationResult} an object containing the results of the calculation.
 */
function evaporation(err_cr, err_sk, t_skin, tdb, rh, ret, height = JOS3Defaults_js_1.default.height, weight = JOS3Defaults_js_1.default.weight, bsa_equation = JOS3Defaults_js_1.default.bsa_equation, age = JOS3Defaults_js_1.default.age) {
    let { wrms, clds } = (0, error_signals_js_1.error_signals)(err_sk);
    let bsar = (0, bsa_rate_js_1.bsa_rate)(height, weight, bsa_equation);
    let bsa = math.dotMultiply(JOS3Defaults_js_1.default.local_bsa, bsar);
    let p_a = math.dotDivide(math.dotMultiply(tdb.map(exports.antoine), rh), 100);
    let p_sk_s = t_skin.map(exports.antoine);
    let e_max = math.dotMultiply(math.dotDivide(math.subtract(p_sk_s, p_a), ret), bsa);
    e_max = e_max.map((e_max) => (e_max === 0 ? 0.001 : e_max));
    let skin_sweat = [
        0.064, 0.017, 0.146, 0.129, 0.206, 0.051, 0.026, 0.0155, 0.051, 0.026,
        0.0155, 0.073, 0.036, 0.0175, 0.073, 0.036, 0.0175,
    ];
    let sig_sweat = 371.2 * err_cr.get([0]) + 33.64 * (wrms - clds);
    sig_sweat = sig_sweat > 0 ? sig_sweat : 0;
    sig_sweat *= bsar;
    let sd_sweat = age < 60
        ? math.ones(17)
        : math.matrix([
            0.69, 0.69, 0.59, 0.52, 0.4, 0.75, 0.75, 0.75, 0.75, 0.75, 0.75, 0.4,
            0.4, 0.4, 0.4, 0.4, 0.4,
        ]);
    let e_sweat = math.multiply(skin_sweat, sig_sweat, sd_sweat, math.dotPow(2, math.divide(err_sk, 10)));
    let wet = math.add(0.06, math.multiply(0.94, math.dotDivide(e_sweat, e_max)));
    wet = wet.map((n) => (n > 1 ? 1 : n));
    let e_sk = math.dotMultiply(wet, e_max);
    e_sweat = math.dotMultiply(math.divide(math.subtract(wet, 0.06), 0.94), e_max);
    return { wet, e_sk, e_max, e_sweat };
}
exports.evaporation = evaporation;
