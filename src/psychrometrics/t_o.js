/**
 * Calculates operative temperature in accordance with ISO 7726:1998.
 *
 *
 * @param {number} airTemperature - air temperature [C]
 * @param {number} meanRadiantTemperature - mean radiant temperature [C]
 * @param {number} airSpeed - air speed [m/s]
 * @param {("ISO" | "ASHRAE")} standard - the standard to use
 * @returns {number} operative temperature [C]
 */
export function t_o(
  airTemperature,
  meanRadiantTemperature,
  airSpeed,
  standard = "ISO",
) {
  if (airSpeed < 0) {
    throw new Error("airSpeed cannot be negative");
  }

  switch (standard) {
    case "ISO":
      return (
        (airTemperature * Math.sqrt(10 * airSpeed) + meanRadiantTemperature) /
        (1 + Math.sqrt(10 * airSpeed))
      );
    case "ASHRAE":
      let adjustment = airSpeed < 0.6 ? 0.6 : 0.7;
      adjustment = airSpeed < 0.2 ? 0.5 : adjustment;
      return (
        adjustment * airTemperature + (1 - adjustment) * meanRadiantTemperature
      );
    default:
      throw new Error("standard must be one of ISO or ASHRAE");
  }
}
