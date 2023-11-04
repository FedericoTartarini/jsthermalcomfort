import JOS3Defaults from "../jos3_functions/JOS3Defaults.js";
import {
  BODY_NAMES,
  INDEX,
  local_arr,
  NUM_NODES,
  vessel_blood_flow,
  VINDEX,
  whole_body,
} from "../jos3_functions/matrix.js";
import { bsa_rate } from "../jos3_functions/bsa_rate.js";
import { local_bsa } from "../jos3_functions/local_bsa.js";
import { bfb_rate } from "../jos3_functions/bfb_rate.js";
import { conductance } from "../jos3_functions/conductance.js";
import { capacity } from "../jos3_functions/capacity.js";
import { pmv } from "./pmv.js";
import {
  set_pre_shiv,
  shivering,
} from "../jos3_functions/thermoregulation/shivering.js";
import { fixed_hc } from "../jos3_functions/thermoregulation/fixed_hc.js";
import { conv_coef } from "../jos3_functions/thermoregulation/conv_coef.js";
import { fixed_hr } from "../jos3_functions/thermoregulation/fixed_hr.js";
import { rad_coef } from "../jos3_functions/thermoregulation/rad_coef.js";
import { operative_temp } from "../jos3_functions/thermoregulation/operative_temp.js";
import { dry_r } from "../jos3_functions/thermoregulation/dry_r.js";
import { wet_r } from "../jos3_functions/thermoregulation/wet_r.js";
import { $array, $average, $index, $map, $reduce, $sum } from "../supa.js";
import {
  antoine,
  evaporation,
} from "../jos3_functions/thermoregulation/evaporation.js";
import { skin_blood_flow } from "../jos3_functions/thermoregulation/skin_blood_flow.js";
import { ava_blood_flow } from "../jos3_functions/thermoregulation/ava_blood_flow.js";
import { nonshivering } from "../jos3_functions/thermoregulation/nonshivering.js";
import { local_mbase } from "../jos3_functions/thermoregulation/local_mbase.js";
import { local_q_work } from "../jos3_functions/thermoregulation/local_q_work.js";
import { sum_m } from "../jos3_functions/thermoregulation/sum_m.js";
import { cr_ms_fat_blood_flow } from "../jos3_functions/thermoregulation/cr_ms_fat_blood_flow.js";
import { resp_heat_loss } from "../jos3_functions/thermoregulation/resp_heat_loss.js";
import { sum_bf } from "../jos3_functions/thermoregulation/sum_bf.js";
import {
  add,
  clone,
  diag,
  divide,
  dotDivide,
  dotMultiply,
  identity,
  index,
  inv,
  map,
  matrix,
  mean,
  multiply,
  reshape,
  subset,
  subtract,
  sum,
  zeros,
} from "mathjs";
import { basal_met } from "../jos3_functions/thermoregulation/basal_met.js";

function _to17array(inp) {
  if (typeof inp === "number") {
    return Array(17).fill(inp);
  } else if (inp instanceof Array) {
    if (inp.length === 17) {
      return [...inp];
    } else {
      throw new Error("The input list is not of length 17");
    }
  } else if (typeof inp === "object" && inp !== null) {
    return BODY_NAMES.map((key) => inp[key]);
  } else {
    throw new Error(
      "Unsupported input type. Supported types: number, Array, object",
    );
  }
}

