import { round, validateInputs } from "../utilities/utilities.js";

/**
 * Calculates the Wind Chill Temperature (WCT) using the North American
 * formula adopted by the US National Weather Service and Environment
 * Canada in 2001 {@link https://en.wikipedia.org/wiki/Wind_chill#North_American_and_United_Kingdom_wind_chill_index}.
 *
 * WCT estimates the equivalent perceived air temperature on exposed skin
 * given dry-bulb air temperature and 10 m wind speed. It is reported in
 * the same unit as `tdb` (°C). The formula is empirical and is intended
 * for cold-weather conditions; outside that range it still evaluates but
 * carries no physical interpretation. Following `pythermalcomfort`, this
 * implementation does not gate inputs against an applicability range; the
 * formula is computed for any finite input.
 *
 * @public
 * @memberof models
 * @docname Wind chill temperature
 *
 * @param {number} tdb - dry-bulb air temperature, [°C]
 * @param {number} v - wind speed 10 m above ground level, [km/h]
 * @param {boolean} [round_output=true] - if true, rounds the returned value to one decimal place; if false, returns the unrounded value.
 * @returns {{wct: number}} wind chill temperature, [°C]
 */
const WCT_SCHEMA = {
  tdb: { type: "number" },
  v: { type: "number" },
  round_output: { type: "boolean", required: false },
};

export function wind_chill_temperature(tdb, v, round_output = true) {
  validateInputs({ tdb, v, round_output }, WCT_SCHEMA);

  let wct =
    13.12 +
    0.6215 * tdb -
    11.37 * Math.pow(v, 0.16) +
    0.3965 * tdb * Math.pow(v, 0.16);

  if (round_output) {
    wct = round(wct, 1);
  }
  return { wct };
}
