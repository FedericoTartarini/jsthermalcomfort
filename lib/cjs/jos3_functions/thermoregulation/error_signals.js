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
exports.error_signals = void 0;
const math = __importStar(require("mathjs"));
/**
 * @typedef ErrorSignalsResult
 * @type {object}
 * @property {number} wrms - Warm signal [°C].
 * @property {number} clds - Cold signal [°C].
 */
/**
 * Calculate WRMS and CLDS signals of thermoregulation.
 *
 * @param {math.MathCollection} [err_sk=0] - Difference between set-point and skin temperatures [°C].
 * If the provided value is an array, its length should be 17.
 *
 * @returns {ErrorSignalsResult} an object containing the results of the calculation.
 */
function error_signals(err_sk = math.zeros(17)) {
    let receptor = math.matrix([
        0.0549, 0.0146, 0.1492, 0.1321, 0.2122, 0.0227, 0.0117, 0.0923, 0.0227,
        0.0117, 0.0923, 0.0501, 0.0251, 0.0167, 0.0501, 0.0251, 0.0167,
    ]);
    let wrm = err_sk.map((n) => math.max(n, 0));
    wrm = math.dotMultiply(wrm, receptor);
    let wrms = math.sum(wrm);
    let cld = err_sk.map((n) => math.min(n, 0));
    cld = math.dotMultiply(cld, math.dotMultiply(receptor, -1));
    let clds = math.sum(cld);
    return { wrms, clds };
}
exports.error_signals = error_signals;
