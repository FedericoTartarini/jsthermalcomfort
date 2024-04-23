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
exports.fixed_hc = void 0;
const JOS3Defaults_js_1 = __importDefault(require("../JOS3Defaults.js"));
const math = __importStar(require("mathjs"));
/**
 * Fixes hc values to fit two-node-model's values.
 */
function fixed_hc(hc, v) {
    const local_bsa_sum = math.sum(JOS3Defaults_js_1.default.local_bsa);
    let mean_hc = math.sum(math.dotMultiply(hc, JOS3Defaults_js_1.default.local_bsa)) / local_bsa_sum;
    let mean_va = math.sum(math.dotMultiply(v, JOS3Defaults_js_1.default.local_bsa)) / local_bsa_sum;
    let mean_hc_whole = Math.max(3, 8.600001 * Math.pow(mean_va, 0.53));
    return math.dotDivide(math.dotMultiply(hc, mean_hc_whole), mean_hc);
}
exports.fixed_hc = fixed_hc;
