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
exports.ava_blood_flow = void 0;
const supa_js_1 = require("../../supa.js");
const JOS3Defaults_js_1 = __importDefault(require("../JOS3Defaults.js"));
const bfb_rate_js_1 = require("../bfb_rate.js");
const math = __importStar(require("mathjs"));
/**
 * @typedef AvaBloodFlowResult
 * @type {object}
 * @property {number} bf_ava_hand - AVA blood flow rate at hand [L/h].
 * @property {number} bf_ava_foot - AVA blood flow rate at foot [L/h].
 */
/**
 * Calculate areteriovenous anastmoses (AVA) blood flow rate [L/h] based on
 * Takemori's model, 1995.
 *
 * @param {math.MathCollection} err_cr - Difference between set-point and body temperatures [°C].
 * @param {math.MathCollection} err_sk - Difference between set-point and body temperatures [°C].
 * @param {number} [height=1.72] - Body height [m]
 * @param {number} [weight=74.43] - Body weight [kg]
 * @param {string} [bsa_equation="dubois"] - The equation name of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi"
 * @param {number} [age=20] - age [years]
 * @param {number} [ci=2.59] - Cardiac index [L/min/m2]
 *
 * @returns {AvaBloodFlowResult} AVA blood flow rate at hand and foot [L/h]
 */
function ava_blood_flow(err_cr, err_sk, height = JOS3Defaults_js_1.default.height, weight = JOS3Defaults_js_1.default.weight, bsa_equation = JOS3Defaults_js_1.default.bsa_equation, age = JOS3Defaults_js_1.default.age, ci = JOS3Defaults_js_1.default.cardiac_index) {
    // Cal. mean error body core temp.
    let cap_bcr = [10.2975, 9.3935, 4.488];
    let err_bcr = math.sum(math.dotMultiply(err_cr.subset(math.index(math.range(2, 5))), cap_bcr)) / math.sum(cap_bcr);
    // Cal. mean error skin temp.
    let err_msk = math.sum(math.dotMultiply(err_sk, JOS3Defaults_js_1.default.local_bsa)) /
        math.sum(JOS3Defaults_js_1.default.local_bsa);
    // Openness of AVA [-]
    let sig_ava_hand = 0.265 * (err_msk + 0.43) + 0.953 * (err_bcr + 0.1905) + 0.9126;
    let sig_ava_foot = 0.265 * (err_msk - 0.997) + 0.953 * (err_bcr + 0.0095) + 0.9126;
    sig_ava_hand = Math.min(sig_ava_hand, 1);
    sig_ava_hand = Math.max(sig_ava_hand, 0);
    sig_ava_foot = Math.min(sig_ava_foot, 1);
    sig_ava_foot = Math.max(sig_ava_foot, 0);
    // Basal blood flow rate to the standard body [-]
    let bfbrate = (0, bfb_rate_js_1.bfb_rate)(height, weight, bsa_equation, age, ci);
    // AVA blood flow rate [L/h]
    let bf_ava_hand = 1.71 * bfbrate * sig_ava_hand;
    let bf_ava_foot = 2.16 * bfbrate * sig_ava_foot;
    return { bf_ava_hand, bf_ava_foot };
}
exports.ava_blood_flow = ava_blood_flow;
