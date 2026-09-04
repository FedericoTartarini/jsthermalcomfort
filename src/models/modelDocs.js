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
 * Metadata for a single input or output variable of a model.
 *
 * @typedef {object} VariableInfo
 * @property {string|null} unit - Unit of measurement, or `null` if dimensionless.
 * @property {Bound} [applicability] - Applicability limits for this variable (inputs only).
 *    For outputs, describes the valid range of the output (e.g. PMV output is valid in [-2, 2]).
 * @property {Object} [classifier] - If present, a bin configuration for `classifyFromBins`.
 *    Has shape `{ edges: number[], labels: string[], right: boolean }`.
 *    Used to convert continuous outputs into categorical labels.
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
 *
 * @param {Object} obj - The object to freeze.
 * @returns {Object} The same object, now frozen.
 * @internal
 */
export function deepFreeze(obj) {
  // Freeze the object itself
  Object.freeze(obj);

  // Recursively freeze all owned properties
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const value = obj[prop];
    // Only freeze if it's an object (including arrays) and not already frozen
    if (value !== null && (typeof value === "object") && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  });

  return obj;
}
