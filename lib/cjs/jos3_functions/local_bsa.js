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
exports.local_bsa = void 0;
const JOS3Defaults_js_1 = __importDefault(require("./JOS3Defaults.js"));
const validate_body_parameters_js_1 = require("./validate_body_parameters.js");
const bsa_rate_js_1 = require("./bsa_rate.js");
const math = __importStar(require("mathjs"));
/**
 * Calculate local body surface area (bsa) [m2].
 *
 * The local body surface area has been derived from 65MN.
 * The head have been divided to head and neck based on Smith's model.
 *     head = 0.1396*0.1117/0.1414 (65MN_Head * Smith_Head / Smith_Head+neck)
 *     neck = 0.1396*0.0297/0.1414 (65MN_Head * Smith_Neck / Smith_Head+neck)
 *
 * @param {number} [height=JOS3Defaults.height] - Body height [m]
 * @param {number} [weight=JOS3Defaults.weight] - Body weight [kg]
 * @param {string} [bsa_equation=JOS3Defaults.bsa_equation] - The equation name
 * of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto",
 * or "kurazumi".
 *
 * @returns {math.Matrix}  local_bsa of length 17 - Local body surface area (bsa) [m2]
 */
function local_bsa(height = JOS3Defaults_js_1.default.height, weight = JOS3Defaults_js_1.default.weight, bsa_equation = JOS3Defaults_js_1.default.bsa_equation) {
    (0, validate_body_parameters_js_1.validate_body_parameters)(height, weight);
    const bsa = (0, bsa_rate_js_1.bsa_rate)(height, weight, bsa_equation);
    return math.matrix(math.dotMultiply(JOS3Defaults_js_1.default.local_bsa, bsa));
}
exports.local_bsa = local_bsa;
