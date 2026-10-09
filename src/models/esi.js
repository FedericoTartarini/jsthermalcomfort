/**
 * Calculate the Environmental Stress Index (ESI), following Moran (2001).
 * Mirrors {@link https://pythermalcomfort.readthedocs.io/en/latest/documentation/models.html#environmental-stress-index-esi|pythermalcomfort.esi}.
 *
 * @public
 * @memberof models
 * @docname Environmental Stress Index (ESI)
 * @param {number|number[]} tdb - Dry bulb air temperature, [°C].
 * @param {number|number[]} rh - Relative humidity, [%], between 0 and 100.
 * @param {number|number[]} sol_radiation_global - Global solar radiation, [W/m²], greater than or equal to zero.
 * @param {boolean} [round_output=true] - Round to one decimal place, using NumPy's ties-to-even rule.
 * @returns {{esi: number|number[]}} Environmental Stress Index.
 *
 * Scalars and one-element arrays broadcast over one-dimensional arrays.
 * Other unequal array lengths raise RangeError. Invalid input types raise
 * TypeError; out-of-range humidity or radiation raises RangeError (Python ValueError).
 *
 * @example
 * esi(30.2, 42.2, 766); // { esi: 26.2 }
 * esi([30.2, 27.0], [42.2, 68.8], [766, 289]); // { esi: [26.2, 25.6] }
 * esi(30.2, 42.2, 766, false); // { esi: 26.173880712178565 }
 */
export function esi(tdb, rh, sol_radiation_global, round_output = true) {
  const inputs = { tdb, rh, sol_radiation_global };
  for (const [name, value] of Object.entries(inputs)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (typeof item !== "number") {
        throw new TypeError(
          `Parameter "${name}" must be a number or an array of numbers`,
        );
      }
      if (name === "rh" && (item < 0 || item > 100)) {
        throw new RangeError("Relative humidity must be between 0 and 100 %");
      }
      if (name === "sol_radiation_global" && item < 0) {
        throw new RangeError(
          "Solar radiation must be greater than or equal to 0 W/m²",
        );
      }
    }
  }
  if (typeof round_output !== "boolean") {
    throw new TypeError('Parameter "round_output" must be a boolean');
  }

  const calculate = (temperature, humidity, radiation) => {
    const value =
      0.63 * temperature -
      0.03 * humidity +
      0.002 * radiation +
      0.0054 * (temperature * humidity) -
      0.073 * (0.1 + radiation) ** -1;
    if (!round_output) return value;
    const scaled = value * 10;
    const lower = Math.floor(scaled);
    return (
      (scaled - lower === 0.5
        ? lower % 2 === 0
          ? lower
          : lower + 1
        : Math.round(scaled)) / 10
    );
  };

  const values = Object.values(inputs);
  if (!values.some(Array.isArray)) {
    return { esi: calculate(tdb, rh, sol_radiation_global) };
  }
  const arrays = values.map((value) =>
    Array.isArray(value) ? value : [value],
  );
  const lengths = new Set(
    arrays.map((array) => array.length).filter((length) => length !== 1),
  );
  if (lengths.size > 1) {
    throw new RangeError("ESI input arrays must have compatible lengths");
  }
  const length = lengths.size === 0 ? 1 : lengths.values().next().value;
  return {
    esi: Array.from({ length }, (_, index) =>
      calculate(
        arrays[0][arrays[0].length === 1 ? 0 : index],
        arrays[1][arrays[1].length === 1 ? 0 : index],
        arrays[2][arrays[2].length === 1 ? 0 : index],
      ),
    ),
  };
}
