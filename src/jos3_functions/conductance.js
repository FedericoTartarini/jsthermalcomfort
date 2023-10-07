import JOS3Defaults from "./JOS3Defaults";
import { validate_body_parameters } from "./validate_body_parameters";
import { weight_rate } from "./weight_rate";
import { bsa_rate } from "./bsa_rate";
import { NUM_NODES, BODY_NAMES, IDICT } from "./matrix";

function maprange(array, from, to, op) {
  return array.map((x, i) => (i >= from && i < to ? op(x) : x));
}

/**
 * Calculate thermal conductance between layers.

 * @param {number} height - Body height in [m]. Default is 1.72.
 * @param {number} weight - Body weight in [kg]. Default is 74.43.
 * @param {string} bsa_equation - The equation name (str) of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi". Default is "dubois".
 * @param {number} fat - Body fat rate in [%]. Default is 15.

 * @returns {number[][]} conductance - Thermal conductance between layers in [W/K]. The shape is (NUM_NODES, NUM_NODES).
 */
export function conductance(
  height = JOS3Defaults.height,
  weight = JOS3Defaults.weight,
  bsa_equation = JOS3Defaults.bsa_equation,
  fat = JOS3Defaults.body_fat,
) {
  validate_body_parameters(height, weight, undefined, fat);

  let cdt_cr_sk;
  if (fat < 12.5) {
    cdt_cr_sk = [
      1.341, 0.93, 1.879, 1.729, 2.37, 1.557, 1.018, 2.21, 1.557, 1.018, 2.21,
      2.565, 1.378, 3.404, 2.565, 1.378, 3.404,
    ];
  } else if (fat < 17.5) {
    cdt_cr_sk = [
      1.311, 0.909, 1.785, 1.643, 2.251, 1.501, 0.982, 2.183, 1.501, 0.982,
      2.183, 2.468, 1.326, 3.37, 2.468, 1.326, 3.37,
    ];
  } else if (fat < 22.5) {
    cdt_cr_sk = [
      1.282, 0.889, 1.698, 1.563, 2.142, 1.448, 0.947, 2.156, 1.448, 0.947,
      2.156, 2.375, 1.276, 3.337, 2.375, 1.276, 3.337,
    ];
  } else if (fat < 27.5) {
    cdt_cr_sk = [
      1.255, 0.87, 1.618, 1.488, 2.04, 1.396, 0.913, 2.13, 1.396, 0.913, 2.13,
      2.285, 1.227, 3.304, 2.285, 1.227, 3.304,
    ];
  } else {
    // fat >= 27.5
    cdt_cr_sk = [
      1.227, 0.852, 1.542, 1.419, 1.945, 1.346, 0.88, 1.945, 1.346, 0.88, 1.945,
      2.198, 1.181, 3.271, 2.198, 1.181, 3.271,
    ];
  }

  let cdt_cr_ms = Array(17).fill(0); // core to muscle [W/K]
  let cdt_ms_fat = Array(17).fill(0); // muscle to fat [W/K]
  let cdt_fat_sk = Array(17).fill(0); // fat to skin [W/K]

  // head and pelvis consists of 65MN's conductances
  cdt_cr_ms[0] = 1.601; // head
  cdt_ms_fat[0] = 13.222;
  cdt_fat_sk[0] = 16.008;
  cdt_cr_ms[4] = 3.0813; // pelvis
  cdt_ms_fat[4] = 10.3738;
  cdt_fat_sk[4] = 41.4954;

  // vessel to core
  // The shape is a cylinder.
  // It is assumed that the inner is vascular radius, 2.5mm and the outer is
  // stolwijk's core radius.
  // The heat transfer coefficient of the core is assumed as the Michel's
  // counter-flow model 0.66816 [W/(m･K)].
  let cdt_ves_cr = [
    0, 0, 0, 0, 0, 0.586, 0.383, 1.534, 0.586, 0.383, 1.534, 0.81, 0.435, 1.816,
    0.81, 0.435, 1.816,
  ];

  // superficial vein to skin
  let cdt_sfv_sk = [
    0, 0, 0, 0, 0, 57.735, 37.768, 16.634, 57.735, 37.768, 16.634, 102.012,
    54.784, 24.277, 102.012, 54.784, 24.277,
  ];

  // art to vein (counter-flow) [W/K]
  // The data has been derived Mitchell's model.
  // The values = 15.869 [W/(m･K)] * the segment length [m]
  let cdt_art_vein = [
    0, 0, 0, 0, 0, 0.537, 0.351, 0.762, 0.537, 0.351, 0.762, 0.826, 0.444,
    0.992, 0.826, 0.444, 0.992,
  ];

  // Changes values by body size based on the standard body.
  const wr = weight_rate(weight);
  const bsar = bsa_rate(height, weight, bsa_equation);

  const adjustSphere = (x) => (x * wr) / bsar;
  const adjustCylinder = (x) => (x * Math.pow(bsar, 2)) / wr;

  // head, neck (Sphere shape)
  cdt_cr_sk = maprange(cdt_cr_sk, 0, 2, adjustSphere);
  cdt_cr_ms = maprange(cdt_cr_ms, 0, 2, adjustSphere);
  cdt_ms_fat = maprange(cdt_ms_fat, 0, 2, adjustSphere);
  cdt_fat_sk = maprange(cdt_fat_sk, 0, 2, adjustSphere);
  cdt_ves_cr = maprange(cdt_ves_cr, 0, 2, adjustSphere);
  cdt_sfv_sk = maprange(cdt_sfv_sk, 0, 2, adjustSphere);
  cdt_art_vein = maprange(cdt_art_vein, 0, 2, adjustSphere);

  // Others (Cylinder shape)
  cdt_cr_sk = maprange(cdt_cr_sk, 2, cdt_cr_sk.length, adjustCylinder);
  cdt_cr_ms = maprange(cdt_cr_ms, 2, cdt_cr_ms.length, adjustCylinder);
  cdt_ms_fat = maprange(cdt_ms_fat, 2, cdt_ms_fat.length, adjustCylinder);
  cdt_fat_sk = maprange(cdt_fat_sk, 2, cdt_fat_sk.length, adjustCylinder);
  cdt_ves_cr = maprange(cdt_ves_cr, 2, cdt_ves_cr.length, adjustCylinder);
  cdt_sfv_sk = maprange(cdt_sfv_sk, 2, cdt_sfv_sk.length, adjustCylinder);
  cdt_art_vein = maprange(cdt_art_vein, 2, cdt_art_vein.length, adjustCylinder);

  const cdt_whole = Array(NUM_NODES)
    .fill()
    .map(() => Array(NUM_NODES).fill(0));

  for (let i = 0; i < BODY_NAMES.length; i++) {
    const bn = BODY_NAMES[i];
    // Dictionary of indices in each body segment
    // key = layer name, value = index of matrix
    const index_of = IDICT[bn];

    // Common
    cdt_whole[index_of["artery"]][index_of["vein"]] = cdt_art_vein[i]; // art to vein
    cdt_whole[index_of["artery"]][index_of["core"]] = cdt_ves_cr[i]; // art to cr
    cdt_whole[index_of["vein"]][index_of["core"]] = cdt_ves_cr[i]; // vein to cr

    // Only limbs
    if (i >= 5) {
      cdt_whole[index_of["sfvein"]][index_of["skin"]] = cdt_sfv_sk[i]; // sfv to sk
    }

    // If the segment has a muscle or fat layer
    if (index_of["muscle"] !== null) {
      // or not indexof["fat"] is None
      cdt_whole[index_of["core"]][index_of["muscle"]] = cdt_cr_ms[i]; // cr to ms
      cdt_whole[index_of["muscle"]][index_of["fat"]] = cdt_ms_fat[i]; // ms to fat
      cdt_whole[index_of["fat"]][index_of["skin"]] = cdt_fat_sk[i]; // fat to sk
    } else {
      cdt_whole[index_of["core"]][index_of["skin"]] = cdt_cr_sk[i]; // cr to sk
    }
  }

  // Creates a symmetrical matrix
  return cdt_whole.map((row, i) => row.map((val, j) => val + cdt_whole[j][i]));
}
