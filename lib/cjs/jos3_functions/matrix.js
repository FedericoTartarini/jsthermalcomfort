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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VINDEX = exports.INDEX = exports.whole_body = exports.local_arr = exports.vessel_blood_flow = exports.NUM_NODES = exports.IDICT = exports.LAYER_NAMES = exports.BODY_NAMES = void 0;
const math = __importStar(require("mathjs"));
exports.BODY_NAMES = [
    "head",
    "neck",
    "chest",
    "back",
    "pelvis",
    "left_shoulder",
    "left_arm",
    "left_hand",
    "right_shoulder",
    "right_arm",
    "right_hand",
    "left_thigh",
    "left_leg",
    "left_foot",
    "right_thigh",
    "right_leg",
    "right_foot",
];
exports.LAYER_NAMES = [
    "artery",
    "vein",
    "sfvein",
    "core",
    "muscle",
    "fat",
    "skin",
];
_a = (() => {
    // Defines existing layers as 1 or null
    let index_dict = {};
    ["head", "pelvis"].forEach((key) => {
        index_dict[key] = {
            artery: 1,
            vein: 1,
            sfvein: null,
            core: 1,
            muscle: 1,
            fat: 1,
            skin: 1,
        };
    });
    ["neck", "chest", "back"].forEach((key) => {
        index_dict[key] = {
            artery: 1,
            vein: 1,
            sfvein: null,
            core: 1,
            muscle: null,
            fat: null,
            skin: 1,
        };
    });
    exports.BODY_NAMES.slice(5).forEach((key) => {
        // limb segments
        index_dict[key] = {
            artery: 1,
            vein: 1,
            sfvein: 1,
            core: 1,
            muscle: null,
            fat: null,
            skin: 1,
        };
    });
    // Sets ordered indices in the matrix
    index_dict["CB"] = 0;
    let order_count = 1;
    exports.BODY_NAMES.forEach((bn) => {
        exports.LAYER_NAMES.forEach((ln) => {
            if (index_dict[bn][ln] !== null) {
                index_dict[bn][ln] = order_count;
                order_count += 1;
            }
        });
    });
    return [index_dict, order_count];
})(), exports.IDICT = _a[0], exports.NUM_NODES = _a[1];
/**
 * @typedef VesselBloodFlowResult
 * @type {object}
 * @property {math.MathCollection} bf_art - Artery blood flow rate [l/h].
 * @property {math.MathCollection} bf_vein - Vein blood flow rate [l/h].
 */
/**
 * Get artery and vein blood flow rate [l/h].
 *
 * @param {math.MathCollection} bf_core - Core blood flow rate [l/h].
 * @param {math.MathCollection} bf_muscle - Muscle blood flow rate [l/h].
 * @param {math.MathCollection} bf_fat - Fat blood flow rate [l/h].
 * @param {math.MathCollection} bf_skin - Skin blood flow rate [l/h].
 * @param {number} bf_ava_hand - AVA blood flow rate at hand [l/h].
 * @param {number} bf_ava_foot - AVA blood flow rate at foot [l/h].
 *
 * @returns {VesselBloodFlowResult} bf_artery, bf_vein - Artery and vein blood flow rate [l/h].
 */
