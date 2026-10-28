import { pmv_ppd_ashrae } from "./pmv_ppd_ashrae.ts";
import {
  _check_ashrae55_compliance,
  ASHRAE_55_COMPLIANCE_STANDARDS,
  ASHRAE_55_LIMITS,
} from "../_internal/ashrae55.ts";
import { parseInputs } from "../_internal/define.ts";
import { deepFreeze } from "../_internal/modelInfo.ts";
import type {
  InputsOf,
  ModelInfo,
  ModelWarning,
  OutputsOf,
} from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { Standard } from "../utilities/options.ts";

export const VERTICAL_TMP_GRAD_PPD_INFO = deepFreeze({
  name: "vertical_tmp_grad_ppd",
  label: "Vertical air temperature gradient",
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
    vertical_tmp_grad: { kind: "numeric", unit: "°C/m" },
    round_output: { kind: "bool", default: true },
    limit_inputs: { kind: "bool", default: true },
  },
  outputs: {
    ppd_vg: { kind: "numeric", unit: "%" },
    acceptability: { kind: "bool", masked: true, unit: null },
  },
} as const satisfies ModelInfo);

/** @interface */
export type VerticalTGradPPDInputs = InputsOf<
  typeof VERTICAL_TMP_GRAD_PPD_INFO
>;

/**
 * Dataclass to represent the Predicted Percentage of Dissatisfied (PPD) with
 * vertical temperature gradient.
 *
 * @interface
 */
export type VerticalTGradPPD = OutputsOf<typeof VERTICAL_TMP_GRAD_PPD_INFO>;

export function vertical_tmp_grad_ppd(
  inputs: VerticalTGradPPDInputs,
): VerticalTGradPPD {
  // Validate inputs using the VerticalTmpGradPPDInputs class
  const {
    tdb,
    tr,
    vr,
    rh,
    met,
    clo,
    vertical_tmp_grad,
    round_output,
    limit_inputs,
  } = parseInputs(VERTICAL_TMP_GRAD_PPD_INFO, inputs);

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
  // With limit_inputs=False upstream's call warns only its notices (deviation vertical_tmp_grad_ppd-3).
  warnings.push(...pmv_result.warnings.filter((row) => row.kind === "notice"));
  const tsv = pmv_result.pmv;
  const numerator = Math.exp(
    0.13 * (tsv - 1.91) ** 2 + 0.15 * vertical_tmp_grad - 1.6,
  );
  // 34.5 % baseline subtracted, negative values set to zero (Liu et al. 2020, eq. 3)
  let ppd_val = Math.max((numerator / (1 + numerator) - 0.345) * 100, 0.0);
  let acceptability: boolean | number = ppd_val <= 5;

  if (round_output) {
    ppd_val = round(ppd_val, 1);
  }

  const [tdb_valid, tr_valid, met_valid, clo_valid, v_limited_valid] =
    _check_ashrae55_compliance(
      {
        tdb,
        tr,
        v_limited: vr,
        met,
        clo,
      },
      warnings,
    );

  const all_valid = !(
    Number.isNaN(tdb_valid) ||
    Number.isNaN(tr_valid) ||
    Number.isNaN(met_valid) ||
    Number.isNaN(clo_valid) ||
    Number.isNaN(v_limited_valid)
  );

  ppd_val = limit_inputs && !all_valid ? NaN : ppd_val;
  acceptability = limit_inputs && !all_valid ? NaN : acceptability;

  return Object.freeze({
    ppd_vg: ppd_val,
    acceptability,
    warnings: Object.freeze(warnings),
  });
}
