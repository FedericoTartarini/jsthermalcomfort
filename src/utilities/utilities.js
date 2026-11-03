import { notOfType } from "../_internal/errors.ts";
import { pythonRound, round } from "../_internal/round.ts";
import { pythonSum } from "../_internal/pythonSum.ts";
import { units_converter } from "./units_converter.ts";

/**
 * Estimates the relative air speed which combines the average air speed of the
 * space plus the relative air speed caused by the body movement. Vag is assumed
 * to be 0 for metabolic rates equal and lower than 1 met and otherwise equal to
 * Vag = 0.3 (M - 1) (m/s)
 *
 * @public
 * @memberof utilities
 * @docname Relative air speed
 *
 * @param {number} v - air spped measured by the sensor, [m/s]
 * @param {number} met - metabolic rate, [met]
 * @returns {number} relative air speed, [m/s]
 */
export function v_relative(v, met) {
  for (const [key, value] of Object.entries({ v, met })) {
    if (typeof value !== "number") throw notOfType(key, "a number");
  }
  if (met <= 1) return v;
  return _v_relative_single(v, met);
}

/**
 * @param {number} v
 * @param {number} met
 * @returns {number}
 */
function _v_relative_single(v, met) {
  return round(v + 0.3 * (met - 1), 3);
}

// FIXME: find how to write math notation inside JSDocs

/**
 * Estimates the running mean temperature also known as prevailing mean outdoor temperature
 *
 * @public
 * @memberof utilities
 * @docname Running mean outdoor temperature
 *
 * @param {number[]} temp_array - array containing the mean daily temperature in descending order (i.e. from
 * newest/yestedayr to oldest) :math:`[t_{day-1}, t_{day-2}, ... , t_{day-n}]`,
 * Where :math:`t_{day-1}` is yesterday's daily mean temperature. The EN
 * 16798-1 2019 {@link #ref_3|[3]} states that n should be equal to 7
 *
 * @param {number} [alpha=0.8] - constant between 0 and 1. The EN 16798-1 2019 {@link #ref_3|[3]} recommends a value of 0.8,
 * while the ASHRAE 55 2020 recommends to choose values between 0.9 and 0.6,
 * corresponding to a slow- and fast- response running mean, respectively.
 * Adaptive comfort theory suggest that a slow-response running mean (alpha = 0.9)
 * could be more appropriate for climates in which synoptic-scale (day-to-day)
 * temperature dynamics are relatively minor, sich as the humid tropics.
 *
 * @param {"IP" | "SI"} [units="SI"] - select the SI (International System of Units) or the IP (Imperial Units) system.
 *
 * @returns {number} running mean outdoor temperature
 */
export function running_mean_outdoor_temperature(
  temp_array,
  alpha = 0.8,
  units = "SI",
) {
  if (!Array.isArray(temp_array)) throw notOfType("temp_array", "an array");
  for (const tdb of temp_array) {
    if (typeof tdb !== "number") {
      throw notOfType("temp_array", "an array of numbers");
    }
  }
  if (typeof alpha !== "number") throw notOfType("alpha", "a number");
  if (typeof units !== "string") throw notOfType("units", "a string");
  units = units.toUpperCase();
  if (units === "IP")
    temp_array = temp_array.map((tdb) => units_converter("IP", { tdb }).tdb);

  const coeff = temp_array.map((_tdb, ix) => Math.pow(alpha, ix));
  // Python's sum and division message depend on which items are ints, an
  // integral number read as one (decisions 271, 331, 332) and the IP path's
  // conversion returning floats.
  const isInt = (x) => Number.isInteger(x) && !Object.is(x, -0);
  const coeffInt = coeff.map(() => isInt(alpha));
  const productInt = temp_array.map(
    (tdb) => isInt(alpha) && units !== "IP" && isInt(tdb),
  );
  const summ_t_rm = pythonSum(
    temp_array.map((tdb, ix) => coeff[ix] * tdb),
    productInt,
  );
  const summ_coeff = pythonSum(coeff, coeffInt);
  // Python raises ZeroDivisionError here, a RangeError (ADR 0022).
  if (summ_coeff === 0) {
    throw new RangeError(
      // Both sums are ints when every weighted temperature is, whose int alpha
      // makes every weight one too.
      productInt.every(Boolean) ? "division by zero" : "float division by zero",
    );
  }
  let t_rm = summ_t_rm / summ_coeff;
  if (units === "IP") t_rm = units_converter("SI", { tmp: t_rm }).tmp;

  return pythonRound(t_rm, 1);
}

