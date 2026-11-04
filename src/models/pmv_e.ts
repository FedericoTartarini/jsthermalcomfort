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
    e_pmv: { kind: "numeric", nullable: true, unit: null },
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

/**
 * Return Adjusted Predicted Mean Votes with Expectancy Factor (ePMV). This index
 * was developed by Fanger, P. O. et al. (2002). In non-air-conditioned buildings in
 * warm climates, occupants may sense the warmth as being less severe than the PMV
 * predicts. The main reason is low expectations, but a metabolic rate that is
 * estimated too high can also contribute to explaining the difference. An extension of
 * the PMV model that includes an expectancy factor is introduced for use in non-air-conditioned
 * buildings in warm climates [Fanger2002](../../docs/references.md#fanger2002).
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'.
 * @param inputs.tr - Mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'.
 * @param inputs.vr - Relative air speed, default in [m/s] in [fps] if `units` = 'IP'.
 *
 * > [!NOTE]
 * > vr is the relative air speed caused by body movement and not the air
 * > speed measured by the air speed sensor. The relative air speed is the sum of the
 * > average air speed measured by the sensor plus the activity-generated air speed
 * > (Vag). Where Vag is the activity-generated air speed caused by motion of
 * > individual body parts. vr can be calculated using the function
 * > `v_relative`.
 * @param inputs.rh - Relative humidity, [%].
 * @param inputs.met - Metabolic rate, [met].
 * @param inputs.clo - Clothing insulation, [clo].
 *
 * > [!NOTE]
 * > this is the basic insulation also known as the intrinsic clothing insulation value of the
 * > clothing ensemble (`I`:sub:`cl,r`), this is the thermal insulation from the skin
 * > surface to the outer clothing surface, including enclosed air layers, under actual
 * > environmental conditions. This value is not the total insulation (`I`:sub:`T,r`).
 * > The dynamic clothing insulation, clo, can be calculated using the function
 * > `clo_dynamic_iso`.
 * @param inputs.e_coefficient - Expectancy factor.
 * @param inputs.wme - External work, [met]. Defaults to 0.
 * @param inputs.units - Select the SI (International System of Units) or the IP (Imperial Units) system.
 * Supported values are 'SI' and 'IP'. Defaults to 'SI'.
 * @param inputs.limit_inputs - By default, if the inputs are outside the standard applicability limits the
 * function returns nan. If False, returns the e_pmv value even if input values are
 * outside the applicability limits of the model. Defaults to True.
 *
 * > [!NOTE]
 * > The ISO 7730 [7730ISO2005](../../docs/references.md#7730iso2005) [7730ISO2025](../../docs/references.md#7730iso2025) limits are 10 <= tdb [°C] <= 30, 10 <= tr [°C] <= 40,
 * > 0 <= vr [m/s] <= 1, 0.8 <= met [met] <= 4, 0 <= clo [clo] <= 2, 0 <= pa [Pa] <= 2700, and -2 <= PMV <= 2.
 *
 * @returns A dataclass containing the Adjusted Predicted Mean Votes with Expectancy Factor. See {@link EPMV} for more details.
 * To access the `e_pmv` value, use the `e_pmv` attribute of the returned `EPMV` instance, e.g., `result.e_pmv`.
 *
 * - `e_pmv` - Adjusted Predicted Mean Votes with Expectancy Factor.
 *
 * @example
 * ```ts
 * import { pmv_e } from "jsthermalcomfort/models";
 * import { clo_dynamic_iso } from "jsthermalcomfort/utilities";
 * import { v_relative } from "jsthermalcomfort/environment";
 *
 * const tdb = 28;
 * const tr = 28;
 * const rh = 50;
 * const v = 0.1;
 * const met = 1.4;
 * const clo = 0.5;
 * // calculate relative air speed
 * const v_r = v_relative(v, met);
 * // Calculate dynamic clothing
 * const clo_d = clo_dynamic_iso(clo, met, v);
 * const results = pmv_e({
 *   tdb,
 *   tr,
 *   vr: v_r,
 *   rh,
 *   met,
 *   clo: clo_d,
 *   e_coefficient: 0.6,
 * });
 * console.log(results.e_pmv); // 0.48
 * ```
 */
export function pmv_e(inputs: EPMVInputs): EPMV {
  // Validate inputs using the EPMVInputs class
  let { tdb, tr, vr, rh, met, clo, e_coefficient, wme, units, limit_inputs } =
    parseInputs(PMV_E_INFO, inputs);

  const warnings: ModelWarning[] = [];
  const default_kwargs = {
    units: units as PMVPPDInputs["units"],
    limit_inputs,
  };
  const first = toComputedOutputs(
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
      ...default_kwargs,
    }),
  );
  warnings.push(...first.warnings);
  let _pmv = first.pmv;
  met = _pmv > 0 ? met * (1 + _pmv * -0.067) : met;
  const second = toComputedOutputs(
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
      ...default_kwargs,
    }),
  );
  // The second call checks the adjusted met, a derived quantity (deviation pmv_e-2).
  for (const row of second.warnings)
    warnings.push(
      row.kind === "range" && row.key === "met"
        ? Object.freeze({ ...row, role: "derived" as const })
        : row,
    );
  _pmv = second.pmv;

  const e_pmv_value = round(_pmv * e_coefficient, 2);

  return buildOutputs(PMV_E_INFO, { e_pmv: e_pmv_value }, warnings);
}
