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
 * @typedef {object} Bound
 * @property {number} [min] - Minimum value (inclusive).
 * @property {number} [max] - Maximum value (inclusive).
 */

/**
 * Bin configuration for `classifyFromBins`.
 *
 * @typedef {object} ClassifierBins
 * @property {number[]} edges - Upper bin boundaries, ascending.
 * @property {string[]} labels - One label per bin, same length as `edges`.
 * @property {boolean} right - `true` for right-inclusive bins (`value <= edge`),
 *    `false` for left-inclusive (`value < edge`). The two conventions disagree
 *    on values landing exactly on an edge, so this is not incidental.
 */

/**
 * Metadata for a single input or output variable of a model.
 *
 * @typedef {object} VariableInfo
 * @property {string|null} unit - Unit of measurement, or `null` if dimensionless.
 * @property {Bound} [applicability] - The range over which the model is applicable.
 *
 *    This is an **applicability gate, not a clamp**. Outside it, and only when
 *    `limit_inputs` is enabled, the model returns NaN — it does not constrain
 *    the value to the bound. On an output such as `pmv_ppd_iso`'s `pmv`, read
 *    it as "results outside this band are suppressed", not "the output is
 *    guaranteed to fall inside it". A front end should surface it as a
 *    condition on the answer rather than as a slider limit.
 * @property {ClassifierBins} [classifier] - If present, the bins used to turn
 *    this continuous output into a categorical label. Pass it to
 *    `classifyFromBins` rather than reimplementing the edge handling.
 */

/**
 * Metadata describing a thermal comfort model.
 *
 * Experimental — the shape may change before release.
 *
 * @typedef {object} ModelInfo
 * @property {string} label - Human-readable model name (e.g. "Heat Index (Rothfusz)").
 * @property {string} description - One-sentence summary of what the model computes.
 * @property {Object.<string, VariableInfo>} inputs - Input variables, keyed by name.
 *    Lists physical quantities only; control parameters (`round`, `units`, etc.) are excluded.
 * @property {Object.<string, VariableInfo>} outputs - Output variables, keyed by name.
 * @property {Object.<string, VariableInfo>} [derived] - Derived outputs computed from inputs
 *    (e.g. offsets on `t_cmf` in adaptive models). Optional.
 * @public
 */

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
