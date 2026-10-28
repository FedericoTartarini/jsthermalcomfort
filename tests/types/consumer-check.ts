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
  ASHRAEInputs,
  ApplicabilityWarning,
  Bound,
  ClassifierBins,
  CloTOut,
  CloTOutInputs,
  CoolingEffectParams,
  CoolingEffectResult,
  DerivedField,
  HI,
  HIInputs,
  ModelInfo,
  ModelWarning,
  PmvPpdAshraeParams,
  PmvPpdAshraeResult,
  PmvPpdIsoParams,
  PmvPpdIsoResult,
  SolarGain,
  SolarGainInputs,
  UTCI,
  UTCIInputs,
  OutputField,
  StandardId,
  UnitSymbol,
} from "jsthermalcomfort";
import {
  ADAPTIVE_ASHRAE_INFO,
  CLO_INDIVIDUAL_GARMENT_GROUPS,
  CLO_TOUT_INFO,
  HEAT_INDEX_ROTHFUSZ_INFO,
  PMV_CATEGORY_BINS_ISO_7730_2005,
  PMV_CATEGORY_BINS_ISO_7730_2025,
  PMV_COMPLIANCE_INTERVAL_ASHRAE,
  PMV_PPD_ASHRAE_INFO,
  PMV_PPD_ISO_INFO,
  PMV_THERMAL_SENSATION_VOTE_BINS_ISO,
  SOLAR_GAIN_INFO,
  Standard,
  Postures,
  Units,
  UTCI_INFO,
  adaptive_ashrae,
  classifyFromBins,
  clo_individual_garments,
  clo_tout,
  clo_typical_ensembles,
  cooling_effect,
  heat_index_rothfusz,
  pmv_ppd_ashrae,
  pmv_ppd_iso,
  solar_gain,
  utci,
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

// The published metadata must satisfy the published type. The models not yet
// migrated publish the old form, whose inputs carry no kind, until the
// contract ticket removes it.
const heatIndex: ModelInfo = HEAT_INDEX_ROTHFUSZ_INFO;
const cloToutInfo: ModelInfo = CLO_TOUT_INFO;
const iso = PMV_PPD_ISO_INFO;
const ashrae = PMV_PPD_ASHRAE_INFO;
const adaptive: ModelInfo = ADAPTIVE_ASHRAE_INFO;
const utciInfo: ModelInfo = UTCI_INFO;
const solarGainInfo = SOLAR_GAIN_INFO;
// @ts-expect-error the old form's inputs carry no kind.
const isoAsModelInfo: ModelInfo = PMV_PPD_ISO_INFO;

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
const tdbBound: Bound | undefined = iso.inputs.tdb.applicability;
const minTdb: number | undefined = tdbBound?.min;

// Every model lists the standards whose values it takes as Standard values,
// the old form and ModelInfo alike, typed by the exported `StandardId`.
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
const tsvLabel = classifyFromBins(0.4, PMV_THERMAL_SENSATION_VOTE_BINS_ISO);
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
PMV_THERMAL_SENSATION_VOTE_BINS_ISO.edges[0] = 0;
// @ts-expect-error push mutates, and the array is readonly.
HEAT_INDEX_ROTHFUSZ_INFO.outputs.stress_category.classifier.labels.push(
  "new label",
);
// @ts-expect-error the UTCI metadata is readonly, its derived bound included.
UTCI_INFO.derived["tr - tdb"].applicability.max = 80;

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

// pmv_ppd_iso returns ISO 7730's category, read against bins published once
// per edition, whose edges a front end finds by label.
const isoCategory: string | number = pmvIso.category;
const categoryIIMax: number =
  PMV_CATEGORY_BINS_ISO_7730_2025.edges[
    PMV_CATEGORY_BINS_ISO_7730_2025.labels.indexOf("II")
  ];
const categoryBMax: number =
  PMV_CATEGORY_BINS_ISO_7730_2005.edges[
    PMV_CATEGORY_BINS_ISO_7730_2005.labels.indexOf("B")
  ];

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
