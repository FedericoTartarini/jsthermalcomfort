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
exports.bfb_rate = void 0;
const JOS3Defaults_js_1 = __importDefault(require("./JOS3Defaults.js"));
const bsa_rate_js_1 = require("./bsa_rate.js");
const validate_body_parameters_js_1 = require("./validate_body_parameters.js");
const math = __importStar(require("mathjs"));
/**
 * Calculate the ratio of basal blood flow (BFB) of the standard body (290 L/h).
 *
 * @param {number} height - Body height [m]. The default is 1.72.
 * @param {number} weight - Body weight [kg]. The default is 74.43.
 * @param {string} bsa_equation - The equation name of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi". The default is "dubois".
 * @param {number} age - age [years]. The default is 20.
 * @param {number} ci - Cardiac index [L/min/㎡]. The default is 2.59.
 *
 * @returns {number} - Basal blood flow rate.
 */
function bfb_rate(height = JOS3Defaults_js_1.default.height, weight = JOS3Defaults_js_1.default.weight, bsa_equation = JOS3Defaults_js_1.default.bsa_equation, age = JOS3Defaults_js_1.default.age, ci = JOS3Defaults_js_1.default.cardiac_index) {
    (0, validate_body_parameters_js_1.validate_body_parameters)(height, weight, age);
    ci *= 60;
    if (age < 50) {
        ci *= 1;
    }
    else if (age < 60) {
        ci *= 0.85;
    }
    else if (age < 70) {
        ci *= 0.75;
    }
    else {
        // age >= 70
        ci *= 0.7;
    }
    const bfb_all = ci *
        (0, bsa_rate_js_1.bsa_rate)(height, weight, bsa_equation) *
        math.sum(JOS3Defaults_js_1.default.local_bsa);
    return bfb_all / JOS3Defaults_js_1.default.blood_flow_rate;
}
exports.bfb_rate = bfb_rate;
