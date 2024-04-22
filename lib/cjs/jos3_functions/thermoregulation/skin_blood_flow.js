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
exports.skin_blood_flow = void 0;
const JOS3Defaults_js_1 = __importDefault(require("../JOS3Defaults.js"));
const error_signals_js_1 = require("./error_signals.js");
const bfb_rate_js_1 = require("../bfb_rate.js");
const math = __importStar(require("mathjs"));
/**
 * Calculate skin blood flow rate (bf_skin) [L/h].
 * @param {math.MathCollection} err_cr - Difference between set-point and body temperatures [°C].
 * @param {math.MathCollection} err_sk - Difference between set-point and body temperatures [°C].
 * @param {number} [height=1.72] - Body height [m].
 * @param {number} [weight=74.43] - Body weight [kg].
 * @param {string} [bsa_equation="dubois"] - The equation name of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi".
 * @param {number} [age=20] - age [years].
 * @param {number} [ci=2.59] - Cardiac index [L/min/㎡].
 *
 * @returns {math.MathCollection} bf_skin - Skin blood flow rate [L/h].
 */
function skin_blood_flow(err_cr, err_sk, height = JOS3Defaults_js_1.default.height, weight = JOS3Defaults_js_1.default.weight, bsa_equation = JOS3Defaults_js_1.default.bsa_equation, age = JOS3Defaults_js_1.default.age, ci = JOS3Defaults_js_1.default.cardiac_index) {
    let { wrms, clds } = (0, error_signals_js_1.error_signals)(err_sk);
    let bfb_sk = math.matrix([
        1.754, 0.325, 1.967, 1.475, 2.272, 0.91, 0.508, 1.114, 0.91, 0.508, 1.114,
        1.456, 0.651, 0.934, 1.456, 0.651, 0.934,
    ]);
    let skin_dilat = math.matrix([
        0.0692, 0.0992, 0.058, 0.0679, 0.0707, 0.04, 0.0373, 0.0632, 0.04, 0.0373,
        0.0632, 0.0736, 0.0411, 0.0623, 0.0736, 0.0411, 0.0623,
    ]);
    let skin_stric = math.matrix([
        0.0213, 0.0213, 0.0638, 0.0638, 0.0638, 0.0213, 0.0213, 0.1489, 0.0213,
        0.0213, 0.1489, 0.0213, 0.0213, 0.1489, 0.0213, 0.0213, 0.1489,
    ]);
    let sig_dilat = 100.5 * err_cr.get([0]) + 6.4 * (wrms - clds);
    sig_dilat = sig_dilat > 0 ? sig_dilat : 0;
    let sig_stric = -10.8 * err_cr.get([0]) + -10.8 * (wrms - clds);
    sig_stric = sig_stric > 0 ? sig_stric : 0;
    let sd_stric = math.ones(17);
    let sd_dilat = age < 60
        ? math.ones(17)
        : math.matrix([
            0.91, 0.91, 0.47, 0.47, 0.31, 0.47, 0.47, 0.47, 0.47, 0.47, 0.47,
            0.31, 0.31, 0.31, 0.31, 0.31, 0.31,
        ]);
    let bf_skin = math.dotMultiply(math.dotMultiply(math.dotDivide(math.add(1, math.multiply(math.dotMultiply(skin_dilat, sd_dilat), sig_dilat)), math.add(1, math.multiply(math.dotMultiply(skin_stric, sd_stric), sig_stric))), bfb_sk), math.dotPow(2, math.divide(err_sk, 6)));
    let bfb = (0, bfb_rate_js_1.bfb_rate)(height, weight, bsa_equation, age, ci);
    return math.dotMultiply(bf_skin, bfb);
}
exports.skin_blood_flow = skin_blood_flow;
