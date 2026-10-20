import { weight_rate } from "./weight_rate.ts";
import { bsa_rate } from "./bsa_rate.ts";
import { NUM_NODES, IDICT } from "./matrix.ts";
import { BODY_NAMES } from "./_body_parts.ts";
import { require_numeric, zeros2d } from "../_internal/numpy.ts";

// Upstream does not validate the body here (construction.py:267-538 at
// v4.6.2), so neither does this any more; a fat that is not a number raises
// a TypeError at the first comparison, as upstream's does, where it used to
// compute with the fat >= 27.5 table. The size corrections multiply by
// wr / bsar and by bsar**2 / wr, as upstream (:495-509), rather than by wr
// and then dividing by bsar.
/**
 * Calculate thermal conductance between layers.
 *
 * @param {number} height - Body height in [m].
 * @param {number} weight - Body weight in [kg].
 * @param {string} bsa_equation - The equation name (str) of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi".
 * @param {number} fat - Body fat rate in [%].
 *
 * @returns {number[][]} conductance - Thermal conductance between layers in [W/K]. The shape is (NUM_NODES, NUM_NODES).
 */
export function conductance(
  height: number,
  weight: number,
  bsa_equation: string,
  fat: number,
): number[][] {
  require_numeric(fat, "<", "comparison");
  let cdt_cr_sk: number[];
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

  const cdt_cr_ms = new Array<number>(17).fill(0); // core to muscle [W/K]
  const cdt_ms_fat = new Array<number>(17).fill(0); // muscle to fat [W/K]
  const cdt_fat_sk = new Array<number>(17).fill(0); // fat to skin [W/K]

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
  const cdt_ves_cr = [
    0, 0, 0, 0, 0, 0.586, 0.383, 1.534, 0.586, 0.383, 1.534, 0.81, 0.435, 1.816,
    0.81, 0.435, 1.816,
  ];

  // superficial vein to skin
  const cdt_sfv_sk = [
    0, 0, 0, 0, 0, 57.735, 37.768, 16.634, 57.735, 37.768, 16.634, 102.012,
    54.784, 24.277, 102.012, 54.784, 24.277,
  ];

  // art to vein (counter-flow) [W/K]
  // The data has been derived Mitchell's model.
  // The values = 15.869 [W/(m･K)] * the segment length [m]
  const cdt_art_vein = [
    0, 0, 0, 0, 0, 0.537, 0.351, 0.762, 0.537, 0.351, 0.762, 0.826, 0.444,
    0.992, 0.826, 0.444, 0.992,
  ];

  // Changes values by body size based on the standard body.
  const wr = weight_rate(weight);
  const bsar = bsa_rate(height, weight, bsa_equation);
  const sphere = wr / bsar;
  const cylinder = bsar ** 2 / wr;
  for (const cdt of [
    cdt_cr_sk,
    cdt_cr_ms,
    cdt_ms_fat,
    cdt_fat_sk,
    cdt_ves_cr,
    cdt_sfv_sk,
    cdt_art_vein,
  ]) {
    // head, neck (Sphere shape)
    for (let i = 0; i < 2; i++) cdt[i] *= sphere;
    // Others (Cylinder shape)
    for (let i = 2; i < cdt.length; i++) cdt[i] *= cylinder;
  }

  const cdt_whole = zeros2d(NUM_NODES);
  BODY_NAMES.forEach((bn, i) => {
    // Dictionary of indices in each body segment
    // key = layer name, value = index of matrix
    const index_of = IDICT[bn];
    const artery = index_of.artery as number;
    const vein = index_of.vein as number;
    const core = index_of.core as number;
    const skin = index_of.skin as number;

    // Common
    cdt_whole[artery][vein] = cdt_art_vein[i]; // art to vein
    cdt_whole[artery][core] = cdt_ves_cr[i]; // art to cr
    cdt_whole[vein][core] = cdt_ves_cr[i]; // vein to cr

    // Only limbs
    if (i >= 5) {
      cdt_whole[index_of.sfvein as number][skin] = cdt_sfv_sk[i]; // sfv to sk
    }

    // If the segment has a muscle or fat layer
    if (index_of.muscle !== null) {
      // or not indexof["fat"] is None
      const fat_node = index_of.fat as number;
      cdt_whole[core][index_of.muscle] = cdt_cr_ms[i]; // cr to ms
      cdt_whole[index_of.muscle][fat_node] = cdt_ms_fat[i]; // ms to fat
      cdt_whole[fat_node][skin] = cdt_fat_sk[i]; // fat to sk
    } else {
      cdt_whole[core][skin] = cdt_cr_sk[i]; // cr to sk
    }
  });

  // Creates a symmetrical matrix
  return cdt_whole.map((row, i) => row.map((x, j) => x + cdt_whole[j][i]));
}
