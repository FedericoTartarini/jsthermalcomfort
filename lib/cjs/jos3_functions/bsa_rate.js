"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bsa_rate = void 0;
const JOS3Defaults_js_1 = __importDefault(require("../jos3_functions/JOS3Defaults.js"));
const validate_body_parameters_js_1 = require("./validate_body_parameters.js");
const utilities_js_1 = require("../utilities/utilities.js");
/**
 * Calculates the body surface area rate based on the given height, weight and
 * BSA equation.
 *
 * @param {number} [height=JOS3Defaults.height] - The height of the person in
 * meters.
 * @param {number} [weight=JOS3Defaults.weight] - The weight of the person in
 * kilograms.
 * @param {string} [bsa_equation=JOS3Defaults.bsa_equation] - The BSA equation
 * to use for calculation.
 *
 * @returns {number} The body surface area rate.
 */
function bsa_rate(height = JOS3Defaults_js_1.default.height, weight = JOS3Defaults_js_1.default.weight, bsa_equation = JOS3Defaults_js_1.default.bsa_equation) {
    (0, validate_body_parameters_js_1.validate_body_parameters)(height, weight, bsa_equation);
    const bsa_all = (0, utilities_js_1.body_surface_area)(weight, height, bsa_equation);
    return bsa_all / JOS3Defaults_js_1.default.local_bsa.reduce((t, c) => t + c, 0);
}
exports.bsa_rate = bsa_rate;
