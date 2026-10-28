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
 *   2. The declarations refuse what a consumer must not do: each
 *      `@ts-expect-error` line is a misuse (a wrong type, an unknown or
 *      removed key, a write to readonly metadata, a non-exported path), so a
 *      declaration that widens, to `any` or otherwise, fails `tsc` with
 *      "Unused '@ts-expect-error' directive".
 *
 * Imports use the package name rather than a relative path into `lib/`, so
 * the `exports` map in package.json is exercised the way a consumer hits it.
 */

import type {
  AdaptiveASHRAE,
  AdaptiveEN,
  AnkleDraft,
  AnkleDraftInputs,
  ASHRAEInputs,
  ENInputs,
  ApplicabilityWarning,
  Bound,
  ClassifierBins,
  CloTOut,
  CloTOutInputs,
  CE,
  CEInputs,
  DerivedField,
  GaggeTwoNodes,
  GaggeTwoNodesInputs,
  HI,
  HIInputs,
  Humidex,
  HumidexInputs,
  ModelInfo,
  ModelWarning,
  PHS,
  PHSInputs,
  PMVPPDAshrae,
  PMVPPDAshraeInputs,
  PMVPPD,
  PMVPPDInputs,
  SET,
  SETInputs,
  SolarGain,
  SolarGainInputs,
  UseFansHeatwaves,
  UseFansHeatwavesInputs,
  UTCI,
  UTCIInputs,
  VerticalTGradPPD,
  VerticalTGradPPDInputs,
  WCI,
  WCIInputs,
  WCT,
  WCTInputs,
  APMV,
  APMVInputs,
  EPMV,
  EPMVInputs,
  OutputField,
  StandardId,
  UnitSymbol,
} from "jsthermalcomfort";
import {
  ADAPTIVE_ASHRAE_INFO,
  ADAPTIVE_EN_INFO,
  ANKLE_DRAFT_INFO,
  CLO_INDIVIDUAL_GARMENT_GROUPS,
  CLO_TOUT_INFO,
  COOLING_EFFECT_INFO,
  HEAT_INDEX_ROTHFUSZ_INFO,
  HUMIDEX_INFO,
  PHS_INFO,
  PHS_LIMITS_ISO_7933,
  PMV_CATEGORY_BINS_ISO_7730,
  PMV_PPD_ASHRAE_INFO,
  PMV_PPD_ISO_INFO,
  SET_TMP_INFO,
  SOLAR_GAIN_INFO,
  Standard,
  TWO_NODES_GAGGE_INFO,
  Postures,
  Units,
  USE_FANS_HEATWAVES_INFO,
  UTCI_INFO,
  VERTICAL_TMP_GRAD_PPD_INFO,
  WCI_INFO,
  WIND_CHILL_TEMPERATURE_INFO,
  PMV_A_INFO,
  PMV_E_INFO,
  adaptive_ashrae,
  adaptive_en,
  ankle_draft,
  classifyFromBins,
  clo_individual_garments,
  clo_tout,
  clo_typical_ensembles,
  cooling_effect,
  heat_index_rothfusz,
  humidex,
  phs,
  pmv_ppd_ashrae,
  pmv_ppd_iso,
  set_tmp,
  solar_gain,
  two_nodes_gagge,
  use_fans_heatwaves,
  utci,
  vertical_tmp_grad_ppd,
  wci,
  wind_chill_temperature,
  pmv_a,
  pmv_e,
} from "jsthermalcomfort";
import * as jsthermalcomfort from "jsthermalcomfort";
// One set of category bins per ISO 7730 edition replaced the one for both, so
// a consumer that still reads it fails to compile instead of reading other
// bins. If this stops being an error, tsc fails with "Unused
// '@ts-expect-error' directive".
// @ts-expect-error PMV_CATEGORY_BINS_ISO is no longer exported.
import { PMV_CATEGORY_BINS_ISO } from "jsthermalcomfort";
// Each subpath entry carries the same declarations as the root.
import { utci as utciFromModels } from "jsthermalcomfort/models";
import { p_sat } from "jsthermalcomfort/psychrometrics";
import { Standard as standardFromUtilities } from "jsthermalcomfort/utilities";
// The exports map seals every file behind the entries. If this stops being an
// error, tsc fails with "Unused '@ts-expect-error' directive".
// @ts-expect-error a deep import is not exported.
import { utci as utciDeep } from "jsthermalcomfort/lib/esm/models/utci.js";

