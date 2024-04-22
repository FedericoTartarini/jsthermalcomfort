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
exports.local_q_work = void 0;
const math = __importStar(require("mathjs"));
/**
 * Calculate local thermogenesis by work [W].
 *
 * @param {number} bmr - Basal metabolic rate [W]
 * @param {number} par - Physical activity ratio [-]
 * @throws {Error} If par is less than 1
 *
 * @return {math.MathCollection} q_work - Local thermogenesis by work [W]
 */
function local_q_work(bmr, par) {
    if (par < 1) {
        throw new Error("par must be greater than or equal to 1");
    }
    let q_work_all = (par - 1) * bmr;
    let workf = math.matrix([
        0, 0, 0.091, 0.08, 0.129, 0.0262, 0.0139, 0.005, 0.0262, 0.0139, 0.005,
        0.201, 0.099, 0.005, 0.201, 0.099, 0.005,
    ]);
    return math.dotMultiply(workf, q_work_all);
}
exports.local_q_work = local_q_work;
