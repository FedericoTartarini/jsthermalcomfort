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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sum_bf = sum_bf;
const math = __importStar(require("mathjs"));
/**
 * Sum the total blood flow in various body parts.
 *
 * @param {math.MathCollection} bf_core - Blood flow rate in the core region [L/h].
 * @param {math.MathCollection} bf_muscle - Blood flow rate in the muscle region [L/h].
 * @param {math.MathCollection} bf_fat - Blood flow rate in the fat region [L/h].
 * @param {math.MathCollection} bf_skin - Blood flow rate in the skin region [L/h].
 * @param {number} bf_ava_hand - AVA blood flow rate in one hand [L/h].
 * @param {number} bf_ava_foot - AVA blood flow rate in one foot [L/h].
 *
 * @returns {number} co - Cardiac output (the sum of the whole blood flow rate) [L/h].
 */
function sum_bf(bf_core, bf_muscle, bf_fat, bf_skin, bf_ava_hand, bf_ava_foot) {
    let co = 0;
    co += math.sum(bf_core);
    co += math.sum(bf_muscle);
    co += math.sum(bf_fat);
    co += math.sum(bf_skin);
    co += 2 * bf_ava_hand;
    co += 2 * bf_ava_foot;
    return co;
}
