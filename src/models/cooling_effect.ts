import {
  round,
  units_converter,
  validateInputs,
} from "../utilities/utilities.js";
import { set_tmp } from "./set_tmp.js";
import { _check_params_object, _upper_units } from "../_internal/validation.ts";
import { brentq, RootNotBracketedError } from "../_internal/brentq.ts";

// A type alias, as the JSDoc typedef it replaces emitted, so the result stays
// assignable to Record<string, unknown>; an interface is not.
/**
 * @typedef {object} CoolingEffectResult
 * @property {number} ce - Cooling Effect, default in [°C] in [°F] if `units` = 'IP'
 * @public
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
 * @public
 * @memberof models
 * @docname Cooling Effect (CE)
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
  // that way fails here, naming the shape it should have. So does an unknown
  // key (ADR 0008).
  _check_params_object(params, "cooling_effect", COOLING_EFFECT_SCHEMA);
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
      units: _upper_units(units),
      suppress_warnings,
    },
    COOLING_EFFECT_SCHEMA,
  );

  if (units.toUpperCase() === "IP") {
    const result = units_converter({ tdb, tr, vr }, "IP");
    tdb = result.tdb;
    tr = result.tr;
    vr = result.vr;
  }

  if (vr <= 0.1) {
    return { ce: 0 };
  }

  const still_air_threshold = 0.1;

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
    // Upstream calls optimize.brentq(function, 0.0, 40) (cooling_effect.py:209
    // at v4.6.2).
    ce = brentq(func, 0, 40);
  } catch (error) {
    // Only the not-bracketed failure falls back to 0, as upstream catches only
    // the ValueError brentq raises for it; anything else propagates.
    if (!(error instanceof RootNotBracketedError)) throw error;
    ce = 0;
  }

  // pythermalcomfort raises a Python warning here, which its callers silence
  // with the warnings module; JavaScript has no such facility, so
  // suppress_warnings is the port of it rather than a new behaviour.
  if (ce === 0 && !suppress_warnings) {
    console.warn("Cooling effect could not be calculated. Returning 0.");
  }

  // Upstream's factor (cooling_effect.py:154-155 at v4.6.2), kept as it is
  // (ADR 0004 as amended), though pythermalcomfort #473 reports it: a
  // temperature difference converts from °C to °F with * 1.8
  // (https://github.com/pythermalcomfort/pythermalcomfort/issues/473).
  if (units.toUpperCase() === "IP") {
    ce = (ce / 1.8) * 3.28;
  }

  ce = round(ce, 2);

  return { ce: ce };
}

// Upstream's `_set_for_cooling_effect` (`cooling_effect.py`): the unrounded
// SET with `calculate_ce`, inputs unlimited, in SI. Upstream calls the
// two-node model directly, to skip the public stack's validation, and says it
// mirrors `set_tmp(..., calculate_ce=True, limit_inputs=False).set`; this
// makes that set_tmp call.
function _set_for_cooling_effect(
  tdb: number,
  tr: number,
  v: number,
  rh: number,
  met: number,
  clo: number,
  wme: number,
): number {
  return set_tmp(
    tdb,
    tr,
    v,
    rh,
    met,
    clo,
    wme,
    undefined,
    undefined,
    undefined,
    undefined,
    false,
    {
      round: false,
      calculate_ce: true,
    },
  ).set;
}
