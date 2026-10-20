// Upstream's JOS3BodyParts dataclass (pythermalcomfort/classes_return.py:774-842
// at v4.6.2): the 17 body parts, in the order upstream keeps "very important".
// Private: the names are public as JOS3's `body_names`, as upstream exposes
// them, and the type through `src/index.js`.

/** The name of one of the 17 body parts of the JOS-3 model. */
export type JOS3BodyPartName =
  | "head"
  | "neck"
  | "chest"
  | "back"
  | "pelvis"
  | "left_shoulder"
  | "left_arm"
  | "left_hand"
  | "right_shoulder"
  | "right_arm"
  | "right_hand"
  | "left_thigh"
  | "left_leg"
  | "left_foot"
  | "right_thigh"
  | "right_leg"
  | "right_foot";

// A type alias, as the other converted result types, so a value stays
// assignable to Record<string, unknown>.
/**
 * One value per body part, upstream's `JOS3BodyParts`. A part a quantity
 * does not have holds `null`, where upstream's holds `None`: `t_muscle` and
 * `t_fat` have only head and pelvis.
 *
 * @typedef {Object} JOS3BodyParts
 * @public
 */
export type JOS3BodyParts<T = number | null> = {
  [K in JOS3BodyPartName]: T;
};

/**
 * `JOS3BodyParts.get_attribute_names()`: the 17 body parts in upstream's
 * order (`classes_return.py:822-842`).
 */
export const BODY_NAMES: readonly JOS3BodyPartName[] = Object.freeze([
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
]);
