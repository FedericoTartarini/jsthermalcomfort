import { validateInputs } from "../utilities/utilities.js";

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
 * formula is evaluated without applicability limits. NaN values propagate.
 * Arrays use NumPy-style broadcasting; incompatible or ragged shapes throw
 * RangeError. Empty arrays return empty arrays when shapes are compatible.
 *
 * @public
 * @memberof models
 * @docname Wind chill temperature
 *
 * @param {number | Array} tdb - dry-bulb air temperature, [°C]
 * @param {number | Array} v - wind speed 10 m above ground level, [km/h]
 * @param {boolean} [round_output=true] - if true, rounds the returned value to one decimal place; if false, returns the unrounded value.
 * @returns {{wct: number | Array}} wind chill temperature, [°C]
 *
 * @example
 * wind_chill_temperature(-5, 5.5); // { wct: -7.5 }
 *
 * @example
 * wind_chill_temperature([-5, -10], [5.5, 10]); // { wct: [-7.5, -15.3] }
 */
export function wind_chill_temperature(tdb, v, round_output = true) {
  validateInputs(
    { round_output },
    {
      round_output: { type: "boolean" },
    },
  );
  const temperatureShape = numericShape(tdb);
  const speedShape = numericShape(v);
  const rank = Math.max(temperatureShape.length, speedShape.length);
  const left = Array(rank - temperatureShape.length)
    .fill(1)
    .concat(temperatureShape);
  const right = Array(rank - speedShape.length)
    .fill(1)
    .concat(speedShape);
  const shape = left.map((size, axis) => {
    if (size === right[axis]) return size;
    if (size === 1) return right[axis];
    if (right[axis] === 1) return size;
    throw new RangeError("tdb and v have incompatible broadcast shapes");
  });

  function calculate(indices) {
    if (indices.length < rank) {
      return Array.from({ length: shape[indices.length] }, (_, i) =>
        calculate([...indices, i]),
      );
    }
    const temperature = broadcastValue(tdb, temperatureShape, indices);
    const speed = broadcastValue(v, speedShape, indices);
    const wct =
      13.12 +
      0.6215 * temperature -
      11.37 * speed ** 0.16 +
      0.3965 * temperature * speed ** 0.16;
    if (!round_output) return wct;
    // NumPy rounds halfway values to the nearest even digit (Math.round does not).
    const scaled = wct * 10;
    const lower = Math.floor(scaled);
    const rounded =
      scaled - lower === 0.5
        ? lower % 2 === 0
          ? lower
          : lower + 1
        : Math.round(scaled);
    return rounded / 10;
  }

  return { wct: calculate([]) };
}

// Keep array handling local to WCT; other models retain their existing contracts.
function numericShape(value) {
  if (!Array.isArray(value)) {
    if (typeof value !== "number")
      throw new TypeError("tdb and v must contain numbers");
    return [];
  }
  const children = value.map(numericShape);
  const childShape = children[0] || [];
  if (
    children.some(
      (shape) =>
        shape.length !== childShape.length ||
        shape.some((n, i) => n !== childShape[i]),
    )
  ) {
    throw new RangeError("tdb and v must be rectangular arrays");
  }
  return [value.length, ...childShape];
}

function broadcastValue(value, shape, indices) {
  const offset = indices.length - shape.length;
  return shape.reduce(
    (item, size, axis) => item[size === 1 ? 0 : indices[offset + axis]],
    value,
  );
}
