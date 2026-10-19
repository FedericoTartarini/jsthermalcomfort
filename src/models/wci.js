function validateNumericInput(value, name) {
  const values = Array.isArray(value) ? value : [value];
  for (const item of values) {
    if (typeof item !== "number") {
      throw new TypeError(
        `Parameter "${name}" must be a number or an array of numbers`,
      );
    }
  }
}

// NumPy rounds halfway values to the nearest even digit, unlike Math.round.
function roundToEven(value) {
  const scaled = value * 10;
  const lower = Math.floor(scaled);
  const rounded =
    scaled - lower === 0.5
      ? lower % 2 === 0
        ? lower
        : lower + 1
      : Math.round(scaled);
  return rounded / 10;
}

/**
 * Calculates the Wind Chill Index (WCI) in accordance with the ASHRAE 2017 Handbook Fundamentals - Chapter 9 {@link #ref_18|[18]}.
 *
 * The wind chill index (WCI) is an empirical index based on cooling measurements taken on a cylindrical flask partially
 * filled with water in Antarctica (Siple and Passel 1945). For a surface temperature of 33°C, the index describes the
 * rate of heat loss from the cylinder via radiation and convection as a function of ambient temperature and wind velocity.
 *
 * This formulation has been met with some valid criticism. WCI is unlikely to be an accurate measure of heat loss from
 * exposed flesh, which differs from plastic in terms of curvature, roughness, and radiation exchange qualities, and is
 * always below 33°C in a cold environment. Furthermore, the equation’s values peak at 90 km/h and then decline as velocity
 * increases. Nonetheless, this score reliably represents the combined effects of temperature and wind on subjective discomfort
 * for velocities below 80 km/h {@link #ref_18|[18]}.
 *
 * @public
 * @memberof models
 * @docname Wind chill index
 *
 * @param {number|number[]} tdb - dry bulb air temperature,[°C]
 * @param {number|number[]} v - wind speed 10m above ground level, [m/s]
 * @param {boolean} [round_output=true] - Whether to round the result to one decimal place (ties to even, as in NumPy).
 * @returns {{wci: number|number[]}} wind chill index, [W/m2]
 *
 * Arrays are evaluated elementwise. Scalars and one-element arrays broadcast
 * over the other input; other unequal array lengths raise RangeError.
 *
 * @example
 * wci(-5, 5.5); // { wci: 1255.2 }
 * wci([-5, -10], [5.5, 10]); // { wci: [1255.2, 1603.9] }
 * wci(0, 0.1, false); // { wci: 518.5877043196023 }
 */
export function wci(tdb, v, round_output = true) {
  validateNumericInput(tdb, "tdb");
  validateNumericInput(v, "v");
  if (typeof round_output !== "boolean") {
    throw new TypeError('Parameter "round_output" must be a boolean');
  }

  const calculate = (temperature, speed) => {
    const value =
      (10.45 + 10 * speed ** 0.5 - speed) * (33 - temperature) * 1.163;
    return round_output ? roundToEven(value) : value;
  };

  if (!Array.isArray(tdb) && !Array.isArray(v)) {
    return { wci: calculate(tdb, v) };
  }
  const temperatures = Array.isArray(tdb) ? tdb : [tdb];
  const speeds = Array.isArray(v) ? v : [v];
  if (
    temperatures.length !== speeds.length &&
    temperatures.length !== 1 &&
    speeds.length !== 1
  ) {
    throw new RangeError("tdb and v arrays must have compatible lengths");
  }
  const length =
    temperatures.length === 1 ? speeds.length : temperatures.length;
  return {
    wci: Array.from({ length }, (_, i) =>
      calculate(
        temperatures[temperatures.length === 1 ? 0 : i],
        speeds[speeds.length === 1 ? 0 : i],
      ),
    ),
  };
}
