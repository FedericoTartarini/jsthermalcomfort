import { pmv_ppd_ashrae, PMV_PPD_ASHRAE_INFO } from "./pmv_ppd_ashrae.ts";
import {
  _check_ashrae55_compliance,
  ASHRAE_55_COMPLIANCE_STANDARDS,
  ASHRAE_55_LIMITS,
} from "../_internal/ashrae55.ts";
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
import { _as_flag } from "../_internal/validation.ts";
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
    ppd_ad: { kind: "numeric", nullable: true, unit: "%" },
    acceptability: { kind: "flag", nullable: true, unit: null },
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

/**
 * Calculate the percentage of thermally dissatisfied people with the ankle draft
 * (0.1 m) above floor level [Liu2017](../../docs/references.md#liu2017).
 *
 * This equation is only applicable for vr < 0.2 m/s (40 fpm).
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, default in [°C] or [°F] if `units` = 'IP'.
 *
 * > [!NOTE]
 * > The air temperature is the average value over two heights: 0.6 m (24 in.)
 * > and 1.1 m (43 in.) for seated occupants, and 1.1 m (43 in.) and 1.7 m (67 in.) for standing occupants.
 * @param inputs.tr - Mean radiant temperature, default in [°C] or [°F] if `units` = 'IP'.
 * @param inputs.vr - Relative air speed, default in [m/s] or [fps] if `units` = 'IP'.
 *
 * > [!NOTE]
 * > `vr` is the relative air speed caused by body movement and not the air speed measured by the air speed sensor.
 * > The relative air speed is the sum of the average air speed measured by the sensor plus the activity-generated air speed (Vag).
 * > Vag is the activity-generated air speed caused by motion of individual body parts.
 * > `vr` can be calculated using the function `v_relative`.
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
 * > `clo_dynamic_ashrae`.
 * @param inputs.v_ankle - Air speed at 0.1 m (4 in.) above the floor, default in [m/s] or [fps] if `units` = 'IP'.
 * @param inputs.units - Select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param inputs.limit_inputs - By default, if the inputs are outside the standard applicability limits the
 * function returns nan. If False, returns values even if input values are
 * outside the applicability limits of the model. Defaults to True. The
 * applicability limits are 10 <= tdb [°C] <= 40, 10 <= tr [°C] <= 40,
 * 0 <= vr [m/s] <= 0.2, 1 <= met [met] <= 4, and 0 <= clo [clo] <= 1.5.
 *
 * @returns Dataclass containing the results of the ankle draft calculation. See {@link AnkleDraft} for more details.
 *
 * - `ppd_ad` - Predicted Percentage of Dissatisfied occupants with ankle draft, [%].
 * - `acceptability` - 1.0 if the air speed at the ankle level is acceptable according to ASHRAE 55
 *   (PPD_ad ≤ 20 %), 0.0 if not, and NaN where the inputs are outside the
 *   applicability limits.
 *
 * @example
 * ```ts
 * import { ankle_draft } from "jsthermalcomfort/models";
 *
 * const results = ankle_draft({
 *   tdb: 25,
 *   tr: 25,
 *   vr: 0.2,
 *   rh: 50,
 *   met: 1.2,
 *   clo: 0.5,
 *   v_ankle: 0.3,
 *   units: "SI",
 * });
 * console.log(results);
 * // { ppd_ad: 18.5, acceptability: true, warnings: [] }
 * ```
 */
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
  const pmv_result = toComputedOutputs(
    PMV_PPD_ASHRAE_INFO,
    pmv_ppd_ashrae({
      tdb,
      tr,
      vr,
      rh,
      met,
      clo,
      standard: Standard.ashrae_55_2023,
      limit_inputs: false,
    }),
  );
  // With limit_inputs=False upstream's call warns only its notices (deviation ankle_draft-3).
  warnings.push(...pmv_result.warnings.filter((row) => row.kind === "notice"));
  const tsv = pmv_result.pmv;
  let ppd_val = round(
    (Math.exp(-2.58 + 3.05 * v_ankle - 1.06 * tsv) /
      (1 + Math.exp(-2.58 + 3.05 * v_ankle - 1.06 * tsv))) *
      100,
    1,
  );
  let acceptability = _as_flag(ppd_val <= 20, !Number.isNaN(ppd_val));

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

  return buildOutputs(
    ANKLE_DRAFT_INFO,
    {
      ppd_ad: ppd_val,
      acceptability,
    },
    warnings,
  );
}
