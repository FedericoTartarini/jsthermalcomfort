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
exports.fixed_hr = void 0;
const JOS3Defaults_js_1 = __importDefault(require("../JOS3Defaults.js"));
const math = __importStar(require("mathjs"));
/**
 * Fixes hr values to fit two-node-model's values.
 *
 * @param {math.MathCollection} hr
 * @return {math.Matrix}
 */
function fixed_hr(hr) {
    let mean_hr = math.sum(math.dotMultiply(hr, JOS3Defaults_js_1.default.local_bsa)) /
        math.sum(JOS3Defaults_js_1.default.local_bsa);
    return math.dotDivide(math.dotMultiply(hr, 4.7), mean_hr);
}
exports.fixed_hr = fixed_hr;
