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
exports.shivering = exports.set_pre_shiv = exports.PRE_SHIV = void 0;
const JOS3Defaults_js_1 = __importDefault(require("../JOS3Defaults.js"));
const error_signals_js_1 = require("./error_signals.js");
const bsa_rate_js_1 = require("../bsa_rate.js");
const math = __importStar(require("mathjs"));
exports.PRE_SHIV = 0;
/**
 * Sets the value of PRE_SHIV.
 *
 * @param {number} value - the value to set PRE_SHIV to
 */
function set_pre_shiv(value) {
    exports.PRE_SHIV = value;
}
exports.set_pre_shiv = set_pre_shiv;
/**
 * Calculate local thermogenesis by shivering [W].
 *
 * @param {math.MathCollection} err_cr - Difference between set-point and body temperatures [°C].
 * @param {math.MathCollection} err_sk - Difference between set-point and body temperatures [°C].
 * @param {math.MathCollection} t_core - Core and skin temperatures [°C].
 * @param {math.MathCollection} t_skin - Core and skin temperatures [°C].
 * @param {number} [height=1.72] - Body height [m].
 * @param {number} [weight=74.43] - Body weight [kg].
 * @param {string} [bsa_equation="dubois"] - The equation name (str) of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi".
 * @param {number} [age=20] - age [years].
 * @param {string} [sex="male"] - Choose male or female.
 * @param {number} [dtime=60] - Interval of analysis time.
 * @param {object} options - Additional options.
 *
 * @returns {math.MathCollection} q_shiv - Local thermogenesis by shivering [W].
 */
function shivering(err_cr, err_sk, t_core, t_skin, height = JOS3Defaults_js_1.default.height, weight = JOS3Defaults_js_1.default.weight, bsa_equation = JOS3Defaults_js_1.default.bsa_equation, age = JOS3Defaults_js_1.default.age, sex = JOS3Defaults_js_1.default.sex, dtime = 60, options = {}) {
    // Integrated error signal in the warm and cold receptors
    let { clds } = (0, error_signals_js_1.error_signals)(err_sk);
    // Distribution coefficient of thermogenesis by shivering
    let shivf = math.matrix([
        0.0339, 0.0436, 0.27394, 0.24102, 0.38754, 0.00243, 0.00137, 0.0002,
        0.00243, 0.00137, 0.0002, 0.0039, 0.00175, 0.00035, 0.0039, 0.00175,
        0.00035,
    ]);
    // Integrated error signal of shivering
    let sig_shiv = 24.36 * clds * -err_cr.get([0]);
    sig_shiv = Math.max(sig_shiv, 0);
    if (options["shivering_threshold"]) {
        // Asaka, 2016
        // Threshold of starting shivering
        let tskm = math.sum(math.dotMultiply(t_skin, JOS3Defaults_js_1.default.local_bsa)) /
            math.sum(JOS3Defaults_js_1.default.local_bsa);
        let thres;
        if (tskm < 31) {
            thres = 36.6;
        }
        else {
            thres = sex === "male" ? -0.2436 * tskm + 44.1 : -0.225 * tskm + 43.05;
        }
        // Second threshold of starting shivering
        if (thres < t_core.get([0])) {
            sig_shiv = 0;
        }
    }
    if (options["limit_dshiv/dt"]) {
        let dshiv = sig_shiv - exports.PRE_SHIV;
        let limit_dshiv = options["limit_dshiv/dt"] === true
            ? 0.0077 * dtime
            : options["limit_dshiv/dt"] * dtime;
        if (dshiv > limit_dshiv) {
            sig_shiv = limit_dshiv + exports.PRE_SHIV;
        }
        else if (dshiv < -limit_dshiv) {
            sig_shiv = -limit_dshiv + exports.PRE_SHIV;
        }
    }
    exports.PRE_SHIV = sig_shiv;
    // Signal sd_shiv by aging
    let sd_shiv;
    if (age < 30) {
        sd_shiv = math.ones(17);
    }
    else if (age < 40) {
        sd_shiv = math.multiply(math.ones(17), 0.97514);
    }
    else if (age < 50) {
        sd_shiv = math.multiply(math.ones(17), 0.95028);
    }
    else if (age < 60) {
        sd_shiv = math.multiply(math.ones(17), 0.92818);
    }
    else if (age < 70) {
        sd_shiv = math.multiply(math.ones(17), 0.90055);
    }
    else if (age < 80) {
        sd_shiv = math.multiply(math.ones(17), 0.86188);
    }
    else {
        sd_shiv = math.multiply(math.ones(17), 0.82597);
    }
    // Ratio of body surface area to the standard body [-]
    let bsar = (0, bsa_rate_js_1.bsa_rate)(height, weight, bsa_equation);
    // Local thermogenesis by shivering [W]
    let q_shiv = math.dotMultiply(math.dotMultiply(math.dotMultiply(shivf, bsar), sd_shiv), sig_shiv);
    let x = q_shiv + 1;
    return q_shiv;
}
exports.shivering = shivering;
