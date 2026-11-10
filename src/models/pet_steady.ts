import {
  BASE_INPUTS_POSITION,
  BASE_INPUTS_SEX,
  parseInputs,
} from "../_internal/define.ts";
import { negativeInput } from "../_internal/errors.ts";
import { fsolve } from "../_internal/fsolve.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
import type {
  InputsOf,
  ModelInfo,
  ModelWarning,
  OutputsOf,
} from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { p_sat } from "../psychrometrics/p_sat.ts";
import { body_surface_area } from "../utilities/body_surface_area.ts";
import { Postures, Sex } from "../utilities/options.ts";

export const PET_STEADY_INFO = deepFreeze({
  name: "pet_steady",
  label: "Physiological Equivalent Temperature (PET)",
  standards: [],
  inputs: {
    tdb: { kind: "numeric", unit: "°C" },
    tr: { kind: "numeric", unit: "°C" },
    v: { kind: "numeric", unit: "m/s" },
    rh: { kind: "numeric", unit: "%" },
    met: { kind: "numeric", unit: "met" },
    clo: { kind: "numeric", unit: "clo" },
    p_atm: { kind: "numeric", unit: "hPa", default: 1013.25 },
    position: { ...BASE_INPUTS_POSITION, default: Postures.sitting },
    age: { kind: "numeric", unit: null, default: 23 },
    sex: { ...BASE_INPUTS_SEX, default: Sex.male },
    weight: { kind: "numeric", unit: "kg", default: 75 },
    height: { kind: "numeric", unit: "m", default: 1.8 },
    wme: { kind: "numeric", unit: "met", default: 0 },
  },
  outputs: {
    pet: { kind: "numeric", unit: "°C" },
  },
} as const satisfies ModelInfo);

/** @interface */
export type PETSteadyInputs = InputsOf<typeof PET_STEADY_INFO>;

/**
 * Dataclass to represent the Physiological Equivalent Temperature (PET).
 *
 * @interface
 */
export type PETSteady = OutputsOf<typeof PET_STEADY_INFO>;

/**
 * Calculate the steady physiological equivalent temperature (PET) using the Munich
 * Energy-balance Model for Individuals (MEMI) to simulate the human body's thermal
 * state in a medically realistic manner.
 *
 * PET is defined as the air temperature
 * at which, in a typical indoor setting the heat budget of the human body is balanced
 * with the same core and skin temperature as under the complex outdoor conditions to be
 * assessed [Hoppe1999](../../docs/references.md#hoppe1999).
 * The following assumptions are made for the indoor reference climate: tdb = tr, v = 0.1
 * m/s, water vapour pressure = 12 hPa, clo = 0.9 clo, and met = 1.37 met + basic
 * metabolism.
 * PET allows a layperson to compare the total effects of complex thermal circumstances
 * outside with his or her own personal experience indoors in this way. This function
 * solves the heat balances without accounting for heat storage in the human body.
 *
 * The PET was originally proposed by Hoppe [Hoppe1999](../../docs/references.md#hoppe1999). In 2018, Walther and Goestchel [Walther2018](../../docs/references.md#walther2018)
 * proposed a correction of the original model, purging the errors in the
 * PET calculation routine, and implementing a state-of-the-art vapour diffusion model.
 * Walther and Goestchel (2018) model is therefore used to calculate the PET.
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, [°C].
 * @param inputs.tr - Mean radiant temperature, [°C].
 * @param inputs.v - Wind speed, [m/s].
 * @param inputs.rh - Relative humidity, [%].
 * @param inputs.met - Metabolic rate, [met].
 * @param inputs.clo - Clothing insulation, [clo].
 * @param inputs.p_atm - Atmospheric pressure, [hPa]. Defaults to 1013.25.
 * @param inputs.position - Position of the person "sitting", "standing", "standing, forced convection". Defaults to "sitting".
 * @param inputs.age - Age of the person. Defaults to 23.
 * @param inputs.sex - Sex of the person "male" or "female". Defaults to "male".
 * @param inputs.weight - Weight of the person, [kg]. Defaults to 75.
 * @param inputs.height - Height of the person, [m]. Defaults to 1.8.
 * @param inputs.wme - External work, [met]. Defaults to 0.
 *
 * @returns A dataclass containing the Physiological Equivalent Temperature. See {@link PETSteady} for more details.
 * To access the `pet` value, use the `pet` attribute of the returned `PETSteady` instance, e.g., `result.pet`.
 *
 * - `pet` - Physiological Equivalent Temperature.
 *
 * @example
 * ```ts
 * import { pet_steady } from "jsthermalcomfort/models";
 *
 * const result = pet_steady({ tdb: 25, tr: 25, v: 0.1, rh: 50, met: 1.2, clo: 0.5 });
 * console.log(result.pet); // 24.67
 *
 * const pet = [
 *   { tdb: 25, tr: 25, v: 0.1, rh: 50, met: 1.2, clo: 0.5 },
 *   { tdb: 30, tr: 30, v: 0.2, rh: 60, met: 1.4, clo: 0.6 },
 * ].map((inputs) => pet_steady(inputs).pet);
 * console.log(pet); // [24.67, 31.46]
 * ```
 */
