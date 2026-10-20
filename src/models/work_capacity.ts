// Upstream's WorkIntensity and WorkCapacity, shared by the work-capacity
// models: upstream's work_capacity_dunne and work_capacity_hothaps take
// WorkIntensity, and work_capacity_dunne, work_capacity_hothaps,
// work_capacity_iso and work_capacity_niosh return WorkCapacity
// (pythermalcomfort/classes_input.py:41-46, classes_return.py:762-771, and
// work_capacity_dunne.py:5-10, work_capacity_hothaps.py:5-10,
// work_capacity_iso.py:6, work_capacity_niosh.py:6, at v4.6.2).

/**
 * Enumeration for work intensity levels.
 *
 * Mirrors `pythermalcomfort.classes_input.WorkIntensity`: the property names
 * and values are upstream's members. A value is the string a caller passes as
 * `work_intensity`; upstream compares it without regard to case.
 *
 * @public
 */
export const WorkIntensity = Object.freeze({
  HEAVY: "heavy",
  MODERATE: "moderate",
  LIGHT: "light",
});

// The values of WorkIntensity, the type of a work_intensity param.
export type WorkIntensity = (typeof WorkIntensity)[keyof typeof WorkIntensity];

// A type alias with a typedef line, so documentation.js names it from the
// typedef and the result stays assignable to Record<string, unknown>.
// Upstream's capacity is a float or list of floats; here a number (ADR 0005).
/**
 * @typedef {object} WorkCapacity
 * @property {number} capacity - Work capacity affected by heat.
 * @public
 */
export type WorkCapacity = {
  capacity: number;
};
