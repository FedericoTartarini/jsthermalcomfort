import type { ClassifierBins } from "./classifierBins.ts";
import type { Standard } from "../utilities/utilities.js";

/** One of the identifiers in `Standard`, e.g. `"7730-2025"` or `"55-2023"`. */
export type StandardId = (typeof Standard)[keyof typeof Standard];

/**
 * Shared JSDoc typedefs and utilities for model metadata.
 *
 * This module exports the type definitions used for `*_INFO` objects,
 * which describe a comfort model's inputs, outputs, and applicability limits.
 *
 * @module modelDocs
 * @internal Experimental — the shape of `ModelInfo` may change before release.
 */

/**
 * A bound on a variable (minimum and/or maximum).
 *
 * Readonly, because the runtime value is frozen. Without that, a consumer could
 * write `INFO.inputs.tdb.applicability.min = 5`, type-check cleanly, and then
 * throw at runtime — an ES module is always strict, so the assignment is not
 * silently ignored.
 */
export interface Bound {
  readonly min?: number;
  readonly max?: number;
}

/**
 * One applicability bound a call broke.
 *
 * `key` names the quantity, `value` is what the call had for it (SI, and for a
 * `derived` or `output` row the unrounded value the gate compared), and `bound`
 * is the range it fell outside. `bound` is frozen. For a fixed limit it is the
 * shared object the model's `*_INFO` metadata references, not a copy; for a
 * limit that depends on the call, such as ASHRAE 55's airspeed limit between
 * 23 and 25.5 °C operative temperature when the occupant cannot control the
 * airspeed, it is built for that call. One quantity can break more than one
 * limit, so `key` can repeat.
 *
 * `role` says where the quantity comes from: `input` for one the caller
 * supplied, `derived` for one computed from the inputs (vapour pressure in
 * `pmv_ppd_iso`), `output` for a result the standard gates (the PMV band in
 * `pmv_ppd_iso`).
 *
 * Reported whatever `limit_inputs` is: with it on these are the reasons the
 * result is NaN, with it off they are what the numbers were computed despite.
 *
 * @public
 */
export interface ApplicabilityWarning {
  readonly key: string;
  readonly role: "input" | "derived" | "output";
  readonly value: number;
  readonly bound: Bound;
}

export type { ClassifierBins };

/**
 * Metadata for a single input or output variable of a model.
 *
 * `unit` is the unit of measurement, or `null` if dimensionless.
 *
 * `applicability` is the range over which the model is applicable. It is an
 * **applicability gate, not a clamp**. Outside it, and only when `limit_inputs`
 * is enabled, the model returns NaN — it does not constrain the value to the
 * bound. On an output such as `pmv_ppd_iso`'s `pmv`, read it as "results
 * outside this band are suppressed", not "the output is guaranteed to fall
 * inside it". A front end should surface it as a condition on the answer rather
 * than as a slider limit.
 *
 * `classifier`, if present, holds the bins used to turn this continuous output
 * into a categorical label. Pass it to `classifyFromBins` rather than
 * reimplementing the edge handling.
 */
export interface VariableInfo {
  readonly unit: string | null;
  readonly applicability?: Bound;
  readonly classifier?: ClassifierBins;
}

/**
 * Metadata describing a thermal comfort model.
 *
 * Experimental — the shape may change before release.
 *
 * `name` is the name the model is exported under, written once, and it is
 * exactly pythermalcomfort's function name for the model:
 * `PMV_PPD_ISO_INFO.name` is `"pmv_ppd_iso"`, and `name.toUpperCase() +
 * "_INFO"` is this object's own export name. A front end can key a model by
 * it without keeping its own copy of the string.
 *
 * `label` is the human-readable model name, `description` a one-sentence
 * summary of what it computes.
 *
 * `inputs` lists physical quantities only; control parameters (`round`,
 * `units`, `limit_inputs` and so on) are excluded. `outputs` are the returned
 * values. `derived` covers quantities computed from the inputs rather than
 * supplied by the caller — vapour pressure in `pmv_ppd_iso`, for instance,
 * which has an applicability bound of its own.
 *
 * `standards` lists the editions this function accepts, default first; empty
 * for a model with no standard. Every entry is a `Standard` value.
 *
 * @public
 */
export interface ModelInfo {
  readonly name: string;
  readonly label: string;
  readonly description: string;
  readonly standards: readonly StandardId[];
  readonly inputs: Readonly<Record<string, VariableInfo>>;
  readonly outputs: Readonly<Record<string, VariableInfo>>;
  readonly derived?: Readonly<Record<string, VariableInfo>>;
}

/**
 * Deep-freezes an object and all nested objects, preventing accidental mutations.
 *
 * Used to lock down model metadata so consumers and the runtime cannot diverge.
 * Handles cycles via WeakSet tracking and recurses into already-frozen objects
 * to ensure their properties are also frozen.
 *
 * @param {Object} obj - The object to freeze.
 * @returns {Object} The same object, now frozen.
 * @internal
 */
export function deepFreeze<T extends object>(
  obj: T,
  visited: WeakSet<object> = new WeakSet(),
): Readonly<T> {
  // Prevent infinite recursion on circular references
  if (visited.has(obj)) {
    return obj;
  }
  visited.add(obj);

  // Freeze the object itself
  Object.freeze(obj);

  // Recursively freeze all owned properties, regardless of current frozen state
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const value = (obj as Record<string, unknown>)[prop];
    // Only recurse if it's an object (including arrays)
    if (value !== null && typeof value === "object") {
      deepFreeze(value, visited);
    }
  });

  return obj;
}