// The published metadata must satisfy the published type.
const heatIndex: ModelInfo = HEAT_INDEX_ROTHFUSZ_INFO;
const cloToutInfo: ModelInfo = CLO_TOUT_INFO;
const coolingEffectInfo: ModelInfo = COOLING_EFFECT_INFO;
const iso: ModelInfo = PMV_PPD_ISO_INFO;
const ashrae: ModelInfo = PMV_PPD_ASHRAE_INFO;
const adaptive: ModelInfo = ADAPTIVE_ASHRAE_INFO;
const utciInfo: ModelInfo = UTCI_INFO;
const solarGainInfo = SOLAR_GAIN_INFO;
const twoNodesGaggeInfo: ModelInfo = TWO_NODES_GAGGE_INFO;
const phsInfo: ModelInfo = PHS_INFO;
const useFansHeatwavesInfo: ModelInfo = USE_FANS_HEATWAVES_INFO;
const ankleDraftInfo: ModelInfo = ANKLE_DRAFT_INFO;
const verticalTmpGradPpdInfo: ModelInfo = VERTICAL_TMP_GRAD_PPD_INFO;
const adaptiveEnInfo: ModelInfo = ADAPTIVE_EN_INFO;
const humidexInfo: ModelInfo = HUMIDEX_INFO;
const wciInfo: ModelInfo = WCI_INFO;
const windChillTemperatureInfo: ModelInfo = WIND_CHILL_TEMPERATURE_INFO;
const setTmpInfo: ModelInfo = SET_TMP_INFO;
const pmvAInfo: ModelInfo = PMV_A_INFO;
const pmvEInfo: ModelInfo = PMV_E_INFO;

// A migrated model's INFO.inputs is its input definition, switches included,
// typed by kind.
const tdbKind: "numeric" = HEAT_INDEX_ROTHFUSZ_INFO.inputs.tdb.kind;
const limitInputsDefault: boolean =
  HEAT_INDEX_ROTHFUSZ_INFO.inputs.limit_inputs.default;
// Its INFO.outputs gives each returned value's kind, from which the result
// type is derived.
const acceptabilityKind: "bool" =
  ADAPTIVE_ASHRAE_INFO.outputs.acceptability_80.kind;
// A migrated INFO's entries are typed `OutputField` and `DerivedField`.
const utciOutput: OutputField = UTCI_INFO.outputs.utci;
const paDerived: DerivedField = UTCI_INFO.derived["pa (kPa)"];
// A unit is one of the symbols the models use, so a misspelt one is rejected.
const tdbUnit: UnitSymbol = HEAT_INDEX_ROTHFUSZ_INFO.inputs.tdb.unit;
// @ts-expect-error "°c" is not a unit; the unit is "°C".
const misspeltUnit: UnitSymbol = "°c";

// The shape a front end actually reaches for: a per-model applicability limit.
const tdbBound: Bound | undefined = PMV_PPD_ISO_INFO.inputs.tdb.applicability;
const minTdb: number | undefined = tdbBound?.min;

// Every model lists the standards whose values it takes as Standard values,
// typed by the exported `StandardId`.
const isoStandards: readonly (typeof Standard)[keyof typeof Standard][] =
  iso.standards;
const heatIndexStandards: readonly StandardId[] = heatIndex.standards;
// @ts-expect-error "55-2020" is not a Standard value.
const unknownStandard: StandardId = "55-2020";

