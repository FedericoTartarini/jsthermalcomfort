import { parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
import type { InputsOf, ModelInfo, OutputsOf } from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { psy_ta_rh } from "../psychrometrics/psy_ta_rh.ts";

export const AT_INFO = deepFreeze({
  name: "at",
  label: "Apparent Temperature",
  standards: [],
  inputs: {
    tdb: { kind: "numeric", unit: "°C" },
    rh: { kind: "numeric", unit: "%" },
    v: { kind: "numeric", unit: "m/s" },
    q: { kind: "numeric", unit: "W/m²", default: null },
    round_output: { kind: "bool", default: true },
  },
  outputs: {
    at: { kind: "numeric", nullable: true, unit: "°C" },
  },
} as const satisfies ModelInfo);

/** @interface */
export type ATInputs = InputsOf<typeof AT_INFO>;

/**
 * Dataclass to store the results of the Apparent Temperature (AT) calculation.
 *
 * @interface
 */
export type AT = OutputsOf<typeof AT_INFO>;

/**
 * Calculate the Apparent Temperature (AT).
 *
 * The AT is defined as the temperature at the reference humidity level producing the same amount of discomfort as that
 * experienced under the current ambient temperature, humidity, and solar radiation
 * [Steadman1984](../../docs/references.md#steadman1984). In other words, the AT is an adjustment to the dry bulb temperature
 * based on the relative humidity value. Absolute humidity with a dew point of 14°C is
 * chosen as a reference.
 *
 * It includes the chilling effect of the wind at lower temperatures. [Blazejczyk2012](../../docs/references.md#blazejczyk2012)
 *
 * > [!NOTE]
 * > Two formulas for AT are in use by the Australian Bureau of Meteorology: one includes
 * > solar radiation and the other one does not (http://www.bom.gov.au/info/thermal_stress/
 * > , 29 Sep 2021). Please specify q if you want to estimate AT with solar load.
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, [°C]
 * @param inputs.rh - Relative humidity, [%]
 * @param inputs.v - Wind speed 10m above ground level, [m/s]
 * @param inputs.q - Net radiation absorbed per unit area of body surface [W/m2]
 * @param inputs.round_output - If True, rounds the output value; if False, does not round it.
 *
 * @returns Dataclass containing the apparent temperature, [°C]. See {@link AT} for more details.
 *
 * - `at` - Apparent temperature, [°C]
 *
 * @example
 * ```ts
 * import { at } from "jsthermalcomfort/models";
 *
 * const result = at({ tdb: 25, rh: 30, v: 0.1 });
 * console.log(result.at); // 24.1
 * ```
 */
export function at(inputs: ATInputs): AT {
  // Validate inputs
  const { tdb, rh, v, q, round_output } = parseInputs(AT_INFO, inputs);

  // Calculate vapor pressure
  const p_vap = psy_ta_rh(tdb, rh).p_vap / 100;

  // Calculate apparent temperature
  let t_at: number;
  if (q !== null) {
    t_at = tdb + 0.348 * p_vap - 0.7 * v + (0.7 * q) / (v + 10) - 4.25;
  } else {
    t_at = tdb + 0.33 * p_vap - 0.7 * v - 4.0;
  }

  if (round_output) {
    t_at = round(t_at, 1);
  }

  return buildOutputs(AT_INFO, { at: t_at }, []);
}
