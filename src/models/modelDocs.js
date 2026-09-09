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
 *
 * @typedef {Readonly<{ min?: number, max?: number }>} Bound
 */

/**
 * Bin configuration for `classifyFromBins`.
 *
 * Readonly, including the arrays — see `Bound`.
 *
 * @typedef {Readonly<{
 *   edges: ReadonlyArray<number>,
 *   labels: ReadonlyArray<string>,
 *   right: boolean,
 * }>} ClassifierBins
 *
 * `edges` are the upper bin boundaries, ascending. `labels` has one entry per
 * bin, the same length as `edges`. `right` is `true` for right-inclusive bins
 * (`value <= edge`) and `false` for left-inclusive (`value < edge`); the two
 * conventions disagree on values landing exactly on an edge, so this is not
 * incidental.
 */

/**
 * Metadata for a single input or output variable of a model.
 *
 * @typedef {Readonly<{
 *   unit: string | null,
 *   applicability?: Bound,
 *   classifier?: ClassifierBins,
 * }>} VariableInfo
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

/**
 * Metadata describing a thermal comfort model.
 *
 * Experimental — the shape may change before release.
 *
 * @typedef {Readonly<{
 *   label: string,
 *   description: string,
 *   inputs: Readonly<Record<string, VariableInfo>>,
 *   outputs: Readonly<Record<string, VariableInfo>>,
 *   derived?: Readonly<Record<string, VariableInfo>>,
 * }>} ModelInfo
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
 * @public

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
export function deepFreeze(obj, visited = new WeakSet()) {
  // Prevent infinite recursion on circular references
  if (visited.has(obj)) {
    return obj;
  }
  visited.add(obj);

  // Freeze the object itself
  Object.freeze(obj);

  // Recursively freeze all owned properties, regardless of current frozen state
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const value = obj[prop];
    // Only recurse if it's an object (including arrays)
    if (value !== null && typeof value === "object") {
      deepFreeze(value, visited);
    }
  });

  return obj;
}