// Bins are reached through the metadata, and the models not yet migrated also
// export them directly (issue #184 §3.4).
const label = classifyFromBins(
  28.5,
  HEAT_INDEX_ROTHFUSZ_INFO.outputs.stress_category.classifier,
);
const tsvLabel = classifyFromBins(0.4, PMV_PPD_ISO_INFO.outputs.tsv.classifier);
const utciLabel = classifyFromBins(
  24.6,
  UTCI_INFO.outputs.stress_category.classifier,
);

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
  standards: [],
  inputs: {},
  outputs: {},
};
const described: ModelInfo = {
  name: "n",
  label: "l",
  // @ts-expect-error ModelInfo has no `description`.
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
const notAKey: unknown = PMV_PPD_ISO_INFO.inputs.tdb.nonexistent_variable;
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
ADAPTIVE_ASHRAE_INFO.inputs.t_running_mean.applicability.max = 40;
// @ts-expect-error the ASHRAE PMV metadata is readonly.
PMV_PPD_ASHRAE_INFO.outputs.pmv = { unit: null };
// @ts-expect-error classifier bin edges are a readonly array.
PMV_PPD_ISO_INFO.outputs.tsv.classifier.edges[0] = 0;
// @ts-expect-error push mutates, and the array is readonly.
HEAT_INDEX_ROTHFUSZ_INFO.outputs.stress_category.classifier.labels.push(
  "new label",
);
// @ts-expect-error the UTCI metadata is readonly, its derived bound included.
UTCI_INFO.derived["tr - tdb"].applicability.max = 80;

// pmv_ppd_iso takes one inputs object too (ADR 0002), with its inputs and
// result types named after upstream's classes; the lines below are errors only
// while the published signature is typed.
const pmvIsoParams: PMVPPDInputs = {
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
const pmvIsoIp: PMVPPD = pmv_ppd_iso(pmvIsoParams);
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
  // @ts-expect-error airspeed_control does not exist on PMVPPDInputs.
  airspeed_control: true,
});

// adaptive_ashrae takes one inputs object keyed like upstream's keyword
// arguments (ADR 0002), with its inputs and result types named after
// upstream's classes. If the published signature degrades to `any`, the lines
// below stop being errors and tsc fails with "Unused '@ts-expect-error' directive".
const adaptiveParams: ASHRAEInputs = {
  tdb: 77,
  tr: 77,
  t_running_mean: 68,
  v: 0.3,
  units: "IP",
  limit_inputs: false,
  round_output: false,
};
const adaptiveResult: AdaptiveASHRAE = adaptive_ashrae(adaptiveParams);
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
// @ts-expect-error the result is readonly, as upstream's frozen dataclass.
adaptiveResult.tmp_cmf = 1;

// cooling_effect takes one inputs object (ADR 0002), with its inputs and
// result types exported by name; the lines below are errors only while the
// published signature is typed. units takes the constant or the literal (ADR
// 0019, whitelist item 5).
const coolingEffectInputs: CEInputs = {
  tdb: 77,
  tr: 77,
  vr: 1.64,
  rh: 50,
  met: 1,
  clo: 0.6,
  wme: 0,
  units: Units.IP,
};
const coolingEffectResult: CE = cooling_effect(coolingEffectInputs);
const coolingEffect: number = coolingEffectResult.ce;
// @ts-expect-error `v` is not an input; the relative air speed is `vr`.
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
// @ts-expect-error suppress_warnings is gone; the notice is a row of warnings.
cooling_effect({ ...coolingEffectInputs, suppress_warnings: true });
// @ts-expect-error the result is readonly, as upstream's frozen dataclass.
coolingEffectResult.ce = 1;

