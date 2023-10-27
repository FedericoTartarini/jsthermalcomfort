import { $array, $map, $reduce, $sum } from "../supa.js";

export const BODY_NAMES = [
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

export const LAYER_NAMES = [
  "artery",
  "vein",
  "sfvein",
  "core",
  "muscle",
  "fat",
  "skin",
];

export const [IDICT, NUM_NODES] = (() => {
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

  BODY_NAMES.slice(5).forEach((key) => {
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
  BODY_NAMES.forEach((bn) => {
    LAYER_NAMES.forEach((ln) => {
      if (index_dict[bn][ln] !== null) {
        index_dict[bn][ln] = order_count;
        order_count += 1;
      }
    });
  });

  return [index_dict, order_count];
})();

/**
 * Get artery and vein blood flow rate [l/h].
 *
 * @param {number[]} bf_core - Core blood flow rate [l/h].
 * @param {number[]} bf_muscle - Muscle blood flow rate [l/h].
 * @param {number[]} bf_fat - Fat blood flow rate [l/h].
 * @param {number[]} bf_skin - Skin blood flow rate [l/h].
 * @param {number} bf_ava_hand - AVA blood flow rate at hand [l/h].
 * @param {number} bf_ava_foot - AVA blood flow rate at foot [l/h].
 *
 * @returns {[number[], number[]]} bf_artery, bf_vein - Artery and vein blood flow rate [l/h].
 */
export function vessel_blood_flow(
  bf_core,
  bf_muscle,
  bf_fat,
  bf_skin,
  bf_ava_hand,
  bf_ava_foot,
) {
  let xbf = $map(
    [bf_core, bf_muscle, bf_fat, bf_skin],
    ([bf_core, bf_muscle, bf_fat, bf_skin]) =>
      bf_core + bf_muscle + bf_fat + bf_skin,
  );

  let bf_art = $array(17, 0);
  let bf_vein = $array(17, 0);

  // head
  bf_art[0] = xbf[0];
  bf_vein[0] = xbf[0];

  // neck (+head)
  bf_art[1] = xbf[1] + xbf[0];
  bf_vein[1] = xbf[1] + xbf[0];

  // chest
  bf_art[2] = xbf[2];
  bf_vein[2] = xbf[2];

  // back
  bf_art[3] = xbf[3];
  bf_vein[3] = xbf[3];

  // pelvis (+Thighs, Legs, Feet, AVA_Feet)
  bf_art[4] = xbf[4] + $sum(xbf.slice(11, 17)) + 2 * bf_ava_foot;
  bf_vein[4] = xbf[4] + $sum(xbf.slice(11, 17)) + 2 * bf_ava_foot;

  // L.Shoulder (+Arm, Hand, (arteryのみAVA_Hand))
  bf_art[5] = $sum(xbf.slice(5, 8)) + bf_ava_hand;
  bf_vein[5] = $sum(xbf.slice(5, 8));

  // L.Arm (+Hand)
  bf_art[6] = $sum(xbf.slice(6, 8)) + bf_ava_hand;
  bf_vein[6] = $sum(xbf.slice(6, 8));

  // R.Shoulder (+Arm, Hand, (arteryのみAVA_Hand))
  bf_art[8] = $sum(xbf.slice(8, 11)) + bf_ava_hand;
  bf_vein[8] = $sum(xbf.slice(8, 11));

  // R.Arm (+Hand)
  bf_art[9] = $sum(xbf.slice(9, 11)) + bf_ava_hand;
  bf_vein[9] = $sum(xbf.slice(9, 11));

  // R.Hand
  bf_art[10] = xbf[10] + bf_ava_hand;
  bf_vein[10] = xbf[10];

  // L.Thigh (+Leg, Foot, (arteryのみAVA_Foot))
  bf_art[11] = $sum(xbf.slice(11, 14)) + bf_ava_foot;
  bf_vein[11] = $sum(xbf.slice(11, 14));

  // L.Leg (+Foot)
  bf_art[12] = $sum(xbf.slice(12, 14)) + bf_ava_foot;
  bf_vein[12] = $sum(xbf.slice(12, 14));

  // L.Foot
  bf_art[13] = xbf[13] + bf_ava_foot;
  bf_vein[13] = xbf[13];

  // R.Thigh (+Leg, Foot, (arteryのみAVA_Foot))
  bf_art[14] = $sum(xbf.slice(14, 17)) + bf_ava_foot;
  bf_vein[14] = $sum(xbf.slice(14, 17));

  // R.Leg (+Foot)
  bf_art[15] = $sum(xbf.slice(15, 17)) + bf_ava_foot;
  bf_vein[15] = $sum(xbf.slice(15, 17));

  // R.Foot
  bf_art[16] = xbf[16] + bf_ava_foot;
  bf_vein[16] = xbf[16];

  return [bf_art, bf_vein];
}

/**
 *
 * @param bf_core
 * @param bf_muscle
 * @param bf_fat
 * @param bf_skin
 * @param bf_ava_hand
 * @param bf_ava_foot
 *
 * @returns {number[][]}
 */
export function local_arr(
  bf_core,
  bf_muscle,
  bf_fat,
  bf_skin,
  bf_ava_hand,
  bf_ava_foot,
) {
  let bf_local = Array(NUM_NODES)
    .fill()
    .map(() => Array(NUM_NODES).fill(0));

  for (let i = 0; i < BODY_NAMES.length; i++) {
    // Dictionary of indicies in each body segment
    // key = layer name, value = index of matrix
    let bn = BODY_NAMES[i];
    let index_of = IDICT[bn];

    // common
    bf_local[index_of["core"]][index_of["artery"]] = 1.067 * bf_core[i]; // art to cr
    bf_local[index_of["skin"]][index_of["artery"]] = 1.067 * bf_core[i]; // art to sk
    bf_local[index_of["vein"]][index_of["core"]] = 1.067 * bf_core[i]; // vein to cr
    bf_local[index_of["vein"]][index_of["skin"]] = 1.067 * bf_core[i]; // vein to sk

    // If the segment has a muscle or fat layer
    if (index_of["muscle"] !== null) {
      bf_local[index_of["muscle"]][index_of["artery"]] = 1.067 * bf_muscle[i]; // art to ms
      bf_local[index_of["vein"]][index_of["muscle"]] = 1.067 * bf_muscle[i]; // vein to ms
    }

    if (index_of["fat"] !== null) {
      bf_local[index_of["fat"]][index_of["artery"]] = 1.067 * bf_fat[i]; // art to ft
      bf_local[index_of["vein"]][index_of["fat"]] = 1.067 * bf_fat[i]; // vein to ft
    }

    switch (i) {
      // Only hand
      case 7:
      case 10:
        bf_local[index_of["sfvein"]][index_of["artery"]] = 1.067 * bf_ava_hand; // art to sfv
        break;

      // Only foot
      case 13:
      case 16:
        bf_local[index_of["sfvein"]][index_of["artery"]] = 1.067 * bf_ava_foot; // art to sfv
    }
  }

  return bf_local;
}

/**
 * Create matrix to calculate heat exchange by blood flow between segments. [W/K]
 * @param bf_art
 * @param bf_vein
 * @param bf_ava_hand
 * @param bf_ava_foot
 */
export function whole_body(bf_art, bf_vein, bf_ava_hand, bf_ava_foot) {
  let arr83 = Array(NUM_NODES)
    .fill(undefined)
    .map(() => Array(NUM_NODES).fill(0));

  const flow = (up, down, bloodflow) => (arr83[down][up] = bloodflow * 1.067); // Coefficient = 1.067 [Wh/L.K] Change units [L/h] to [W/K]

  const CB = IDICT["CB"];
  const head = IDICT["head"]["artery"];
  const neck = IDICT["neck"]["artery"];
  const chest = IDICT["chest"]["artery"];
  const back = IDICT["back"]["artery"];
  const pelvis = IDICT["pelvis"]["artery"];
  const left_shoulder = IDICT["left_shoulder"]["artery"];
  const left_arm = IDICT["left_arm"]["artery"];
  const left_hand = IDICT["left_hand"]["artery"];
  const right_shoulder = IDICT["right_shoulder"]["artery"];
  const right_arm = IDICT["right_arm"]["artery"];
  const right_hand = IDICT["right_hand"]["artery"];
  const left_thigh = IDICT["left_thigh"]["artery"];
  const left_leg = IDICT["left_leg"]["artery"];
  const left_foot = IDICT["left_foot"]["artery"];
  const right_thigh = IDICT["right_thigh"]["artery"];
  const right_leg = IDICT["right_leg"]["artery"];
  const right_foot = IDICT["right_foot"]["artery"];

  flow(CB, neck, bf_art[1]); // CB to neck.art
  flow(neck, head, bf_art[0]); // neck.art to head.art
  flow(head + 1, neck + 1, bf_vein[0]); // head.vein to neck.vein
  flow(neck + 1, CB, bf_vein[1]); // neck.vein to CB

  flow(CB, chest, bf_art[2]); // CB to chest.art
  flow(chest + 1, CB, bf_vein[2]); // chest.vein to CB

  flow(CB, back, bf_art[3]); // CB to back.art
  flow(back + 1, CB, bf_vein[3]); // back.vein to CB

  flow(CB, pelvis, bf_art[4]); // CB to pelvis.art
  flow(pelvis + 1, CB, bf_vein[4]); // pelvis.vein to CB

  flow(CB, left_shoulder, bf_art[5]); // CB to left_shoulder.art
  flow(left_shoulder, left_arm, bf_art[6]); // left_shoulder.art to left_arm.art
  flow(left_arm, left_hand, bf_art[7]); // left_arm.art to left_hand.art
  flow(left_hand + 1, left_arm + 1, bf_vein[7]); // left_hand.vein to left_arm.vein
  flow(left_arm + 1, left_shoulder + 1, bf_vein[6]); // left_arm.vein to left_shoulder.vein
  flow(left_shoulder + 1, CB, bf_vein[5]); // left_shoulder.vein to CB
  flow(left_hand + 2, left_arm + 2, bf_ava_hand); // left_hand.sfvein to left_arm.sfvein
  flow(left_arm + 2, left_shoulder + 2, bf_ava_hand); // left_arm.sfvein to left_shoulder.sfvein
  flow(left_shoulder + 2, CB, bf_ava_hand); // left_shoulder.sfvein to CB

  flow(CB, right_shoulder, bf_art[8]); // CB to right_shoulder.art
  flow(right_shoulder, right_arm, bf_art[9]); // right_shoulder.art to right_arm.art
  flow(right_arm, right_hand, bf_art[10]); // right_arm.art to right_hand.art
  flow(right_hand + 1, right_arm + 1, bf_vein[10]); // right_hand.vein to right_arm.vein
  flow(right_arm + 1, right_shoulder + 1, bf_vein[9]); // right_arm.vein to right_shoulder.vein
  flow(right_shoulder + 1, CB, bf_vein[8]); // right_shoulder.vein to CB
  flow(right_hand + 2, right_arm + 2, bf_ava_hand); // right_hand.sfvein to right_arm.sfvein
  flow(right_arm + 2, right_shoulder + 2, bf_ava_hand); // right_arm.sfvein to right_shoulder.sfvein
  flow(right_shoulder + 2, CB, bf_ava_hand); // right_shoulder.sfvein to CB

  flow(pelvis, left_thigh, bf_art[11]); // pelvis to left_thigh.art
  flow(left_thigh, left_leg, bf_art[12]); // left_thigh.art to left_leg.art
  flow(left_leg, left_foot, bf_art[13]); // left_leg.art to left_foot.art
  flow(left_foot + 1, left_leg + 1, bf_vein[13]); // left_foot.vein to left_leg.vein
  flow(left_leg + 1, left_thigh + 1, bf_vein[12]); // left_leg.vein to left_thigh.vein
  flow(left_thigh + 1, pelvis + 1, bf_vein[11]); // left_thigh.vein to pelvis
  flow(left_foot + 2, left_leg + 2, bf_ava_foot); // left_foot.sfvein to left_leg.sfvein
  flow(left_leg + 2, left_thigh + 2, bf_ava_foot); // left_leg.sfvein to left_thigh.sfvein
  flow(left_thigh + 2, pelvis + 1, bf_ava_foot); // left_thigh.vein to pelvis

  flow(pelvis, right_thigh, bf_art[14]); // pelvis to right_thigh.art
  flow(right_thigh, right_leg, bf_art[15]); // right_thigh.art to right_leg.art
  flow(right_leg, right_foot, bf_art[16]); // right_leg.art to right_foot.art
  flow(right_foot + 1, right_leg + 1, bf_vein[16]); // right_foot.vein to right_leg.vein
  flow(right_leg + 1, right_thigh + 1, bf_vein[15]); // right_leg.vein to right_thigh.vein
  flow(right_thigh + 1, pelvis + 1, bf_vein[14]); // right_thigh.vein to pelvis
  flow(right_foot + 2, right_leg + 2, bf_ava_foot); // right_foot.sfvein to right_leg.sfvein
  flow(right_leg + 2, right_thigh + 2, bf_ava_foot); // right_leg.sfvein to right_thigh.sfvein
  flow(right_thigh + 2, pelvis + 1, bf_ava_foot); // right_thigh.vein to pelvis

  return arr83;
}

export const [INDEX, VINDEX] = (function () {
  const index_by_layer = (layer) => {
    const out_index = [];

    for (const bn of BODY_NAMES) {
      for (const ln of LAYER_NAMES) {
        if (layer.toLowerCase() === ln && IDICT[bn][ln] !== null) {
          out_index.push(IDICT[bn][ln]);
        }
      }
    }

    return out_index;
  };

  const valid_index_by_layer = (key) => {
    const out_index = [];

    for (let i = 0; i < BODY_NAMES.length; i++) {
      const bn = BODY_NAMES[i];

      if (IDICT[bn][key] !== null) {
        out_index.push(i);
      }
    }

    return out_index;
  };

  const index = {};
  const vindex = {};

  for (const key of LAYER_NAMES) {
    index[key] = index_by_layer(key);
    vindex[key] = valid_index_by_layer(key);
  }

  return [index, vindex];
})();