function vessel_blood_flow(bf_core, bf_muscle, bf_fat, bf_skin, bf_ava_hand, bf_ava_foot) {
    let xbf = math.add(bf_core, bf_muscle, bf_fat, bf_skin);
    let bf_art = math.zeros(17);
    let bf_vein = math.zeros(17);
    // head
    bf_art.set([0], xbf.get([0]));
    bf_vein.set([0], xbf.get([0]));
    // neck (+head)
    bf_art.set([1], xbf.get([1]) + xbf.get([0]));
    bf_vein.set([1], xbf.get([1]) + xbf.get([0]));
    // chest
    bf_art.set([2], xbf.get([2]));
    bf_vein.set([2], xbf.get([2]));
    // back
    bf_art.set([3], xbf.get([3]));
    bf_vein.set([3], xbf.get([3]));
    // pelvis (+Thighs, Legs, Feet, AVA_Feet)
    bf_art.set([4], xbf.get([4]) +
        math.sum(xbf.subset(math.index(math.range(11, 17)))) +
        2 * bf_ava_foot);
    bf_vein.set([4], xbf.get([4]) +
        math.sum(xbf.subset(math.index(math.range(11, 17)))) +
        2 * bf_ava_foot);
    // L.Shoulder (+Arm, Hand, (arteryのみAVA_Hand))
    bf_art.set([5], math.sum(xbf.subset(math.index(math.range(5, 8)))) + bf_ava_hand);
    bf_vein.set([5], math.sum(xbf.subset(math.index(math.range(5, 8)))));
    // L.Arm (+Hand)
    bf_art.set([6], math.sum(xbf.subset(math.index(math.range(6, 8)))) + bf_ava_hand);
    bf_vein.set([6], math.sum(xbf.subset(math.index(math.range(6, 8)))));
    // L.Hand
    bf_art.set([7], xbf.get([7]) + bf_ava_hand);
    bf_vein.set([7], xbf.get([7]));
    // R.Shoulder (+Arm, Hand, (arteryのみAVA_Hand))
    bf_art.set([8], math.sum(xbf.subset(math.index(math.range(8, 11)))) + bf_ava_hand);
    bf_vein.set([8], math.sum(xbf.subset(math.index(math.range(8, 11)))));
    // R.Arm (+Hand)
    bf_art.set([9], math.sum(xbf.subset(math.index(math.range(9, 11)))) + bf_ava_hand);
    bf_vein.set([9], math.sum(xbf.subset(math.index(math.range(9, 11)))));
    // R.Hand
    bf_art.set([10], xbf.get([10]) + bf_ava_hand);
    bf_vein.set([10], xbf.get([10]));
    // L.Thigh (+Leg, Foot, (arteryのみAVA_Foot))
    bf_art.set([11], math.sum(xbf.subset(math.index(math.range(11, 14)))) + bf_ava_foot);
    bf_vein.set([11], math.sum(xbf.subset(math.index(math.range(11, 14)))));
    // L.Leg (+Foot)
    bf_art.set([12], math.sum(xbf.subset(math.index(math.range(12, 14)))) + bf_ava_foot);
    bf_vein.set([12], math.sum(xbf.subset(math.index(math.range(12, 14)))));
    // L.Foot
    bf_art.set([13], xbf.get([13]) + bf_ava_foot);
    bf_vein.set([13], xbf.get([13]));
    // R.Thigh (+Leg, Foot, (arteryのみAVA_Foot))
    bf_art.set([14], math.sum(xbf.subset(math.index(math.range(14, 17)))) + bf_ava_foot);
    bf_vein.set([14], math.sum(xbf.subset(math.index(math.range(14, 17)))));
    // R.Leg (+Foot)
    bf_art.set([15], math.sum(xbf.subset(math.index(math.range(15, 17)))) + bf_ava_foot);
    bf_vein.set([15], math.sum(xbf.subset(math.index(math.range(15, 17)))));
    // R.Foot
    bf_art.set([16], xbf.get([16]) + bf_ava_foot);
    bf_vein.set([16], xbf.get([16]));
    return { bf_art, bf_vein };
}
exports.vessel_blood_flow = vessel_blood_flow;
/**
 * Create matrix to calculate heat exchange by blood flow in each segment.
 *
 * @param {math.MathCollection} bf_core
 * @param {math.MathCollection} bf_muscle
 * @param {math.MathCollection} bf_fat
 * @param {math.MathCollection} bf_skin
 * @param {number} bf_ava_hand
 * @param {number} bf_ava_foot
 *
 * @returns {math.Matrix} The heat exchange by blood flow in each segment.
 */
