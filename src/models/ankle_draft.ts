import { pmv_ppd_ashrae } from "./pmv_ppd_ashrae.ts";
import {
  _check_ashrae55_compliance,
  ASHRAE_55_COMPLIANCE_STANDARDS,
  ASHRAE_55_LIMITS,
} from "../_internal/ashrae55.ts";
import { BASE_INPUTS_UNITS, parseInputs } from "../_internal/define.ts";
import { deepFreeze } from "../_internal/modelInfo.ts";
import type {
  InputsOf,
  ModelInfo,
  ModelWarning,
  OutputsOf,
} from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { Standard, Units } from "../utilities/options.ts";
import { units_converter } from "../utilities/units_converter.ts";

export const ANKLE_DRAFT_INFO = deepFreeze({
  name: "ankle_draft",
  label: "Ankle draft",
  standards: ASHRAE_55_COMPLIANCE_STANDARDS,
  inputs: {
    tdb: { kind: "numeric", unit: "°C", applicability: ASHRAE_55_LIMITS.tdb },
    tr: { kind: "numeric", unit: "°C", applicability: ASHRAE_55_LIMITS.tr },
    vr: {
      kind: "numeric",
      unit: "m/s",
      applicability: ASHRAE_55_LIMITS.v_limited,
    },
    rh: { kind: "numeric", unit: "%" },
    met: {
      kind: "numeric",
      unit: "met",
      applicability: ASHRAE_55_LIMITS.met,
    },
    clo: {
      kind: "numeric",
      unit: "clo",
      applicability: ASHRAE_55_LIMITS.clo,
    },
    v_ankle: { kind: "numeric", unit: "m/s" },
    units: BASE_INPUTS_UNITS,
    limit_inputs: { kind: "bool", default: true },
  },
  outputs: {
    ppd_ad: { kind: "numeric", unit: "%" },
    acceptability: { kind: "bool", masked: true, unit: null },
  },
} as const satisfies ModelInfo);

/** @interface */
export type AnkleDraftInputs = InputsOf<typeof ANKLE_DRAFT_INFO>;

/**
 * Dataclass to store the results of the ankle draft calculation.
 *
 * @interface
 */
export type AnkleDraft = OutputsOf<typeof ANKLE_DRAFT_INFO>;

export function ankle_draft(inputs: AnkleDraftInputs): AnkleDraft {
  // Validate inputs using the AnkleDraftInputs class
  let { tdb, tr, vr, rh, met, clo, v_ankle, units, limit_inputs } = parseInputs(
    ANKLE_DRAFT_INFO,
    inputs,
  );

  if (units.toUpperCase() === Units.IP) {
    ({
      tdb,
      tr,
      vr,
      vel: v_ankle,
    } = units_converter(Units.IP, { tdb, tr, vr, vel: v_ankle }));
  }

  const warnings: ModelWarning[] = [];
  const pmv_result = pmv_ppd_ashrae({
    tdb,
    tr,
    vr,
    rh,
    met,
    clo,
    standard: Standard.ashrae_55_2023,
    limit_inputs: false,
  });
  // With limit_inputs=False upstream's call warns only its notices (deviation ankle_draft-3).
  warnings.push(...pmv_result.warnings.filter((row) => row.kind === "notice"));
  const tsv = pmv_result.pmv;
  let ppd_val = round(
    (Math.exp(-2.58 + 3.05 * v_ankle - 1.06 * tsv) /
      (1 + Math.exp(-2.58 + 3.05 * v_ankle - 1.06 * tsv))) *
      100,
    1,
  );
  let acceptability: boolean | number = ppd_val <= 20;

  const [tdb_valid, tr_valid, v_valid, met_valid, clo_valid, v_limited] =
    _check_ashrae55_compliance(
      {
        tdb,
        tr,
        v_limited: vr,
        v: vr,
        met,
        clo,
        v_param_name: "vr",
      },
      warnings,
    );

  if (limit_inputs && Number.isNaN(v_limited)) {
    throw new RangeError(
      "This equation is only applicable for air speed lower than 0.2 m/s",
    );
  }

  const all_valid = !(
    Number.isNaN(tdb_valid) ||
    Number.isNaN(tr_valid) ||
    Number.isNaN(v_valid) ||
    Number.isNaN(met_valid) ||
    Number.isNaN(clo_valid)
  );
  ppd_val = limit_inputs && !all_valid ? NaN : ppd_val;
  acceptability = limit_inputs && !all_valid ? NaN : acceptability;

  return Object.freeze({
    ppd_ad: ppd_val,
    acceptability,
    warnings: Object.freeze(warnings),
  });
}
