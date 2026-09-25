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
  CoolingEffectParams,
  CoolingEffectResult,
  HeatIndexRothfuszParams,
  HeatIndexRothfuszResult,
  ModelInfo,
  PmvPpdAshraeParams,
  PmvPpdAshraeResult,
  PmvPpdIsoParams,
  PmvPpdIsoResult,
  UtciParams,
  UtciResult,
  VariableInfo,
} from "jsthermalcomfort";
import {
  ADAPTIVE_ASHRAE_INFO,
  HEAT_INDEX_ROTHFUSZ_INFO,
  HEAT_INDEX_STRESS_CATEGORY_BINS,
  PMV_CATEGORY_BINS_ISO,
  PMV_COMPLIANCE_INTERVAL_ASHRAE,
  PMV_PPD_ASHRAE_INFO,
  PMV_PPD_ISO_INFO,
  PMV_THERMAL_SENSATION_VOTE_BINS_ISO,
  Standard,
  UTCI_INFO,
  UTCI_STRESS_CATEGORY_BINS,
  adaptive_ashrae,
  classifyFromBins,
  clo_typical_ensembles,
  cooling_effect,
  heat_index_rothfusz,
  pmv_ppd_ashrae,
  pmv_ppd_iso,
  utci,
} from "jsthermalcomfort";
import * as jsthermalcomfort from "jsthermalcomfort";

// The published metadata must satisfy the published type.
const iso: ModelInfo = PMV_PPD_ISO_INFO;
const ashrae: ModelInfo = PMV_PPD_ASHRAE_INFO;
const heatIndex: ModelInfo = HEAT_INDEX_ROTHFUSZ_INFO;
const adaptive: ModelInfo = ADAPTIVE_ASHRAE_INFO;
const utciInfo: ModelInfo = UTCI_INFO;

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
const utciLabel = classifyFromBins(24.6, UTCI_STRESS_CATEGORY_BINS);

// The classifier reached through the metadata is typed, not `Object`, so a
// consumer can read the edge convention without casting.
const bins: ClassifierBins | undefined = iso.outputs.tsv.classifier;
const rightInclusive: boolean | undefined = bins?.right;
const edgeCount: number | undefined = bins?.edges.length;

// Model info names the model it belongs to: `name` reads as a string, no
// other type, and a ModelInfo without it is rejected.
const modelName: string = iso.name;
// @ts-expect-error `name` is a string, not a number.
const nameNotANumber: number = PMV_PPD_ISO_INFO.name;
// @ts-expect-error `name` is required: a ModelInfo without it is rejected.
const nameless: ModelInfo = {
  label: "l",
  description: "d",
  standards: [],
  inputs: {},
  outputs: {},
};

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
// @ts-expect-error the UTCI metadata is readonly, its derived bound included.
UTCI_INFO.derived!.tr_minus_tdb.applicability!.max = 80;

