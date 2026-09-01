/**
 * Display name and summary on a model function.
 * `label` matches `@docname`; `description` matches the leading JSDoc first sentence.
 *
 * @typedef {object} ModelDocs
 * @property {string} label
 * @property {string} description
 */

/**
 * Offset from comfort temperature, [°C]. `id` matches the result-field stem.
 *
 * @typedef {object} AdaptiveOffset
 * @property {string} id
 * @property {number} lower
 * @property {number} upper
 */

/**
 * Inclusive applicability range for prevailing-mean outdoor temperature, [°C].
 *
 * @typedef {object} RunningMeanLimits
 * @property {number} min
 * @property {number} max
 */

/**
 * Attach static `label` and `description` strings on a model function.
 *
 * @param {function} modelFn
 * @param {string} label
 * @param {string} description
 * @returns {function}
 */
export function attachModelDocs(modelFn, label, description) {
  modelFn.label = label;
  modelFn.description = description;
  return modelFn;
}
