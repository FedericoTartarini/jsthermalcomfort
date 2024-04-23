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
exports.dry_r = void 0;
const clo_area_factor_js_1 = require("./clo_area_factor.js");
const math = __importStar(require("mathjs"));
/**
 * Calculate total sensible thermal resistance (between the skin and ambient air).
 *
 * @param {math.Matrix} hc - Convective heat transfer coefficient (hc) [W/(m2*K)].
 * @param {math.Matrix} hr - Radiative heat transfer coefficient (hr) [W/(m2*K)].
 * @param {math.Matrix} clo - Clothing insulation [clo].
 *
 * @returns {math.Matrix} Total sensible thermal resistance between skin and ambient.
 */
function dry_r(hc, hr, clo) {
    if (hc.toArray().some((x) => x < 0) || hr.toArray().some((x) => x < 0)) {
        throw new Error("Input parameters hc and hr must be non-negative.");
    }
    let fcl = (0, clo_area_factor_js_1.clo_area_factor)(clo);
    let r_a = math.dotDivide(1, math.add(hc, hr));
    let r_cl = math.dotMultiply(0.155, clo);
    return math.add(math.dotDivide(r_a, fcl), r_cl);
}
exports.dry_r = dry_r;