/**
 * Calculates the sky-vault view fraction
 *
 * @public
 * @memberof utilities
 * @docname Sky-vault view fraction
 *
 * @param {number} w - width of the window, [m]
 * @param {number} h - height of the window, [m]
 * @param {number} d - distance between the occupant and the window, [m]
 *
 * @returns {number} sky-vault view faction ranges between 0 and 1
 */
export function f_svv(w, h, d) {
  for (const [key, value] of Object.entries({ w, h, d })) {
    if (typeof value !== "number") throw notOfType(key, "a number");
  }
  let h_degrees = Math.atan(h / (2 * d)) * (180 / Math.PI);
  let w_degrees = Math.atan(w / (2 * d)) * (180 / Math.PI);
  return (h_degrees * w_degrees) / 16200;
}

/**
 * Met values of typical tasks. Keyed the same way pythermalcomfort keys
 * `met_typical_tasks` in `utilities.py`.
 * @public
 * @memberof reference_values
 * @docname Met typical tasks, [met]
 * @constant
 * @type {Readonly<Record<string, number>>}
 * @example
 * import { met_typical_tasks } from "jsthermalcomfort/utilities"; //The path to utilities
 * console.log(met_typical_tasks["Seated, quiet"]);
 * // output 1.0
 */
export const met_typical_tasks = Object.freeze({
  Sleeping: 0.7,
  Reclining: 0.8,
  "Seated, quiet": 1.0,
  "Reading, seated": 1.0,
  Writing: 1.0,
  Typing: 1.1,
  "Standing, relaxed": 1.2,
  "Filing, seated": 1.2,
  "Flying aircraft, routine": 1.2,
  "Filing, standing": 1.4,
  "Driving a car": 1.5,
  "Walking about": 1.7,
  Cooking: 1.8,
  "Table sawing": 1.8,
  "Walking 2mph (3.2kmh)": 2.0,
  "Lifting/packing": 2.1,
  "Seated, heavy limb movement": 2.2,
  "Light machine work": 2.2,
  "Flying aircraft, combat": 2.4,
  "Walking 3mph (4.8kmh)": 2.6,
  "House cleaning": 2.7,
  "Driving, heavy vehicle": 3.2,
  Dancing: 3.4,
  Calisthenics: 3.5,
  "Walking 4mph (6.4kmh)": 3.8,
  Tennis: 3.8,
  "Heavy machine work": 4.0,
  "Handling 100lb (45 kg) bags": 4.0,
  "Pick and shovel work": 4.4,
  Basketball: 6.3,
  Wrestling: 7.8,
});

/**
 * Total clothing insulation of typical ensembles, keyed the same way
 * pythermalcomfort keys `clo_typical_ensembles` in `utilities.py`.
 * @public
 * @memberof reference_values
 * @docname Typical ensembles insulation, [clo]
 * @constant
 * @example
 * import { clo_typical_ensembles } from "jsthermalcomfort/utilities";
 * console.log(clo_typical_ensembles["Trousers, long-sleeve shirt"]);
 * // output 0.61
 */
export const clo_typical_ensembles = Object.freeze({
  "Walking shorts, short-sleeve shirt": 0.36,
  "Typical summer indoor clothing": 0.5,
  "Knee-length skirt, short-sleeve shirt, sandals, underwear": 0.54,
  "Trousers, short-sleeve shirt, socks, shoes, underwear": 0.57,
  "Trousers, long-sleeve shirt": 0.61,
  "Knee-length skirt, long-sleeve shirt, full slip": 0.67,
  "Sweat pants, long-sleeve sweatshirt": 0.74,
  "Jacket, Trousers, long-sleeve shirt": 0.96,
  "Typical winter indoor clothing": 1.0,
});

