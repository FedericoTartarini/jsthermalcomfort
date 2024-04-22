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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sum_m = void 0;
const matrix_js_1 = require("../matrix.js");
const math = __importStar(require("mathjs"));
/**
 * @typedef SumMResult
 * @type {object}
 * @property {math.MathCollection} q_thermogenesis_core - Total thermogenesis in core layer [W].
 * @property {math.MathCollection} q_thermogenesis_muscle - Total thermogenesis in muscle layer [W].
 * @property {math.MathCollection} q_thermogenesis_fat - Total thermogenesis in fat layer [W].
 * @property {math.MathCollection} q_thermogenesis_skin - Total thermogenesis in skin layer [W].
 */
/**
 * Calculate total thermogenesis in each layer [W].
 *
 * @param {[math.MathCollection, math.MathCollection, math.MathCollection, math.MathCollection]} mbase - Local basal metabolic rate (Mbase) [W].
 * @param {math.MathCollection} q_work - Local thermogenesis by work [W].
 * @param {math.MathCollection} q_shiv - Local thermogenesis by shivering [W].
 * @param {math.MathCollection} q_nst - Local thermogenesis by non-shivering [W].
 *
 * @return {SumMResult} Total thermogenesis in core, muscle, fat, skin layers [W].
 */
function sum_m(mbase, q_work, q_shiv, q_nst) {
    let [q_thermogenesis_core, q_thermogenesis_muscle, q_thermogenesis_fat, q_thermogenesis_skin,] = mbase;
    for (let i = 0; i < matrix_js_1.BODY_NAMES.length; i++) {
        let bn = matrix_js_1.BODY_NAMES[i];
        if (matrix_js_1.IDICT[bn]["muscle"] !== null) {
            q_thermogenesis_muscle.set([i], q_thermogenesis_muscle.get([i]) + q_work.get([i]) + q_shiv.get([i]));
        }
        else {
            q_thermogenesis_core.set([i], q_thermogenesis_core.get([i]) + q_work.get([i]) + q_shiv.get([i]));
        }
    }
    q_thermogenesis_core = math.add(q_thermogenesis_core, q_nst);
    return {
        q_thermogenesis_core,
        q_thermogenesis_muscle,
        q_thermogenesis_fat,
        q_thermogenesis_skin,
    };
}
exports.sum_m = sum_m;