// heat_index_rothfusz takes one inputs object (ADR 0002), with its inputs
// and result types exported by name; the lines below are errors only while
// the published signature is typed.
const heatIndexInputs: HIInputs = {
  tdb: 30,
  rh: 80,
  round_output: false,
  limit_inputs: false,
};
const heatIndexResult: HI = heat_index_rothfusz(heatIndexInputs);
// @ts-expect-error `round` is not an input; the switch is `round_output`.
heat_index_rothfusz({ tdb: 30, rh: 80, round: false });
// @ts-expect-error `units` is not an input; the model is SI only, as upstream's.
heat_index_rothfusz({ tdb: 30, rh: 80, units: "SI" });
// @ts-expect-error rh is a required quantity.
heat_index_rothfusz({ tdb: 30 });
// @ts-expect-error tdb must be a number.
heat_index_rothfusz({ tdb: "30", rh: 80 });

// pmv_ppd_ashrae takes one inputs object too (ADR 0002), with its inputs and
// result types named after upstream's classes; the lines below are errors only
// while the published signature is typed.
const pmvAshraeParams: PMVPPDAshraeInputs = {
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
};
const pmvAshrae: PMVPPDAshrae = pmv_ppd_ashrae(pmvAshraeParams);
const ashraeCompliance: boolean | number = pmvAshrae.compliance;
const ashraeTsv: string | number = pmvAshrae.tsv;
// The interval compliance is read against, published once in its INFO.
const complianceMax: number =
  PMV_PPD_ASHRAE_INFO.outputs.compliance.interval.max;
// @ts-expect-error suppress_warnings is gone; the notice is a row of warnings.
pmv_ppd_ashrae({ ...pmvAshraeParams, suppress_warnings: true });
// @ts-expect-error the result is readonly, as upstream's frozen dataclass.
pmvAshrae.compliance = true;
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
// @ts-expect-error the interval is frozen, so its type is readonly.
PMV_PPD_ASHRAE_INFO.outputs.compliance.interval.max = 1;

// pmv_ppd_iso returns ISO 7730's category, read against bins published once,
// keyed by edition, whose edges a front end finds by label.
const isoCategory: string | number = pmvIso.category;
const categoryIIMax: number | undefined =
  PMV_CATEGORY_BINS_ISO_7730[Standard.iso_7730_2025].edges[
    PMV_CATEGORY_BINS_ISO_7730[Standard.iso_7730_2025].labels.indexOf("II")
  ];
const categoryBMax: number | undefined =
  PMV_CATEGORY_BINS_ISO_7730[Standard.iso_7730_2005].edges[
    PMV_CATEGORY_BINS_ISO_7730[Standard.iso_7730_2005].labels.indexOf("B")
  ];
// @ts-expect-error the bins are frozen, so their type is readonly.
PMV_CATEGORY_BINS_ISO_7730[Standard.iso_7730_2025].right = true;

// pmv_ppd_iso and pmv_ppd_ashrae return ModelWarning rows, typed through to
// the bound once a row's kind is narrowed.
const isoWarnings: readonly ModelWarning[] = pmvIso.warnings;
const isoRow = pmvIso.warnings[0];
const isoRowMax: number | undefined =
  isoRow.kind === "range" ? isoRow.bound.max : undefined;
// @ts-expect-error the result is readonly, as upstream's frozen dataclass.
pmvIso.pmv = 1;
const ashraeRow = pmv_ppd_ashrae({
  tdb: 45,
  tr: 25,
  vr: 0.1,
  rh: 50,
  met: 1.2,
  clo: 0.5,
}).warnings[0];
const ashraeRowMax: number | undefined =
  ashraeRow.kind === "range" ? ashraeRow.bound.max : undefined;
// @ts-expect-error role is one of three literals, not any string.
const notARole: ApplicabilityWarning["role"] = "somewhere";
if (ashraeRow.kind === "range")
  // @ts-expect-error the rows share the metadata's frozen bounds, so writes are rejected.
  ashraeRow.bound.max = 50;

// utci takes one inputs object too (ADR 0002), with its inputs and result
// types named after upstream's classes; the lines below are errors only while
// the published signature is typed.
const utciParams: UTCIInputs = {
  tdb: 77,
  tr: 77,
  v: 3.28084,
  rh: 50,
  units: "IP",
  limit_inputs: false,
  round_output: false,
};
const utciResult: UTCI = utci(utciParams);
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
// @ts-expect-error the result is readonly, as upstream's frozen dataclass.
utciResult.utci = 1;

