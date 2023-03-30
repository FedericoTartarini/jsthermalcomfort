interface HeatIndexOptions {
  round?: boolean;
  units?: "SI" | "IP";
}

/**
 * Calculates the Heat Index (HI). It combines air temperature and relative humidity to determine an apparent temperature.
 *
 * @param tdb Dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'.
 * @param rh Relative humidity, [%].
 * @param options (Optional) Other parameters.
 * @param options.round If True rounds output value, if False it does not round it.
 * @param options.units Select the SI (International System of Units) or the IP (Imperial Units) system.
 *
 * @returns Heat Index, default in [°C] in [°F] if `units` = 'IP'.
 *
 * @example
 * const hi = heatIndex(25, 50); // returns 25.9
 */
export function heatIndex(tdb: number, rh: number, options: HeatIndexOptions = {}): number {
  const defaultOptions: HeatIndexOptions = {
    round: true,
    units: "SI",
  };

  let round: boolean, units: "SI" | "IP";
  let heatIndexOptions: HeatIndexOptions;
  // @ts-ignore
  heatIndexOptions = {round, units} = Object.assign(defaultOptions, options);

  let hi: number;
  if (units === "SI") {
    hi =
      -8.784695 +
      1.61139411 * tdb +
      2.338549 * rh -
      0.14611605 * tdb * rh -
      0.012308094 * Math.pow(tdb, 2) -
      0.016424828 * Math.pow(rh, 2) +
      0.002211732 * Math.pow(tdb, 2) * rh +
      0.00072546 * tdb * Math.pow(rh, 2) -
      0.000003582 * Math.pow(tdb, 2) * Math.pow(rh, 2);
  } else {
    hi =
      -42.379 +
      2.04901523 * tdb +
      10.14333127 * rh -
      0.22475541 * tdb * rh -
      0.00683783 * Math.pow(tdb, 2) -
      0.05481717 * Math.pow(rh, 2) +
      0.00122874 * Math.pow(tdb, 2) * rh +
      0.00085282 * tdb * Math.pow(rh, 2) -
      0.00000199 * Math.pow(tdb, 2) * Math.pow(rh, 2);
  }

  if (round) {
    return Math.round(hi * 10) / 10;
  } else {
    return hi;
  }
}

export function helloWorld() {
  const message = 'Hello World from my example modern npm package!';
  return message;
}

export function goodBye() {
  const message = 'Goodbye from my example modern npm package!';
  return message;
}

export default {
  helloWorld,
  heatIndex,
  goodBye,
};