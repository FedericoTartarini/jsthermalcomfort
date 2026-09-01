/**
 * Shared PMV thermal-sensation vote (TSV) classifiers.
 *
 * Bin edges and labels match pythermalcomfort `pmv_ppd_ashrae` /
 * `pmv_ppd_iso` `thermal_sensation` dictionaries (including `10: "Hot"`).
 * ASHRAE uses `mapping(..., right=True)` (right-closed); ISO uses
 * `right=False` (left-closed).
 */

import { attachBins, classifyFromBins } from "./classifierBins.js";

const PMV_TSV_EDGES = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 10];
const PMV_TSV_LABELS = [
  "Cold",
  "Cool",
  "Slightly Cool",
  "Neutral",
  "Slightly Warm",
  "Warm",
  "Hot",
];

const ASHRAE_TSV_BINS = {
  edges: PMV_TSV_EDGES,
  labels: PMV_TSV_LABELS,
  right: true,
};

const ISO_TSV_BINS = {
  edges: PMV_TSV_EDGES,
  labels: PMV_TSV_LABELS,
  right: false,
};

/**
 * ASHRAE TSV: right-closed (`np.digitize(..., right=True)`).
 * PMV = -0.5 is Slightly Cool; PMV = 0.5 is Neutral.
 *
 * @param {number} pmv
 * @returns {string|number}
 * @property {ClassifierBins} bins
 */
export function tsv_ashrae(pmv) {
  return classifyFromBins(pmv, ASHRAE_TSV_BINS);
}

attachBins(tsv_ashrae, ASHRAE_TSV_BINS);

/**
 * ISO TSV: left-closed (`np.digitize(..., right=False)`).
 * PMV = -0.5 is Neutral; PMV = 0.5 is Slightly Warm.
 *
 * @param {number} pmv
 * @returns {string|number}
 * @property {ClassifierBins} bins
 */
export function tsv_iso(pmv) {
  return classifyFromBins(pmv, ISO_TSV_BINS);
}

attachBins(tsv_iso, ISO_TSV_BINS);
