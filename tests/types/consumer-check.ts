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
  AdaptiveAshraeParams,
  AdaptiveAshraeResult,
  ApplicabilityWarning,
  Bound,
  ClassifierBins,
  ModelInfo,
  VariableInfo,
} from "jsthermalcomfort";
import {
  ADAPTIVE_ASHRAE_INFO,
  HEAT_INDEX_ROTHFUSZ_INFO,
  HEAT_INDEX_STRESS_CATEGORY_BINS,
  PMV_PPD_ASHRAE_INFO,
  PMV_PPD_ISO_INFO,
  PMV_THERMAL_SENSATION_VOTE_BINS_ISO,
  Standard,
  adaptive_ashrae,
  classifyFromBins,
  clo_typical_ensembles,
  pmv_ppd_ashrae,
  pmv_ppd_iso,
} from "jsthermalcomfort";
import * as jsthermalcomfort from "jsthermalcomfort";

// The published metadata must satisfy the published type.
const iso: ModelInfo = PMV_PPD_ISO_INFO;
const ashrae: ModelInfo = PMV_PPD_ASHRAE_INFO;
const heatIndex: ModelInfo = HEAT_INDEX_ROTHFUSZ_INFO;
const adaptive: ModelInfo = ADAPTIVE_ASHRAE_INFO;

// The shape a front end actually reaches for: a per-model applicability limit.
const tdbBound: Bound | undefined = iso.inputs.tdb.applicability;
const minTdb: number | undefined = tdbBound?.min;
const ppd: VariableInfo = iso.outputs.ppd;

// Which standard a model is for, as data (issue #184): a list of Standard
// values, empty for a model with no standard.
const isoStandards: readonly (typeof Standard)[keyof typeof Standard][] =
  iso.standards;
const heatIndexStandards: readonly string[] = heatIndex.standards;

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
// @ts-expect-error `label` is a string, not a number.
const notANumberEither: number = ADAPTIVE_ASHRAE_INFO.label;

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
// @ts-expect-error push mutates, and the standards array is readonly.
PMV_PPD_ISO_INFO.standards.push(Standard.ashrae_55_2023);
// @ts-expect-error the adaptive metadata is readonly too.
ADAPTIVE_ASHRAE_INFO.inputs.t_running_mean.applicability!.max = 40;
// @ts-expect-error the ASHRAE PMV metadata is readonly.
PMV_PPD_ASHRAE_INFO.outputs.pmv = { unit: null };
// @ts-expect-error classifier bin edges are a readonly array.
PMV_THERMAL_SENSATION_VOTE_BINS_ISO.edges[0] = 0;
// @ts-expect-error push mutates, and the array is readonly.
HEAT_INDEX_STRESS_CATEGORY_BINS.labels.push("new label");

// pmv_ppd_iso's JSDoc must be attached to the function itself, not to its
// schema constant, or every parameter degrades to `any` and `model` degrades
// to the single literal it happened to default to (issue #196-class defect).
const pmvIso = pmv_ppd_iso(
  25,
  25,
  0.1,
  50,
  1.2,
  0.5,
  0,
  Standard.iso_7730_2005,
);
// @ts-expect-error tdb must be a number.
pmv_ppd_iso("25", 25, 0.1, 50, 1.2, 0.5);
// @ts-expect-error model must be one of the two ISO 7730 Standard values.
pmv_ppd_iso(25, 25, 0.1, 50, 1.2, 0.5, 0, "not-a-standard");
// airspeed_control is an ASHRAE-only kwarg; the ISO wrapper must not expose
// it, since its own JSDoc never documents it.
pmv_ppd_iso(25, 25, 0.1, 50, 1.2, 0.5, 0, Standard.iso_7730_2005, {
  // @ts-expect-error airspeed_control does not exist on the ISO kwargs type.
  airspeed_control: true,
});

// adaptive_ashrae takes one params object keyed like upstream's keyword
// arguments (ADR 0002), and both the params and the result types are exported
// by name. If the published signature degrades to `any`, the lines below stop
// being errors and tsc fails with "Unused '@ts-expect-error' directive".
const adaptiveParams: AdaptiveAshraeParams = {
  tdb: 77,
  tr: 77,
  t_running_mean: 68,
  v: 0.3,
  units: "IP",
  limit_inputs: false,
  round_output: false,
};
const adaptiveResult: AdaptiveAshraeResult = adaptive_ashrae(adaptiveParams);
// @ts-expect-error `round` is not a param; the switch is `round_output`.
adaptive_ashrae({ tdb: 25, tr: 25, t_running_mean: 20, v: 0.1, round: false });
// @ts-expect-error t_running_mean is a required quantity.
adaptive_ashrae({ tdb: 25, tr: 25, v: 0.1 });
adaptive_ashrae({
  tdb: 25,
  tr: 25,
  t_running_mean: 20,
  v: 0.1,
  // @ts-expect-error units is "SI" or "IP".
  units: "metric",
});
// @ts-expect-error tdb must be a number.
adaptive_ashrae({ tdb: "25", tr: 25, t_running_mean: 20, v: 0.1 });

// Both wrappers return the applicability rows a call broke (issue #199), typed
// through to the bound, so a front end can phrase "35 °C is above 30 °C"
// without casting.
const isoWarnings: ApplicabilityWarning[] = pmvIso.warnings;
const isoRowMax: number | undefined = pmvIso.warnings[0].bound.max;
const ashraeRowMax: number | undefined = pmv_ppd_ashrae(
  45,
  25,
  0.1,
  50,
  1.2,
  0.5,
).warnings[0].bound.max;
// @ts-expect-error role is one of three literals, not any string.
const notARole: ApplicabilityWarning["role"] = "somewhere";
// @ts-expect-error the rows share the metadata's frozen bounds, so writes are rejected.
pmvIso.warnings[0].bound.max = 50;

// The shared PMV module is not part of the package, as upstream has no public
// pmv_ppd: a consumer calls pmv_ppd_iso or pmv_ppd_ashrae.
// @ts-expect-error pmv_ppd is not exported.
jsthermalcomfort.pmv_ppd;

// clo_typical_ensembles is a table keyed like pythermalcomfort's dict, typed
// from its entries: a known ensemble reads as a number, an unknown one and a
// write are type errors, so neither `any` nor a mutable record gets through.
const winterClo: number =
  clo_typical_ensembles["Typical winter indoor clothing"];
// @ts-expect-error "Sweet pants" is not one of the table's keys.
clo_typical_ensembles["Sweet pants, short-sleeve shirt"];
// @ts-expect-error the table is frozen, so its type is readonly.
clo_typical_ensembles["Typical winter indoor clothing"] = 1.1;

export {
  iso,
  ashrae,
  heatIndex,
  adaptive,
  adaptiveResult,
  notANumberEither,
  minTdb,
  isoStandards,
  heatIndexStandards,
  ppd,
  label,
  tsvLabel,
  bins,
  rightInclusive,
  edgeCount,
  notANumber,
  notAKey,
  pmvIso,
  isoWarnings,
  isoRowMax,
  ashraeRowMax,
  notARole,
  winterClo,
};
