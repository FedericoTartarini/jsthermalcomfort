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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wet_r = wet_r;
const JOS3Defaults_js_1 = __importDefault(require("../JOS3Defaults.js"));
const clo_area_factor_js_1 = require("./clo_area_factor.js");
const math = __importStar(require("mathjs"));
/**
 * Calculate total evaporative thermal resistance (between the skin and ambient air).
 *
 * @param {math.Matrix} hc - Convective heat transfer coefficient (hc) [W/(m2*K)].
 * @param {math.Matrix} clo - Clothing insulation [clo].
 * @param {number | math.Matrix} [i_clo=0.45] - Clothing vapor permeation efficiency [-].
 * @param {number} [lewis_rate=16.5] - Lewis rate [K/kPa].
 *
 * @returns {math.Matrix} r_et - Total evaporative thermal resistance.
 */
function wet_r(hc, clo, i_clo = JOS3Defaults_js_1.default.clothing_vapor_permeation_efficiency, lewis_rate = JOS3Defaults_js_1.default.lewis_rate) {
    if (hc.toArray().some((hc) => hc < 0)) {
        throw new Error("Input parameter hc must be non-negative.");
    }
    let fcl = (0, clo_area_factor_js_1.clo_area_factor)(clo);
    let r_cl = math.dotMultiply(0.155, clo);
    let r_ea = math.dotDivide(1, math.dotMultiply(lewis_rate, hc));
    let r_ecl = math.dotDivide(r_cl, math.multiply(i_clo, lewis_rate));
    return math.add(math.dotDivide(r_ea, fcl), r_ecl);
}
