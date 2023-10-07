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
