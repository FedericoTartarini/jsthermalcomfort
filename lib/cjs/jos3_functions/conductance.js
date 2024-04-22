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
exports.conductance = void 0;
const JOS3Defaults_js_1 = __importDefault(require("./JOS3Defaults.js"));
const validate_body_parameters_js_1 = require("./validate_body_parameters.js");
const weight_rate_js_1 = require("./weight_rate.js");
const bsa_rate_js_1 = require("./bsa_rate.js");
const matrix_js_1 = require("./matrix.js");
const math = __importStar(require("mathjs"));
/**
 * Calculate thermal conductance between layers.

 * @param {number} height - Body height in [m]. Default is 1.72.
 * @param {number} weight - Body weight in [kg]. Default is 74.43.
 * @param {string} bsa_equation - The equation name (str) of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi". Default is "dubois".
 * @param {number} fat - Body fat rate in [%]. Default is 15.

 * @returns {math.Matrix} conductance - Thermal conductance between layers in [W/K]. The shape is (NUM_NODES, NUM_NODES).
 */
function conductance(height = JOS3Defaults_js_1.default.height, weight = JOS3Defaults_js_1.default.weight, bsa_equation = JOS3Defaults_js_1.default.bsa_equation, fat = JOS3Defaults_js_1.default.body_fat) {
    (0, validate_body_parameters_js_1.validate_body_parameters)(height, weight, undefined, fat);
    let cdt_cr_sk;
    if (fat < 12.5) {
        cdt_cr_sk = math.matrix([
            1.341, 0.93, 1.879, 1.729, 2.37, 1.557, 1.018, 2.21, 1.557, 1.018, 2.21,
            2.565, 1.378, 3.404, 2.565, 1.378, 3.404,
        ]);
    }
    else if (fat < 17.5) {
        cdt_cr_sk = math.matrix([
            1.311, 0.909, 1.785, 1.643, 2.251, 1.501, 0.982, 2.183, 1.501, 0.982,
            2.183, 2.468, 1.326, 3.37, 2.468, 1.326, 3.37,
        ]);
    }
    else if (fat < 22.5) {
        cdt_cr_sk = math.matrix([
            1.282, 0.889, 1.698, 1.563, 2.142, 1.448, 0.947, 2.156, 1.448, 0.947,
            2.156, 2.375, 1.276, 3.337, 2.375, 1.276, 3.337,
        ]);
    }
    else if (fat < 27.5) {
        cdt_cr_sk = math.matrix([
            1.255, 0.87, 1.618, 1.488, 2.04, 1.396, 0.913, 2.13, 1.396, 0.913, 2.13,
            2.285, 1.227, 3.304, 2.285, 1.227, 3.304,
        ]);
    }
    else {
        // fat >= 27.5
        cdt_cr_sk = math.matrix([
            1.227, 0.852, 1.542, 1.419, 1.945, 1.346, 0.88, 1.945, 1.346, 0.88, 1.945,
            2.198, 1.181, 3.271, 2.198, 1.181, 3.271,
        ]);
    }
    let cdt_cr_ms = math.zeros(17); // core to muscle [W/K]
    let cdt_ms_fat = math.zeros(17); // muscle to fat [W/K]
    let cdt_fat_sk = math.zeros(17); // fat to skin [W/K]
    // head and pelvis consists of 65MN's conductances
    cdt_cr_ms.set([0], 1.601); // head
    cdt_ms_fat.set([0], 13.222);
    cdt_fat_sk.set([0], 16.008);
    cdt_cr_ms.set([4], 3.0813); // pelvis
    cdt_ms_fat.set([4], 10.3738);
    cdt_fat_sk.set([4], 41.4954);
    // vessel to core
    // The shape is a cylinder.
    // It is assumed that the inner is vascular radius, 2.5mm and the outer is
    // stolwijk's core radius.
    // The heat transfer coefficient of the core is assumed as the Michel's
    // counter-flow model 0.66816 [W/(m･K)].
    let cdt_ves_cr = math.matrix([
        0, 0, 0, 0, 0, 0.586, 0.383, 1.534, 0.586, 0.383, 1.534, 0.81, 0.435, 1.816,
        0.81, 0.435, 1.816,
    ]);
    // superficial vein to skin
    let cdt_sfv_sk = math.matrix([
        0, 0, 0, 0, 0, 57.735, 37.768, 16.634, 57.735, 37.768, 16.634, 102.012,
        54.784, 24.277, 102.012, 54.784, 24.277,
    ]);
    // art to vein (counter-flow) [W/K]
    // The data has been derived Mitchell's model.
    // The values = 15.869 [W/(m･K)] * the segment length [m]
    let cdt_art_vein = math.matrix([
        0, 0, 0, 0, 0, 0.537, 0.351, 0.762, 0.537, 0.351, 0.762, 0.826, 0.444,
        0.992, 0.826, 0.444, 0.992,
    ]);
    // Changes values by body size based on the standard body.
    const wr = (0, weight_rate_js_1.weight_rate)(weight);
    const bsar = (0, bsa_rate_js_1.bsa_rate)(height, weight, bsa_equation);
    const adjustSphere = (matrix, range) => {
        let index = math.index(math.range(0, 2));
        let subset = math.subset(matrix, index);
        subset = math.dotDivide(math.dotMultiply(subset, wr), bsar);
        return math.subset(matrix, index, subset);
    };
    const adjustCylinder = (matrix) => {
        let index = math.index(math.range(2, matrix.size()[0]));
        let subset = math.subset(matrix, index);
        subset = math.dotDivide(math.dotMultiply(subset, Math.pow(bsar, 2)), wr);
        return math.subset(matrix, index, subset);
    };
    // head, neck (Sphere shape)
    cdt_cr_sk = adjustSphere(cdt_cr_sk);
    cdt_cr_ms = adjustSphere(cdt_cr_ms);
    cdt_ms_fat = adjustSphere(cdt_ms_fat);
    cdt_fat_sk = adjustSphere(cdt_fat_sk);
    cdt_ves_cr = adjustSphere(cdt_ves_cr);
    cdt_sfv_sk = adjustSphere(cdt_sfv_sk);
    cdt_art_vein = adjustSphere(cdt_art_vein);
    // Others (Cylinder shape)
    cdt_cr_sk = adjustCylinder(cdt_cr_sk);
    cdt_cr_ms = adjustCylinder(cdt_cr_ms);
    cdt_ms_fat = adjustCylinder(cdt_ms_fat);
    cdt_fat_sk = adjustCylinder(cdt_fat_sk);
    cdt_ves_cr = adjustCylinder(cdt_ves_cr);
    cdt_sfv_sk = adjustCylinder(cdt_sfv_sk);
    cdt_art_vein = adjustCylinder(cdt_art_vein);
    const cdt_whole = math.zeros(matrix_js_1.NUM_NODES, matrix_js_1.NUM_NODES);
    for (let i = 0; i < matrix_js_1.BODY_NAMES.length; i++) {
        const bn = matrix_js_1.BODY_NAMES[i];
        // Dictionary of indices in each body segment
        // key = layer name, value = index of matrix
        const index_of = matrix_js_1.IDICT[bn];
        // Common
        cdt_whole.set([index_of["artery"], index_of["vein"]], cdt_art_vein.get([i])); // art to vein
        cdt_whole.set([index_of["artery"], index_of["core"]], cdt_ves_cr.get([i])); // art to cr
        cdt_whole.set([index_of["vein"], index_of["core"]], cdt_ves_cr.get([i])); // vein to cr
        // Only limbs
        if (i >= 5) {
            cdt_whole.set([index_of["sfvein"], index_of["skin"]], cdt_sfv_sk.get([i])); // sfv to sk
        }
        // If the segment has a muscle or fat layer
        if (index_of["muscle"] !== null) {
            // or not indexof["fat"] is None
            cdt_whole.set([index_of["core"], index_of["muscle"]], cdt_cr_ms.get([i])); // cr to ms
            cdt_whole.set([index_of["muscle"], index_of["fat"]], cdt_ms_fat.get([i])); // ms to fat
            cdt_whole.set([index_of["fat"], index_of["skin"]], cdt_fat_sk.get([i])); // fat to sk
        }
        else {
            cdt_whole.set([index_of["core"], index_of["skin"]], cdt_cr_sk.get([i])); // cr to sk
        }
    }
    // Creates a symmetrical matrix
    return math.add(cdt_whole, math.transpose(cdt_whole));
}
exports.conductance = conductance;
