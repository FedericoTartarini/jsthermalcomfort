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
exports.operative_temp = void 0;
const supa_js_1 = require("../../supa.js");
const math = __importStar(require("mathjs"));
/**
 * Calculate operative temperature [°C]
 *
 * @param {math.MathCollection} tdb - Air temperature [°C]
 * @param {math.MathCollection} tr - Mean radiant temperature [°C]
 * @param {math.MathCollection} hc - Convective heat transfer coefficient [W/(m2*K)]
 * @param {math.MathCollection} hr - Radiative heat transfer coefficient [W/(m2*K)]

 * @returns {math.MathCollection} Operative temperature [°C]
 */
function operative_temp(tdb, tr, hc, hr) {
    return math.dotDivide(math.add(math.dotMultiply(hc, tdb), math.dotMultiply(hr, tr)), math.add(hc, hr));
}
exports.operative_temp = operative_temp;
