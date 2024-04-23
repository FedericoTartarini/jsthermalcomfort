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
exports.nonshivering = void 0;
const JOS3Defaults_js_1 = __importDefault(require("../JOS3Defaults.js"));
const error_signals_js_1 = require("./error_signals.js");
const bsa_rate_js_1 = require("../bsa_rate.js");
const math = __importStar(require("mathjs"));
/**
 * Calculate local metabolic rate by non-shivering [W]
 *
 * @param {math.MathCollection} err_sk - Difference between set-point and body temperatures [°C].
 * @param {number} [height=1.72] - Body height [m].
 * @param {number} [weight=74.43] - Body weight [kg].
 * @param {string} [bsa_equation="dubois"] - The equation name (str) of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi".
 * @param {number} [age=20] - age [years].
 * @param {boolean} [cold_acclimation=false] - Whether the subject acclimates cold environment or not.
 * @param {boolean} [batpositive=true] - Whether BAT activity is positive or not.
 *
 * @returns {math.MathCollection} q_nst - Local metabolic rate by non-shivering [W].
 */
function nonshivering(err_sk, height = JOS3Defaults_js_1.default.height, weight = JOS3Defaults_js_1.default.weight, bsa_equation = JOS3Defaults_js_1.default.bsa_equation, age = JOS3Defaults_js_1.default.age, cold_acclimation = false, batpositive = true) {
    // NST (Non-Shivering Thermogenesis) model, Asaka, 2016
    let { clds } = (0, error_signals_js_1.error_signals)(err_sk);
    // BMI (Body Mass Index)
    let bmi = weight / Math.pow(height, 2);
    // BAT: brown adipose tissue [SUV]
    let bat = Math.pow(10, (-0.10502 * bmi + 2.7708));
    if (age < 30) {
        bat *= 1.61;
    }
    else if (age < 40) {
        bat *= 1.0;
    }
    else {
        bat *= 0.8;
    }
    if (cold_acclimation) {
        bat += 3.46;
    }
    if (!batpositive) {
        // incidence age factor: T.Yoneshiro 2011
        if (age < 30) {
            bat *= 44 / 83;
        }
        else if (age < 40) {
            bat *= 15 / 38;
        }
        else if (age < 50) {
            bat *= 7 / 26;
        }
        else if (age < 60) {
            bat *= 1 / 8;
        }
        else {
            bat *= 0;
        }
    }
    // NST limit
    let thres = 1.8 * bat + 2.43 + 5.62; // [W]
    let sig_nst = 2.8 * clds; // [W]
    sig_nst = Math.min(sig_nst, thres);
    let nstf = math.matrix([
        0.0, 0.19, 0.0, 0.19, 0.19, 0.215, 0.0, 0.0, 0.215, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0,
    ]);
    let bsar = (0, bsa_rate_js_1.bsa_rate)(height, weight, bsa_equation);
    return math.dotMultiply(math.dotMultiply(bsar, nstf), sig_nst);
}
exports.nonshivering = nonshivering;
