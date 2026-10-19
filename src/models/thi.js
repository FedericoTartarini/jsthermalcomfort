import { validateInputs } from "../utilities/utilities.js";

/**
 * Calculate the Temperature-Humidity Index (THI), using Celsius inputs and
 * the same equation as pythermalcomfort.models.thi.
 * Inputs must be finite scalar numbers. Use Array.map() for multiple readings.
 * Rounding uses ties-to-even, matching NumPy rather than Math.round.
 *
 * @public
 * @memberof models
 * @docname Temperature-Humidity Index (THI)
 * @param {number} tdb - Dry bulb air temperature, [°C].
 * @param {number} rh - Relative humidity, [%], between 0 and 100.
 * @param {boolean} [round_output=true] - Round the result to one decimal place.
 * @returns {{thi: number}} Temperature-Humidity Index.
 * @throws {TypeError} If inputs have invalid types or non-finite numeric values.
 * @throws {RangeError} If humidity is outside [0, 100].
 * @example
 * thi(30, 70); // { thi: 81.4 }
 * thi(30, 70, false); // { thi: 81.38 }
 * [30, 20].map((t, i) => thi(t, [70, 50][i]).thi); // [81.4, 65.2]
 */
export function thi(tdb, rh, round_output = true) {
  validateInputs(
    { tdb, rh, round_output },
    {
      tdb: { type: "number" },
      rh: { type: "number", min: 0, max: 100 },
      round_output: { type: "boolean" },
    },
  );
  const value = 1.8 * tdb + 32 - 0.55 * (1 - 0.01 * rh) * (1.8 * tdb - 26);
  if (!round_output) return { thi: value };
  // NumPy rounds exact halfway values to the nearest even digit.
  const scaled = value * 10;
  const lower = Math.floor(scaled);
  return {
    thi:
      (scaled - lower === 0.5
        ? lower + (Math.abs(lower) % 2)
        : Math.round(scaled)) / 10,
  };
}
