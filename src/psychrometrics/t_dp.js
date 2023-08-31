import { round } from "../utilities/utilities";

/**
 * Calculates the dew point temperature.
 * @param {number} bulbTemperature - dry bulb air temperature, [°C]
 * @param {number} relativeHumidity - relative humidity, [%]
 * @returns {number} - dew point temperature, [°C]
 */
export function t_dp(bulbTemperature, relativeHumidity) {
  const c = 257.14;
  const b = 18.678;
  const d = 234.5;

  const gamma_m = Math.log(
    (relativeHumidity / 100) *
      Math.exp(
        (b - bulbTemperature / d) * (bulbTemperature / (c + bulbTemperature)),
      ),
  );

  return round((c * gamma_m) / (b - gamma_m), 1);
}
