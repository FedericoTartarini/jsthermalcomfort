/**
 * Classifies a value into bins, matching numpy's digitize behavior.
 *
 * Given a value and a set of bin edges with corresponding labels, returns the
 * label of the bin that contains the value. Semantics match numpy.digitize:
 *
 * - right=false (left-inclusive):
 *   Bins are [edges[i-1], edges[i]). Returns labels[0] if value < edges[0],
 *   labels[1] if edges[0] <= value < edges[1], etc. Returns NaN if value >= edges[-1].
 *
 * - right=true (right-inclusive):
 *   Bins are (edges[i-1], edges[i]]. Returns labels[0] if value <= edges[0],
 *   labels[1] if edges[0] < value <= edges[1], etc. Returns NaN if value > edges[-1].
 *
 * Special cases (matching numpy.digitize):
 * - NaN input returns NaN.
 * - -Infinity returns labels[0] (falls into first bin in both modes).
 * - +Infinity returns NaN (beyond all bins).
 *
 * @param {number} value - The value to classify.
 * @param {Object} bins - The bin configuration.
 * @param {number[]} bins.edges - Strictly increasing bin edges. Must have at least one element.
 * @param {string[]} bins.labels - Labels corresponding to bins. Must have length equal to edges length.
 * @param {boolean} bins.right - If true, bins are right-inclusive (open on left). If false, left-inclusive (open on right).
 *
 * @returns {string|number} The label for the bin containing value, or NaN if value is outside all bins.
 *
 * @example
 * const bins = {
 *   edges: [0, 10, 20],
 *   labels: ["low", "medium", "high"],
 *   right: false
 * };
 * classifyFromBins(-5, bins);  // "low" (value < 0)
 * classifyFromBins(5, bins);   // "medium" (0 <= value < 10)
 * classifyFromBins(15, bins);  // "high" (10 <= value < 20)
 * classifyFromBins(25, bins);  // NaN (value >= 20)
 * classifyFromBins(-Infinity, bins);  // "low" (-Infinity falls into first bin)
 * classifyFromBins(Infinity, bins);   // NaN (Infinity is beyond all bins)
 *
 * @public
 */
export function classifyFromBins(value, bins) {
  // NaN in -> NaN out
  if (Number.isNaN(value)) {
    return NaN;
  }

  // +Infinity is always beyond the last bin, so NaN
  if (value === Infinity) {
    return NaN;
  }

  // -Infinity falls into the first bin in both left and right inclusive modes
  if (value === -Infinity) {
    return bins.labels[0];
  }

  const { edges, labels, right } = bins;

  if (right) {
    // Right-inclusive: intervals are (edge[i-1], edge[i]]
    // value <= edges[0] -> labels[0]
    // edges[i-1] < value <= edges[i] -> labels[i]
    // value > edges[-1] -> NaN
    if (value <= edges[0]) {
      return labels[0];
    }
    for (let i = 1; i < edges.length; i++) {
      if (value <= edges[i]) {
        return labels[i];
      }
    }
    return NaN;
  } else {
    // Left-inclusive: intervals are [edge[i-1], edge[i])
    // value < edges[0] -> labels[0]
    // edges[i-1] <= value < edges[i] -> labels[i]
    // value >= edges[-1] -> NaN
    if (value < edges[0]) {
      return labels[0];
    }
    for (let i = 1; i < edges.length; i++) {
      if (value < edges[i]) {
        return labels[i];
      }
    }
    return NaN;
  }
}
