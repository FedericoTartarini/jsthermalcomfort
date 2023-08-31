/**
 * Calculates the wet-bulb temperature using the Stull equation [6]
 *
 * @param {number} airTemperature - air temperature, [°C]
 * @param {number} relativeHumidity - relative humidity, [%]
 * @returns {number} - wet-bulb temperature, [°C]
 */
export function t_wb(airTemperature, relativeHumidity) {
  const twb =
    Math.round(
      (airTemperature *
        Math.atan(0.151977 * Math.pow(relativeHumidity + 8.313659, 0.5)) +
        Math.atan(airTemperature + relativeHumidity) -
        Math.atan(relativeHumidity - 1.676331) +
        0.00391838 *
          Math.pow(relativeHumidity, 1.5) *
          Math.atan(0.023101 * relativeHumidity) -
        4.686035) *
        10,
    ) / 10;

  return twb;
}
