"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.weight_rate = void 0;
const JOS3Defaults_js_1 = __importDefault(require("./JOS3Defaults.js"));
const validate_body_parameters_js_1 = require("./validate_body_parameters.js");
/**
 * Calculate the ratio of the body weight to the standard body (74.43 kg).
 *
 * The standard values of local body weights are as as follows:
 *   weight_local = [
 *       3.18, 0.84, 12.4, 11.03, 17.57,
 *       2.16, 1.37, 0.34, 2.16, 1.37, 0.34,
 *       7.01, 3.34, 0.48, 7.01, 3.34, 0.48
 *   ]
 *
 * The data have been derived from 65MN.
 * The weight of neck is extracted from the weight of 65MN's head based on
 * the local body surface area of Smith's model.
 *
 * @param {number} [weight=JOS3Defaults.weight] - The body weight [kg].
 *
 * @returns {number} the ratio of the body weight to the standard body (74.43 kg).
 */
function weight_rate(weight = JOS3Defaults_js_1.default.weight) {
    (0, validate_body_parameters_js_1.validate_body_parameters)(undefined, weight);
    return weight / JOS3Defaults_js_1.default.weight;
}
exports.weight_rate = weight_rate;