// pmv_ppd_iso takes one params object too (ADR 0002), with its params and
// result types exported by name; the lines below are errors only while the
// published signature is typed.
const pmvIsoParams: PmvPpdIsoParams = {
  tdb: 77,
  tr: 77,
  vr: 0.328,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  wme: 0,
  standard: Standard.iso_7730_2005,
  units: "IP",
  limit_inputs: false,
  round_output: false,
};
const pmvIsoIp: PmvPpdIsoResult = pmv_ppd_iso(pmvIsoParams);
const pmvIso = pmv_ppd_iso({
  tdb: 25,
  tr: 25,
  vr: 0.1,
  rh: 50,
  met: 1.2,
  clo: 0.5,
});
pmv_ppd_iso({
  tdb: 25,
  tr: 25,
  vr: 0.1,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  // @ts-expect-error `round` is not a param; the switch is `round_output`.
  round: false,
});
// @ts-expect-error clo is a required quantity.
pmv_ppd_iso({ tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2 });
pmv_ppd_iso({
  tdb: 25,
  tr: 25,
  vr: 0.1,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  // @ts-expect-error units is "SI" or "IP".
  units: "metric",
});
// @ts-expect-error tdb must be a number.
pmv_ppd_iso({ tdb: "25", tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 });
pmv_ppd_iso({
  tdb: 25,
  tr: 25,
  vr: 0.1,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  // @ts-expect-error standard is one of the two ISO 7730 editions.
  standard: Standard.ashrae_55_2023,
});
// airspeed_control is an ASHRAE-only switch; the ISO wrapper must not expose
// it, as upstream's pmv_ppd_iso has no such parameter.
pmv_ppd_iso({
  tdb: 25,
  tr: 25,
  vr: 0.1,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  // @ts-expect-error airspeed_control does not exist on PmvPpdIsoParams.
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

// cooling_effect takes one params object too (ADR 0002), with its params and
// result types exported by name; the lines below are errors only while the
// published signature is typed.
const coolingEffectParams: CoolingEffectParams = {
  tdb: 77,
  tr: 77,
  vr: 1.64,
  rh: 50,
  met: 1,
  clo: 0.6,
  wme: 0,
  units: "IP",
  suppress_warnings: true,
};
const coolingEffectResult: CoolingEffectResult =
  cooling_effect(coolingEffectParams);
const coolingEffect: number = coolingEffectResult.ce;
// @ts-expect-error `v` is not a param; the relative air speed is `vr`.
cooling_effect({ tdb: 25, tr: 25, v: 0.3, rh: 50, met: 1.2, clo: 0.5 });
// @ts-expect-error clo is a required quantity.
cooling_effect({ tdb: 25, tr: 25, vr: 0.3, rh: 50, met: 1.2 });
cooling_effect({
  tdb: 25,
  tr: 25,
  vr: 0.3,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  // @ts-expect-error units is "SI" or "IP".
  units: "metric",
});
// @ts-expect-error vr must be a number.
cooling_effect({ tdb: 25, tr: 25, vr: "0.3", rh: 50, met: 1.2, clo: 0.5 });

// heat_index_rothfusz takes one params object too (ADR 0002), with its params
// and result types exported by name; the lines below are errors only while
// the published signature is typed.
const heatIndexParams: HeatIndexRothfuszParams = {
  tdb: 30,
  rh: 80,
  round_output: false,
  limit_inputs: false,
};
const heatIndexResult: HeatIndexRothfuszResult =
  heat_index_rothfusz(heatIndexParams);
// @ts-expect-error `round` is not a param; the switch is `round_output`.
heat_index_rothfusz({ tdb: 30, rh: 80, round: false });
// @ts-expect-error `units` is not a param; the model is SI only, as upstream's.
heat_index_rothfusz({ tdb: 30, rh: 80, units: "SI" });
// @ts-expect-error rh is a required quantity.
heat_index_rothfusz({ tdb: 30 });
// @ts-expect-error tdb must be a number.
heat_index_rothfusz({ tdb: "30", rh: 80 });

// pmv_ppd_ashrae takes one params object too (ADR 0002), with its params and
// result types exported by name; the lines below are errors only while the
// published signature is typed.
const pmvAshraeParams: PmvPpdAshraeParams = {
  tdb: 77,
  tr: 77,
  vr: 0.328,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  wme: 0,
  standard: Standard.ashrae_55_2023,
  units: "IP",
  limit_inputs: false,
  airspeed_control: false,
  round_output: false,
  suppress_warnings: true,
};
const pmvAshrae: PmvPpdAshraeResult = pmv_ppd_ashrae(pmvAshraeParams);
const ashraeCompliance: boolean | number = pmvAshrae.compliance;
// The interval compliance is read against, published once.
const complianceMax: number = PMV_COMPLIANCE_INTERVAL_ASHRAE.max;
pmv_ppd_ashrae({
  tdb: 25,
  tr: 25,
  vr: 0.1,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  // @ts-expect-error `airspeed_controll` is misspelled; the switch is `airspeed_control`.
  airspeed_controll: false,
});
// @ts-expect-error clo is a required quantity.
pmv_ppd_ashrae({ tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2 });
pmv_ppd_ashrae({
  tdb: 25,
  tr: 25,
  vr: 0.1,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  // @ts-expect-error standard is "55-2023"; an ISO 7730 standard is for pmv_ppd_iso.
  standard: Standard.iso_7730_2025,
});
// @ts-expect-error PMV_COMPLIANCE_INTERVAL_ASHRAE is frozen, so its type is readonly.
PMV_COMPLIANCE_INTERVAL_ASHRAE.max = 1;

// pmv_ppd_iso returns ISO 7730's category, read against bins published once,
// whose edges a front end finds by label.
const isoCategory: string | number = pmvIso.category;
const categoryBMax: number =
  PMV_CATEGORY_BINS_ISO.edges[PMV_CATEGORY_BINS_ISO.labels.indexOf("B")];

// Both wrappers return the applicability rows a call broke (issue #199), typed
// through to the bound, so a front end can phrase "35 °C is above 30 °C"
// without casting.
const isoWarnings: ApplicabilityWarning[] = pmvIso.warnings;
const isoRowMax: number | undefined = pmvIso.warnings[0].bound.max;
const ashraeRowMax: number | undefined = pmv_ppd_ashrae({
  tdb: 45,
  tr: 25,
  vr: 0.1,
  rh: 50,
  met: 1.2,
  clo: 0.5,
}).warnings[0].bound.max;
// @ts-expect-error role is one of three literals, not any string.
const notARole: ApplicabilityWarning["role"] = "somewhere";
// @ts-expect-error the rows share the metadata's frozen bounds, so writes are rejected.
pmvIso.warnings[0].bound.max = 50;

// utci takes one params object too (ADR 0002), with its params and result
// types exported by name; the lines below are errors only while the published
// signature is typed.
const utciParams: UtciParams = {
  tdb: 77,
  tr: 77,
  v: 3.28084,
  rh: 50,
  units: "IP",
  limit_inputs: false,
  round_output: false,
};
const utciResult: UtciResult = utci(utciParams);
const utciCategory: string | number = utciResult.stress_category;
// @ts-expect-error `return_stress_category` is not a param; stress_category is always returned.
utci({ tdb: 25, tr: 25, v: 1, rh: 50, return_stress_category: true });
// @ts-expect-error rh is a required quantity.
utci({ tdb: 25, tr: 25, v: 1 });
utci({
  tdb: 25,
  tr: 25,
  v: 1,
  rh: 50,
  // @ts-expect-error units is "SI" or "IP".
  units: "metric",
});
// @ts-expect-error tdb must be a number.
utci({ tdb: "25", tr: 25, v: 1, rh: 50 });

// adaptive_ashrae, heat_index_rothfusz and utci return the same rows as the
// PMV wrappers, typed through to the bound.
const adaptiveWarnings: ApplicabilityWarning[] = adaptiveResult.warnings;
const adaptiveRowMax: number | undefined = adaptiveResult.warnings[0].bound.max;
const heatIndexWarnings: ApplicabilityWarning[] = heatIndexResult.warnings;
const heatIndexRowMax: number | undefined =
  heatIndexResult.warnings[0].bound.max;
const utciWarnings: ApplicabilityWarning[] = utciResult.warnings;
const utciRowMax: number | undefined = utciResult.warnings[0].bound.max;

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
  heatIndexResult,
  adaptive,
  adaptiveResult,
  utciInfo,
  utciLabel,
  utciCategory,
  coolingEffect,
  ashraeCompliance,
  complianceMax,
  isoCategory,
  categoryBMax,
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
  pmvIsoIp,
  isoWarnings,
  isoRowMax,
  ashraeRowMax,
  notARole,
  adaptiveWarnings,
  adaptiveRowMax,
  heatIndexWarnings,
  heatIndexRowMax,
  utciWarnings,
  utciRowMax,
  winterClo,
};