function local_arr(bf_core, bf_muscle, bf_fat, bf_skin, bf_ava_hand, bf_ava_foot) {
    let bf_local = math.zeros(exports.NUM_NODES, exports.NUM_NODES);
    for (let i = 0; i < exports.BODY_NAMES.length; i++) {
        // Dictionary of indicies in each body segment
        // key = layer name, value = index of matrix
        let bn = exports.BODY_NAMES[i];
        let index_of = exports.IDICT[bn];
        // Common
        bf_local.set([index_of["core"], index_of["artery"]], 1.067 * bf_core.get([i])); // art to cr
        bf_local.set([index_of["skin"], index_of["artery"]], 1.067 * bf_skin.get([i])); // art to sk
        bf_local.set([index_of["vein"], index_of["core"]], 1.067 * bf_core.get([i])); // vein to cr
        bf_local.set([index_of["vein"], index_of["skin"]], 1.067 * bf_skin.get([i])); // vein to sk
        // If the segment has a muscle or fat layer
        if (index_of["muscle"] !== null) {
            bf_local.set([index_of["muscle"], index_of["artery"]], 1.067 * bf_muscle.get([i])); // art to ms
            bf_local.set([index_of["vein"], index_of["muscle"]], 1.067 * bf_muscle.get([i])); // vein to ms
        }
        if (index_of["fat"] !== null) {
            bf_local.set([index_of["fat"], index_of["artery"]], 1.067 * bf_fat.get([i])); // art to ft
            bf_local.set([index_of["vein"], index_of["fat"]], 1.067 * bf_fat.get([i])); // vein to ft
        }
        // Only hand
        if (i === 7 || i === 10) {
            bf_local.set([index_of["sfvein"], index_of["artery"]], 1.067 * bf_ava_hand); // art to sfv
        }
        // Only foot
        if (i === 13 || i === 16) {
            bf_local.set([index_of["sfvein"], index_of["artery"]], 1.067 * bf_ava_foot); // art to sfv
        }
    }
    return bf_local;
}
exports.local_arr = local_arr;
/**
 * Create matrix to calculate heat exchange by blood flow between segments. [W/K]
 *
 * @param {math.MathCollection} bf_art
 * @param {math.MathCollection} bf_vein
 * @param {number} bf_ava_hand
 * @param {number} bf_ava_foot
 *
 * @return {math.Matrix}
 */
