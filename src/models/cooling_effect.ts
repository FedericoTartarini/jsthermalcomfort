import { ASHRAE_55_STILL_AIR_THRESHOLD } from "../_internal/ashrae55.ts";
import { brentq } from "../_internal/brentq.ts";
import { BASE_INPUTS_UNITS, parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
import type {
  InputsOf,
  ModelInfo,
  ModelWarning,
  OutputsOf,
} from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { Standard, Units } from "../utilities/options.ts";
import { units_converter } from "../utilities/units_converter.ts";
import {
  _gagge_two_nodes_optimized,
  TWO_NODES_GAGGE_INFO,
} from "./two_nodes_gagge.ts";

// set_tmp()/two_nodes_gagge() defaults that cooling_effect() relies on but never
// exposes as parameters itself
const _BODY_SURFACE_AREA =
  TWO_NODES_GAGGE_INFO.inputs.body_surface_area.default;
const _P_ATM = TWO_NODES_GAGGE_INFO.inputs.p_atm.default;
// two_nodes_gagge()'s calculate_ce=True path hardcodes position=1 (forces the
// "standing" branch) regardless of the position argument, so this matches it
const _POSITION_STANDING_CODE = 1;

export const COOLING_EFFECT_INFO = deepFreeze({
  name: "cooling_effect",
  label: "Cooling Effect",
  standards: [Standard.ashrae_55_2023],
  inputs: {
    tdb: { kind: "numeric", unit: "°C" },
    tr: { kind: "numeric", unit: "°C" },
    vr: { kind: "numeric", unit: "m/s" },
    rh: { kind: "numeric", unit: "%" },
    met: { kind: "numeric", unit: "met" },
    clo: { kind: "numeric", unit: "clo" },
    wme: { kind: "numeric", unit: "met", default: 0 },
    units: BASE_INPUTS_UNITS,
  },
  outputs: {
    ce: { kind: "numeric", unit: "°C" },
  },
} as const satisfies ModelInfo);

/** @interface */
export type CEInputs = InputsOf<typeof COOLING_EFFECT_INFO>;

/**
 * Dataclass to represent the Cooling Effect (CE).
 *
 * @interface
 */
export type CE = OutputsOf<typeof COOLING_EFFECT_INFO>;

/**
 * Return the value of the Cooling Effect ([CE](https://en.wikipedia.org/wiki/Thermal_comfort#Cooling_Effect)) calculated in compliance with the
 * ASHRAE 55 2020 Standard [55ASHRAE2023](../../docs/references.md#55ashrae2023). The [CE](https://en.wikipedia.org/wiki/Thermal_comfort#Cooling_Effect) of the elevated air speed is the
 * value that, when subtracted equally from both the average air temperature and the
 * mean radiant temperature, yields the same [SET](https://en.wikipedia.org/wiki/Thermal_comfort#Standard_effective_temperature) under still air as in the first
 * [SET](https://en.wikipedia.org/wiki/Thermal_comfort#Standard_effective_temperature) calculation under elevated air speed. The cooling effect is calculated only
 * for air speed higher than 0.1 m/s.
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, default in [°C] or [°F] if `units` = 'IP'.
 * @param inputs.tr - Mean radiant temperature, default in [°C] or [°F] if `units` = 'IP'.
 * @param inputs.vr - Relative air speed, default in [m/s] or [fps] if `units` = 'IP'.
 *
 * > [!NOTE]
 * > The cooling effect is calculated only for air speed higher than 0.1 m/s. If the air speed is lower than 0.1 m/s the function will return 0.
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
 * > `clo_dynamic_ashrae`.
 * @param inputs.wme - External work, [met]. Defaults to 0.
 * @param inputs.units - Select the SI (International System of Units) or the IP (Imperial Units) system.
 * Supported values are 'SI' and 'IP'. Defaults to 'SI'.
 *
 * @returns A dataclass containing the Cooling Effect value. See {@link CE} for more details.
 * To access the `ce` value, use the `ce` attribute of the returned `CE` instance, e.g., `result.ce`.
 *
 * - `ce` - Cooling Effect value.
 *
 * @remarks
 * > [!NOTE]
 * > Limitations:
 * > - This equation may not be accurate for extreme temperature ranges.
 *
 * @example
 * ```ts
 * import { cooling_effect } from "jsthermalcomfort/models";
 *
 * const result = cooling_effect({ tdb: 25, tr: 25, vr: 0.3, rh: 50, met: 1.2, clo: 0.5 });
 * console.log(result.ce); // 1.68
 *
 * const results = [
 *   { tdb: 25, tr: 25, vr: 0.3, rh: 50, met: 1.2, clo: 0.5 },
 *   { tdb: 77, tr: 77, vr: 1.64, rh: 50, met: 1, clo: 0.6 },
 * ].map((inputs) => cooling_effect({ ...inputs, units: "IP" }));
 * console.log(results.map(({ ce }) => ce)); // [0, 3.9]
 * ```
 */
export function cooling_effect(inputs: CEInputs): CE {
  // Validate inputs using the CEInputs class
  let { tdb, tr, vr, rh, met, clo, wme, units } = parseInputs(
    COOLING_EFFECT_INFO,
    inputs,
  );

  if (units.toUpperCase() === Units.IP) {
    ({ tdb, tr, v: vr } = units_converter(Units.IP, { tdb, tr, v: vr }));
  }

  const still_air_threshold = ASHRAE_55_STILL_AIR_THRESHOLD;

  const warnings: ModelWarning[] = [];
  let _ce = _cooling_effect_vectorised(
    tdb,
    tr,
    still_air_threshold,
    rh,
    met,
    clo,
    wme,
    vr,
    warnings,
  );

  if (units.toUpperCase() === Units.IP) {
    _ce = _ce * 1.8;
  }

  return buildOutputs(COOLING_EFFECT_INFO, { ce: round(_ce, 2) }, warnings);
}

function _p_sat_torr(tdb: number): number {
  return Math.exp(18.6686 - 4030.183 / (tdb + 235.0));
}

function _set_for_cooling_effect(
  tdb: number,
  tr: number,
  v: number,
  rh: number,
  met: number,
  clo: number,
  wme: number,
): number {
  // mirrors set_tmp(..., calculate_ce=True, limit_inputs=False).set, without
  // the per-call input validation/dataclass overhead of the public API stack
  const vapor_pressure = (rh * _p_sat_torr(tdb)) / 100.0;
  return _gagge_two_nodes_optimized(
    tdb,
    tr,
    v,
    met,
    clo,
    vapor_pressure,
    wme,
    _BODY_SURFACE_AREA,
    _P_ATM,
    _POSITION_STANDING_CODE,
    true,
  )[0];
}

function _cooling_effect_vectorised(
  tdb: number,
  tr: number,
  still_air_threshold: number,
  rh: number,
  met: number,
  clo: number,
  wme: number,
  vr: number,
  warnings: ModelWarning[],
): number {
  if (vr <= ASHRAE_55_STILL_AIR_THRESHOLD) {
    return 0.0;
  }

  const initial_set_tmp = _set_for_cooling_effect(
    tdb,
    tr,
    vr,
    rh,
    met,
    clo,
    wme,
  );

  function func(x: number): number {
    return (
      _set_for_cooling_effect(
        tdb - x,
        tr - x,
        still_air_threshold,
        rh,
        met,
        clo,
        wme,
      ) - initial_set_tmp
    );
  }

  let ce;
  try {
    ce = brentq(func, 0.0, 40);
  } catch (error) {
    // scipy's ValueError is brentq's RangeError (deviation _shared-45).
    if (!(error instanceof RangeError)) throw error;
    ce = 0.0;
  }

  if (ce === 0.0) {
    warnings.push(
      Object.freeze({
        kind: "notice",
        message: "Cooling effect could not be calculated. Returning 0.",
      }),
    );
  }

  return ce;
}