// adaptive_ashrae returns ModelWarning rows, typed through to the bound once
// a row's kind is narrowed.
const adaptiveWarnings: readonly ModelWarning[] = adaptiveResult.warnings;
const adaptiveRow = adaptiveResult.warnings[0];
const adaptiveRowMax: number | undefined =
  adaptiveRow.kind === "range" ? adaptiveRow.bound.max : undefined;
// heat_index_rothfusz returns ModelWarning rows: a row's bound reads once its
// kind is narrowed to "range", and the rows are readonly.
const heatIndexWarnings: readonly ModelWarning[] = heatIndexResult.warnings;
const heatIndexRow = heatIndexResult.warnings[0];
const heatIndexRowMax: number | undefined =
  heatIndexRow.kind === "range" ? heatIndexRow.bound.max : undefined;
// @ts-expect-error a notice row has no bound.
const heatIndexUnnarrowed = heatIndexRow.bound;
// @ts-expect-error the rows are readonly.
heatIndexResult.warnings.push(heatIndexRow);
const utciWarnings: readonly ModelWarning[] = utciResult.warnings;
const utciRow = utciResult.warnings[0];
const utciRowMax: number | undefined =
  utciRow.kind === "range" ? utciRow.bound.max : undefined;
const utciPaBound: Bound = UTCI_INFO.derived["pa (kPa)"].applicability;

// clo_tout takes one inputs object too (ADR 0002), with its inputs and
// result types named after upstream's classes; the lines below are errors
// only while the published signature is typed. units takes the constant or
// the literal (ADR 0019, whitelist item 5).
const cloToutInputs: CloTOutInputs = { tout: 68, units: Units.IP };
const cloToutResult: CloTOut = clo_tout(cloToutInputs);
const cloTout: number = cloToutResult.clo_tout;
const cloToutUnits: "SI" | "IP" | undefined = cloToutInputs.units;
const cloToutUnitsDefault: "SI" = CLO_TOUT_INFO.inputs.units.default;
// @ts-expect-error `t_out` is not a param; the temperature is `tout`.
clo_tout({ t_out: 20 });
// @ts-expect-error tout is a required quantity.
clo_tout({ units: "SI" });
// @ts-expect-error tout must be a number.
clo_tout({ tout: "20" });
// @ts-expect-error units is "SI" or "IP".
clo_tout({ tout: 20, units: "metric" });
// @ts-expect-error the result's key is `clo_tout`, not `clo`.
cloToutResult.clo;
// @ts-expect-error the clo_tout metadata is readonly.
CLO_TOUT_INFO.inputs.tout = { kind: "numeric", unit: "°C" };
// @ts-expect-error the result is readonly, as upstream's frozen dataclass.
cloToutResult.clo_tout = 1;

// solar_gain takes one inputs object too (ADR 0002), with its inputs and
// result types named after upstream's classes; the lines below are errors
// only while the published signature is typed. posture takes the constant or
// the literal (deviation _shared-29).
const solarGainParams: SolarGainInputs = {
  sol_altitude: 0,
  sharp: 120,
  sol_radiation_dir: 800,
  sol_transmittance: 0.5,
  f_svv: 0.5,
  f_bes: 0.5,
  posture: Postures.supine,
  round_output: false,
};
const solarGainResult: SolarGain = solar_gain(solarGainParams);
const deltaMrt: number = solarGainResult.delta_mrt;
const solarGainWarnings: readonly ModelWarning[] = solarGainResult.warnings;
const solarGainPostureDefault: "sitting" =
  SOLAR_GAIN_INFO.inputs.posture.default;
const solRadiationDirMax: number | undefined =
  SOLAR_GAIN_INFO.inputs.sol_radiation_dir.applicability?.max;
