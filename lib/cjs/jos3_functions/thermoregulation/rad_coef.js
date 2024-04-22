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
exports.rad_coef = void 0;
const JOS3Defaults_js_1 = __importDefault(require("../JOS3Defaults.js"));
const math = __importStar(require("mathjs"));
/**
 * Calculate radiative heat transfer coefficient (hr) [W/(m2*K)]
 *
 * @param {string} posture - Select posture from standing, sitting, lying, sedentary or supine. Default is "standing".
 *
 * @returns {math.Matrix} hr - Radiative heat transfer coefficient (hr) [W/(m2*K)].
 */
function rad_coef(posture = JOS3Defaults_js_1.default.posture) {
    const valid_postures = [
        "standing",
        "sitting",
        "lying",
        "sedentary",
        "supine",
    ];
    if (!valid_postures.includes(posture)) {
        let postures = valid_postures.join(", ");
        throw new Error(`Invalid posture ${posture}. Must be one of ${postures}.`);
    }
    switch (posture) {
        case "standing":
            // Ichihara et al., 1997, https://doi.org/10.3130/aija.62.45_5
            return math.matrix([
                4.89, 4.89, 4.32, 4.09, 4.32, 4.55, 4.43, 4.21, 4.55, 4.43, 4.21, 4.77,
                5.34, 6.14, 4.77, 5.34, 6.14,
            ]);
        case "sitting":
        case "sedentary":
            // Ichihara et al., 1997, https://doi.org/10.3130/aija.62.45_5
            return math.matrix([
                4.96, 4.96, 3.99, 4.64, 4.21, 4.96, 4.21, 4.74, 4.96, 4.21, 4.74, 4.1,
                4.74, 6.36, 4.1, 4.74, 6.36,
            ]);
        case "lying":
        case "supine":
            // Kurazumi et al., 2008, https://doi.org/10.20718/jjpa.13.1_17
            return math.matrix([
                5.475, 5.475, 3.463, 3.463, 3.463, 4.249, 4.835, 4.119, 4.249, 4.835,
                4.119, 4.44, 5.547, 6.085, 4.44, 5.547, 6.085,
            ]);
    }
}
exports.rad_coef = rad_coef;
