/**
 * Models options.
 *
 * Upstream's `Models` (`utilities.py`), named `Standard` here (ADR 0003). Each
 * property is upstream's member name, and its value is the string a caller
 * passes; a parameter accepts either `Standard.iso_7730_2025` or
 * `"7730-2025"`. `en_16798_1_2019` and `iso_7243_2017` are the library's,
 * for EN 16798-1 and ISO 7243, which `Models` names no member for (deviations
 * _shared-51 and _shared-78).
 */
export const Standard = Object.freeze({
  ashrae_55_2023: "55-2023",
  iso_7730_2005: "7730-2005",
  iso_7730_2025: "7730-2025",
  iso_9920_2007: "9920-2007",
  iso_7933_2004: "7933-2004",
  iso_7933_2023: "7933-2023",
  iso_7243_2017: "7243-2017",
  en_16798_1_2019: "16798-1-2019",
} as const);

/**
 * Units options.
 *
 * Upstream's `Units` (`utilities.py`); a parameter accepts either `Units.SI`
 * or `"SI"` (deviation _shared-1).
 */
export const Units = Object.freeze({
  SI: "SI",
  IP: "IP",
} as const);

/**
 * Postures options.
 *
 * Upstream's `Postures` (`utilities.py:48-57`); a parameter accepts either
 * `Postures.sitting` or `"sitting"` (deviation _shared-29).
 */
export const Postures = Object.freeze({
  standing: "standing",
  sitting: "sitting",
  sedentary: "sedentary",
  reclining: "reclining",
  lying: "lying",
  supine: "supine",
  crouching: "crouching",
} as const);

/**
 * Enumeration for work intensity levels.
 *
 * Upstream's `WorkIntensity` (`classes_input.py:41-46`); a parameter accepts
 * either `WorkIntensity.HEAVY` or `"heavy"` (deviation _shared-77).
 */
export const WorkIntensity = Object.freeze({
  HEAVY: "heavy",
  MODERATE: "moderate",
  LIGHT: "light",
} as const);