// @ts-expect-error `altitude` is not a param; the angle is `sol_altitude`.
solar_gain({ ...solarGainParams, altitude: 30 });
// @ts-expect-error f_bes is a required quantity.
solar_gain({
  sol_altitude: 0,
  sharp: 120,
  sol_radiation_dir: 800,
  sol_transmittance: 0.5,
  f_svv: 0.5,
});
// @ts-expect-error sharp must be a number.
solar_gain({ ...solarGainParams, sharp: "120" });
// @ts-expect-error posture is "sitting", "standing" or "supine".
solar_gain({ ...solarGainParams, posture: "lying" });
// @ts-expect-error round_output is a boolean.
solar_gain({ ...solarGainParams, round_output: "false" });
// @ts-expect-error `limit_inputs` is not an input; upstream's solar_gain has none.
solar_gain({ ...solarGainParams, limit_inputs: true });
// @ts-expect-error the solar gain metadata is readonly.
SOLAR_GAIN_INFO.inputs.asw = { kind: "numeric", unit: null };
// @ts-expect-error the result is readonly, as upstream's frozen dataclass.
solarGainResult.erf = 1;

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

// A group's garments index clo_individual_garments and read it as numbers;
// the groups are frozen, so a write to their garments is a type error. The
// table is typed Record<string, number>, so its keys type as string: that each
// garment is a real key is held by tests/utilities/clothing.test.ts.
const garmentClo: number[] = CLO_INDIVIDUAL_GARMENT_GROUPS.flatMap(
  ({ garments }) => garments.map((garment) => clo_individual_garments[garment]),
);
// @ts-expect-error a group's garments are readonly.
CLO_INDIVIDUAL_GARMENT_GROUPS[0].garments.push("Bra");

// A subpath export is the root's export, so their types are interchangeable.
const sameUtci: typeof utci = utciFromModels;
const samePSat: typeof jsthermalcomfort.p_sat = p_sat;
const sameStandard: typeof Standard = standardFromUtilities;

// two_nodes_gagge returns SET for calculate_ce: true, GaggeTwoNodes for false or
// left out, and upstream's union, SET | GaggeTwoNodes, for a boolean; position
// is a choice_field, which takes null as upstream's takes None, and w_max a
// number.
const twoNodesInputs: GaggeTwoNodesInputs = {
  tdb: 25,
  tr: 25,
  v: 0.1,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  position: null,
};
const twoNodes: SET | GaggeTwoNodes = two_nodes_gagge(twoNodesInputs);
const twoNodesSet: number = twoNodes.set;
// @ts-expect-error a boolean calculate_ce returns the union, not GaggeTwoNodes.
const twoNodesUnion: GaggeTwoNodes = two_nodes_gagge(twoNodesInputs);
const twoNodesW: number = two_nodes_gagge({
  tdb: 25,
  tr: 25,
  v: 0.1,
  rh: 50,
  clo: 0.5,
  met: 1.2,
}).w;
const twoNodesSkin: number = two_nodes_gagge({
  ...twoNodesInputs,
  calculate_ce: false,
}).e_skin;
// calculate_ce: true returns SET, which has none of GaggeTwoNodes' other fields.
const twoNodesCe: SET &
  Partial<Record<Exclude<keyof GaggeTwoNodes, keyof SET>, never>> =
  two_nodes_gagge({ ...twoNodesInputs, calculate_ce: true });
// @ts-expect-error position is one of choice_field's three values.
two_nodes_gagge({ ...twoNodesInputs, position: "lying" });
// @ts-expect-error w_max is a number; upstream's False is 0 here.
two_nodes_gagge({ ...twoNodesInputs, w_max: false });

