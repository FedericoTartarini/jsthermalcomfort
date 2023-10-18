import JOS3Defaults from "../jos3_functions/JOS3Defaults";
import { NUM_NODES } from "../jos3_functions/matrix";
import { bsa_rate } from "../jos3_functions/bsa_rate";
import { local_bsa } from "../jos3_functions/local_bsa";
import { bfb_rate } from "../jos3_functions/bfb_rate";
import { conductance } from "../jos3_functions/conductance";
import { capacity } from "../jos3_functions/capacity";
import { pmv } from "./pmv";

export class JOS3 {
  constructor(
    height = JOS3Defaults.height,
    weight = JOS3Defaults.weight,
    fat = JOS3Defaults.body_fat,
    age = JOS3Defaults.age,
    sex = JOS3Defaults.sex,
    ci = JOS3Defaults.cardiac_index,
    bmr_equation = JOS3Defaults.bmr_equation,
    bsa_equation = JOS3Defaults.bsa_equation,
    ex_output = null,
  ) {
    // Initialize basic attributes
    this._height = height;
    this._weight = weight;
    this._fat = fat;
    this._sex = sex;
    this._age = age;
    this._ci = ci;
    this._bmr_equation = bmr_equation;
    this._bsa_equation = bsa_equation;
    this._ex_output = ex_output;

    // Calculate body surface area (bsa) rate
    this._bsa_rate = bsa_rate(height, weight, bsa_equation);

    // Calculate local body surface area
    this._bsa = local_bsa(height, weight, bsa_equation);

    // Calculate basal blood flow (BFB) rate [-]
    this._bfb_rate = bfb_rate(height, weight, bsa_equation, age, ci);

    // Calculate thermal conductance (CDT) [W/K]
    this._cdt = conductance(height, weight, bsa_equation, fat);

    // Calculate thermal capacity [J/K]
    this._cap = capacity(height, weight, bsa_equation, age, ci);

    // Set initial core and skin temperature set points [°C]
    this.setpt_cr = Array(17).fill(Default.core_temperature);
    this.setpt_sk = Array(17).fill(Default.skin_temperature);

    // Initialize body temperature [°C]
    this._bodytemp = Array(NUM_NODES).fill(Default.other_body_temperature);

    // Initialize environmental conditions and other factors
    // (Default values of input conditions)
    this._ta = Array(17).fill(Default.dry_bulb_air_temperature);
    this._tr = Array(17).fill(Default.mean_radiant_temperature);
    this._rh = Array(17).fill(Default.relative_humidity);
    this._va = Array(17).fill(Default.air_speed);
    this._clo = Array(17).fill(Default.clothing_insulation);
    this._iclo = Array(17).fill(Default.clothing_vapor_permeation_efficiency);
    this._par = JOS3Defaults.physical_activity_ratio;
    this._posture = JOS3Defaults.posture;
    this._hc = null; // Convective heat transfer coefficient
    this._hr = null; // Radiative heat transfer coefficient
    this.ex_q = Array(NUM_NODES).fill(0); // External heat gain
    this._t = 0; // Elapsed time
    this._cycle = 0; // Cycle time
    this.model_name = "JOS3"; // Model name
    this.options = {
      nonshivering_thermogenesis: true,
      cold_acclimated: false,
      shivering_threshold: false,
      "limit_dshiv/dt": false,
      bat_positive: false,
      ava_zero: false,
      shivering: false,
    };

    // Set shivering threshold = 0
    threg.PRE_SHIV = 0;

    // Initialize history to store model parameters
    this._history = [];

    // Set elapsed time and cycle time to 0
    this._t = 0; // Elapsed time
    this._cycle = 0; // Cycle time

    // Reset set-point temperature and save the last model parameters
    dictout = this._reset_setpt(JOS3Defaults.physical_activity_ratio);
    this._history.append(dictout);
  }

