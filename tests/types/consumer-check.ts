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
  AT,
  ATInputs,
  ASHRAEInputs,
  ENInputs,
  Bound,
  ClassifierBins,
  CloTOut,
  CloTOutInputs,
  CE,
  CEInputs,
  DerivedField,
  DI,
  DIInputs,
  ESI,
  ESIInputs,
  GaggeTwoNodes,
  GaggeTwoNodesInputs,
  GaggeTwoNodesJi,
  GaggeTwoNodesJiInputs,
  GaggeTwoNodesSleep,
  GaggeTwoNodesSleepInputs,
  HI,
  HIInputs,
  HILu,
  HILuInputs,
  HISchoenInputs,
  Humidex,
  HumidexInputs,
  IREQ,
  IREQInputs,
  PredictedBodyTemperatures,
  RidgeRegressionInputs,
  ModelInfo,
  ModelWarning,
  NET,
  NETInputs,
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
  THI,
  THIInputs,
  UseFansHeatwaves,
  UseFansHeatwavesInputs,
  UTCI,
  UTCIInputs,
  VerticalTGradPPD,
  VerticalTGradPPDInputs,
  WBGT,
  WBGTInputs,
  WCI,
  WCIInputs,
  WCT,
  WCTInputs,
  WorkCapacity,
  WorkCapacityDunneInputs,
  WorkCapacityHothapsInputs,
  WorkCapacityStandardsInputs,
  APMV,
  APMVInputs,
  EPMV,
  EPMVInputs,
  ATHB,
  ATHBInputs,
  SportsHeatStressInputs,
  SportsHeatStressRisk,
  OutputField,
  StandardId,
  UnitSymbol,
} from "jsthermalcomfort";
import {
  ADAPTIVE_ASHRAE_INFO,
  ADAPTIVE_EN_INFO,
  ANKLE_DRAFT_INFO,
  AT_INFO,
  CLO_INDIVIDUAL_GARMENT_GROUPS,
  CLO_TOUT_INFO,
  COOLING_EFFECT_INFO,
  DISCOMFORT_INDEX_INFO,
  ESI_INFO,
  HEAT_INDEX_LU_INFO,
  HEAT_INDEX_ROTHFUSZ_INFO,
  HEAT_INDEX_SCHOEN_INFO,
  HUMIDEX_INFO,
  IREQ_INFO,
  RIDGE_REGRESSION_PREDICT_T_RE_T_SK_INFO,
  NET_INFO,
  PHS_INFO,
  PHS_LIMITS_ISO_7933,
  PMV_CATEGORY_BINS_ISO_7730,
  PMV_PPD_ASHRAE_INFO,
  PMV_PPD_ISO_INFO,
  SET_TMP_INFO,
  SOLAR_GAIN_INFO,
  Standard,
  THI_INFO,
  TWO_NODES_GAGGE_INFO,
  TWO_NODES_GAGGE_JI_INFO,
  TWO_NODES_GAGGE_SLEEP_INFO,
  Postures,
  Sex,
  Units,
  USE_FANS_HEATWAVES_INFO,
  UTCI_INFO,
  VERTICAL_TMP_GRAD_PPD_INFO,
  WBGT_INFO,
  WCI_INFO,
  WIND_CHILL_TEMPERATURE_INFO,
  WORK_CAPACITY_DUNNE_INFO,
  WORK_CAPACITY_HOTHAPS_INFO,
  WORK_CAPACITY_ISO_INFO,
  WORK_CAPACITY_NIOSH_INFO,
  WorkIntensity,
  PMV_A_INFO,
  PMV_E_INFO,
  PMV_ATHB_INFO,
  SPORTS_HEAT_STRESS_RISK_INFO,
  Sports,
  _SportsValues,
  adaptive_ashrae,
  adaptive_en,
  ankle_draft,
  at,
  classifyFromBins,
  clo_individual_garments,
  clo_tout,
  clo_typical_ensembles,
  cooling_effect,
  discomfort_index,
  esi,
  heat_index_lu,
  heat_index_rothfusz,
  heat_index_schoen,
  humidex,
  ireq,
  ridge_regression_predict_t_re_t_sk,
  net,
  phs,
  pmv_ppd_ashrae,
  pmv_ppd_iso,
  set_tmp,
  solar_gain,
  thi,
  two_nodes_gagge,
  two_nodes_gagge_ji,
  two_nodes_gagge_sleep,
  use_fans_heatwaves,
  utci,
  vertical_tmp_grad_ppd,
  wbgt,
  wci,
  wind_chill_temperature,
  work_capacity_dunne,
  work_capacity_hothaps,
  work_capacity_iso,
  work_capacity_niosh,
  pmv_a,
  pmv_e,
  pmv_athb,
  sports_heat_stress_risk,
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
const heat_index: ModelInfo = HEAT_INDEX_ROTHFUSZ_INFO;
const clo_tout_info: ModelInfo = CLO_TOUT_INFO;
const cooling_effect_info: ModelInfo = COOLING_EFFECT_INFO;
const iso: ModelInfo = PMV_PPD_ISO_INFO;
const ashrae: ModelInfo = PMV_PPD_ASHRAE_INFO;
const adaptive: ModelInfo = ADAPTIVE_ASHRAE_INFO;
const utci_info: ModelInfo = UTCI_INFO;
const solar_gain_info = SOLAR_GAIN_INFO;
const two_nodes_gagge_info: ModelInfo = TWO_NODES_GAGGE_INFO;
const phs_info: ModelInfo = PHS_INFO;
const use_fans_heatwaves_info: ModelInfo = USE_FANS_HEATWAVES_INFO;
const ankle_draft_info: ModelInfo = ANKLE_DRAFT_INFO;
const vertical_tmp_grad_ppd_info: ModelInfo = VERTICAL_TMP_GRAD_PPD_INFO;
const adaptive_en_info: ModelInfo = ADAPTIVE_EN_INFO;
const humidex_info: ModelInfo = HUMIDEX_INFO;
const heat_index_schoen_info: ModelInfo = HEAT_INDEX_SCHOEN_INFO;
const heat_index_lu_info: ModelInfo = HEAT_INDEX_LU_INFO;
const at_info: ModelInfo = AT_INFO;
const wci_info: ModelInfo = WCI_INFO;
const wind_chill_temperature_info: ModelInfo = WIND_CHILL_TEMPERATURE_INFO;
const set_tmp_info: ModelInfo = SET_TMP_INFO;
const pmv_a_info: ModelInfo = PMV_A_INFO;
const pmv_e_info: ModelInfo = PMV_E_INFO;
const pmv_athb_info: ModelInfo = PMV_ATHB_INFO;
const sports_heat_stress_risk_info: ModelInfo = SPORTS_HEAT_STRESS_RISK_INFO;
const work_capacity_dunne_info: ModelInfo = WORK_CAPACITY_DUNNE_INFO;
const work_capacity_hothaps_info: ModelInfo = WORK_CAPACITY_HOTHAPS_INFO;
const work_capacity_iso_info: ModelInfo = WORK_CAPACITY_ISO_INFO;
const work_capacity_niosh_info: ModelInfo = WORK_CAPACITY_NIOSH_INFO;
const discomfort_index_info: ModelInfo = DISCOMFORT_INDEX_INFO;
const esi_info: ModelInfo = ESI_INFO;
const net_info: ModelInfo = NET_INFO;
const thi_info: ModelInfo = THI_INFO;
const wbgt_info: ModelInfo = WBGT_INFO;
const ireq_info: ModelInfo = IREQ_INFO;
const ridge_info: ModelInfo = RIDGE_REGRESSION_PREDICT_T_RE_T_SK_INFO;
const two_nodes_ji_info: ModelInfo = TWO_NODES_GAGGE_JI_INFO;
const two_nodes_sleep_info: ModelInfo = TWO_NODES_GAGGE_SLEEP_INFO;

// A migrated model's INFO.inputs is its input definition, switches included,
// typed by kind.
const tdb_kind: "numeric" = HEAT_INDEX_ROTHFUSZ_INFO.inputs.tdb.kind;
const limit_inputs_default: boolean =
  HEAT_INDEX_ROTHFUSZ_INFO.inputs.limit_inputs.default;
// Its INFO.outputs gives each returned value's kind, from which the result
// type is derived.
const acceptability_kind: "flag" =
  ADAPTIVE_ASHRAE_INFO.outputs.acceptability_80.kind;
// A migrated INFO's entries are typed `OutputField` and `DerivedField`.
const utci_output: OutputField = UTCI_INFO.outputs.utci;
const pa_derived: DerivedField = UTCI_INFO.derived["pa (kPa)"];
// A unit is one of the symbols the models use, so a misspelt one is rejected.
const tdb_unit: UnitSymbol = HEAT_INDEX_ROTHFUSZ_INFO.inputs.tdb.unit;
// @ts-expect-error "°c" is not a unit; the unit is "°C".
const misspelt_unit: UnitSymbol = "°c";

// The shape a front end actually reaches for: a per-model applicability limit.
const min_of = (bound: Bound | undefined): number | undefined => bound?.min;
const min_tdb = min_of(PMV_PPD_ISO_INFO.inputs.tdb.applicability);

// Every model lists the standards whose values it takes as Standard values,
// typed by the exported `StandardId`.
const iso_standards: readonly (typeof Standard)[keyof typeof Standard][] =
  iso.standards;
const heat_index_standards: readonly StandardId[] = heat_index.standards;
// @ts-expect-error "55-2020" is not a Standard value.
const unknown_standard: StandardId = "55-2020";

// Bins are reached through the metadata, and the models not yet migrated also
// export them directly (issue #184 §3.4).
const label = classifyFromBins(
  28.5,
  HEAT_INDEX_ROTHFUSZ_INFO.outputs.stress_category.classifier,
);
const tsv_label = classifyFromBins(
  0.4,
  PMV_PPD_ISO_INFO.outputs.tsv.classifier,
);
const utci_label = classifyFromBins(
  24.6,
  UTCI_INFO.outputs.stress_category.classifier,
);

// The classifier reached through the metadata is typed, not `Object`, so a
// consumer can read the edge convention without casting.
const bins: ClassifierBins | undefined = iso.outputs.tsv.classifier;
const right_inclusive: boolean | undefined = bins?.right;
const edge_count: number | undefined = bins?.edges.length;

// Model info names the model it belongs to: `name` reads as a string, no
// other type, and a ModelInfo without it is rejected.
const model_name: string = iso.name;
// @ts-expect-error `name` is a string, not a number.
const name_not_a_number: number = PMV_PPD_ISO_INFO.name;
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
const not_a_number: number = PMV_PPD_ISO_INFO.label;
// @ts-expect-error `inputs` has no `nonexistent_variable` key.
const not_a_key: unknown = PMV_PPD_ISO_INFO.inputs.tdb.nonexistent_variable;
// @ts-expect-error `label` is a string, not a number.
const not_a_number_either: number = ADAPTIVE_ASHRAE_INFO.label;

// The runtime values are deep-frozen, so the types must reject writes too.
// Without these, a consumer could assign, type-check cleanly, and then throw:
// an ES module is always strict, so the assignment is not silently ignored.
// If any of these stop being errors the readonly modifiers have been lost, and
// tsc fails with "Unused '@ts-expect-error' directive".
// @ts-expect-error applicability bounds are readonly.
PMV_PPD_ISO_INFO.inputs.tdb.applicability.min = 5;
// @ts-expect-error the inputs map is readonly.
PMV_PPD_ISO_INFO.inputs.tdb = { unit: "°C" };
// @ts-expect-error the metadata object itself is readonly.
PMV_PPD_ISO_INFO.label = "something else";
// @ts-expect-error push mutates, and the standards array is readonly.
PMV_PPD_ISO_INFO.standards.push(Standard.ashrae_55_2023); // eslint-disable-line @typescript-eslint/no-unsafe-call -- the call the compiler rejects
// @ts-expect-error the adaptive metadata is readonly too.
ADAPTIVE_ASHRAE_INFO.inputs.t_running_mean.applicability.max = 40;
// @ts-expect-error the ASHRAE PMV metadata is readonly.
PMV_PPD_ASHRAE_INFO.outputs.pmv = { unit: null };
// @ts-expect-error classifier bin edges are a readonly array.
PMV_PPD_ISO_INFO.outputs.tsv.classifier.edges[0] = 0;
// @ts-expect-error push mutates, and the array is readonly.
HEAT_INDEX_ROTHFUSZ_INFO.outputs.stress_category.classifier.labels.push("new"); // eslint-disable-line @typescript-eslint/no-unsafe-call -- the call the compiler rejects
// @ts-expect-error the UTCI metadata is readonly, its derived bound included.
UTCI_INFO.derived["tr - tdb"].applicability.max = 80;

// pmv_ppd_iso takes one inputs object too (ADR 0002), with its inputs and
// result types named after upstream's classes; the lines below are errors only
// while the published signature is typed.
const pmv_iso_params: PMVPPDInputs = {
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
const pmv_iso_ip: PMVPPD = pmv_ppd_iso(pmv_iso_params);
const pmv_iso = pmv_ppd_iso({
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
const adaptive_params: ASHRAEInputs = {
  tdb: 77,
  tr: 77,
  t_running_mean: 68,
  v: 0.3,
  units: "IP",
  limit_inputs: false,
  round_output: false,
};
const adaptive_result: AdaptiveASHRAE = adaptive_ashrae(adaptive_params);
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
adaptive_result.tmp_cmf = 1;

// cooling_effect takes one inputs object (ADR 0002), with its inputs and
// result types exported by name; the lines below are errors only while the
// published signature is typed. units takes the constant or the literal (ADR
// 0019, whitelist item 5).
const cooling_effect_inputs: CEInputs = {
  tdb: 77,
  tr: 77,
  vr: 1.64,
  rh: 50,
  met: 1,
  clo: 0.6,
  wme: 0,
  units: Units.IP,
};
const cooling_effect_result: CE = cooling_effect(cooling_effect_inputs);
const cooling_effect_value: number = cooling_effect_result.ce;
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
cooling_effect({ ...cooling_effect_inputs, suppress_warnings: true });
// @ts-expect-error the result is readonly, as upstream's frozen dataclass.
cooling_effect_result.ce = 1;

// heat_index_rothfusz takes one inputs object (ADR 0002), with its inputs
// and result types exported by name; the lines below are errors only while
// the published signature is typed.
const heat_index_inputs: HIInputs = {
  tdb: 30,
  rh: 80,
  round_output: false,
  limit_inputs: false,
};
const heat_index_result: HI = heat_index_rothfusz(heat_index_inputs);
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
const pmv_ashrae_params: PMVPPDAshraeInputs = {
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
const pmv_ashrae: PMVPPDAshrae = pmv_ppd_ashrae(pmv_ashrae_params);
const ashrae_compliance: boolean | null = pmv_ashrae.compliance;
// @ts-expect-error a nullable flag may be null, no value.
const ashrae_compliance_bool: boolean = pmv_ashrae.compliance;
const ashrae_tsv: string | null = pmv_ashrae.tsv;
// The interval compliance is read against, published once in its INFO.
const compliance_max: number =
  PMV_PPD_ASHRAE_INFO.outputs.compliance.interval.max;
// @ts-expect-error suppress_warnings is gone; the notice is a row of warnings.
pmv_ppd_ashrae({ ...pmv_ashrae_params, suppress_warnings: true });
// @ts-expect-error the result is readonly, as upstream's frozen dataclass.
pmv_ashrae.compliance = true;
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
const iso_category: string | null = pmv_iso.category;
const category_ii_max: number | undefined =
  PMV_CATEGORY_BINS_ISO_7730[Standard.iso_7730_2025].edges[
    PMV_CATEGORY_BINS_ISO_7730[Standard.iso_7730_2025].labels.indexOf("II")
  ];
const category_b_max: number | undefined =
  PMV_CATEGORY_BINS_ISO_7730[Standard.iso_7730_2005].edges[
    PMV_CATEGORY_BINS_ISO_7730[Standard.iso_7730_2005].labels.indexOf("B")
  ];
// @ts-expect-error the bins are frozen, so their type is readonly.
PMV_CATEGORY_BINS_ISO_7730[Standard.iso_7730_2025].right = true;

// pmv_ppd_iso and pmv_ppd_ashrae return ModelWarning rows, typed through to
// the bound once a row's kind is narrowed.
const iso_warnings: readonly ModelWarning[] = pmv_iso.warnings;
const iso_row = pmv_iso.warnings[0];
const iso_row_max: number | undefined =
  iso_row.kind === "range" ? iso_row.bound.max : undefined;
// @ts-expect-error the result is readonly, as upstream's frozen dataclass.
pmv_iso.pmv = 1;
const ashrae_row = pmv_ppd_ashrae({
  tdb: 45,
  tr: 25,
  vr: 0.1,
  rh: 50,
  met: 1.2,
  clo: 0.5,
}).warnings[0];
const ashrae_row_max: number | undefined =
  ashrae_row.kind === "range" ? ashrae_row.bound.max : undefined;
// @ts-expect-error role is one of three literals, not any string.
const not_a_role: Extract<ModelWarning, { kind: "range" }>["role"] =
  "somewhere";
if (ashrae_row.kind === "range")
  // @ts-expect-error the rows share the metadata's frozen bounds, so writes are rejected.
  ashrae_row.bound.max = 50;

// utci takes one inputs object too (ADR 0002), with its inputs and result
// types named after upstream's classes; the lines below are errors only while
// the published signature is typed.
const utci_params: UTCIInputs = {
  tdb: 77,
  tr: 77,
  v: 3.28084,
  rh: 50,
  units: "IP",
  limit_inputs: false,
  round_output: false,
};
const utci_result: UTCI = utci(utci_params);
const utci_category: string | null = utci_result.stress_category;
// @ts-expect-error a nullable number may be null, no value.
const utci_number: number = utci_result.utci;
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
utci_result.utci = 1;

// adaptive_ashrae returns ModelWarning rows, typed through to the bound once
// a row's kind is narrowed.
const adaptive_warnings: readonly ModelWarning[] = adaptive_result.warnings;
const adaptive_row = adaptive_result.warnings[0];
const adaptive_row_max: number | undefined =
  adaptive_row.kind === "range" ? adaptive_row.bound.max : undefined;
// heat_index_rothfusz returns ModelWarning rows: a row's bound reads once its
// kind is narrowed to "range", and the rows are readonly.
const heat_index_warnings: readonly ModelWarning[] = heat_index_result.warnings;
const heat_index_row = heat_index_result.warnings[0];
const heat_index_row_max: number | undefined =
  heat_index_row.kind === "range" ? heat_index_row.bound.max : undefined;
// @ts-expect-error a notice row has no bound.
const heat_index_unnarrowed: unknown = heat_index_row.bound;
// @ts-expect-error the rows are readonly.
heat_index_result.warnings.push(heat_index_row); // eslint-disable-line @typescript-eslint/no-unsafe-call -- the call the compiler rejects
const utci_warnings: readonly ModelWarning[] = utci_result.warnings;
const utci_row = utci_result.warnings[0];
const utci_row_max: number | undefined =
  utci_row.kind === "range" ? utci_row.bound.max : undefined;
const utci_pa_bound: Bound = UTCI_INFO.derived["pa (kPa)"].applicability;

// clo_tout takes one inputs object too (ADR 0002), with its inputs and
// result types named after upstream's classes; the lines below are errors
// only while the published signature is typed. units takes the constant or
// the literal (ADR 0019, whitelist item 5).
const clo_tout_inputs: CloTOutInputs = { tout: 68, units: Units.IP };
const clo_tout_result: CloTOut = clo_tout(clo_tout_inputs);
const clo_tout_value: number = clo_tout_result.clo_tout;
const clo_tout_units: "SI" | "IP" | undefined = clo_tout_inputs.units;
const clo_tout_units_default: "SI" = CLO_TOUT_INFO.inputs.units.default;
// @ts-expect-error `t_out` is not a param; the temperature is `tout`.
clo_tout({ t_out: 20 });
// @ts-expect-error tout is a required quantity.
clo_tout({ units: "SI" });
// @ts-expect-error tout must be a number.
clo_tout({ tout: "20" });
// @ts-expect-error units is "SI" or "IP".
clo_tout({ tout: 20, units: "metric" });
// @ts-expect-error the result's key is `clo_tout`, not `clo`.
clo_tout_result.clo; // eslint-disable-line @typescript-eslint/no-unused-expressions -- the read the compiler rejects
// @ts-expect-error the clo_tout metadata is readonly.
CLO_TOUT_INFO.inputs.tout = { kind: "numeric", unit: "°C" };
// @ts-expect-error the result is readonly, as upstream's frozen dataclass.
clo_tout_result.clo_tout = 1;

// solar_gain takes one inputs object too (ADR 0002), with its inputs and
// result types named after upstream's classes; the lines below are errors
// only while the published signature is typed. posture takes the constant or
// the literal (deviation _shared-29).
const solar_gain_params: SolarGainInputs = {
  sol_altitude: 0,
  sharp: 120,
  sol_radiation_dir: 800,
  sol_transmittance: 0.5,
  f_svv: 0.5,
  f_bes: 0.5,
  posture: Postures.supine,
  round_output: false,
};
const solar_gain_result: SolarGain = solar_gain(solar_gain_params);
const delta_mrt: number | null = solar_gain_result.delta_mrt;
const solar_gain_warnings: readonly ModelWarning[] = solar_gain_result.warnings;
const solar_gain_posture_default: "sitting" =
  SOLAR_GAIN_INFO.inputs.posture.default;
const sol_radiation_dir_max: number | undefined =
  SOLAR_GAIN_INFO.inputs.sol_radiation_dir.applicability.max;
// @ts-expect-error `altitude` is not a param; the angle is `sol_altitude`.
solar_gain({ ...solar_gain_params, altitude: 30 });
// @ts-expect-error f_bes is a required quantity.
solar_gain({
  sol_altitude: 0,
  sharp: 120,
  sol_radiation_dir: 800,
  sol_transmittance: 0.5,
  f_svv: 0.5,
});
// @ts-expect-error sharp must be a number.
solar_gain({ ...solar_gain_params, sharp: "120" });
// @ts-expect-error posture is "sitting", "standing" or "supine".
solar_gain({ ...solar_gain_params, posture: "lying" });
// @ts-expect-error round_output is a boolean.
solar_gain({ ...solar_gain_params, round_output: "false" });
// @ts-expect-error `limit_inputs` is not an input; upstream's solar_gain has none.
solar_gain({ ...solar_gain_params, limit_inputs: true });
// @ts-expect-error the solar gain metadata is readonly.
SOLAR_GAIN_INFO.inputs.asw = { kind: "numeric", unit: null };
// @ts-expect-error the result is readonly, as upstream's frozen dataclass.
solar_gain_result.erf = 1;

// The shared PMV module is not part of the package, as upstream has no public
// pmv_ppd: a consumer calls pmv_ppd_iso or pmv_ppd_ashrae.
// @ts-expect-error pmv_ppd is not exported.
jsthermalcomfort.pmv_ppd; // eslint-disable-line @typescript-eslint/no-unused-expressions -- the read the compiler rejects

// clo_typical_ensembles is a table keyed like pythermalcomfort's dict, typed
// from its entries: a known ensemble reads as a number, an unknown one and a
// write are type errors, so neither `any` nor a mutable record gets through.
const winter_clo: number =
  clo_typical_ensembles["Typical winter indoor clothing"];
// @ts-expect-error "Sweet pants" is not one of the table's keys.
clo_typical_ensembles["Sweet pants, short-sleeve shirt"]; // eslint-disable-line @typescript-eslint/no-unused-expressions -- the read the compiler rejects
// @ts-expect-error the table is frozen, so its type is readonly.
clo_typical_ensembles["Typical winter indoor clothing"] = 1.1;

// A group's garments index clo_individual_garments and read it as numbers;
// the groups are frozen, so a write to their garments is a type error. The
// table is typed Record<string, number>, so its keys type as string: that each
// garment is a real key is held by tests/utilities/clothing.test.ts.
const garment_clo: number[] = CLO_INDIVIDUAL_GARMENT_GROUPS.flatMap(
  ({ garments }) => garments.map((garment) => clo_individual_garments[garment]),
);
// @ts-expect-error a group's garments are readonly.
CLO_INDIVIDUAL_GARMENT_GROUPS[0].garments.push("Bra"); // eslint-disable-line @typescript-eslint/no-unsafe-call -- the call the compiler rejects

// A subpath export is the root's export, so their types are interchangeable.
const sameUtci: typeof utci = utciFromModels;
const samePSat: typeof jsthermalcomfort.p_sat = p_sat;
const same_standard: typeof Standard = standardFromUtilities;

// two_nodes_gagge returns SET for calculate_ce: true, GaggeTwoNodes for false or
// left out, and upstream's union, SET | GaggeTwoNodes, for a boolean; position
// is a choice_field, which takes null as upstream's takes None, and w_max a
// number.
const two_nodes_inputs: GaggeTwoNodesInputs = {
  tdb: 25,
  tr: 25,
  v: 0.1,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  position: null,
};
const two_nodes: SET | GaggeTwoNodes = two_nodes_gagge(two_nodes_inputs);
const two_nodes_set: number | null = two_nodes.set;
// @ts-expect-error a boolean calculate_ce returns the union, not GaggeTwoNodes.
const two_nodes_union: GaggeTwoNodes = two_nodes_gagge(two_nodes_inputs);
const two_nodes_w: number = two_nodes_gagge({
  tdb: 25,
  tr: 25,
  v: 0.1,
  rh: 50,
  clo: 0.5,
  met: 1.2,
}).w;
const two_nodes_skin: number = two_nodes_gagge({
  ...two_nodes_inputs,
  calculate_ce: false,
}).e_skin;
// calculate_ce: true returns SET, which has none of GaggeTwoNodes' other fields.
const two_nodes_ce: SET &
  Partial<Record<Exclude<keyof GaggeTwoNodes, keyof SET>, never>> =
  two_nodes_gagge({ ...two_nodes_inputs, calculate_ce: true });
// @ts-expect-error position is one of choice_field's three values.
two_nodes_gagge({ ...two_nodes_inputs, position: "lying" });
// @ts-expect-error w_max is a number; upstream's False is 0 here.
two_nodes_gagge({ ...two_nodes_inputs, w_max: false });

// phs takes posture, a choice_field with no default, and standard, one of ISO
// 7933's editions; the edition's p_a and met bounds are PHS_LIMITS_ISO_7933's.
const phs_inputs: PHSInputs = {
  tdb: 40,
  tr: 40,
  v: 0.3,
  rh: 33.85,
  met: 2.5,
  clo: 0.5,
  posture: "standing",
  standard: "7933-2004",
};
const phs_result: PHS = phs(phs_inputs);
const phs_tre: number | null = phs_result.t_re;
const phs_met2004: Bound = PHS_LIMITS_ISO_7933["7933-2004"].met;
// @ts-expect-error posture is required.
phs({ tdb: 40, tr: 40, v: 0.3, rh: 33.85, met: 2.5, clo: 0.5 });
// @ts-expect-error posture is one of choice_field's three values.
phs({ ...phs_inputs, posture: "lying" });
// @ts-expect-error standard is one of ISO 7933's two editions.
phs({ ...phs_inputs, standard: "7730-2025" });

// set_tmp takes position as two_nodes_gagge does and no units, as upstream's
// signature does, and returns upstream's SET, which two_nodes_gagge declares.
const set_inputs: SETInputs = {
  tdb: 25,
  tr: 25,
  v: 0.1,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  position: null,
  calculate_ce: true,
};
const set_result: SET = set_tmp(set_inputs);
const set_value: number | null = set_result.set;
// @ts-expect-error the result is readonly.
set_result.set = 1;
// @ts-expect-error position is one of choice_field's three values.
set_tmp({ ...set_inputs, position: "lying" });
// @ts-expect-error set_tmp takes no units.
set_tmp({ ...set_inputs, units: "SI" });

// use_fans_heatwaves takes position as two_nodes_gagge does, and returns the
// heat strain flags as true, false or null.
const use_fans_inputs: UseFansHeatwavesInputs = {
  tdb: 35,
  tr: 35,
  v: 1.0,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  position: "sitting",
};
const use_fans: UseFansHeatwaves = use_fans_heatwaves(use_fans_inputs);
const use_fans_skin: number | null = use_fans.e_skin;
const use_fans_strain: boolean | null = use_fans.heat_strain;
// @ts-expect-error a nullable flag may be null, no value.
const use_fans_strain_bool: boolean = use_fans.heat_strain;
// @ts-expect-error position is one of choice_field's three values.
use_fans_heatwaves({ ...use_fans_inputs, position: "lying" });

// ankle_draft takes units as BaseInputs does, and returns acceptability as
// true, false or null.
const ankle_inputs: AnkleDraftInputs = {
  tdb: 25,
  tr: 25,
  vr: 0.2,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  v_ankle: 0.3,
  units: "SI",
};
const ankle: AnkleDraft = ankle_draft(ankle_inputs);
const ankle_ppd: number | null = ankle.ppd_ad;
const ankle_acceptability: boolean | null = ankle.acceptability;
// @ts-expect-error a nullable flag may be null, no value.
const ankle_acceptability_bool: boolean = ankle.acceptability;
// @ts-expect-error units is 'SI' or 'IP'.
ankle_draft({ ...ankle_inputs, units: "metric" });

// vertical_tmp_grad_ppd takes no units, as upstream's signature does, and
// returns acceptability as true, false or null.
const vertical_inputs: VerticalTGradPPDInputs = {
  tdb: 25,
  tr: 25,
  vr: 0.1,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  vertical_tmp_grad: 7,
};
const vertical: VerticalTGradPPD = vertical_tmp_grad_ppd(vertical_inputs);
const vertical_ppd: number | null = vertical.ppd_vg;
const vertical_acceptability: boolean | null = vertical.acceptability;
// @ts-expect-error a nullable flag may be null, no value.
const vertical_acceptability_bool: boolean = vertical.acceptability;
// @ts-expect-error vertical_tmp_grad_ppd takes no units.
vertical_tmp_grad_ppd({ ...vertical_inputs, units: "SI" });

// adaptive_en takes one inputs object (ADR 0002), with its inputs and result
// types named after upstream's ENInputs and AdaptiveEN, and returns a readonly
// result, frozen although upstream's dataclass is not (deviation adaptive_en-5).
const en_inputs: ENInputs = { tdb: 25, tr: 25, t_running_mean: 20, v: 0.1 };
const en: AdaptiveEN = adaptive_en(en_inputs);
const en_cmf: number | null = en.tmp_cmf;
const en_acceptability: boolean | null = en.acceptability_cat_i;
// @ts-expect-error a nullable flag may be null, no value.
const en_acceptability_bool: boolean = en.acceptability_cat_i;
// @ts-expect-error the result is readonly.
en.tmp_cmf = 1;
// @ts-expect-error units is 'SI' or 'IP'.
adaptive_en({ ...en_inputs, units: "metric" });
// @ts-expect-error adaptive_en takes no standard, as upstream takes no model.
adaptive_en({ ...en_inputs, standard: "16798-1-2019" });

// humidex takes one inputs object (ADR 0002), with its inputs and result types
// named after upstream's HumidexInputs and Humidex, and returns a readonly
// result whose discomfort is a label.
const humidex_inputs: HumidexInputs = { tdb: 25, rh: 50, model: "masterson" };
const humidex_result: Humidex = humidex(humidex_inputs);
const humidex_value: number | null = humidex_result.humidex;
const humidex_discomfort: string = humidex_result.discomfort;
// @ts-expect-error the result is readonly.
humidex_result.humidex = 1;
// @ts-expect-error model is 'rana' or 'masterson'.
humidex({ tdb: 25, rh: 50, model: "lu" });
// @ts-expect-error humidex takes upstream's model, not standard.
humidex({ tdb: 25, rh: 50, standard: "rana" });

// wci takes one inputs object (ADR 0002), with its inputs and result types
// named after upstream's WCIInputs and WCI, and returns a readonly result.
const wci_inputs: WCIInputs = { tdb: -5, v: 5.5, round_output: false };
const wci_result: WCI = wci(wci_inputs);
const wci_value: number | null = wci_result.wci;
// @ts-expect-error the result is readonly.
wci_result.wci = 1;
// @ts-expect-error v is required.
wci({ tdb: -5 });

// wind_chill_temperature takes one inputs object (ADR 0002), with its inputs
// and result types named after upstream's WCTInputs and WCT, and returns a
// readonly result.
const wct_inputs: WCTInputs = { tdb: -5, v: 5.5, round_output: false };
const wct_result: WCT = wind_chill_temperature(wct_inputs);
const wct_value: number | null = wct_result.wct;
// @ts-expect-error the result is readonly.
wct_result.wct = 1;
// @ts-expect-error v is required.
wind_chill_temperature({ tdb: -5 });

// pmv_a takes one inputs object (ADR 0002), with its inputs and result types
// named after upstream's APMVInputs and APMV, and returns a readonly result.
const pmv_a_inputs: APMVInputs = {
  tdb: 24,
  tr: 30,
  vr: 0.22,
  rh: 50,
  met: 1.4,
  clo: 0.5,
  a_coefficient: 0.293,
  units: "SI",
};
const pmv_a_result: APMV = pmv_a(pmv_a_inputs);
const pmv_a_value: number | null = pmv_a_result.a_pmv;
// @ts-expect-error the result is readonly.
pmv_a_result.a_pmv = 1;
// @ts-expect-error a_coefficient is required.
pmv_a({ tdb: 24, tr: 30, vr: 0.22, rh: 50, met: 1.4, clo: 0.5 });

// pmv_e takes one inputs object (ADR 0002), with its inputs and result types
// named after upstream's EPMVInputs and EPMV, and returns a readonly result.
const pmv_e_inputs: EPMVInputs = {
  tdb: 24,
  tr: 30,
  vr: 0.22,
  rh: 50,
  met: 1.4,
  clo: 0.5,
  e_coefficient: 0.6,
  units: "SI",
};
const pmv_e_result: EPMV = pmv_e(pmv_e_inputs);
const pmv_e_value: number | null = pmv_e_result.e_pmv;
// @ts-expect-error the result is readonly.
pmv_e_result.e_pmv = 1;
// @ts-expect-error e_coefficient is required.
pmv_e({ tdb: 24, tr: 30, vr: 0.22, rh: 50, met: 1.4, clo: 0.5 });

// pmv_athb takes one inputs object (ADR 0002), with its inputs and result
// types named after upstream's ATHBInputs and ATHB, and returns a readonly
// result; clo takes upstream's False or a number (decision 244).
const pmv_athb_inputs: ATHBInputs = {
  tdb: 25,
  tr: 25,
  vr: 0.1,
  rh: 50,
  met: 1.2,
  t_running_mean: 20,
  clo: false,
};
const pmv_athb_result: ATHB = pmv_athb(pmv_athb_inputs);
const pmv_athb_value: number | null = pmv_athb_result.athb_pmv;
pmv_athb({ ...pmv_athb_inputs, clo: 0.5 });
// @ts-expect-error clo takes false or a number, not true.
pmv_athb({ ...pmv_athb_inputs, clo: true });
// @ts-expect-error the result is readonly.
pmv_athb_result.athb_pmv = 1;
// @ts-expect-error t_running_mean is required.
pmv_athb({ tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2 });

// sports_heat_stress_risk takes one inputs object (ADR 0002), with its inputs
// and result types named after upstream's SportsHeatStressInputs and
// SportsHeatStressRisk; sport is a _SportsValues, a Sports entry or one a
// consumer builds (decisions 246, 247), and the result is readonly.
const sports_inputs: SportsHeatStressInputs = {
  tdb: 35,
  tr: 35,
  rh: 40,
  vr: 2.0,
  sport: Sports.RUNNING,
};
const sports_result: SportsHeatStressRisk =
  sports_heat_stress_risk(sports_inputs);
const sports_risk: number = sports_result.risk_level_interpolated;
const sports_recommendation: string = sports_result.recommendation;
sports_heat_stress_risk({
  ...sports_inputs,
  sport: new _SportsValues(0.5, 6.0, 1.0, 60),
});
// @ts-expect-error sport is a _SportsValues, not a sport's name.
sports_heat_stress_risk({ ...sports_inputs, sport: "RUNNING" });
// @ts-expect-error a Sports entry is readonly.
Sports.RUNNING.clo = 1;
// @ts-expect-error the result is readonly.
sports_result.t_medium = 1;
// @ts-expect-error sport is required.
sports_heat_stress_risk({ tdb: 35, tr: 35, rh: 40, vr: 2.0 });

// heat_index_schoen takes one inputs object (ADR 0002), with its inputs type
// HISchoenInputs (decision 251), and returns upstream's HI, readonly.
const schoen_inputs: HISchoenInputs = { tdb: 29, rh: 50, round_output: false };
const schoen_result: HI = heat_index_schoen(schoen_inputs);
const schoen_hi: number | null = schoen_result.hi;
// @ts-expect-error the result is readonly.
schoen_result.hi = 1;
// @ts-expect-error heat_index_schoen takes no limit_inputs, as upstream's.
heat_index_schoen({ tdb: 29, rh: 50, limit_inputs: false });
// @ts-expect-error rh is a required quantity.
heat_index_schoen({ tdb: 29 });

// at takes one inputs object (ADR 0002), with its inputs and result types
// named after upstream's ATInputs and AT, q taking null for upstream's None
// (decision 252), and returns a readonly result.
const at_inputs: ATInputs = { tdb: 25, rh: 30, v: 0.1, q: 100 };
const at_result: AT = at(at_inputs);
const at_value: number | null = at_result.at;
at({ tdb: 25, rh: 30, v: 0.1, q: null });
at({ tdb: 25, rh: 30, v: 0.1 });
// @ts-expect-error the result is readonly.
at_result.at = 1;
// @ts-expect-error q is a quantity or null, not a boolean.
at({ tdb: 25, rh: 30, v: 0.1, q: false });
// @ts-expect-error v is a required quantity.
at({ tdb: 25, rh: 30 });

// work_capacity_dunne takes one inputs object (ADR 0002), with its inputs type
// WorkCapacityDunneInputs (decision 254), work_intensity taking the
// WorkIntensity constant or its literal (deviation _shared-77), and returns
// upstream's WorkCapacity, readonly.
const work_capacity_dunne_inputs: WorkCapacityDunneInputs = {
  wbgt: 30,
  work_intensity: WorkIntensity.MODERATE,
};
const work_capacity_dunne_result: WorkCapacity = work_capacity_dunne(
  work_capacity_dunne_inputs,
);
const work_capacity: number | null = work_capacity_dunne_result.capacity;
work_capacity_dunne({ wbgt: 30, work_intensity: "light" });
work_capacity_dunne({ wbgt: 30 });
// @ts-expect-error the result is readonly.
work_capacity_dunne_result.capacity = 1;
// @ts-expect-error work_intensity is one of upstream's three.
work_capacity_dunne({ wbgt: 30, work_intensity: "extreme" });
// @ts-expect-error wbgt is a required quantity.
work_capacity_dunne({ work_intensity: "heavy" });

// work_capacity_hothaps takes one inputs object (ADR 0002), with upstream's
// inputs type name WorkCapacityHothapsInputs, work_intensity taking the
// WorkIntensity constant or its literal (deviation _shared-77), and returns
// upstream's WorkCapacity, readonly.
const work_capacity_hothaps_inputs: WorkCapacityHothapsInputs = {
  wbgt: 30,
  work_intensity: WorkIntensity.LIGHT,
};
const work_capacity_hothaps_result: WorkCapacity = work_capacity_hothaps(
  work_capacity_hothaps_inputs,
);
const work_capacity_hothaps_value: number | null =
  work_capacity_hothaps_result.capacity;
work_capacity_hothaps({ wbgt: 30, work_intensity: "moderate" });
work_capacity_hothaps({ wbgt: 30 });
// @ts-expect-error the result is readonly.
work_capacity_hothaps_result.capacity = 1;
// @ts-expect-error work_intensity is one of upstream's three.
work_capacity_hothaps({ wbgt: 30, work_intensity: "extreme" });
// @ts-expect-error wbgt is a required quantity.
work_capacity_hothaps({ work_intensity: "heavy" });

// work_capacity_iso takes one inputs object (ADR 0002), with upstream's inputs
// type name WorkCapacityStandardsInputs (decision 256), and returns upstream's
// WorkCapacity, readonly.
const work_capacity_standards_inputs: WorkCapacityStandardsInputs = {
  wbgt: 30,
  met: 300,
};
const work_capacity_iso_result: WorkCapacity = work_capacity_iso(
  work_capacity_standards_inputs,
);
const work_capacity_iso_value: number | null =
  work_capacity_iso_result.capacity;
// @ts-expect-error the result is readonly.
work_capacity_iso_result.capacity = 1;
// @ts-expect-error met is a required quantity.
work_capacity_iso({ wbgt: 30 });
// @ts-expect-error wbgt is a required quantity.
work_capacity_iso({ met: 300 });

// work_capacity_niosh takes upstream's WorkCapacityStandardsInputs, which
// work_capacity_iso.ts declares (decision 256), and returns upstream's
// WorkCapacity, readonly.
const work_capacity_niosh_result: WorkCapacity = work_capacity_niosh(
  work_capacity_standards_inputs,
);
const work_capacity_niosh_value: number | null =
  work_capacity_niosh_result.capacity;
// @ts-expect-error the result is readonly.
work_capacity_niosh_result.capacity = 1;
// @ts-expect-error met is a required quantity.
work_capacity_niosh({ wbgt: 30 });
// @ts-expect-error wbgt is a required quantity.
work_capacity_niosh({ met: 300 });

// discomfort_index takes one inputs object (ADR 0002), with its inputs and
// result types named after upstream's DIInputs and DI, and returns a readonly
// result whose category is null where upstream's _mapping leaves it unmapped.
const discomfort_index_inputs: DIInputs = { tdb: 25, rh: 50 };
const discomfort_index_result: DI = discomfort_index(discomfort_index_inputs);
const discomfort_index_value: number = discomfort_index_result.di;
const discomfort_condition: string | null =
  discomfort_index_result.discomfort_condition;
// @ts-expect-error the result is readonly.
discomfort_index_result.di = 1;
// @ts-expect-error the category can be null, so it is not only a string.
const discomfort_condition_string: string =
  discomfort_index_result.discomfort_condition;
// @ts-expect-error rh is a required quantity.
discomfort_index({ tdb: 25 });

// esi takes one inputs object (ADR 0002), with its inputs and result types
// named after upstream's ESIInputs and ESI, and returns a readonly result.
const esi_inputs: ESIInputs = {
  tdb: 30.2,
  rh: 42.2,
  sol_radiation_global: 766,
};
const esi_result: ESI = esi(esi_inputs);
const esi_value: number = esi_result.esi;
// @ts-expect-error the result is readonly.
esi_result.esi = 1;
esi({ ...esi_inputs, round_output: false });
// @ts-expect-error sol_radiation_global is a required quantity.
esi({ tdb: 30.2, rh: 42.2 });

// net takes one inputs object (ADR 0002), with its inputs and result types
// named after upstream's NETInputs and NET, and returns a readonly result.
const net_inputs: NETInputs = { tdb: 37, rh: 100, v: 0.1 };
const net_result: NET = net(net_inputs);
const net_value: number | null = net_result.net;
// @ts-expect-error the result is readonly.
net_result.net = 1;
net({ ...net_inputs, round_output: false });
// @ts-expect-error v is a required quantity.
net({ tdb: 37, rh: 100 });

// thi takes one inputs object (ADR 0002), with its inputs and result types
// named after upstream's THIInputs and THI, and returns a readonly result.
const thi_inputs: THIInputs = { tdb: 30, rh: 70 };
const thi_result: THI = thi(thi_inputs);
const thi_value: number | null = thi_result.thi;
// @ts-expect-error the result is readonly.
thi_result.thi = 1;
thi({ ...thi_inputs, round_output: false });
// @ts-expect-error rh is a required quantity.
thi({ tdb: 30 });

// wbgt takes one inputs object (ADR 0002), with its inputs and result types
// named after upstream's WBGTInputs and WBGT, and returns a readonly result.
const wbgt_inputs: WBGTInputs = { twb: 25, tg: 32 };
const wbgt_result: WBGT = wbgt(wbgt_inputs);
const wbgt_value: number = wbgt_result.wbgt;
// @ts-expect-error the result is readonly.
wbgt_result.wbgt = 1;
wbgt({ ...wbgt_inputs, tdb: 20, with_solar_load: true, round_output: false });
wbgt({ ...wbgt_inputs, tdb: null });
// @ts-expect-error tg is a required quantity.
wbgt({ twb: 25 });

// ireq takes one inputs object (ADR 0002), with its inputs and result types
// named after upstream's IREQInputs and IREQ, and returns a readonly result
// whose dle is upstream's str | float (decision 264).
const ireq_inputs: IREQInputs = {
  tdb: -15,
  tr: -15,
  vr: 2,
  rh: 55,
  met: 3,
  clo: 2.8,
  p: 50,
  walk_sp: 1.1,
};
const ireq_result: IREQ = ireq(ireq_inputs);
const ireq_value: number | null = ireq_result.ireq_min;
const ireq_dle: string | number | null = ireq_result.dle_min;
// @ts-expect-error dle may be "more than 8".
const ireq_dle_number: number = ireq_result.dle_neutral;
// @ts-expect-error the result is readonly.
ireq_result.icl_min = 1;
ireq({ ...ireq_inputs, wme: 1, limit_inputs: false, round_output: false });
// @ts-expect-error walk_sp is a required quantity.
ireq({ tdb: -15, tr: -15, vr: 2, rh: 55, met: 3, clo: 2.8, p: 50 });

// ridge_regression_predict_t_re_t_sk takes one inputs object of scalars
// (decision 268), with its inputs and result types named after upstream's
// RidgeRegressionInputs and PredictedBodyTemperatures, and returns its
// series as readonly arrays (decision 269).
const ridge_inputs: RidgeRegressionInputs = {
  sex: Sex.male,
  age: 70,
  height: 1.8,
  weight: 75,
  tdb: 35,
  rh: 60,
  duration: 60,
};
const ridge_result: PredictedBodyTemperatures =
  ridge_regression_predict_t_re_t_sk(ridge_inputs);
const ridge_series: readonly (number | null)[] = ridge_result.t_re;
// @ts-expect-error a series is readonly.
ridge_result.t_sk[0] = 1;
// @ts-expect-error the result is readonly.
ridge_result.t_re = [];
ridge_regression_predict_t_re_t_sk({
  ...ridge_inputs,
  sex: "female",
  t_re: 37,
  t_sk: 32,
  limit_inputs: false,
  round_output: false,
});
ridge_regression_predict_t_re_t_sk({ ...ridge_inputs, sex: null, t_re: null });
// @ts-expect-error sex takes "male" or "female".
ridge_regression_predict_t_re_t_sk({ ...ridge_inputs, sex: "other" });
// @ts-expect-error duration is a required quantity.
ridge_regression_predict_t_re_t_sk({
  sex: "male",
  age: 70,
  height: 1.8,
  weight: 75,
  tdb: 35,
  rh: 60,
});

// two_nodes_gagge_ji takes one inputs object of scalars, its **kwargs
// included, with its inputs and result types named after upstream's
// GaggeTwoNodesJiInputs and GaggeTwoNodesJi, and returns its series as
// readonly arrays (decision 269).
const two_nodes_ji_inputs: GaggeTwoNodesJiInputs = {
  tdb: 36.5,
  tr: 36.5,
  v: 0.25,
  met: 0.95,
  clo: 0.1,
  vapor_pressure: 12,
};
const two_nodes_ji_result: GaggeTwoNodesJi =
  two_nodes_gagge_ji(two_nodes_ji_inputs);
const two_nodes_ji_series: readonly number[] = two_nodes_ji_result.t_core;
// @ts-expect-error a series is readonly.
two_nodes_ji_result.t_skin[0] = 1;
// @ts-expect-error the result is readonly.
two_nodes_ji_result.t_core = [];
two_nodes_gagge_ji({
  ...two_nodes_ji_inputs,
  position: Postures.standing,
  body_weight: 80.1,
  length_time_simulation: 60,
  initial_skin_temp: 36.8,
  initial_core_temp: 36.49,
  acclimatized: false,
});
two_nodes_gagge_ji({ ...two_nodes_ji_inputs, position: null });
// @ts-expect-error position takes one of choice_field's values.
two_nodes_gagge_ji({ ...two_nodes_ji_inputs, position: "lying" });
// @ts-expect-error acclimatized is a switch.
two_nodes_gagge_ji({ ...two_nodes_ji_inputs, acclimatized: 1 });
// @ts-expect-error vapor_pressure is a required quantity.
two_nodes_gagge_ji({ tdb: 36.5, tr: 36.5, v: 0.25, met: 0.95, clo: 0.1 });

// two_nodes_gagge_sleep takes its six time series as numbers or arrays, its
// **kwargs included, with its inputs and result types named after upstream's
// GaggeTwoNodesSleepInputs and GaggeTwoNodesSleep: numbers for a call of one
// time step, typed so where the series are numbers, and number | readonly
// number[] otherwise (decisions 276, 277).
const sleep_scalars: GaggeTwoNodesSleepInputs<number> = {
  tdb: 18,
  tr: 18,
  v: 0.05,
  rh: 50,
  clo: 1.4,
  thickness_quilt: 1.76,
};
const sleep_scalar: GaggeTwoNodesSleep<number> =
  two_nodes_gagge_sleep(sleep_scalars);
const sleep_set: number | null = sleep_scalar.set;
const sleep_series_inputs: GaggeTwoNodesSleepInputs = {
  ...sleep_scalars,
  tdb: [18, 19],
  tr: [18, 18.5],
  v: [0.05, 0.1],
  rh: [50, 55],
  clo: [1.4, 1.3],
  thickness_quilt: [1.76, 1.6],
};
const sleep_series: GaggeTwoNodesSleep =
  two_nodes_gagge_sleep(sleep_series_inputs);
const sleep_t_core: number | null | readonly (number | null)[] =
  sleep_series.t_core;
// @ts-expect-error an array input may give a series.
const sleep_not_number: number = sleep_series.set;
// @ts-expect-error the result is readonly.
sleep_scalar.set = 1;
two_nodes_gagge_sleep({
  ...sleep_scalars,
  ltime: 2,
  height: 171,
  weight: 70,
  met_shivering: 0,
});
// @ts-expect-error a series holds numbers.
two_nodes_gagge_sleep({ ...sleep_scalars, tdb: ["18"] });
// @ts-expect-error wme is a scalar.
two_nodes_gagge_sleep({ ...sleep_scalars, wme: [0] });
// @ts-expect-error thickness_quilt is a required quantity.
two_nodes_gagge_sleep({ tdb: 18, tr: 18, v: 0.05, rh: 50, clo: 1.4 });

// heat_index_lu takes one inputs object (ADR 0002), with its inputs type
// HILuInputs (decision 251), and returns HILu, whose stress_category is
// upstream's None as null (decision 279), readonly.
const lu_inputs: HILuInputs = { tdb: 25, rh: 50, round_output: false };
const lu_result: HILu = heat_index_lu(lu_inputs);
const lu_hi: number = lu_result.hi;
const lu_category: null = lu_result.stress_category;
// @ts-expect-error the result is readonly.
lu_result.hi = 1;
// @ts-expect-error HI is not HILu: its stress_category may be a label.
const hi_as_lu: HILu = heat_index_result;
// @ts-expect-error heat_index_lu takes no limit_inputs, as upstream's.
heat_index_lu({ tdb: 25, rh: 50, limit_inputs: false });
// @ts-expect-error rh is a required quantity.
heat_index_lu({ tdb: 25 });
