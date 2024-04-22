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
exports.local_mbase = void 0;
const JOS3Defaults_js_1 = __importDefault(require("../JOS3Defaults.js"));
const basal_met_js_1 = require("./basal_met.js");
const math = __importStar(require("mathjs"));
/**
 * Calculate local basal metabolic rate [W].
 *
 * @param {number} [height=1.72] - Body height [m].
 * @param {number} [weight=74.43] - Body weight [kg].
 * @param {number} [age=20] - Age [years].
 * @param {string} [sex='male'] - Sex (male or female).
 * @param {string} [bmr_equation='harris-benedict'] - BMR equation to use (harris-benedict or ganpule).
 *
 * @returns {[math.MathCollection, math.MathCollection, math.MathCollection, math.MathCollection]} mbase - Local basal metabolic rate (Mbase) [W].
 */
function local_mbase(height = JOS3Defaults_js_1.default.height, weight = JOS3Defaults_js_1.default.weight, age = JOS3Defaults_js_1.default.age, sex = JOS3Defaults_js_1.default.sex, bmr_equation = JOS3Defaults_js_1.default.bmr_equation) {
    let mbase_all = (0, basal_met_js_1.basal_met)(height, weight, age, sex, bmr_equation);
    let mbf_cr = math.matrix([
        0.19551, 0.00324, 0.28689, 0.25677, 0.09509, 0.01435, 0.00409, 0.00106,
        0.01435, 0.00409, 0.00106, 0.01557, 0.00422, 0.0025, 0.01557, 0.00422,
        0.0025,
    ]);
    let mbf_ms = math.matrix([
        0.00252, 0.0, 0.0, 0.0, 0.04804, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0,
    ]);
    let mbf_fat = math.matrix([
        0.00127, 0.0, 0.0, 0.0, 0.0095, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0,
    ]);
    let mbf_sk = math.matrix([
        0.00152, 0.00033, 0.00211, 0.00187, 0.003, 0.00059, 0.00031, 0.00059,
        0.00059, 0.00031, 0.00059, 0.00144, 0.00027, 0.00118, 0.00144, 0.00027,
        0.00118,
    ]);
    let mbase_cr = math.dotMultiply(mbf_cr, mbase_all);
    let mbase_ms = math.dotMultiply(mbf_ms, mbase_all);
    let mbase_fat = math.dotMultiply(mbf_fat, mbase_all);
    let mbase_sk = math.dotMultiply(mbf_sk, mbase_all);
    return [mbase_cr, mbase_ms, mbase_fat, mbase_sk];
}
exports.local_mbase = local_mbase;
