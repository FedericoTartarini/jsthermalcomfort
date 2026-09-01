/**
 * Shared digitize-style classifier bins.
 *
 * `right: true` matches numpy `digitize(..., right=True)` / Python default
 * for Heat Index, UTCI, ASHRAE TSV: `value <= edges[i]` is `labels[i]`.
 * Humidex uses the same right-closed edges as pythermalcomfort's if/else
 * categories (last label unbounded). `right: false` matches ISO TSV
 * (`value < edges[i]`).
 *
 * When `labels.length === edges.length`, values beyond the last edge are
 * unmapped (NaN). When `labels.length === edges.length + 1`, the last
 * label is unbounded above.
 *
 * @typedef {object} ClassifierBins
 * @property {readonly number[]} edges
 * @property {readonly string[]} labels
 * @property {boolean} right
 */

/**
 * Value classifier with digitize-style `bins`.
 *
 * @typedef {function(number): (string|number)} ClassifyFn
 * @typedef {ClassifyFn & { bins: ClassifierBins }} ClassifierFn
 */

/**
 * @param {number} value
 * @param {ClassifierBins} bins
 * @returns {string|number}
 */
export function classifyFromBins(value, bins) {
  if (!Number.isFinite(value)) return NaN;
  const { edges, labels, right } = bins;
  for (let index = 0; index < edges.length; index += 1) {
    const inside = right ? value <= edges[index] : value < edges[index];
    if (inside) return labels[index];
  }
  if (labels.length > edges.length) return labels[labels.length - 1];
  return NaN;
}

/**
 * @param {ClassifierFn} classifyFn
 * @param {ClassifierBins} bins
 * @returns {ClassifierFn}
 */
export function attachBins(classifyFn, bins) {
  classifyFn.bins = bins;
  return classifyFn;
}