function wmean(values, weights) {
  if (values.length !== weights.length) {
    throw new Error("Values and weights arrays must have the same length.");
  }

  // Calculate the sum of all products of values and their corresponding weights
  const sumProduct = sum(multiply(values, weights));

  // Calculate the sum of all weights
  const sumWeights = sum(weights);

  return divide(sumProduct, sumWeights);
}

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
    this.setpt_cr = Array(17).fill(JOS3Defaults.core_temperature);
    this.setpt_sk = Array(17).fill(JOS3Defaults.skin_temperature);

    // Initialize body temperature [°C]
    this._bodytemp = Array(NUM_NODES).fill(JOS3Defaults.other_body_temperature);

    // Initialize environmental conditions and other factors
    // (Default values of input conditions)
    this._ta = Array(17).fill(JOS3Defaults.dry_bulb_air_temperature);
    this._tr = Array(17).fill(JOS3Defaults.mean_radiant_temperature);
    this._rh = Array(17).fill(JOS3Defaults.relative_humidity);
    this._va = Array(17).fill(JOS3Defaults.air_speed);
    this._clo = Array(17).fill(JOS3Defaults.clothing_insulation);
    this._iclo = Array(17).fill(
      JOS3Defaults.clothing_vapor_permeation_efficiency,
    );
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
    set_pre_shiv(0);

    // Initialize history to store model parameters
    this._history = [];

    // Set elapsed time and cycle time to 0
    this._t = 0; // Elapsed time
    this._cycle = 0; // Cycle time

    // Reset set-point temperature and save the last model parameters
    let dictout = this._reset_setpt(JOS3Defaults.physical_activity_ratio);
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
    let w_per_m2_to_met = 1 / 58.15; // unit converter W/m2 to met
    let met = this.bmr * par * w_per_m2_to_met; // [met]
    this.to = this._calculate_operative_temp_when_pmv_is_zero(met);
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
   * Run JOS-3 model.
   *
   * @param {number} times - Number of loops of a simulation.
   * @param {number} [dtime=60] - Time delta in seconds.
   * @param {boolean} [output=true] - If you don't want to record parameters, set to false.
   * @returns {void}
   */
  simulate(times, dtime = 60, output = true) {
    // Loop through the simulation for the given number of times
    for (let i = 0; i < times; i++) {
      // Increment the elapsed time by the time delta
      // Assuming you have a method or logic to increment `_t` with dtime
      this._t += dtime; // This line might need further adjustment depending on how `_t` is used in your code

      // Increment the cycle counter
      this._cycle++;

      // Execute the simulation step
      // Assuming `_run` is a method on this class
      const dictData = this._run(dtime, output);

      // If output is true, append the results to the history
      if (output) {
        this._history.push(dictData);
      }
    }
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
  _run(dtime = 60, passive = false, output = true) {
    // Get core and skin temperatures
    let tcr = this.t_core;
    let tsk = this.t_skin;

    // Convective and radiative heat transfer coefficients [W/(m2*K)]
    let hc = fixed_hc(
      conv_coef(this._posture, this._va, this._ta, tsk),
      this._va,
    );
    let hr = fixed_hr(rad_coef(this._posture));

    // Manually set convective and radiative heat transfer coefficients if necessary
    if (this._hc !== null) {
      hc = this._hc;
    }
    if (this._hr !== null) {
      hr = this._hr;
    }

    // Compute operative temp. [°C], clothing heat and evaporative resistance [m2.K/W], [m2.kPa/W]
    // Operative temp. [°C]
    let to = operative_temp(this._ta, this._tr, hc, hr);
    // Clothing heat resistance [m2.K/W]
    let r_t = dry_r(hc, hr, this._clo);
    // Clothing evaporative resistance [m2.kPa/W]
    let r_et = wet_r(hc, this._clo, this._iclo);

    // Thermoregulation
    // 1) Sweating
    // 2) Vasoconstriction, Vasodilation
    // 3) Shivering and non-shivering thermogenesis

    // Compute the difference between the set-point temperature and body temperatures
    // and other thermoregulation parameters.
    // If running a passive model, the set-point temperature of thermoregulation is
    // set to the current body temperature.

    // set-point temperature for thermoregulation

    let setpt_sk, setpt_cr;
    if (passive) {
      setpt_cr = tcr;
      setpt_sk = tsk;
    } else {
      setpt_cr = this.setpt_cr;
      setpt_sk = this.setpt_sk;
    }

    // Error signal = Difference between set-point and body temperatures
    let err_cr = subtract(tcr, setpt_cr);
    let err_sk = subtract(tsk, setpt_sk);

    // SWEATING THERMOREGULATION
    let { wet, e_sk, e_max, e_sweat } = evaporation(
      err_cr,
      err_sk,
      tsk,
      this._ta,
      this._rh,
      r_et,
      this._height,
      this._weight,
      this._bsa_equation,
      this._age,
    );

    // VASOCONSTRICTION, VASODILATION
    let bf_skin = skin_blood_flow(
      err_cr,
      err_sk,
      this._height,
      this._weight,
      this._bsa_equation,
      this._age,
      this._ci,
    );

    let bloodFlows = ava_blood_flow(
      err_cr,
      err_sk,
      this._height,
      this._weight,
      this._bsa_equation,
      this._age,
      this._ci,
    );
    let bf_ava_hand = bloodFlows[0];
    let bf_ava_foot = bloodFlows[1];

    if (this.options.ava_zero && passive) {
      bf_ava_hand = 0;
      bf_ava_foot = 0;
    }

    // SHIVERING AND NON-SHIVERING
    let q_shiv = shivering(
      err_cr,
      err_sk,
      tcr,
      tsk,
      this._height,
      this._weight,
      this._bsa_equation,
      this._age,
      this._sex,
      dtime,
      this.options,
    );

    // Calculate non-shivering thermogenesis (NST) [W]
    let q_nst;
    if (this.options.nonshivering_thermogenesis) {
      q_nst = nonshivering(
        err_sk,
        this._height,
        this._weight,
        this._bsa_equation,
        this._age,
        this.options.cold_acclimated,
        this.options.bat_positive,
      );
    } else {
      q_nst = new Array(17).fill(0);
    }

    // Thermogenesis

    // Calculate local basal metabolic rate (BMR) [W]
    let q_bmr_local = local_mbase(
      this._height,
      this._weight,
      this._age,
      this._sex,
      this._bmr_equation,
    );

    // Calculate overall basal metabolic rate (BMR) [W]
    let q_bmr_total = q_bmr_local
      .map((m) => m.reduce((a, b) => a + b, 0))
      .reduce((a, b) => a + b, 0);

    // Calculate thermogenesis by work [W]
    let q_work = local_q_work(q_bmr_total, this._par);

    // Calculate the sum of thermogenesis in core, muscle, fat, skin [W]
    let [
      q_thermogenesis_core,
      q_thermogenesis_muscle,
      q_thermogenesis_fat,
      q_thermogenesis_skin,
    ] = sum_m(q_bmr_local, q_work, q_shiv, q_nst);

    let q_thermogenesis_total =
      q_thermogenesis_core.reduce((a, b) => a + b, 0) +
      q_thermogenesis_muscle.reduce((a, b) => a + b, 0) +
      q_thermogenesis_fat.reduce((a, b) => a + b, 0) +
      q_thermogenesis_skin.reduce((a, b) => a + b, 0);

    // Others

    // Calculate blood flow in core, muscle, fat [L/h]
    let [bf_core, bf_muscle, bf_fat] = cr_ms_fat_blood_flow(
      q_work,
      q_shiv,
      this._height,
      this._weight,
      this._bsa_equation,
      this._age,
      this._ci,
    );

    // Calculate heat loss by respiratory
    let p_a = (antoine(this._ta) * this._rh) / 100;
    let [res_sh, res_lh] = resp_heat_loss(
      this._ta[0],
      p_a[0],
      q_thermogenesis_total,
    );

    // Calculate sensible heat loss [W]
    let shl_sk = ((tsk - to) / r_t) * this._bsa;

    // Calculate cardiac output [L/h]
    let co = sum_bf(
      bf_core,
      bf_muscle,
      bf_fat,
      bf_skin,
      bf_ava_hand,
      bf_ava_foot,
    );

    // Calculate weight loss rate by evaporation [g/sec]
    let wlesk = (e_sweat + 0.06 * e_max) / 2418;
    let wleres = res_lh / 2418;

    // Matrix
    // This code section is focused on constructing and calculating
    // various matrices required for modeling the thermoregulation
    // of the human body.
    // Since JOS-3 has 85 thermal nodes, the determinant of 85*85 is to be solved.

    // Matrix A = Matrix for heat exchange due to blood flow and conduction occurring between tissues

    // Calculates the blood flow in arteries and veins for core, muscle, fat, skin,
    // and arteriovenous anastomoses (AVA) in hands and feet,
    // and combines them into two arrays:
    // 1) bf_local for the local blood flow and 2) bf_whole for the whole-body blood flow.
    // These arrays are then combined to form arr_bf.

    let [bf_art, bf_vein] = vessel_blood_flow(
      bf_core,
      bf_muscle,
      bf_fat,
      bf_skin,
      bf_ava_hand,
      bf_ava_foot,
    );
    let bf_local = local_arr(
      bf_core,
      bf_muscle,
      bf_fat,
      bf_skin,
      bf_ava_hand,
      bf_ava_foot,
    );
    let bf_whole = whole_body(bf_art, bf_vein, bf_ava_hand, bf_ava_foot);

    // Initialize arr_bf with zeros using mathjs matrix
    let arr_bf = zeros(NUM_NODES, NUM_NODES);

    // Add bf_local and bf_whole to arr_bf
    arr_bf = add(arr_bf, bf_local);
    arr_bf = add(arr_bf, bf_whole);

    // Adjusts the units of arr_bf from [W/K] to [/sec] and then to [-]
    // by dividing by the heat capacity this._cap and multiplying by the time step dtime.
    let reshaped_cap = reshape(this._cap, [NUM_NODES, 1]);
    arr_bf = dotDivide(arr_bf, reshaped_cap); // Change unit [W/K] to [/sec]
    arr_bf = multiply(arr_bf, dtime); // Change unit [/sec] to [-]

    // Performs similar unit conversions for the convective heat transfer coefficient array arr_cdt
    // (also divided by this._cap and multiplied by dtime).
    let arr_cdt = clone(this._cdt);
    arr_cdt = dotDivide(arr_cdt, reshaped_cap); // Change unit [W/K] to [/sec]
    arr_cdt = multiply(arr_cdt, dtime); // Change unit [/sec] to [-]

    // Matrix B = Matrix for heat transfer between skin and environment
    let arr_b = zeros(NUM_NODES);

    // Updating arr_b based on INDEX["skin"]
    INDEX["skin"].forEach((idx, i) => {
      arr_b[idx] += (1 / r_t) * this._bsa[i];
    });

    // Using mathjs library for array operations
    arr_b = dotDivide(arr_b, this._cap);
    arr_b = multiply(arr_b, dtime);

    // Calculates the off-diagonal and diagonal elements of the matrix A
    let arr_a_tria = subtract(multiply(-1, arr_cdt), arr_bf);

    let arr_a_dia = add(arr_cdt, arr_bf);
    arr_a_dia = add(sum(arr_a_dia, 1), arr_b); // Assuming 'axis=1' means summing along rows
    arr_a_dia = diag(arr_a_dia);
    arr_a_dia = add(arr_a_dia, identity(NUM_NODES));

    let arr_a = add(arr_a_tria, arr_a_dia);
    let arr_a_inv = inv(arr_a);

    // Matrix Q = Matrix for heat generation rate from thermogenesis, respiratory, sweating,
    // and extra heat gain processes in different body parts.
    let arr_q = zeros(NUM_NODES);

    // Thermogensis
    arr_q = add(
      arr_q,
      subset(zeros(NUM_NODES), index(INDEX["core"]), q_thermogenesis_core),
    );

    arr_q = add(
      arr_q,
      subset(
        zeros(NUM_NODES),
        index(INDEX["muscle"]),
        subset(q_thermogenesis_muscle, index(VINDEX["muscle"])),
      ),
    );
    arr_q = add(
      arr_q,
      subset(
        zeros(NUM_NODES),
        index(INDEX["fat"]),
        subset(q_thermogenesis_fat, index(VINDEX["fat"])),
      ),
    );
    arr_q = add(
      arr_q,
      subset(zeros(NUM_NODES), index(INDEX["skin"]), q_thermogenesis_skin),
    );

    // Respiratory [W]
    arr_q[INDEX["core"][2]] -= res_sh + res_lh; // chest core

    // Sweating [W]
    arr_q = subtract(
      arr_q,
      subset(zeros(NUM_NODES), index(INDEX["skin"]), e_sk),
    );

    // Extra heat gain [W]
    arr_q = add(arr_q, this.ex_q);

    // Adjust units
    arr_q = dotDivide(arr_q, this._cap); // Change unit [W]/[J/K] to [K/sec]
    arr_q = multiply(arr_q, dtime); // Change unit [K/sec] to [K]

    // Boundary matrix [°C]
    let arr_to = zeros(NUM_NODES);
    arr_to = add(arr_to, subset(zeros(NUM_NODES), index(INDEX["skin"]), to));

    // Combines the current body temperature, the boundary matrix, and the heat generation matrix
    // to calculate the new body temperature distribution (arr).
    let arr = add(add(this._bodytemp, dotMultiply(arr_b, arr_to)), arr_q);

    console.log(arr_b);
    console.log(arr_to);
    console.log(arr_q);
    console.log(arr_a_inv);
    console.log(arr);

    // ------------------------------------------------------------------
    // New body temp. [°C]
    // ------------------------------------------------------------------
    this._bodytemp = dotMultiply(arr_a_inv, arr);

    // ------------------------------------------------------------------
    // Output parameters
    // ------------------------------------------------------------------
    let dict_out = {};
    if (output) {
      // Default output
      dict_out["cycle_time"] = this._cycle;
      dict_out["simulation_time"] = this._t;
      dict_out["dt"] = dtime;
      dict_out["t_skin_mean"] = this.t_skin_mean;
      dict_out["t_skin"] = this.t_skin;
      dict_out["t_core"] = this.t_core;
      dict_out["w_mean"] = $average(wet, JOS3Defaults.local_bsa);
      dict_out["w"] = wet;
      dict_out["weight_loss_by_evap_and_res"] = $sum(wlesk) + wleres;
      dict_out["cardiac_output"] = co;
      dict_out["q_thermogenesis_total"] = q_thermogenesis_total;
      dict_out["q_res"] = res_sh + res_lh;
      dict_out["q_skin2env"] = shl_sk + e_sk;
    }

    let detail_out = {};
    if (this._ex_output && output) {
      detail_out["name"] = this.model_name;
      detail_out["height"] = this._height;
      detail_out["weight"] = this._weight;
      detail_out["bsa"] = this._bsa;
      detail_out["fat"] = this._fat;
      detail_out["sex"] = this._sex;
      detail_out["age"] = this._age;
      detail_out["t_core_set"] = setpt_cr;
      detail_out["t_skin_set"] = setpt_sk;
      detail_out["t_cb"] = this.t_cb;
      detail_out["t_artery"] = this.t_artery;
      detail_out["t_vein"] = this.t_vein;
      detail_out["t_superficial_vein"] = this.t_superficial_vein;
      detail_out["t_muscle"] = this.t_muscle;
      detail_out["t_fat"] = this.t_fat;
      detail_out["to"] = to;
      detail_out["r_t"] = r_t;
      detail_out["r_et"] = r_et;
      detail_out["tdb"] = this._ta.slice();
      detail_out["tr"] = this._tr.slice();
      detail_out["rh"] = this._rh.slice();
      detail_out["v"] = this._va.slice();
      detail_out["par"] = this._par;
      detail_out["clo"] = this._clo.slice();
      detail_out["e_skin"] = e_sk;
      detail_out["e_max"] = e_max;
      detail_out["e_sweat"] = e_sweat;
      detail_out["bf_core"] = bf_core;
      detail_out["bf_muscle"] = bf_muscle[VINDEX["muscle"]];
      detail_out["bf_fat"] = bf_fat[VINDEX["fat"]];
      detail_out["bf_skin"] = bf_skin;
      detail_out["bf_ava_hand"] = bf_ava_hand;
      detail_out["bf_ava_foot"] = bf_ava_foot;
      detail_out["q_bmr_core"] = q_bmr_local[0];
      detail_out["q_bmr_muscle"] = q_bmr_local[1][VINDEX["muscle"]];
      detail_out["q_bmr_fat"] = q_bmr_local[2][VINDEX["fat"]];
      detail_out["q_bmr_skin"] = q_bmr_local[3];
      detail_out["q_work"] = q_work;
      detail_out["q_shiv"] = q_shiv;
      detail_out["q_nst"] = q_nst;
      detail_out["q_thermogenesis_core"] = q_thermogenesis_core;
      detail_out["q_thermogenesis_muscle"] =
        q_thermogenesis_muscle[VINDEX["muscle"]];
      detail_out["q_thermogenesis_fat"] = q_thermogenesis_fat[VINDEX["fat"]];
      detail_out["q_thermogenesis_skin"] = q_thermogenesis_skin;
      dict_out["q_skin2env_sensible"] = shl_sk;
      dict_out["q_skin2env_latent"] = e_sk;
      dict_out["q_res_sensible"] = res_sh;
      dict_out["q_res_latent"] = res_lh;
    }

    if (this._ex_output === "all") {
      dict_out = Object.assign({}, dict_out, detail_out);
    } else if (Array.isArray(this._ex_output)) {
      let out_keys = Object.keys(detail_out);
      this._ex_output.forEach((key) => {
        if (out_keys.includes(key)) {
          dict_out[key] = detail_out[key];
        }
      });
    }

    return dict_out;
  }

  dict_results() {
    if (!this._history || this._history.length === 0) {
      console.log("The model has no data.");
      return null;
    }

    const checkWordContain = (word, ...args) => {
      for (let arg of args) {
        if (word.includes(arg)) {
          return true;
        }
      }
      return false;
    };

    let key2keys = {}; // Map for column keys

    for (let key in this._history[0]) {
      let value = this._history[0][key];
      let keys = [];
      try {
        let length = value.length;
        if (typeof value === "string") {
          keys = [key];
        } else if (checkWordContain(key, "sve", "sfv", "superficialvein")) {
          keys = VINDEX["sfvein"].map((i) => `${key}_${BODY_NAMES[i]}`);
        } else if (checkWordContain(key, "ms", "muscle")) {
          keys = VINDEX["muscle"].map((i) => `${key}_${BODY_NAMES[i]}`);
        } else if (checkWordContain(key, "fat")) {
          keys = VINDEX["fat"].map((i) => `${key}_${BODY_NAMES[i]}`);
        } else if (length === 17) {
          keys = BODY_NAMES.map((bn) => `${key}_${bn}`);
        } else {
          keys = Array.from(
            { length: length },
            (_, i) => `${key}_${BODY_NAMES[i]}`,
          );
        }
      } catch (error) {
        if (error instanceof TypeError) {
          keys = [key];
        }
      }
      key2keys[key] = keys;
    }

    let data = [];
    for (let dictout of this._history) {
      let row = {};
      for (let key in dictout) {
        let keys = key2keys[key];
        let values = keys.length === 1 ? [dictout[key]] : dictout[key];
        row = {
          ...row,
          ...Object.fromEntries(keys.map((k, index) => [k, values[index]])),
        };
      }
      data.push(row);
    }

    let out_dict = Object.fromEntries(Object.keys(data[0]).map((k) => [k, []]));
    for (let row of data) {
      for (let k in data[0]) {
        out_dict[k].push(row[k]);
      }
    }

    return out_dict;
  }

  /**
   * Set extra heat gain by tissue name.
   *
   * @param {string} tissue - Tissue name. Can be "core", "skin", "artery"...,
   *                          If you want to set value to head muscle and other segment's core,
   *                          use "all_muscle".
   * @param {(number|number[])} value - Heat gain [W]
   * @returns {number[]} Extra heat gain of model.
   */
  _set_ex_q(tissue, value) {
    this.ex_q[INDEX[tissue]] = value;
    return self.ex_q;
  }

  get tdb() {
    return this._ta;
  }

  set tdb(inp) {
    this._ta = _to17array(inp);
  }

  get tr() {
    return this._tr;
  }

  set tr(inp) {
    this._tr = _to17array(inp);
  }

  get to() {
    const hc = fixed_hc(
      conv_coef(this._posture, this._va, this._ta, this.t_skin),
      self._va,
    );

    const hr = fixed_hr(rad_coef(this._posture));

    return operative_temp(this._ta, this._tr, hc, hr);
  }

  set to(inp) {
    this._ta = _to17array(inp);
    this._tr = _to17array(inp);
  }

  get rh() {
    return this._rh;
  }

  set rh(inp) {
    this._rh = _to17array(inp);
  }

  get v() {
    return this._va;
  }

  set v(inp) {
    this._va = _to17array(inp);
  }

  get posture() {
    return this._posture;
  }

  set posture(inp) {
    if (inp === 0) {
      this._posture = "standing";
    } else if (inp === 1) {
      this._posture = "sitting";
    } else if (inp === 2) {
      this._posture = "lying";
    } else if (typeof inp === "string") {
      const lowerInput = inp.toLowerCase();
      if (lowerInput === "standing") {
        this._posture = "standing";
      } else if (["sitting", "sedentary"].includes(lowerInput)) {
        this._posture = "sitting";
      } else if (["lying", "supine"].includes(lowerInput)) {
        this._posture = "lying";
      }
    } else {
      this._posture = "standing";
      console.log('posture must be 0="standing", 1="sitting" or 2="lying".');
      console.log('posture was set "standing".');
    }
  }

  get clo() {
    return this._clo;
  }

  set clo(inp) {
    this._clo = _to17array(inp);
  }

  get par() {
    return this._par;
  }

  set par(inp) {
    this._par = inp;
  }

  get body_temp() {
    return this._bodytemp;
  }

  set body_temp(inp) {
    this._bodytemp = inp.slice();
  }

  get bsa() {
    return this._bsa.slice();
  }

  get r_t() {
    const hc = fixed_hc(
      conv_coef(this._posture, this._va, this._ta, this.t_skin),
      self._va,
    );

    const hr = fixed_hr(rad_coef(this._posture));

    return dry_r(hc, hr, this._clo);
  }

  get r_et() {
    const hc = fixed_hc(
      conv_coef(this._posture, this._va, this._ta, this.t_skin),
      self._va,
    );

    const hr = fixed_hr(rad_coef(this._posture));

    return wet_r(hc, this._clo, this._iclo);
  }

  get w() {
    const err_cr = subtract(this.t_core, this.setpt_cr);
    const err_sk = subtract(this.t_skin, this.setpt_sk);
    const { wet } = evaporation(
      err_cr,
      err_sk,
      this._ta,
      this._rh,
      this.r_et,
      this._bsa_rate,
      this._age,
    );

    return wet;
  }

  get w_mean() {
    return $average(this.w, JOS3Defaults.local_bsa);
  }

  get t_skin_mean() {
    return divide(
      sum(
        multiply(
          subset(this._bodytemp, index(INDEX["skin"])),
          JOS3Defaults.local_bsa,
        ),
      ),
      sum(JOS3Defaults.local_bsa),
    );
  }

  get t_skin() {
    return $index(this._bodytemp, INDEX["skin"]);
  }

  set t_skin(inp) {
    this._bodytemp[INDEX["skin"]] = _to17array(inp);
  }

  get t_core() {
    return $index(this._bodytemp, INDEX["core"]);
  }

  get t_cb() {
    return this._bodytemp[0];
  }

  get t_artery() {
    return $index(this._bodytemp, INDEX["artery"]);
  }

  get t_vein() {
    return $index(this._bodytemp, INDEX["vein"]);
  }

  get t_superficial_vein() {
    return $index(this._bodytemp, INDEX["sfvein"]);
  }

  get t_muscle() {
    return $index(this._bodytemp, INDEX["muscle"]);
  }

  get t_fat() {
    return $index(this._bodytemp, INDEX["fat"]);
  }

  get body_names() {
    return BODY_NAMES;
  }

  get results() {
    return this.dict_results();
  }

  get bmr() {
    const tcr = basal_met(
      this._height,
      this._weight,
      this._age,
      this._sex,
      this._bmr_equation,
    );
    return tcr / $sum(this.bsa);
  }
}