function whole_body(bf_art, bf_vein, bf_ava_hand, bf_ava_foot) {
    let arr83 = math.zeros(exports.NUM_NODES, exports.NUM_NODES);
    const flow = (up, down, bloodflow) => arr83.set([down, up], bloodflow * 1.067); // Coefficient = 1.067 [Wh/L.K] Change units [L/h] to [W/K]
    const CB = exports.IDICT["CB"];
    const head = exports.IDICT["head"]["artery"];
    const neck = exports.IDICT["neck"]["artery"];
    const chest = exports.IDICT["chest"]["artery"];
    const back = exports.IDICT["back"]["artery"];
    const pelvis = exports.IDICT["pelvis"]["artery"];
    const left_shoulder = exports.IDICT["left_shoulder"]["artery"];
    const left_arm = exports.IDICT["left_arm"]["artery"];
    const left_hand = exports.IDICT["left_hand"]["artery"];
    const right_shoulder = exports.IDICT["right_shoulder"]["artery"];
    const right_arm = exports.IDICT["right_arm"]["artery"];
    const right_hand = exports.IDICT["right_hand"]["artery"];
    const left_thigh = exports.IDICT["left_thigh"]["artery"];
    const left_leg = exports.IDICT["left_leg"]["artery"];
    const left_foot = exports.IDICT["left_foot"]["artery"];
    const right_thigh = exports.IDICT["right_thigh"]["artery"];
    const right_leg = exports.IDICT["right_leg"]["artery"];
    const right_foot = exports.IDICT["right_foot"]["artery"];
    flow(CB, neck, bf_art.get([1])); // CB to neck.art
    flow(neck, head, bf_art.get([0])); // neck.art to head.art
    flow(head + 1, neck + 1, bf_vein.get([0])); // head.vein to neck.vein
    flow(neck + 1, CB, bf_vein.get([1])); // neck.vein to CB
    flow(CB, chest, bf_art.get([2])); // CB to chest.art
    flow(chest + 1, CB, bf_vein.get([2])); // chest.vein to CB
    flow(CB, back, bf_art.get([3])); // CB to back.art
    flow(back + 1, CB, bf_vein.get([3])); // back.vein to CB
    flow(CB, pelvis, bf_art.get([4])); // CB to pelvis.art
    flow(pelvis + 1, CB, bf_vein.get([4])); // pelvis.vein to CB
    flow(CB, left_shoulder, bf_art.get([5])); // CB to left_shoulder.art
    flow(left_shoulder, left_arm, bf_art.get([6])); // left_shoulder.art to left_arm.art
    flow(left_arm, left_hand, bf_art.get([7])); // left_arm.art to left_hand.art
    flow(left_hand + 1, left_arm + 1, bf_vein.get([7])); // left_hand.vein to left_arm.vein
    flow(left_arm + 1, left_shoulder + 1, bf_vein.get([6])); // left_arm.vein to left_shoulder.vein
    flow(left_shoulder + 1, CB, bf_vein.get([5])); // left_shoulder.vein to CB
    flow(left_hand + 2, left_arm + 2, bf_ava_hand); // left_hand.sfvein to left_arm.sfvein
    flow(left_arm + 2, left_shoulder + 2, bf_ava_hand); // left_arm.sfvein to left_shoulder.sfvein
    flow(left_shoulder + 2, CB, bf_ava_hand); // left_shoulder.sfvein to CB
    flow(CB, right_shoulder, bf_art.get([8])); // CB to right_shoulder.art
    flow(right_shoulder, right_arm, bf_art.get([9])); // right_shoulder.art to right_arm.art
    flow(right_arm, right_hand, bf_art.get([10])); // right_arm.art to right_hand.art
    flow(right_hand + 1, right_arm + 1, bf_vein.get([10])); // right_hand.vein to right_arm.vein
    flow(right_arm + 1, right_shoulder + 1, bf_vein.get([9])); // right_arm.vein to right_shoulder.vein
    flow(right_shoulder + 1, CB, bf_vein.get([8])); // right_shoulder.vein to CB
    flow(right_hand + 2, right_arm + 2, bf_ava_hand); // right_hand.sfvein to right_arm.sfvein
    flow(right_arm + 2, right_shoulder + 2, bf_ava_hand); // right_arm.sfvein to right_shoulder.sfvein
    flow(right_shoulder + 2, CB, bf_ava_hand); // right_shoulder.sfvein to CB
    flow(pelvis, left_thigh, bf_art.get([11])); // pelvis to left_thigh.art
    flow(left_thigh, left_leg, bf_art.get([12])); // left_thigh.art to left_leg.art
    flow(left_leg, left_foot, bf_art.get([13])); // left_leg.art to left_foot.art
    flow(left_foot + 1, left_leg + 1, bf_vein.get([13])); // left_foot.vein to left_leg.vein
    flow(left_leg + 1, left_thigh + 1, bf_vein.get([12])); // left_leg.vein to left_thigh.vein
    flow(left_thigh + 1, pelvis + 1, bf_vein.get([11])); // left_thigh.vein to pelvis
    flow(left_foot + 2, left_leg + 2, bf_ava_foot); // left_foot.sfvein to left_leg.sfvein
    flow(left_leg + 2, left_thigh + 2, bf_ava_foot); // left_leg.sfvein to left_thigh.sfvein
    flow(left_thigh + 2, pelvis + 1, bf_ava_foot); // left_thigh.vein to pelvis
    flow(pelvis, right_thigh, bf_art.get([14])); // pelvis to right_thigh.art
    flow(right_thigh, right_leg, bf_art.get([15])); // right_thigh.art to right_leg.art
    flow(right_leg, right_foot, bf_art.get([16])); // right_leg.art to right_foot.art
    flow(right_foot + 1, right_leg + 1, bf_vein.get([16])); // right_foot.vein to right_leg.vein
    flow(right_leg + 1, right_thigh + 1, bf_vein.get([15])); // right_leg.vein to right_thigh.vein
    flow(right_thigh + 1, pelvis + 1, bf_vein.get([14])); // right_thigh.vein to pelvis
    flow(right_foot + 2, right_leg + 2, bf_ava_foot); // right_foot.sfvein to right_leg.sfvein
    flow(right_leg + 2, right_thigh + 2, bf_ava_foot); // right_leg.sfvein to right_thigh.sfvein
    flow(right_thigh + 2, pelvis + 1, bf_ava_foot); // right_thigh.vein to pelvis
    return arr83;
}
exports.whole_body = whole_body;
_b = (function () {
    const index_by_layer = (layer) => {
        const out_index = [];
        for (const bn of exports.BODY_NAMES) {
            for (const ln of exports.LAYER_NAMES) {
                if (layer.toLowerCase() === ln && exports.IDICT[bn][ln] !== null) {
                    out_index.push(exports.IDICT[bn][ln]);
                }
            }
        }
        return out_index;
    };
    const valid_index_by_layer = (key) => {
        const out_index = [];
        for (let i = 0; i < exports.BODY_NAMES.length; i++) {
            const bn = exports.BODY_NAMES[i];
            if (exports.IDICT[bn][key] !== null) {
                out_index.push(i);
            }
        }
        return out_index;
    };
    const index = {};
    const vindex = {};
    for (const key of exports.LAYER_NAMES) {
        index[key] = index_by_layer(key);
        vindex[key] = valid_index_by_layer(key);
    }
    return [index, vindex];
})(), exports.INDEX = _b[0], exports.VINDEX = _b[1];