export function pet_steady(inputs: PETSteadyInputs): PETSteady {
  // Validate inputs using the PETSteadyInputs class
  const {
    tdb,
    tr,
    v,
    rh,
    met,
    clo,
    p_atm,
    position,
    age,
    sex,
    weight,
    height,
    wme,
  } = parseInputs(PET_STEADY_INFO, inputs);

  const warnings: ModelWarning[] = [];
  return buildOutputs(
    PET_STEADY_INFO,
    {
      pet: _pet_steady_vectorised(
        tdb,
        tr,
        v,
        rh,
        met,
        clo,
        p_atm,
        position,
        age,
        sex,
        weight,
        height,
        wme,
        warnings,
      ),
    },
    warnings,
  );
}

function _pet_steady_vectorised(
  tdb: number,
  tr: number,
  v: number,
  rh: number,
  met: number,
  clo: number,
  p_atm: number,
  position: string | null,
  age: number,
  sex: string | null,
  weight: number,
  height: number,
  wme: number,
  warnings: ModelWarning[],
): number {
  const met_factor = 58.2; // met conversion factor
  met = met * met_factor; // metabolic rate

  /**
   * Vasomotricity (blood flow) in function of the core and skin temperatures.
   *
   * @param t_cr - The body core temperature, [°C]
   * @param t_sk - The body skin temperature, [°C]
   * @returns "m_blood": Blood flow rate, [kg/m2/h] and "alpha": repartition of body
   * mass
   * between core and skin [].
   */
  function vasomotricity(
    t_cr: number,
    t_sk: number,
  ): { m_blood: number; alpha: number } {
    // skin and core temperatures set values
    const tc_set = 36.6; // 36.8
    const tsk_set = 34; // 33.7
    // Set value signals
    let sig_skin = tsk_set - t_sk;
    let sig_core = t_cr - tc_set;
    if (sig_core < 0) {
      // In this case, T_core<Tc_set --> the blood flow is reduced
      sig_core = 0.0;
    }
    if (sig_skin < 0) {
      // In this case, Tsk>Tsk_set --> the blood flow is increased
      sig_skin = 0.0;
    }
    // 6.3 L/m^2/h is the set value of the blood flow
    let m_blood = (6.3 + 75.0 * sig_core) / (1.0 + 0.5 * sig_skin);
    // 90 L/m^2/h is the blood flow upper limit
    if (m_blood > 90) {
      m_blood = 90.0;
    }
    // in other models, alpha is used to update tbody
    const alpha = 0.0417737 + 0.7451833 / (m_blood + 0.585417);

    return { m_blood, alpha };
  }

  /**
   * Sweating mechanism depending on the body and core temperatures.
   *
   * @param t_body - weighted average between skin and core temperatures, [°C]
   * @returns The sweating flow rate, [g/m2/h].
   */
  function sweat_rate(t_body: number): number {
    const tc_set = 36.6; // 36.8
    const tsk_set = 34; // 33.7
    const tbody_set = 0.1 * tsk_set + 0.9 * tc_set; // Calculation of the body
    // temperature
    // through a weighted average
    let sig_body = t_body - tbody_set;
    if (sig_body < 0) {
      // In this case, Tbody<Tbody_set --> The sweat flow is 0
      sig_body = 0.0;
    }
    // from Gagge's model
    let m_rsw = 304.94 * sig_body;
    // 500 g/m^2/h is the upper sweat rate limit
    m_rsw = Math.min(m_rsw, 500);

    return m_rsw;
  }

  function solve_pet(
    t_arr: readonly number[],
    _tdb: number,
    _tr: number,
    _v: number,
    _rh: number,
    _met: number,
    _clo: number,
    actual_environment: true,
  ): number[];
  function solve_pet(
    t_arr: readonly number[],
    _tdb: number,
    _tr: number,
    _v?: number,
    _rh?: number,
    _met?: number,
    _clo?: number,
    actual_environment?: false,
  ): number;
  /**
   * Solve PET by either computing the vectorial balance of the three unknown
   * temperatures (T_core, T_sk, T_clo) or by finding the environment operative
   * temperature that yields the same energy balance as the actual environment.
   *
   * @param t_arr - [T_core, T_sk, T_clo], [°C]
   * @param _tdb - dry bulb air temperature, [°C]
   * @param _tr - mean radiant temperature, [°C]
   * @param _v - air speed, [m/s]
   * @param _rh - relative humidity, [%]
   * @param _met - metabolic rate, [W/m2]
   * @param _clo - clothing insulation, [clo]
   * @param actual_environment - True=solve 3eqs/3unknowns, False=solve for PET
   * @returns PET or energy balance.
   */
  function solve_pet(
    t_arr: readonly number[],
    _tdb: number,
    _tr: number,
    _v = 0.1,
    _rh = 50,
    _met = 80,
    _clo = 0.9,
    actual_environment = false,
  ): number | number[] {
    const e_skin = 0.99; // Skin emissivity
    const e_clo = 0.95; // Clothing emissivity
    const h_vap = 2.42 * 10 ** 6; // Latent heat of evaporation [J/Kg]
    const sbc = 5.67 * 10 ** -8; // Stefan-Boltzmann constant [W/(m2*K^4)]
    const cb = 3640; // Blood specific heat [J/kg/k]

    const [t_cr = NaN, t_sk = NaN, t_clo = NaN] = t_arr;
    const e_bal_vec = [0.0, 0.0, 0.0]; // required for the vectorial expression of the balance
    // Upstream's Python float division raises at a zero divisor, and a complex
    // dividend makes its message "complex" (deviation pet_steady-4).
    const zero_division_message =
      weight < 0 || height < 0
        ? "complex division by zero"
        : "float division by zero";
    // Area parameters of the body:
    const a_dubois = body_surface_area(weight, height);
    // Base metabolism for men and women in [W]
    if (weight ** (1.0 / 3.0) === 0) {
      throw new RangeError("float division by zero");
    }
    const met_female =
      3.19 *
      weight ** 0.75 *
      (1.0 +
        0.004 * (30.0 - age) +
        0.018 * ((height * 100.0) / weight ** (1.0 / 3.0) - 42.1));
    const met_male =
      3.45 *
      weight ** 0.75 *
      (1.0 +
        0.004 * (30.0 - age) +
        0.01 * ((height * 100.0) / weight ** (1.0 / 3.0) - 43.4));
    // Attribution of internal energy depending on the sex of the subject
    const met_correction = sex === Sex.male ? met_male : met_female;

    // Source term : metabolic activity
    // a_dubois is NaN where upstream's is complex, so its zero is tested on height.
    if (a_dubois === 0 || height === 0)
      throw new RangeError(zero_division_message);
    const he = (_met + met_correction) / a_dubois;
    // impact of efficiency
    const h = he * (1.0 - wme); // [W/m2]

    // correction for wind
    const i_m = 0.38; // Woodcock ratio for vapour transfer through clothing [-]

    // Calculation of the Burton surface increase coefficient, k = 0.31 for Hoeppe:
    const fcl = 1 + 0.31 * _clo; // Increase heat exchange surface depending on clothing level
    let f_a_cl =
      (173.51 * _clo - 2.36 - 100.76 * _clo * _clo + 19.28 * _clo ** 3.0) / 100;
    const a_clo = a_dubois * f_a_cl + a_dubois * (fcl - 1.0); // clothed body surface area

    const f_eff = position === Postures.standing ? 0.696 : 0.725; // effective radiation factor

    const a_r_eff = a_dubois * f_eff; // Effective radiative area depending on the position of the subject

    // Partial pressure of water in the air
    let vpa = ((_rh / 100.0) * p_sat(_tdb)) / 100; // [hPa]
    if (!actual_environment) {
      // mode=False means we are calculating the PET
      vpa = 12; // [hPa] vapour pressure of the standard environment
    }

    // Convection coefficient depending on wind velocity and subject position
    let hc = 2.67 + 6.5 * _v ** 0.67; // sitting
    if (position === Postures.standing) {
      // standing
      hc = 2.26 + 7.42 * _v ** 0.67;
    }
    if (position === "standing, forced convection") {
      // standing, forced convection
      hc = 8.6 * _v ** 0.513;
    }
    // h_cc corrected convective heat transfer coefficient
    const h_cc = 3.0 * Math.pow(p_atm / 1013.25, 0.53);
    // Upstream's max raises TypeError on a complex hc or h_cc (deviation pet_steady-5).
    if (_v < 0) throw negativeInput("v");
    if (p_atm < 0) throw negativeInput("p_atm");
    hc = Math.max(h_cc, hc);
    // modification of hc with the total pressure
    hc = hc * (p_atm / 1013.25) ** 0.55;

    // Respiratory energy losses
    const t_exp = 0.47 * _tdb + 21.0; // Expired air temperature calculation [degC]
    const d_vent_pulm = he * 1.44 * 10.0 ** -6.0; // breathing flow rate
    const c_res = 1010 * (_tdb - t_exp) * d_vent_pulm; // Sensible heat energy loss [W/m2]
    const vpexp = p_sat(t_exp) / 100; // Latent heat energy loss [hPa]
    if (p_atm === 0) throw new RangeError("float division by zero");
    const q_res = ((0.623 * h_vap) / p_atm) * (vpa - vpexp) * d_vent_pulm; // [W/m2]
    const ere = c_res + q_res; // [W/m2]

    // Calculation of the equivalent thermal resistance of body tissues
    const alpha = vasomotricity(t_cr, t_sk).alpha;
    const tbody = alpha * t_sk + (1 - alpha) * t_cr;

    // Clothed fraction of the body approximation
    const r_cl = _clo / 6.45; // Conversion in [m2.K/W]
    let y = 0;
    f_a_cl = Math.min(f_a_cl, 1.0);
    if (_clo >= 2.0) {
      y = 1.0;
    }
    if (0.6 < _clo && _clo < 2.0) {
      y = (height - 0.2) / height;
    }
    if (0.6 >= _clo && _clo > 0.3) {
      y = 0.5;
    }
    if (0.3 >= _clo && _clo > 0.0) {
      y = 0.1;
    }
    // calculation of the clothing radius depending on the clothing level (6.28 = 2*
    // pi !)
    if (6.28 * height * y === 0) throw new RangeError(zero_division_message);
    const r2 = (a_dubois * (fcl - 1.0 + f_a_cl)) / (6.28 * height * y); // External radius
    const r1 = (f_a_cl * a_dubois) / (6.28 * height * y); // Internal radius
    const di = r2 - r1;
    // Calculation of the equivalent thermal resistance of body tissues
    // r1 is NaN where upstream's is complex, so its zero is tested on f_a_cl.
    if (r1 === 0 || f_a_cl === 0) throw new RangeError(zero_division_message);
    const htcl = (6.28 * height * y * di) / (r_cl * Math.log(r2 / r1) * a_clo); // [W/(m2.K)]

    // Calculation of sweat losses
    const qmsw = sweat_rate(tbody);
    // h_vap/1000 = 2420 000[J/kg] divided by 1000 = [J/g] // qmsw/3600 for [g/m2/h]
    // to [
    // g/m2/s]
    let esw = ((h_vap / 1000) * qmsw) / 3600; // [W/m2]
    // Saturation vapor pressure at temperature Tsk
    const p_v_sk = p_sat(t_sk) / 100; // hPa
    // Calculation of vapour transfer
    const lr = 16.7 * 10 ** -1; // [K/hPa] Lewis ratio
    const he_diff = hc * lr; // diffusion coefficient of air layer
    if (1 + 0.92 * hc * r_cl === 0) {
      throw new RangeError("float division by zero");
    }
    const fecl = 1 / (1 + 0.92 * hc * r_cl); // Burton efficiency factor
    let e_max = he_diff * fecl * (p_v_sk - vpa); // maximum diffusion at skin surface
    if (e_max === 0) {
      // added this otherwise esw / e_max cannot be calculated
      e_max = 0.001;
    }
    let w = esw / e_max; // skin wettedness
    if (w > 1) {
      w = 1;
      const delta = esw - e_max;
      if (delta < 0) {
        esw = e_max;
      }
    }
    esw = Math.max(esw, 0);
    // i_m= Woodcock's ratio (see above)
    if (fcl * hc === 0) throw new RangeError("float division by zero");
    const r_ecl = (1 / (fcl * hc) + r_cl) / (lr * i_m); // clothing vapour transfer resistance after Woodcock's method
    const ediff = ((1 - w) * (p_v_sk - vpa)) / r_ecl; // diffusion heat transfer
    const evap = -(ediff + esw); // [W/m2]

    // Radiation losses bare skin
    const r_bare =
      (a_r_eff *
        (1.0 - f_a_cl) *
        e_skin *
        sbc *
        ((_tr + 273.15) ** 4.0 - (t_sk + 273.15) ** 4.0)) /
      a_dubois;
    // ... for clothed area
    const r_clo =
      (f_eff *
        a_clo *
        e_clo *
        sbc *
        ((_tr + 273.15) ** 4.0 - (t_clo + 273.15) ** 4.0)) /
      a_dubois;
    const r_sum = r_clo + r_bare; // radiation total

    // Convection losses for bare skin
    const c_bare = (hc * (_tdb - t_sk) * a_dubois * (1.0 - f_a_cl)) / a_dubois; // [W/m^2]
    // ... for clothed area
    const c_clo = (hc * (_tdb - t_clo) * a_clo) / a_dubois; // [W/m^2]
    const csum = c_clo + c_bare; // convection total

    // Balance equations of the 3-nodes model
    e_bal_vec[0] =
      h +
      ere -
      ((vasomotricity(t_cr, t_sk).m_blood / 3600) * cb + 5.28) * (t_cr - t_sk); // Core balance [W/m^2]
    e_bal_vec[1] =
      r_bare +
      c_bare +
      evap +
      ((vasomotricity(t_cr, t_sk).m_blood / 3600) * cb + 5.28) * (t_cr - t_sk) -
      htcl * (t_sk - t_clo); // Skin balance [W/m^2]
    e_bal_vec[2] = c_clo + r_clo + htcl * (t_sk - t_clo); // Clothes balance [W/m^2]
    const e_bal_scal = h + ere + r_sum + csum + evap;

    // returning either the calculated core, skin, clo temperatures or the PET
    if (actual_environment) {
      // if we solve for the system we need to return 3 temperatures
      return [...e_bal_vec];
    }
    // minpack cannot take upstream's complex PET balance (deviation pet_steady-5).
    if (weight < 0) throw negativeInput("weight");
    if (height < 0) throw negativeInput("height");
    // solving for the PET requires the scalar balance only
    return e_bal_scal;
  }

  /**
   * Find the solution.
   *
   * @param _t_stable - 3 temperatures obtained from the actual environment (T_core,T_skin,T_clo).
   * @returns The PET comfort index.
   */
  function pet_fc(_t_stable: readonly number[]): number {
    // Definition of a function with the input variables of the PET reference situation
    function f(tx: readonly number[]): number[] {
      const tx0 = tx[0] ?? NaN;
      return [
        solve_pet(
          _t_stable,
          tx0,
          tx0,
          undefined,
          undefined,
          undefined,
          undefined,
          false,
        ),
      ];
    }

    // solving for PET
    const pet_guess = _t_stable[2] ?? NaN; // start with the clothing temperature

    // round() on an np.float64 rounds as numpy does.
    return round(fsolve(f, [pet_guess], warnings)[0] ?? NaN, 2);
  }

  // initial guess
  const t_guess = [36.7, 34, 0.5 * (tdb + tr)];
  // solve for Tc, Tsk, Tcl temperatures
  const t_stable = fsolve(
    (t_arr) => solve_pet(t_arr, tdb, tr, v, rh, met, clo, true),
    t_guess,
    warnings,
  );
  // compute PET
  return pet_fc(t_stable);
}