// phs takes posture, a choice_field with no default, and standard, one of ISO
// 7933's editions; the edition's p_a and met bounds are PHS_LIMITS_ISO_7933's.
const phsInputs: PHSInputs = {
  tdb: 40,
  tr: 40,
  v: 0.3,
  rh: 33.85,
  met: 2.5,
  clo: 0.5,
  posture: "standing",
  standard: "7933-2004",
};
const phsResult: PHS = phs(phsInputs);
const phsTre: number = phsResult.t_re;
const phsMet2004: Bound = PHS_LIMITS_ISO_7933["7933-2004"].met;
// @ts-expect-error posture is required.
phs({ tdb: 40, tr: 40, v: 0.3, rh: 33.85, met: 2.5, clo: 0.5 });
// @ts-expect-error posture is one of choice_field's three values.
phs({ ...phsInputs, posture: "lying" });
// @ts-expect-error standard is one of ISO 7933's two editions.
phs({ ...phsInputs, standard: "7730-2025" });

// set_tmp takes position as two_nodes_gagge does and no units, as upstream's
// signature does, and returns upstream's SET, which two_nodes_gagge declares.
const setInputs: SETInputs = {
  tdb: 25,
  tr: 25,
  v: 0.1,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  position: null,
  calculate_ce: true,
};
const setResult: SET = set_tmp(setInputs);
const setValue: number = setResult.set;
// @ts-expect-error the result is readonly.
setResult.set = 1;
// @ts-expect-error position is one of choice_field's three values.
set_tmp({ ...setInputs, position: "lying" });
// @ts-expect-error set_tmp takes no units.
set_tmp({ ...setInputs, units: "SI" });

// use_fans_heatwaves takes position as two_nodes_gagge does, and returns the
// heat strain flags as masked booleans, NaN where the gate masks them.
const useFansInputs: UseFansHeatwavesInputs = {
  tdb: 35,
  tr: 35,
  v: 1.0,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  position: "sitting",
};
const useFans: UseFansHeatwaves = use_fans_heatwaves(useFansInputs);
const useFansSkin: number = useFans.e_skin;
const useFansStrain: boolean | number = useFans.heat_strain;
// @ts-expect-error a masked boolean may be NaN, a number.
const useFansStrainBool: boolean = useFans.heat_strain;
// @ts-expect-error position is one of choice_field's three values.
use_fans_heatwaves({ ...useFansInputs, position: "lying" });

// ankle_draft takes units as BaseInputs does, and returns acceptability as a
// masked boolean, NaN where the gate masks it.
const ankleInputs: AnkleDraftInputs = {
  tdb: 25,
  tr: 25,
  vr: 0.2,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  v_ankle: 0.3,
  units: "SI",
};
const ankle: AnkleDraft = ankle_draft(ankleInputs);
const anklePpd: number = ankle.ppd_ad;
const ankleAcceptability: boolean | number = ankle.acceptability;
// @ts-expect-error a masked boolean may be NaN, a number.
const ankleAcceptabilityBool: boolean = ankle.acceptability;
// @ts-expect-error units is 'SI' or 'IP'.
ankle_draft({ ...ankleInputs, units: "metric" });

// vertical_tmp_grad_ppd takes no units, as upstream's signature does, and
// returns acceptability as a masked boolean, NaN where the gate masks it.
const verticalInputs: VerticalTGradPPDInputs = {
  tdb: 25,
  tr: 25,
  vr: 0.1,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  vertical_tmp_grad: 7,
};
const vertical: VerticalTGradPPD = vertical_tmp_grad_ppd(verticalInputs);
const verticalPpd: number = vertical.ppd_vg;
const verticalAcceptability: boolean | number = vertical.acceptability;
// @ts-expect-error a masked boolean may be NaN, a number.
const verticalAcceptabilityBool: boolean = vertical.acceptability;
// @ts-expect-error vertical_tmp_grad_ppd takes no units.
vertical_tmp_grad_ppd({ ...verticalInputs, units: "SI" });