  /**
   * Reset set-point temperatures under steady state calculation.
   * Set-point temperatures are hypothetical core or skin temperatures in a thermally neutral state
   * when at rest (similar to room set-point temperature for air conditioning).
   * This function is used during initialization to calculate the set-point temperatures as a reference for thermoregulation.
   * Be careful, input parameters (tdb, tr, rh, v, clo, par) and body temperatures are also reset.
   *
   * @returns {Object} Parameters of JOS-3 model.
   */
  _reset_setpt(par = JOS3Defaults.physical_activity_ratio) {
    // Set operative temperature under PMV=0 environment
    // 1 met = 58.15 W/m2
    w_per_m2_to_met = 1 / 58.15; // unit converter W/m2 to met
    met = this.bmr * par * w_per_m2_to_met; // [met]
    this.to = this._calculate_operative_temp_when_pmv_is_zero((met = met));
    this.rh = JOS3Defaults.relative_humidity;
    this.v = JOS3Defaults.air_speed;
    this.clo = JOS3Defaults.clothing_insulation;
    this.par = par; // Physical activity ratio

    // Steady-calculation
    this.options["ava_zero"] = true;

    let dict_out = {};
    for (let i = 0; i < 10; i++) {
      dict_out = this._run(60000, true);
    }

    // Set new set-point temperatures for core and skin
    this.setpt_cr = this.t_core;
    this.setpt_sk = this.t_skin;
    this.options["ava_zero"] = false;

    return dict_out;
  }

  /**
   * Calculate operative temperature [°C] when PMV=0.
   *
   * @param {number} [va=JOS3Defaults.air_speed] - Air velocity [m/s].
   * @param {number} [rh=JOS3Defaults.relative_humidity] - Relative humidity [%].
   * @param {number} [met=JOS3Defaults.metabolic_rate] - Metabolic rate [met].
   * @param {number} [clo=JOS3Defaults.clothing_insulation] - Clothing insulation [clo].
   *
   * @returns {number} Operative temperature [°C].
   */
  _calculate_operative_temp_when_pmv_is_zero(
    va = JOS3Defaults.air_speed,
    rh = JOS3Defaults.relative_humidity,
    met = JOS3Defaults.metabolic_rate,
    clo = JOS3Defaults.clothing_insulation,
  ) {
    let to = 28; // initial operative temperature

    // Iterate until the PMV (Predicted Mean Vote) value is less than 0.001
    for (let i = 0; i < 100; i++) {
      let vpmv = pmv(to, to, va, undefined, rh, met, clo);

      // Break the loop if the absolute value of PMV is less than 0.001
      if (Math.abs(vpmv) < 0.001) {
        break;
      }

      // Update the temperature based on the PMV value
      to = to - vpmv / 3;
    }

    return to;
  }

  /**
   * Runs the model once and gets the model parameters.
   *
   * The function then calculates several thermoregulation parameters using the input data,
   * such as convective and radiative heat transfer coefficients, operative temperature, heat resistance,
   * and blood flow rates.
   *
   * It also calculates the thermogenesis by shivering and non-shivering, basal thermogenesis, and thermogenesis by work.
   *
   * The function then calculates the total heat loss and gains, including respiratory,
   * sweating, and extra heat gain, and builds the matrices required
   * to solve for the new body temperature.
   *
   * It then calculates the new body temperature by solving the matrices using numpy's linalg library.
   *
   * Finally, the function returns a dictionary of the simulation results.
   * The output parameters include cycle time, model time, t_skin_mean, t_skin, t_core, w_mean, w, weight_loss_by_evap_and_res, cardiac_output, q_thermogenesis_total, q_res, and q_skin_env.
   *
   * Additionally, if the _ex_output variable is set to "all" or is a list of keys,
   * the function also returns a detailed dictionary of all the thermoregulation parameters
   * and other variables used in the simulation.
   *
   * @param {number} [dtime=60] - Time delta [sec]. Default is 60.
   * @param {boolean} [passive=false] - If you run a passive model, set to True. Default is False.
   * @param {boolean} [output=true] - If you don't need parameters, set to False. Default is True.
   *
   * @returns {Object} - Output parameters.
   */
  _run(dtime = 60, passive = false, output = true) {}
}
