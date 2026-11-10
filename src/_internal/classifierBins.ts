/**
 * Bin configuration for {@link classifyFromBins}.
 *
 * Readonly, because the bin constants this library publishes are frozen:
 * `edges[0] = 0` would type-check and then throw, since an ES module is always
 * strict.
 *
 * `right` selects the interval convention: `true` for right-inclusive
 * (`value <= edge`), `false` for left-inclusive (`value < edge`). The two
 * disagree on values landing exactly on an edge, so this is not incidental.
 */
export interface ClassifierBins {
  /** Upper bin boundaries, strictly increasing. */
  readonly edges: readonly number[];
  /** One label per bin, as many as `edges`. */
  readonly labels: readonly string[];
  /** `true` for right-inclusive bins, `false` for left-inclusive. */
  readonly right: boolean;
}

/**
 * Classifies a value into bins, matching numpy's `digitize`.
 *
 * Given a value and a set of bin edges with corresponding labels, returns the
 * label of the bin that contains the value:
 *
 * - `right: false` (left-inclusive): the bins are `[edges[i-1], edges[i])`.
 *   It returns `labels[0]` if `value < edges[0]`, `labels[1]` if
 *   `edges[0] <= value < edges[1]`, and so on, and NaN if
 *   `value >= edges[-1]`.
 * - `right: true` (right-inclusive): the bins are `(edges[i-1], edges[i]]`.
 *   It returns `labels[0]` if `value <= edges[0]`, `labels[1]` if
 *   `edges[0] < value <= edges[1]`, and so on, and NaN if
 *   `value > edges[-1]`.
 *
 * As with `digitize`, NaN returns NaN, -Infinity falls into the first bin and
 * +Infinity is beyond the last.
 *
 * Unlike `digitize`, which also takes decreasing edges, it throws unless the
 * edges are strictly increasing (deviation _shared-2).
 *
 * @param value - The value to classify.
 * @param bins - The bin configuration: strictly increasing `edges`, one
 * `label` per bin, and `right` selecting right-inclusive (`value <= edge`) or
 * left-inclusive (`value < edge`) bins. Typed readonly, so the frozen
 * constants this library publishes can be passed straight in.
 * @returns The label of the bin containing `value`, or NaN if `value` is
 * outside all bins.
 * @throws `RangeError` if the edges are not strictly increasing.
 *
 * @example
 * ```ts
 * const bins = {
 *   edges: [0, 10, 20],
 *   labels: ["low", "medium", "high"],
 *   right: false,
 * };
 * classifyFromBins(-5, bins); // "low" (value < 0)
 * classifyFromBins(5, bins); // "medium" (0 <= value < 10)
 * classifyFromBins(15, bins); // "high" (10 <= value < 20)
 * classifyFromBins(25, bins); // NaN (value >= 20)
 * classifyFromBins(-Infinity, bins); // "low"
 * classifyFromBins(Infinity, bins); // NaN
 * ```
 */
export function classifyFromBins(
  value: number,
  bins: ClassifierBins,
): string | number {
  const { edges, labels, right } = bins;

  // The edges are checked before the value, so a bad table fails on every call
  // rather than only on the values it would misclassify.
  let previous: number | undefined;
  for (const edge of edges) {
    if (previous !== undefined && !(previous < edge)) {
      throw new RangeError("edges must be strictly increasing.");
    }
    previous = edge;
  }

  // NaN, and +Infinity, which is beyond the last bin, give NaN; -Infinity falls
  // into the first bin in both modes.
  if (Number.isNaN(value) || value === Infinity) return NaN;
  if (value === -Infinity) return labels[0] ?? NaN;

  // The first edge the value is at or below (right-inclusive), or below
  // (left-inclusive), names its bin; beyond the last edge there is none.
  const index = edges.findIndex((edge) =>
    right ? value <= edge : value < edge,
  );
  return index === -1 ? NaN : (labels[index] ?? NaN);
}
