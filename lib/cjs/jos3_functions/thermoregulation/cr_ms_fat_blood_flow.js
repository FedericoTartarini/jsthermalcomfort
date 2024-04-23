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
exports.cr_ms_fat_blood_flow = void 0;
const JOS3Defaults_js_1 = __importDefault(require("../JOS3Defaults.js"));
const bfb_rate_js_1 = require("../bfb_rate.js");
const matrix_js_1 = require("../matrix.js");
const math = __importStar(require("mathjs"));
/**
 * @typedef CrMsFatBloodFlowResult
 * @type {object}
 * @property {math.MathCollection} bf_core - Core blood flow rate [L/h].
 * @property {math.MathCollection} bf_muscle - Muscle blood flow rate [L/h].
 * @property {math.MathCollection} bf_fat - Fat blood flow rate [L/h].
 */
/**
 * Calculate core, muscle and fat blood flow rate [L/h].
 *
 * @param {math.MathCollection} q_work - Heat production by work [W].
 * @param {math.MathCollection} q_shiv - Heat production by shivering [W].
 * @param {number} [height=1.72] - Body height [m].
 * @param {number} [weight=74.43] - Body weight [kg].
 * @param {string} [bsa_equation="dubois"] - The equation name of bsa calculation. Choose from "dubois","takahira", "fujimoto", or "kurazumi".
 * @param {number} [age=20] - Age [years].
 * @param {number} [ci=2.59] - Cardiac index [L/min/㎡].
 *
 * @returns {CrMsFatBloodFlowResult} - Core, muscle and fat blood flow rate [L/h].
 */
function cr_ms_fat_blood_flow(q_work, q_shiv, height = JOS3Defaults_js_1.default.height, weight = JOS3Defaults_js_1.default.weight, bsa_equation = JOS3Defaults_js_1.default.bsa_equation, age = JOS3Defaults_js_1.default.age, ci = JOS3Defaults_js_1.default.cardiac_index) {
    // Basal blood flow rate [L/h]
    // core, CBFB
    let bfb_core = math.matrix([
        35.251, 15.24, 89.214, 87.663, 18.686, 1.808, 0.94, 0.217, 1.808, 0.94,
        0.217, 1.406, 0.164, 0.08, 1.406, 0.164, 0.08,
    ]);
    // muscle, MSBFB
    let bfb_muscle = math.matrix([
        0.682, 0.0, 0.0, 0.0, 12.614, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0,
    ]);
    // fat, FTBFB
    let bfb_fat = math.matrix([
        0.265, 0.0, 0.0, 0.0, 2.219, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0,
    ]);
    let bfbrate = (0, bfb_rate_js_1.bfb_rate)(height, weight, bsa_equation, age, ci);
    let bf_core = math.dotMultiply(bfb_core, bfbrate);
    let bf_muscle = math.dotMultiply(bfb_muscle, bfbrate);
    let bf_fat = math.dotMultiply(bfb_fat, bfbrate);
    for (let i = 0; i < matrix_js_1.BODY_NAMES.length; i++) {
        let bn = matrix_js_1.BODY_NAMES[i];
        if (matrix_js_1.IDICT[bn]["muscle"] !== null) {
            bf_muscle.set([i], bf_muscle.get([i]) + (q_work.get([i]) + q_shiv.get([i])) / 1.163);
        }
        else {
            bf_core.set([i], bf_core.get([i]) + (q_work.get([i]) + q_shiv.get([i])) / 1.163);
        }
    }
    return { bf_core, bf_muscle, bf_fat };
}
exports.cr_ms_fat_blood_flow = cr_ms_fat_blood_flow;