// adaptive_en takes one inputs object (ADR 0002), with its inputs and result
// types named after upstream's ENInputs and AdaptiveEN, and returns a readonly
// result, frozen although upstream's dataclass is not (deviation adaptive_en-5).
const enInputs: ENInputs = { tdb: 25, tr: 25, t_running_mean: 20, v: 0.1 };
const en: AdaptiveEN = adaptive_en(enInputs);
const enCmf: number = en.tmp_cmf;
const enAcceptability: boolean = en.acceptability_cat_i;
// @ts-expect-error the result is readonly.
en.tmp_cmf = 1;
// @ts-expect-error units is 'SI' or 'IP'.
adaptive_en({ ...enInputs, units: "metric" });
// @ts-expect-error adaptive_en takes no standard, as upstream takes no model.
adaptive_en({ ...enInputs, standard: "16798-1-2019" });

// humidex takes one inputs object (ADR 0002), with its inputs and result types
// named after upstream's HumidexInputs and Humidex, and returns a readonly
// result whose discomfort is a label.
const humidexInputs: HumidexInputs = { tdb: 25, rh: 50, model: "masterson" };
const humidexResult: Humidex = humidex(humidexInputs);
const humidexValue: number = humidexResult.humidex;
const humidexDiscomfort: string = humidexResult.discomfort;
// @ts-expect-error the result is readonly.
humidexResult.humidex = 1;
// @ts-expect-error model is 'rana' or 'masterson'.
humidex({ tdb: 25, rh: 50, model: "lu" });
// @ts-expect-error humidex takes upstream's model, not standard.
humidex({ tdb: 25, rh: 50, standard: "rana" });

// wci takes one inputs object (ADR 0002), with its inputs and result types
// named after upstream's WCIInputs and WCI, and returns a readonly result.
const wciInputs: WCIInputs = { tdb: -5, v: 5.5, round_output: false };
const wciResult: WCI = wci(wciInputs);
const wciValue: number = wciResult.wci;
// @ts-expect-error the result is readonly.
wciResult.wci = 1;
// @ts-expect-error v is required.
wci({ tdb: -5 });

// wind_chill_temperature takes one inputs object (ADR 0002), with its inputs
// and result types named after upstream's WCTInputs and WCT, and returns a
// readonly result.
const wctInputs: WCTInputs = { tdb: -5, v: 5.5, round_output: false };
const wctResult: WCT = wind_chill_temperature(wctInputs);
const wctValue: number = wctResult.wct;
// @ts-expect-error the result is readonly.
wctResult.wct = 1;
// @ts-expect-error v is required.
wind_chill_temperature({ tdb: -5 });

// pmv_a takes one inputs object (ADR 0002), with its inputs and result types
// named after upstream's APMVInputs and APMV, and returns a readonly result.
const pmvAInputs: APMVInputs = {
  tdb: 24,
  tr: 30,
  vr: 0.22,
  rh: 50,
  met: 1.4,
  clo: 0.5,
  a_coefficient: 0.293,
  units: "SI",
};
const pmvAResult: APMV = pmv_a(pmvAInputs);
const pmvAValue: number = pmvAResult.a_pmv;
// @ts-expect-error the result is readonly.
pmvAResult.a_pmv = 1;
// @ts-expect-error a_coefficient is required.
pmv_a({ tdb: 24, tr: 30, vr: 0.22, rh: 50, met: 1.4, clo: 0.5 });

// pmv_e takes one inputs object (ADR 0002), with its inputs and result types
// named after upstream's EPMVInputs and EPMV, and returns a readonly result.
const pmvEInputs: EPMVInputs = {
  tdb: 24,
  tr: 30,
  vr: 0.22,
  rh: 50,
  met: 1.4,
  clo: 0.5,
  e_coefficient: 0.6,
  units: "SI",
};
const pmvEResult: EPMV = pmv_e(pmvEInputs);
const pmvEValue: number = pmvEResult.e_pmv;
// @ts-expect-error the result is readonly.
pmvEResult.e_pmv = 1;
// @ts-expect-error e_coefficient is required.
pmv_e({ tdb: 24, tr: 30, vr: 0.22, rh: 50, met: 1.4, clo: 0.5 });
