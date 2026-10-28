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

export const PMV_E_INFO = deepFreeze({
  name: "pmv_e",
  label: "Adjusted PMV with expectancy factor",
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
    e_coefficient: { kind: "numeric", unit: null },
    wme: { kind: "numeric", unit: "met", default: 0 },
    units: BASE_INPUTS_UNITS,
    limit_inputs: { kind: "bool", default: true },
  },
  outputs: {
    e_pmv: { kind: "numeric", unit: null },
  },
  derived: {
    pa: PMV_PPD_ISO_INFO.derived.pa,
    pmv: {
      unit: PMV_PPD_ISO_INFO.outputs.pmv.unit,
      applicability: PMV_PPD_ISO_INFO.outputs.pmv.applicability,
    },
    met: {
      unit: PMV_PPD_ISO_INFO.inputs.met.unit,
      applicability: PMV_PPD_ISO_INFO.inputs.met.applicability,
    },
  },
} as const satisfies ModelInfo);

/** @interface */
export type EPMVInputs = InputsOf<typeof PMV_E_INFO>;

/**
 * Dataclass to represent the Adjusted Predicted Mean Votes with Expectancy Factor
 * (ePMV).
 *
 * @interface
 */
export type EPMV = OutputsOf<typeof PMV_E_INFO>;

export function pmv_e(inputs: EPMVInputs): EPMV {
  // Validate inputs using the EPMVInputs class
  let { tdb, tr, vr, rh, met, clo, e_coefficient, wme, units, limit_inputs } =
    parseInputs(PMV_E_INFO, inputs);

  const warnings: ModelWarning[] = [];
  const default_kwargs = {
    units: units as PMVPPDInputs["units"],
    limit_inputs,
  };
  const first = pmv_ppd_iso({
    tdb,
    tr,
    vr,
    rh,
    met,
    clo,
    wme,
    standard: Standard.iso_7730_2025,
    ...default_kwargs,
  });
  warnings.push(...first.warnings);
  let _pmv = first.pmv;
  met = _pmv > 0 ? met * (1 + _pmv * -0.067) : met;
  const second = pmv_ppd_iso({
    tdb,
    tr,
    vr,
    rh,
    met,
    clo,
    wme,
    standard: Standard.iso_7730_2025,
    ...default_kwargs,
  });
  // The second call checks the adjusted met, a derived quantity (deviation pmv_e-2).
  for (const row of second.warnings)
    warnings.push(
      row.kind === "range" && row.key === "met"
        ? Object.freeze({ ...row, role: "derived" as const })
        : row,
    );
  _pmv = second.pmv;

  const e_pmv_value = round(_pmv * e_coefficient, 2);

  return Object.freeze({
    e_pmv: e_pmv_value,
    warnings: Object.freeze(warnings),
  });
}
