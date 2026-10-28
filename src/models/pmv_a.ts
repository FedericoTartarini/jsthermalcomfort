import { pmv_ppd_iso, PMV_PPD_ISO_INFO } from "./pmv_ppd_iso.ts";
import type { PMVPPDInputs } from "./pmv_ppd_iso.ts";
import { BASE_INPUTS_UNITS, parseInputs } from "../_internal/define.ts";
import { deepFreeze } from "../_internal/modelInfo.ts";
import type {
  InputsOf,
  ModelInfo,
  ModelWarning,
  OutputsOf,
} from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { Standard } from "../utilities/options.ts";

export const PMV_A_INFO = deepFreeze({
  name: "pmv_a",
  label: "Adaptive PMV",
  standards: [Standard.iso_7730_2025],
  inputs: {
    tdb: {
      kind: "numeric",
      unit: "°C",
      applicability: PMV_PPD_ISO_INFO.inputs.tdb.applicability,
    },
    tr: {
      kind: "numeric",
      unit: "°C",
      applicability: PMV_PPD_ISO_INFO.inputs.tr.applicability,
    },
    vr: {
      kind: "numeric",
      unit: "m/s",
      applicability: PMV_PPD_ISO_INFO.inputs.vr.applicability,
    },
    rh: { kind: "numeric", unit: "%" },
    met: {
      kind: "numeric",
      unit: "met",
      applicability: PMV_PPD_ISO_INFO.inputs.met.applicability,
    },
    clo: {
      kind: "numeric",
      unit: "clo",
      applicability: PMV_PPD_ISO_INFO.inputs.clo.applicability,
    },
    a_coefficient: { kind: "numeric", unit: null },
    wme: { kind: "numeric", unit: "met", default: 0 },
    units: BASE_INPUTS_UNITS,
    limit_inputs: { kind: "bool", default: true },
  },
  outputs: {
    a_pmv: { kind: "numeric", unit: null },
  },
  derived: {
    pa: PMV_PPD_ISO_INFO.derived.pa,
    pmv: {
      unit: PMV_PPD_ISO_INFO.outputs.pmv.unit,
      applicability: PMV_PPD_ISO_INFO.outputs.pmv.applicability,
    },
  },
} as const satisfies ModelInfo);

/** @interface */
export type APMVInputs = InputsOf<typeof PMV_A_INFO>;

/**
 * A dataclass to store the results of the adaptive Predicted Mean Vote (aPMV)
 * model.
 *
 * @interface
 */
export type APMV = OutputsOf<typeof PMV_A_INFO>;

export function pmv_a(inputs: APMVInputs): APMV {
  // Validate inputs using the APMVInputs class
  const { tdb, tr, vr, rh, met, clo, a_coefficient, wme, units, limit_inputs } =
    parseInputs(PMV_A_INFO, inputs);

  const warnings: ModelWarning[] = [];
  const pmv_result = pmv_ppd_iso({
    tdb,
    tr,
    vr,
    rh,
    met,
    clo,
    wme,
    standard: Standard.iso_7730_2025,
    units: units as PMVPPDInputs["units"],
    limit_inputs,
  });
  warnings.push(...pmv_result.warnings);
  const _pmv = pmv_result.pmv;

  const pmv_value = round(_pmv / (1 + a_coefficient * _pmv), 2);

  return Object.freeze({ a_pmv: pmv_value, warnings: Object.freeze(warnings) });
}