/**
 * Clo values of individual clothing elements. To calculate the total clothing
 * insulation you need to add these values together. Keyed the same way
 * pythermalcomfort keys `clo_individual_garments` in `utilities.py`.
 * @public
 * @memberof reference_values
 * @docname Insulation of individual garments, [clo]
 * @constant
 * @type {Readonly<Record<string, number>>}
 * @example
 * import { clo_individual_garments } from "jsthermalcomfort/utilities"; //The path to utilities
 * console.log(clo_individual_garments["Metal chair"]);
 * // output 0.0
 */
export const clo_individual_garments = Object.freeze({
  "Metal chair": 0.0,
  Bra: 0.01,
  "Wooden stool": 0.01,
  "Ankle socks": 0.02,
  "Shoes or sandals": 0.02,
  Slippers: 0.03,
  "Panty hose": 0.02,
  "Calf length socks": 0.03,
  "Women's underwear": 0.03,
  "Men's underwear": 0.04,
  "Knee socks (thick)": 0.06,
  "Short shorts": 0.06,
  "Walking shorts": 0.08,
  "T-shirt": 0.08,
  "Standard office chair": 0.1,
  "Executive chair": 0.15,
  Boots: 0.1,
  "Sleeveless scoop-neck blouse": 0.12,
  "Half slip": 0.14,
  "Long underwear bottoms": 0.15,
  "Full slip": 0.16,
  "Short-sleeve knit shirt": 0.17,
  "Sleeveless vest (thin)": 0.1,
  "Sleeveless vest (thick)": 0.17,
  "Sleeveless short gown (thin)": 0.18,
  "Short-sleeve dress shirt": 0.19,
  "Sleeveless long gown (thin)": 0.2,
  "Long underwear top": 0.2,
  "Thick skirt": 0.23,
  "Long-sleeve dress shirt": 0.25,
  "Long-sleeve flannel shirt": 0.34,
  "Long-sleeve sweat shirt": 0.34,
  "Short-sleeve hospital gown": 0.31,
  "Short-sleeve short robe (thin)": 0.34,
  "Short-sleeve pajamas": 0.42,
  "Long-sleeve long gown": 0.46,
  "Long-sleeve short wrap robe (thick)": 0.48,
  "Long-sleeve pajamas (thick)": 0.57,
  "Long-sleeve long wrap robe (thick)": 0.69,
  "Thin trousers": 0.15,
  "Thick trousers": 0.24,
  Sweatpants: 0.28,
  Overalls: 0.3,
  Coveralls: 0.49,
  "Thin skirt": 0.14,
  "Long-sleeve shirt dress (thin)": 0.33,
  "Long-sleeve shirt dress (thick)": 0.47,
  "Short-sleeve shirt dress": 0.29,
  "Sleeveless, scoop-neck shirt (thin)": 0.23,
  "Sleeveless, scoop-neck shirt (thick)": 0.27,
  "Long sleeve shirt (thin)": 0.25,
  "Long sleeve shirt (thick)": 0.36,
  "Single-breasted coat (thin)": 0.36,
  "Single-breasted coat (thick)": 0.44,
  "Double-breasted coat (thin)": 0.42,
  "Double-breasted coat (thick)": 0.48,
});

