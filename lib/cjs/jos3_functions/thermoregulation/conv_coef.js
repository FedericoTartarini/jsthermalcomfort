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
exports.conv_coef = void 0;
const JOS3Defaults_js_1 = __importDefault(require("../JOS3Defaults.js"));
const math = __importStar(require("mathjs"));
/**
 * Calculate convective heat transfer coefficient (hc) [W/(m2*K)]
 *
 * @param {string} [posture=JOS3Defaults.posture] - Select posture from standing, sitting, lying, sedentary or supine. The default is "standing".
 * @param {math.Matrix} [v=JOS3Defaults.air_speed] - Air velocity [m/s]. If Iterable is input, its length should be 17. The default is 0.1.
 * @param {math.Matrix} [tdb=JOS3Defaults.dry_bulb_air_temperature] - Air temperature [°C]. If Iterable is input, its length should be 17. The default is 28.8.
 * @param {math.Matrix} [t_skin=JOS3Defaults.skin_temperature] - Skin temperature [°C]. If Iterable is input, its length should be 17. The default is 34.0.
 *
 * @returns {math.Matrix} Convective heat transfer coefficient (hc) [W/(m2*K)].
 *
 * @see {@link https://doi.org/10.3130/aija.62.45_5 | Ichihara et al., 1997}
 * @see {@link https://doi.org/10.20718/jjpa.13.1_17 | Kurazumi et al., 2008}
 */
function conv_coef(posture = JOS3Defaults_js_1.default.posture, v = math.multiply(math.ones(17), JOS3Defaults_js_1.default.air_speed), tdb = math.multiply(math.ones(17), JOS3Defaults_js_1.default.dry_bulb_air_temperature), t_skin = math.multiply(math.ones(17), JOS3Defaults_js_1.default.skin_temperature)) {
    // Convert v to math.matrix
    v = math.isMatrix(v) ? v : math.matrix(v);
    /**
     * Natural convection
     *
     * @param {string} posture
     * @param {math.Matrix} tdb
     * @param {math.Matrix} t_skin
     *
     * @return {math.Matrix}
     */
    const natural_convection = (posture, tdb, t_skin) => {
        posture = posture.toLowerCase();
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
        let hc_natural;
        switch (posture) {
            case "standing":
                // Ichihara et al., 1997, https://doi.org/10.3130/aija.62.45_5
                hc_natural = math.matrix([
                    4.48, 4.48, 2.97, 2.91, 2.85, 3.61, 3.55, 3.67, 3.61, 3.55, 3.67, 2.8,
                    2.04, 2.04, 2.8, 2.04, 2.04,
                ]);
                break;
            case "sitting":
            case "sedentary":
                // Ichihara et al., 1997, https://doi.org/10.3130/aija.62.45_5
                hc_natural = math.matrix([
                    4.75, 4.75, 3.12, 2.48, 1.84, 3.76, 3.62, 2.06, 3.76, 3.62, 2.06,
                    2.98, 2.98, 2.62, 2.98, 2.98, 2.62,
                ]);
                break;
            case "lying":
            case "supine":
                // Kurazumi et al., 2008, https://doi.org/10.20718/jjpa.13.1_17
                // The values are applied under cold environment.
                let hc_a = math.matrix([
                    1.105, 1.105, 1.211, 1.211, 1.211, 0.913, 2.081, 2.178, 0.913, 2.081,
                    2.178, 0.945, 0.385, 0.2, 0.945, 0.385, 0.2,
                ]);
                let hc_b = math.matrix([
                    0.345, 0.345, 0.046, 0.046, 0.046, 0.373, 0.85, 0.297, 0.373, 0.85,
                    0.297, 0.447, 0.58, 0.966, 0.447, 0.58, 0.966,
                ]);
                hc_natural = math.dotMultiply(hc_a, math.dotPow(math.abs(math.subtract(tdb, t_skin)), hc_b));
                break;
        }
        return hc_natural;
    };
    /**
     * Forced convection
     *
     * @param v {math.Matrix}
     *
     * @return {math.Matrix}
     */
    const forced_convection = (v) => {
        // Ichihara et al., 1997, https://doi.org/10.3130/aija.62.45_5
        let hc_a = math.matrix([
            15.0, 15.0, 11.0, 17.0, 13.0, 17.0, 17.0, 20.0, 17.0, 17.0, 20.0, 14.0,
            15.8, 15.1, 14.0, 15.8, 15.1,
        ]);
        let hc_b = math.matrix([
            0.62, 0.62, 0.67, 0.49, 0.6, 0.59, 0.61, 0.6, 0.59, 0.61, 0.6, 0.61, 0.74,
            0.62, 0.61, 0.74, 0.62,
        ]);
        return math.dotMultiply(hc_a, math.dotPow(v, hc_b));
    };
    let hc_natural = natural_convection(posture, tdb, t_skin);
    let hc_forced = forced_convection(v);
    return v.map((z, idx) => z < 0.2 ? hc_natural.get(idx) : hc_forced.get(idx));
}
exports.conv_coef = conv_coef;
