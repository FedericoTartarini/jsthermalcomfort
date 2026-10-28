import { ASHRAE_55_STILL_AIR_THRESHOLD } from "../_internal/ashrae55.ts";
import { brentq } from "../_internal/brentq.ts";
import { round } from "../_internal/round.ts";
import { _check_params_object } from "../_internal/validation.ts";
import { Units } from "../utilities/options.ts";
import { units_converter } from "../utilities/units_converter.ts";
import { validateInputs } from "../utilities/utilities.js";
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

// A type alias, as the JSDoc typedef it replaces emitted, so the result stays
// assignable to Record<string, unknown>; an interface is not.
/**
 * @typedef {object} CoolingEffectResult
 * @property {number} ce - Cooling Effect, default in [°C] in [°F] if `units` = 'IP'
 */
export type CoolingEffectResult = {
  ce: number;
};

/**
 * The params of `cooling_effect`: upstream's keyword parameters, quantities
 * and switches alike, with upstream's defaults (ADR 0002). Documented on the
 * function's `params`.
 */
export interface CoolingEffectParams {
  tdb: number;
  tr: number;
  vr: number;
  rh: number;
  met: number;
  clo: number;
  wme?: number;
  units?: "SI" | "IP";
  suppress_warnings?: boolean;
}

/**
 * Returns the value of the Cooling Effect ( {@link https://en.wikipedia.org/wiki/Thermal_comfort#Cooling_Effect|CE} )
 * calculated in compliance with the ASHRAE 55 2020 Standard {@link #ref_1|[1]}.
 * The {@link https://en.wikipedia.org/wiki/Thermal_comfort#Cooling_Effect|CE} of the elevated air speed
 * is the value that, when subtracted equally from both the average air temperature and the mean radiant temperature,
 * the same {@link https://en.wikipedia.org/wiki/Thermal_comfort#Standard_effective_temperature|SET} under still air
 * as in the first {@link https://en.wikipedia.org/wiki/Thermal_comfort#Standard_effective_temperature|SET} calculation
 * under elevated air speed. The cooling effect is calculated only for air speed higher than 0.1 m/s.
 *
 * @param {Object} params - the model's parameters, named as in pythermalcomfort.
 * @param {number} params.tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} params.tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} params.vr - relative air speed, default in [m/s] in [fps] if `units` = 'IP'
 *
 * Note: vr is the relative air speed caused by body movement and not the air
 * speed measured by the air speed sensor. The relative air speed is the sum of the
 * average air speed measured by the sensor plus the activity-generated air speed
 * (Vag). Where Vag is the activity-generated air speed caused by motion of individual body parts.
 * vr can be calculated using the function `v_relative` which is in .utilities.js.
 *
 * @param {number} params.rh - relative humidity, [%]
 * @param {number} params.met - metabolic rate, [met]
 * @param {number} params.clo - clothing insulation, [clo]
 *
 * Note: The activity as well as the air speed modify the insulation characteristics
 * of the clothing and the adjacent air layer. Consequently, the ISO 7730 states that
 * the clothing insulation shall be corrected {@link #ref_2|[2]}. The ASHRAE 55 Standard corrects
 * for the effect of the body movement for met equal or higher than 1.2 met using
 * the equation clo = Icl × (0.6 + 0.4/met) The dynamic clothing insulation, clo,
 * can be calculated using the function `clo_dynamic_ashrae` which is in utilities.
 *
 * @param {number} [params.wme=0] - external work
 * @param {'SI'|'IP'} [params.units= "SI"] - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {boolean} [params.suppress_warnings=false] - If true, writes nothing to the console when the cooling effect cannot be calculated and is assumed to be 0.
 * @returns {CoolingEffectResult} ce - Cooling Effect, default in [°C] in [°F] if `units` = 'IP'
 *
 * @example
 * const CE = cooling_effect({ tdb: 25, tr: 25, vr: 0.3, rh: 50, met: 1.2, clo: 0.5 });
 * console.log(CE); // Output: {ce: 1.68}
 *
 * // For users who want to use the IP system
 * const CE_IP = cooling_effect({ tdb: 77, tr: 77, vr: 1.64, rh: 50, met: 1, clo: 0.6, units: "IP" });
 * console.log(CE_IP); // Output: {ce: 3.95}
 */
// A non-finite number throws a TypeError here, where upstream lets it
// propagate (ADR 0001, reason three).
const COOLING_EFFECT_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  vr: { type: "number" },
  rh: { type: "number" },
  met: { type: "number" },
  clo: { type: "number" },
  wme: { type: "number" },
  units: { enum: ["SI", "IP"] },
  suppress_warnings: { type: "boolean" },
};

export function cooling_effect(
  params: CoolingEffectParams,
): CoolingEffectResult {
  // Every argument was positional before v2 (ADR 0002); a call still written
  // that way fails here, naming the shape it should have.
  _check_params_object(params, "cooling_effect");
  let { tdb, tr, vr } = params;
  const { rh, met, clo } = params;
  // Destructuring defaults also apply to a switch passed as undefined.
  const { wme = 0, units = "SI", suppress_warnings = false } = params;
  validateInputs(
    {
      tdb,
      tr,
      vr,
      rh,
      met,
      clo,
      wme,
      units: units.toUpperCase(),
      suppress_warnings,
    },
    COOLING_EFFECT_SCHEMA,
  );

  if (units.toUpperCase() === Units.IP) {
    ({ tdb, tr, v: vr } = units_converter(Units.IP, { tdb, tr, v: vr }));
  }

  const still_air_threshold = ASHRAE_55_STILL_AIR_THRESHOLD;

  let _ce = _cooling_effect_vectorised(
    tdb,
    tr,
    still_air_threshold,
    rh,
    met,
    clo,
    wme,
    vr,
    suppress_warnings,
  );

  if (units.toUpperCase() === Units.IP) {
    _ce = _ce * 1.8;
  }

  return { ce: round(_ce, 2) };
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
  suppress_warnings: boolean,
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

  if (ce === 0.0 && !suppress_warnings) {
    console.warn("Cooling effect could not be calculated. Returning 0.");
  }

  return ce;
}
