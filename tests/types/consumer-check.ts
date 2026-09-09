/**
 * Type-level fixture compiled by `npm run check:types`.
 *
 * It stands in for a TypeScript front end consuming this package, and it
 * guards two separate things:
 *
 *   1. The published .d.ts files parse at all. A malformed JSDoc tag makes
 *      `tsc` emit invalid declarations, which breaks every TypeScript
 *      consumer while the build still reports success (see issue #196).
 *
 *   2. The model metadata is actually typed. A plain exported const emits as
 *      `any` unless it carries an explicit `@type` annotation, and `any`
 *      fails silently: every assignment below would still compile. The
 *      `@ts-expect-error` lines are what make that failure loud.
 *
 * Imports use the package name rather than a relative path into `lib/`, so
 * the `types` entry in package.json is exercised the way a consumer hits it.
 */

import type {
  Bound,
  ClassifierBins,
  ModelInfo,
  VariableInfo,
} from "jsthermalcomfort";
import {
  HEAT_INDEX_ROTHFUSZ_INFO,
  HEAT_INDEX_STRESS_CATEGORY_BINS,
  PMV_PPD_ISO_INFO,
  PMV_THERMAL_SENSATION_VOTE_BINS_ISO,
  classifyFromBins,
} from "jsthermalcomfort";

// The published metadata must satisfy the published type.
const iso: ModelInfo = PMV_PPD_ISO_INFO;
const heatIndex: ModelInfo = HEAT_INDEX_ROTHFUSZ_INFO;

// The shape a front end actually reaches for: a per-model applicability limit.
const tdbBound: Bound | undefined = iso.inputs.tdb.applicability;
const minTdb: number | undefined = tdbBound?.min;
const ppd: VariableInfo = iso.outputs.ppd;

// Bins are exported directly as well as through the metadata (issue #184 §3.4).
const label = classifyFromBins(28.5, HEAT_INDEX_STRESS_CATEGORY_BINS);
const tsvLabel = classifyFromBins(0.4, PMV_THERMAL_SENSATION_VOTE_BINS_ISO);

// The classifier reached through the metadata is typed, not `Object`, so a
// consumer can read the edge convention without casting.
const bins: ClassifierBins | undefined = iso.outputs.tsv.classifier;
const rightInclusive: boolean | undefined = bins?.right;
const edgeCount: number | undefined = bins?.edges.length;

// Guards against the metadata silently degrading to `any`.
// If these stop being errors, tsc fails with "Unused '@ts-expect-error'
// directive" — which is the point: `any` would accept both assignments.
// @ts-expect-error `label` is a string, not a number.
const notANumber: number = PMV_PPD_ISO_INFO.label;
// @ts-expect-error `inputs` has no `nonexistent_variable` key.
const notAKey: VariableInfo = PMV_PPD_ISO_INFO.inputs.tdb.nonexistent_variable;

// The runtime values are deep-frozen, so the types must reject writes too.
// Without these, a consumer could assign, type-check cleanly, and then throw:
// an ES module is always strict, so the assignment is not silently ignored.
// If any of these stop being errors the readonly modifiers have been lost, and
// tsc fails with "Unused '@ts-expect-error' directive".
// @ts-expect-error applicability bounds are readonly.
PMV_PPD_ISO_INFO.inputs.tdb.applicability!.min = 5;
// @ts-expect-error the inputs map is readonly.
PMV_PPD_ISO_INFO.inputs.tdb = { unit: "°C" };
// @ts-expect-error the metadata object itself is readonly.
PMV_PPD_ISO_INFO.label = "something else";
// @ts-expect-error classifier bin edges are a readonly array.
PMV_THERMAL_SENSATION_VOTE_BINS_ISO.edges[0] = 0;
// @ts-expect-error push mutates, and the array is readonly.
HEAT_INDEX_STRESS_CATEGORY_BINS.labels.push("new label");

export {
  iso,
  heatIndex,
  minTdb,
  ppd,
  label,
  tsvLabel,
  bins,
  rightInclusive,
  edgeCount,
  notANumber,
  notAKey,
};
