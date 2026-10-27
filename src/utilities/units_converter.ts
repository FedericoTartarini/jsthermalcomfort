import { notOfType } from "../_internal/errors.ts";
import { Units } from "./options.ts";

/** A value as a helper takes it: a number, NaN and ±Infinity included. */
function asNumber(key: string, value: unknown): number {
  if (typeof value !== "number") throw notOfType(key, "a number");
  return value;
}

/**
 * Convert IP values to SI units, or SI values to IP units.
 *
 * @param from_units - specify system to convert from
 * @param values - [t, v]
 * @returns converted values in SI units, or in IP units if `from_units` is
 * 'SI'
 */
export function units_converter<K extends string>(
  from_units: (typeof Units)[keyof typeof Units] = Units.IP,
  values: Readonly<Record<K, number>> = {} as Record<K, number>,
): {
  // The keys it converts, as upstream tests each key.
  [
    P in K as P extends
      | `${string}tmp${string}`
      | "tr"
      | "tdb"
      | "v"
      | "vr"
      | "vel"
      | "area"
      | "pressure"
      ? P
      : never
  ]: number;
} {
  if (typeof (from_units as unknown) !== "string") {
    throw notOfType("from_units", "a string");
  }
  const kwargs: unknown = values;
  if (typeof kwargs !== "object" || kwargs === null || Array.isArray(kwargs)) {
    throw notOfType("values", "an object");
  }
  const results: Record<string, number> = {};
  const from_units_upper = from_units.toUpperCase();
  if (from_units_upper === Units.IP) {
    for (const [key, value] of Object.entries(kwargs)) {
      if (value === undefined) continue;
      if (key.includes("tmp") || key === "tr" || key === "tdb") {
        results[key] = ((asNumber(key, value) - 32) * 5) / 9;
      }
      if (["v", "vr", "vel"].includes(key)) {
        results[key] = asNumber(key, value) / 3.281;
      }
      if (key === "area") {
        results[key] = asNumber(key, value) / 10.764;
      }
      if (key === "pressure") {
        results[key] = asNumber(key, value) * 101325;
      }
    }
  } else if (from_units_upper === Units.SI) {
    for (const [key, value] of Object.entries(kwargs)) {
      if (value === undefined) continue;
      if (key.includes("tmp") || key === "tr" || key === "tdb") {
        results[key] = (asNumber(key, value) * 9) / 5 + 32;
      }
      if (["v", "vr", "vel"].includes(key)) {
        results[key] = asNumber(key, value) * 3.281;
      }
      if (key === "area") {
        results[key] = asNumber(key, value) * 10.764;
      }
      if (key === "pressure") {
        results[key] = asNumber(key, value) / 101325;
      }
    }
  }

  return results as ReturnType<typeof units_converter<K>>;
}