/**
 * The keys of `clo_individual_garments` grouped under the eight headings of
 * ASHRAE 55's garment insulation table, in the table's order, with the chairs
 * as a last group in the chair table's order. The headings and rows are those
 * of Table 5.2.2.2B and Table 5.2.2.2C as printed in Addendum h to ASHRAE
 * 55-2010 (2013); Addendum f to 55-2020 (2021) refers to these tables as
 * Tables 5-3 and 5-4. Every key is in exactly one group, so the sum over the
 * garments chosen from these groups is the sum over the same keys of
 * `clo_individual_garments`.
 *
 * pythermalcomfort has no counterpart: its `clo_individual_garments` is a flat
 * dict with no groups. This export is added for the CBE Thermal Comfort Tool,
 * whose ensemble dialog is designed to list the garments under the table's
 * headings (ADR 0001: a deviation may add an export).
 * `clo_individual_garments` itself is not re-ordered, re-keyed or added to.
 *
 * Each key is placed with the row whose value it holds. Where the key's name
 * differs from that row's:
 * - "Shoes or sandals" (0.02) has the value of Footwear's "Shoes" and
 *   "Sandals/thongs".
 * - "Sleeveless vest (thin)" (0.10) and "Sleeveless vest (thick)" (0.17) have
 *   the values of the Suit Jackets and Vests rows of those names. The
 *   Sweaters rows of the same names (0.13 and 0.22) have no key.
 * - "Long sleeve shirt (thin)" (0.25) and "Long sleeve shirt (thick)" (0.36)
 *   have the values of the Sweaters' "Long-sleeve" rows; Shirts and Blouses
 *   has no row at 0.36.
 * - "Sleeveless, scoop-neck shirt (thin)" (0.23) and "Sleeveless, scoop-neck
 *   shirt (thick)" (0.27) have the values of the Dress and Skirts'
 *   "Sleeveless, scoop neck" rows; Shirts and Blouses has no row at 0.23 or
 *   0.27, and its "Sleeveless/scoop-neck blouse" (0.12) is the key
 *   "Sleeveless scoop-neck blouse".
 * @public
 * @memberof reference_values
 * @docname Garment groups of the ASHRAE 55 garment table
 * @constant
 * @type {ReadonlyArray<Readonly<{ group: string, garments: ReadonlyArray<keyof typeof clo_individual_garments> }>>}
 * @example
 * import { CLO_INDIVIDUAL_GARMENT_GROUPS } from "jsthermalcomfort";
 * console.log(CLO_INDIVIDUAL_GARMENT_GROUPS[8]);
 * // output { group: "Chairs", garments: ["Metal chair", "Wooden stool", "Standard office chair", "Executive chair"] }
 */
export const CLO_INDIVIDUAL_GARMENT_GROUPS = Object.freeze(
  [
    {
      group: "Underwear",
      garments: [
        "Bra",
        "Women's underwear",
        "Men's underwear",
        "T-shirt",
        "Half slip",
        "Long underwear bottoms",
        "Full slip",
        "Long underwear top",
      ],
    },
    {
      group: "Footwear",
      garments: [
        "Ankle socks",
        "Panty hose",
        "Shoes or sandals",
        "Slippers",
        "Calf length socks",
        "Knee socks (thick)",
        "Boots",
      ],
    },
    {
      group: "Shirts and Blouses",
      garments: [
        "Sleeveless scoop-neck blouse",
        "Short-sleeve knit shirt",
        "Short-sleeve dress shirt",
        "Long-sleeve dress shirt",
        "Long-sleeve flannel shirt",
        "Long-sleeve sweat shirt",
      ],
    },
    {
      group: "Trousers and Coveralls",
      garments: [
        "Short shorts",
        "Walking shorts",
        "Thin trousers",
        "Thick trousers",
        "Sweatpants",
        "Overalls",
        "Coveralls",
      ],
    },
    {
      group: "Dress and Skirts",
      garments: [
        "Thin skirt",
        "Thick skirt",
        "Sleeveless, scoop-neck shirt (thin)",
        "Sleeveless, scoop-neck shirt (thick)",
        "Short-sleeve shirt dress",
        "Long-sleeve shirt dress (thin)",
        "Long-sleeve shirt dress (thick)",
      ],
    },
    {
      group: "Sweaters",
      garments: ["Long sleeve shirt (thin)", "Long sleeve shirt (thick)"],
    },
    {
      group: "Suit Jackets and Vests",
      garments: [
        "Sleeveless vest (thin)",
        "Sleeveless vest (thick)",
        "Single-breasted coat (thin)",
        "Single-breasted coat (thick)",
        "Double-breasted coat (thin)",
        "Double-breasted coat (thick)",
      ],
    },
    {
      group: "Sleepwear and Robes",
      garments: [
        "Sleeveless short gown (thin)",
        "Sleeveless long gown (thin)",
        "Short-sleeve hospital gown",
        "Short-sleeve short robe (thin)",
        "Short-sleeve pajamas",
        "Long-sleeve long gown",
        "Long-sleeve short wrap robe (thick)",
        "Long-sleeve pajamas (thick)",
        "Long-sleeve long wrap robe (thick)",
      ],
    },
    {
      group: "Chairs",
      garments: [
        "Metal chair",
        "Wooden stool",
        "Standard office chair",
        "Executive chair",
      ],
    },
  ].map(({ group, garments }) =>
    Object.freeze({ group, garments: Object.freeze(garments) }),
  ),
);
