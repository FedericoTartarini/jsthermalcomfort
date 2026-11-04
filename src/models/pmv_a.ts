import { pmv_ppd_iso, PMV_PPD_ISO_INFO } from "./pmv_ppd_iso.ts";
import type { PMVPPDInputs } from "./pmv_ppd_iso.ts";
import { BASE_INPUTS_UNITS, parseInputs } from "../_internal/define.ts";
import {
  buildOutputs,
  deepFreeze,
  toComputedOutputs,
} from "../_internal/modelInfo.ts";
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
    a_pmv: { kind: "numeric", nullable: true, unit: null },
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

/**
 * Return Adaptive Predicted Mean Vote (aPMV) [Yao2009](../../docs/references.md#yao2009). This index was developed
 * by Yao, R. et al. (2009). The model takes into account factors such as culture,
 * climate, social, psychological, and behavioral adaptations, which have an impact on
 * the senses used to detect thermal comfort. This model uses an adaptive coefficient
 * (λ) representing the adaptive factors that affect the sense of thermal comfort.
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, default in [°C] or [°F] if `units` = 'IP'.
 * @param inputs.tr - Mean radiant temperature, default in [°C] or [°F] if `units` = 'IP'.
 * @param inputs.vr - Relative air speed, default in [m/s] or [fps] if `units` = 'IP'.
 *
 * > [!NOTE]
 * > vr is the sum of the average air speed measured by the sensor and the activity-generated air speed (Vag).
 * > Calculate vr using `v_relative`.
 * @param inputs.rh - Relative humidity, [%].
 * @param inputs.met - Metabolic rate, [met].
 * @param inputs.clo - Clothing insulation, [clo].
 *
 * > [!NOTE]
 * > Correct for body movement effects using `clo_dynamic_iso`.
 * @param inputs.a_coefficient - Adaptive coefficient.
 * @param inputs.wme - External work, [met], default is 0.
 * @param inputs.units - Units system, 'SI' or 'IP'. Defaults to 'SI'.
 * @param inputs.limit_inputs - If True, returns nan for inputs outside standard limits. Defaults to True.
 *
 * > [!NOTE]
 * > ISO 7730 [7730ISO2005](../../docs/references.md#7730iso2005) [7730ISO2025](../../docs/references.md#7730iso2025) limits: 10 <= tdb [°C] <= 30, 10 <= tr [°C] <= 40, 0 <= vr [m/s] <= 1,
 * > 0.8 <= met [met] <= 4, 0 <= clo [clo] <= 2, 0 <= pa [Pa] <= 2700, -2 <= PMV <= 2.
 *
 * @returns A dataclass containing the Predicted Mean Vote (a_pmv). See
 * {@link APMV} for more details.
 * To access the `a_pmv` value, use the `a_pmv` attribute of the returned `APMV` instance,
 * e.g., `result.a_pmv`.
 *
 * - `a_pmv` - Predicted Mean Vote.
 *
 * @example
 * ```ts
 * import { pmv_a } from "jsthermalcomfort/models";
 * import { clo_dynamic_iso } from "jsthermalcomfort/utilities";
 * import { v_relative } from "jsthermalcomfort/environment";
 *
 * const v = 0.1;
 * const met = 1.4;
 * const clo = 0.5;
 *
 * // Calculate relative air speed
 * const v_r = v_relative(v, met);
 *
 * // Calculate dynamic clothing
 * const clo_d = clo_dynamic_iso(clo, met, v);
 *
 * const results = pmv_a({
 *   tdb: 28,
 *   tr: 28,
 *   vr: v_r,
 *   rh: 50,
 *   met,
 *   clo: clo_d,
 *   a_coefficient: 0.293,
 * });
 * console.log(results); // { a_pmv: 0.71, warnings: [] }
 * console.log(results.a_pmv); // 0.71
 * ```
 */
export function pmv_a(inputs: APMVInputs): APMV {
  // Validate inputs using the APMVInputs class
  const { tdb, tr, vr, rh, met, clo, a_coefficient, wme, units, limit_inputs } =
    parseInputs(PMV_A_INFO, inputs);

  const warnings: ModelWarning[] = [];
  const pmv_result = toComputedOutputs(
    PMV_PPD_ISO_INFO,
    pmv_ppd_iso({
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
    }),
  );
  warnings.push(...pmv_result.warnings);
  const _pmv = pmv_result.pmv;

  const pmv_value = round(_pmv / (1 + a_coefficient * _pmv), 2);

  return buildOutputs(PMV_A_INFO, { a_pmv: pmv_value }, warnings);
}
