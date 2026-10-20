import { ew } from "../jos3_functions/_numpy.ts";
import type { NumOrArray } from "../jos3_functions/_numpy.ts";

// Moved from jos3_functions/thermoregulation/evaporation.js to upstream's
// home, pythermalcomfort/psychrometrics/antoine.py (v4.6.2). Upstream also
// exports it from pythermalcomfort.psychrometrics; whether the library's
// psychrometrics export it is left to the psychrometrics ticket. The JSDoc
// said the temperature is in Kelvin; upstream's docstring says °C (:16-17),
// which the formula's `tdb + 235` takes.
/**
 * Calculate saturated vapor pressure using Antoine equation [kPa]
 * (`pythermalcomfort/psychrometrics/antoine.py:11-25` at v4.6.2).
 *
 * @param {number | number[]} tdb - Temperature [°C].
 * @returns {number | number[]} Saturated vapor pressure [kPa].
 */
export function antoine(tdb: number): number;
export function antoine(tdb: readonly number[]): number[];
export function antoine(tdb: NumOrArray): number | number[];
export function antoine(tdb: NumOrArray): number | number[] {
  // math.e ** (...) on a float64 array is numpy's power, the C library's
  // pow, as Math.E ** (...) is V8's.
  return ew((t) => Math.E ** (16.6536 - 4030.183 / (t + 235)), tdb);
}
