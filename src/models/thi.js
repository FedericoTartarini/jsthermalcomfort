import { validateInputs } from "../utilities/utilities.js";

/**
 * Calculate the Temperature-Humidity Index (THI), using Celsius inputs and
 * the same equation as pythermalcomfort.models.thi.
 * Scalars and one-dimensional arrays are supported. A scalar or a single-element
 * array is broadcast against the other input; otherwise array lengths must match.
 * Rounding uses ties-to-even, matching NumPy rather than Math.round.
 *
 * @public
 * @memberof models
 * @docname Temperature-Humidity Index (THI)
 * @param {number|number[]} tdb - Dry bulb air temperature, [°C].
 * @param {number|number[]} rh - Relative humidity, [%], between 0 and 100.
 * @param {boolean} [round_output=true] - Round the result to one decimal place.
 * @returns {{thi: number|number[]}} Temperature-Humidity Index.
 * @throws {TypeError} If inputs have invalid types or non-finite numeric values.
 * @throws {RangeError} If humidity is outside [0, 100] or array lengths cannot broadcast.
 * @example
 * thi(30, 70); // { thi: 81.4 }
 * thi(30, 70, false); // { thi: 81.38 }
 * thi([30, 20], [70, 50]); // { thi: [81.4, 65.2] }
 */
export function thi(tdb, rh, round_output = true) {
  validateInputs({ round_output }, { round_output: { type: "boolean" } });
  const temperatures = Array.isArray(tdb) ? tdb : [tdb];
  const humidities = Array.isArray(rh) ? rh : [rh];
  for (const value of temperatures) {
    validateInputs({ tdb: value }, { tdb: { type: "number" } });
  }
  for (const value of humidities) {
    validateInputs({ rh: value }, { rh: { type: "number", min: 0, max: 100 } });
  }
  if (
    temperatures.length !== humidities.length &&
    temperatures.length !== 1 &&
    humidities.length !== 1
  ) {
    throw new RangeError(
      "tdb and rh array lengths cannot be broadcast together",
    );
  }
  const length =
    temperatures.length === 1 ? humidities.length : temperatures.length;
  const values = Array.from({ length }, (_, index) => {
    const t = temperatures[temperatures.length === 1 ? 0 : index];
    const h = humidities[humidities.length === 1 ? 0 : index];
    const value = 1.8 * t + 32 - 0.55 * (1 - 0.01 * h) * (1.8 * t - 26);
    if (!round_output) return value;
    // NumPy rounds exact halfway values to the nearest even digit.
    const scaled = value * 10;
    const lower = Math.floor(scaled);
    return (
      (scaled - lower === 0.5
        ? lower + (Math.abs(lower) % 2)
        : Math.round(scaled)) / 10
    );
  });
  return { thi: Array.isArray(tdb) || Array.isArray(rh) ? values : values[0] };
}
