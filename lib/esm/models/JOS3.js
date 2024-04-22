import JOS3Defaults from "../jos3_functions/JOS3Defaults.js";
import { bsa_rate } from "../jos3_functions/bsa_rate.js";
import { local_bsa } from "../jos3_functions/local_bsa.js";
import { bfb_rate } from "../jos3_functions/bfb_rate.js";
import { conductance } from "../jos3_functions/conductance.js";
import { capacity } from "../jos3_functions/capacity.js";
import * as math from "mathjs";
import { BODY_NAMES, INDEX, local_arr, NUM_NODES, vessel_blood_flow, VINDEX, whole_body, } from "../jos3_functions/matrix.js";
import { set_pre_shiv, shivering, } from "../jos3_functions/thermoregulation/shivering.js";
import { basal_met } from "../jos3_functions/thermoregulation/basal_met.js";
import { pmv } from "./pmv.js";
import { fixed_hc } from "../jos3_functions/thermoregulation/fixed_hc.js";
import { conv_coef } from "../jos3_functions/thermoregulation/conv_coef.js";
import { fixed_hr } from "../jos3_functions/thermoregulation/fixed_hr.js";
import { rad_coef } from "../jos3_functions/thermoregulation/rad_coef.js";
import { operative_temp } from "../jos3_functions/thermoregulation/operative_temp.js";
import { dry_r } from "../jos3_functions/thermoregulation/dry_r.js";
import { wet_r } from "../jos3_functions/thermoregulation/wet_r.js";
import { antoine, evaporation, } from "../jos3_functions/thermoregulation/evaporation.js";
import { skin_blood_flow } from "../jos3_functions/thermoregulation/skin_blood_flow.js";
import { ava_blood_flow } from "../jos3_functions/thermoregulation/ava_blood_flow.js";
import { nonshivering } from "../jos3_functions/thermoregulation/nonshivering.js";
import { local_mbase } from "../jos3_functions/thermoregulation/local_mbase.js";
import { sum_m } from "../jos3_functions/thermoregulation/sum_m.js";
import { local_q_work } from "../jos3_functions/thermoregulation/local_q_work.js";
import { cr_ms_fat_blood_flow } from "../jos3_functions/thermoregulation/cr_ms_fat_blood_flow.js";
import { resp_heat_loss } from "../jos3_functions/thermoregulation/resp_heat_loss.js";
import { sum_bf } from "../jos3_functions/thermoregulation/sum_bf.js";
import Object from "lodash/object.js";
/**
 * Create an array of shape (17,) with the given input.
 *
 * @param inp {number | number[] | object}
 * @returns {math.Matrix}
 */
function _to17array(inp) {
    if (typeof inp === "number") {
        return math.multiply(math.ones(17), inp);
    }
    if (math.isCollection(inp)) {
        const size = math.size(inp).toArray();
        if (!math.equal(size, [17])) {
            throw new Error("Input list is not of length 17");
        }
        return math.matrix(inp);
    }
    if (typeof inp === "object") {
        return math.matrix(BODY_NAMES.map((name) => inp[name]));
    }
    throw new Error("Unsupported input type. Supported types: number");
}
/**
 * JOS-3 model simulates human thermal physiology including skin
 * temperature, core temperature, sweating rate, etc. for the whole body and
 * 17 local body parts.
 *
 * This model was developed at Shin-ichi Tanabe Laboratory, Waseda University
 * and was derived from 65 Multi-Node model (https://doi.org/10.1016/S0378-7788(02)00014-2)
 * and JOS-2 model (https://doi.org/10.1016/j.buildenv.2013.04.013).
 *
 * To use this model, create an instance of the JOS3 class with optional body parameters
 * such as body height, weight, age, sex, etc.
 *
 * Environmental conditions such as air temperature, mean radiant temperature, air velocity, etc.
 * can be set using the setter methods. (ex. X.tdb, X.tr X.v)
 * If you want to set the different conditions in each body part, set them
 * as a 17 lengths of list, dictionary, or numpy array format.
 *
 * List or numpy array format input must be 17 lengths and means the order of "head", "neck", "chest",
 * "back", "pelvis", "left_shoulder", "left_arm", "left_hand", "right_shoulder", "right_arm",
 * "right_hand", "left_thigh", "left_leg", "left_foot", "right_thigh", "right_leg" and "right_foot".
 *
 * The model output includes local and mean skin temperature, local core temperature,
 * local and mean skin wettedness, and heat loss from the skin etc.
 * The model output can be accessed using "dict_results()" method and be converted to a csv file
 * using "to_csv" method.
 * Each output parameter also can be accessed using getter methods.
 * (ex. X.t_skin, X.t_skin_mean, X.t_core)
 *
 * If you use this package, please cite us as follows and mention the version of pythermalcomfort used:
 * Y. Takahashi, A. Nomoto, S. Yoda, R. Hisayama, M. Ogata, Y. Ozeki, S. Tanabe,
 * Thermoregulation Model JOS-3 with New Open Source Code, Energy & Buildings (2020),
 * doi: https://doi.org/10.1016/j.enbuild.2020.110575
 *
 * Note: To maintain consistency in variable names for jsthermalcomfort and pythermalcomfort,
 * some variable names differ from those used in the original paper.
 *
 * @public
 * @memberof models
 * @docname JOS3
 */
export class JOS3 {
    /**
     * Initialize a new instance of JOS3 class, which is designed to model
     * and simulate various physiological parameters related to human
     * thermoregulation.
     *
     * This class uses mathematical models to calculate and predict
     * body temperature, basal metabolic rate, body surface area, and
     * other related parameters.
     *
     * @param {number} [height] - body height, in [m].
     * @param {number} [weight] - body weight, in [kg].
     * @param {number} [fat] - fat percentage, in [%].
     * @param {number} [age] - age, in [years].
     * @param {"male" | "female"} [sex] - sex.
     * @param {number} [ci] - Cardiac index, in [L/min/m2].
     * @param {"harris-benedict" | "harris-benedict_origin" | "japanese" | "ganpule"} [bmr_equation] - The equation used
     * to calculate basal metabolic rate (BMR).
     * @param {"dubois" | "fujimoto" | "kruazumi" | "takahira"} [bsa_equation] - The equation used to calculate body
     * surface area (bsa).
     * @param {[] | "all"} [ex_output] - This is used when you want to display results other than the default output
     * parameters (ex.skin temperature); by default, JOS outputs only the most necessary parameters in order to reduce
     * the computational load.
     */
    constructor(height = JOS3Defaults.height, weight = JOS3Defaults.weight, fat = JOS3Defaults.body_fat, age = JOS3Defaults.age, sex = JOS3Defaults.sex, ci = JOS3Defaults.cardiac_index, bmr_equation = JOS3Defaults.bmr_equation, bsa_equation = JOS3Defaults.bsa_equation, ex_output = []) {
        // Initialize basic attributes
        this._height = height;
        this._weight = weight;
        this._fat = fat;
        this._age = age;
        this._sex = sex;
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
        this.setpt_cr = math.multiply(math.ones(17), JOS3Defaults.core_temperature);
        this.setpt_sk = math.multiply(math.ones(17), JOS3Defaults.skin_temperature);
        // Initialize body temperature [°C]
        this._bodytemp = math.multiply(math.ones(NUM_NODES), JOS3Defaults.other_body_temperature);
        // Initialize environmental conditions and other factors
        // (Default values of input conditions)
        this._ta = math.multiply(math.ones(17), JOS3Defaults.dry_bulb_air_temperature);
        this._tr = math.multiply(math.ones(17), JOS3Defaults.mean_radiant_temperature);
        this._rh = math.multiply(math.ones(17), JOS3Defaults.relative_humidity);
        this._va = math.multiply(math.ones(17), JOS3Defaults.air_speed);
        this._clo = math.multiply(math.ones(17), JOS3Defaults.clothing_insulation);
        this._iclo = math.multiply(math.ones(17), JOS3Defaults.clothing_vapor_permeation_efficiency);
        this._par = JOS3Defaults.physical_activity_ratio;
        this._posture = JOS3Defaults.posture;
        this._hc = null; // Convective heat transfer coefficient
        this._hr = null; // Radiative heat transfer coefficient
        this.ex_q = math.zeros(NUM_NODES); // External heat gain
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
        const dictout = this._reset_setpt(JOS3Defaults.physical_activity_ratio);
        this._history.push(dictout);
    }
    /**
     * Calculate operative temperature [°C] when PMV=0.
     *
     * @private
     *
     * @param va {number} - Air velocity [m/s].
     * @param rh {number} - Relative humidity [%].
     * @param met {number} - Metabolic rate [met].
     * @param clo {number} - Clothing insulation [clo].
     *
     * @returns {number}
     */
    _calculate_operative_temp_when_pmv_is_zero(va = JOS3Defaults.air_speed, rh = JOS3Defaults.relative_humidity, met = JOS3Defaults.metabolic_rate, clo = JOS3Defaults.clothing_insulation) {
        let to = 28; // initial operative temperature
        // Iterate until the PMV (Predicted Mean Vote) value is less than 0.001
        let vpmv;
        for (let i = 0; i < 100; i++) {
            vpmv = pmv(to, to, va, rh, met, clo);
            // Break the loop if the absolute value of PMV is less than 0.001
            if (math.abs(vpmv) < 0.001) {
                break;
            }
            // Update the temperature based on the PMV value
            to = to - vpmv / 3;
        }
        return to;
    }
    /**
     * Reset set-point temperatures under steady state calculation.
     * Set-point temperatures are hypothetical core or skin temperatures in a thermally neutral state
     * when at rest (similar to room set-point temperature for air conditioning).
     * This function is used during initialization to calculate the set-point temperatures as a reference for thermoregulation.
     * Be careful, input parameters (tdb, tr, rh, v, clo, par) and body temperatures are also reset.
     *
     * @private
     *
     * @param par {number} - Physical activity ratio.
     */
    _reset_setpt(par = JOS3Defaults.physical_activity_ratio) {
        // Set operative temperature under PMV=0 environment
        // 1 met = 58.15 W/m2
        const w_per_m2_to_met = 1 / 58.15; // unit converter W/m2 to met
        const met = this.bmr * par * w_per_m2_to_met; // [met]
        this.to = this._calculate_operative_temp_when_pmv_is_zero(undefined, undefined, met, undefined);
        this.rh = JOS3Defaults.relative_humidity;
        this.v = JOS3Defaults.air_speed;
        this.clo = JOS3Defaults.clothing_insulation;
        this.par = par;
        // Steady-calculatio
        this.options["ava_zero"] = true;
        let dict_out;
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
     * Run JOS-3 model.
     *
     * @property {number} times - Number of loops of a simulation.
     * @property {number} [dtime=60] - Time delta in seconds.
     * @property {boolean} [output=true] - If you don't want to record parameters, set False.
     */
    simulate(times, dtime = 60, output = true) {
        // Loop through the simulation for the given number of times
        for (let i = 0; i < times; i++) {
            // Increment the elapsed time by the time delta
            this._t += dtime;
            // Increment the cycle counter
            this._cycle += 1;
            // Execute the simulation step
            const dict_data = this._run(dtime, undefined, output);
            // If output is True, append the results to the history
            if (output) {
                this._history.push(dict_data);
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
     * @private
     *
     * @param {number} dtime - Time delta [sec].
     * @param {boolean} passive - If you run a passive model.
     * @param {boolean} output - If you don't need parameters.
     *
     * @returns {object}
     */
    _run(dtime = 60, passive = false, output = true) {
        // Compute convective and radiative heat transfer coefficient [W/(m2*K)]
        // based on posture, air velocity, air temperature, and skin temperature.
        // Manual setting is possible by setting self._hc and self._hr.
        // Compute heat and evaporative heat resistance [m2.K/W], [m2.kPa/W]
        // Get core and skin temperatures
        let tcr = this.t_core;
        let tsk = this.t_skin;
        // Convective and radiative heat transfer coefficients [W/(m2*K)]
        let hc = fixed_hc(conv_coef(this._posture, this._va, this._ta, tsk), this._va);
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
        // ------------------------------------------------------------------
        // Thermoregulation
        // 1) Sweating
        // 2) Vasoconstriction, Vasodilation
        // 3) Shivering and non-shivering thermogenesis
        // ------------------------------------------------------------------
        // Compute the difference between the set-point temperature and body temperatures
        // and other thermoregulation parameters.
        // If running a passive model, the set-point temperature of thermoregulation is
        // set to the current body temperature.
        // set-point temperature for thermoregulation
        let setpt_cr = passive ? tcr.clone() : this.setpt_cr.clone();
        let setpt_sk = passive ? tsk.clone() : this.setpt_sk.clone();
        // Error signal = Difference between set-point and body temperatures
        let err_cr = math.subtract(tcr, setpt_cr);
        let err_sk = math.subtract(tsk, setpt_sk);
        // SWEATING THERMOREGULATION
        // Skin wettedness [-], e_skin, e_max, e_sweat [W]
        // Calculate skin wettedness, sweating heat loss, maximum sweating rate, and total sweat rate
        let { wet, e_sk, e_max, e_sweat } = evaporation(err_cr, err_sk, tsk, this._ta, this._rh, r_et, this._height, this._weight, this._bsa_equation, this._age);
        // VASOCONSTRICTION, VASODILATION
        // Calculate skin blood flow and basal skin blood flow [L/h]
        let bf_skin = skin_blood_flow(err_cr, err_sk, this._height, this._weight, this._bsa_equation, this._age, this._ci);
        // Calculate hands and feet's AVA blood flow [L/h]
        let { bf_ava_hand, bf_ava_foot } = ava_blood_flow(err_cr, err_sk, this._height, this._weight, this._bsa_equation, this._age, this._ci);
        if (this.options["ava_zero"] && passive) {
            bf_ava_hand = 0;
            bf_ava_foot = 0;
        }
        // SHIVERING AND NON-SHIVERING
        // Calculate shivering thermogenesis [W]
        let q_shiv = shivering(err_cr, err_sk, tcr, tsk, this._height, this._weight, this._bsa_equation, this._age, this._sex, dtime, this.options);
        // Calculate non-shivering thermogenesis (NST) [W]
        let q_nst = this.options["nonshivering_thermogenesis"]
            ? nonshivering(err_sk, this._height, this._weight, this._bsa_equation, this._age, this.options["cold_acclimated"], this.options["bat_positive"])
            : math.zeros(17);
        // ------------------------------------------------------------------
        // Thermogenesis
        // ------------------------------------------------------------------
        // Calculate local basal metabolic rate (BMR) [W]
        let q_bmr_local = local_mbase(this._height, this._weight, this._age, this._sex, this._bmr_equation);
        // Calculate overall basal metabolic rate (BMR) [W]
        let q_bmr_total = math.sum(q_bmr_local.map((q) => math.sum(q)));
        // Calculate thermogenesis by work [W]
        let q_work = local_q_work(q_bmr_total, this._par);
        // Calculate the sum of thermogenesis in core, muscle, fat, skin [W]
        let { q_thermogenesis_core, q_thermogenesis_muscle, q_thermogenesis_fat, q_thermogenesis_skin, } = sum_m(q_bmr_local.map((c) => c.clone()), q_work, q_shiv, q_nst);
        let q_thermogenesis_total = math.sum(q_thermogenesis_core) +
            math.sum(q_thermogenesis_muscle) +
            math.sum(q_thermogenesis_fat) +
            math.sum(q_thermogenesis_skin);
        // ------------------------------------------------------------------
        // Others
        // ------------------------------------------------------------------
        // Calculate blood flow in core, muscle, fat [L/h]
        let { bf_core, bf_muscle, bf_fat } = cr_ms_fat_blood_flow(q_work, q_shiv, this._height, this._weight, this._bsa_equation, this._age, this._ci);
        // Calculate heat loss by respiratory
        let p_a = math.dotDivide(math.dotMultiply(this._ta.map(antoine), this._rh), 100);
        let { res_sh, res_lh } = resp_heat_loss(this._ta.get([0]), p_a.get([0]), q_thermogenesis_total);
        // Calculate sensible heat loss [W]
        let shl_sk = math.dotMultiply(math.dotDivide(math.subtract(tsk, to), r_t), this._bsa);
        // Calculate cardiac output [L/h]
        let co = sum_bf(bf_core, bf_muscle, bf_fat, bf_skin, bf_ava_hand, bf_ava_foot);
        // Calculate weight loss rate by evaporation [g/sec]
        let wlesk = math.dotDivide(math.add(e_sweat, math.dotMultiply(0.06, e_max)), 2418);
        let wleres = res_lh / 2418;
        // ------------------------------------------------------------------
        // Matrix
        // This code section is focused on constructing and calculating
        // various matrices required for modeling the thermoregulation
        // of the human body.
        // Since JOS-3 has 85 thermal nodes, the determinant of 85*85 is to be solved.
        // ------------------------------------------------------------------
        // Matrix A = Matrix for heat exchange due to blood flow and conduction occurring between tissues
        // (85, 85,) ndarray
        // Calculates the blood flow in arteries and veins for core, muscle, fat, skin,
        // and arteriovenous anastomoses (AVA) in hands and feet,
        // and combines them into two arrays:
        // 1) bf_local for the local blood flow and 2) bf_whole for the whole-body blood flow.
        // These arrays are then combined to form arr_bf.
        let { bf_art, bf_vein } = vessel_blood_flow(bf_core, bf_muscle, bf_fat, bf_skin, bf_ava_hand, bf_ava_foot);
        let bf_local = local_arr(bf_core, bf_muscle, bf_fat, bf_skin, bf_ava_hand, bf_ava_foot);
        let bf_whole = whole_body(bf_art, bf_vein, bf_ava_hand, bf_ava_foot);
        let arr_bf = math.zeros(NUM_NODES, NUM_NODES);
        arr_bf = math.add(arr_bf, bf_local);
        arr_bf = math.add(arr_bf, bf_whole);
        // Adjusts the units of arr_bf from [W/K] to [/sec] and then to [-]
        // by dividing by the heat capacity self._cap and multiplying by the time step dtime.
        arr_bf = math.dotDivide(arr_bf, math.reshape(this._cap, [NUM_NODES, 1])); // Change unit [W/K] to [/sec]
        arr_bf = math.dotMultiply(arr_bf, dtime); // Change unit [/sec] to [-]
        // Performs similar unit conversions for the convective heat transfer coefficient array arr_cdt
        // (also divided by self._cap and multiplied by dtime).
        let arr_cdt = this._cdt.clone();
        arr_cdt = math.dotDivide(arr_cdt, math.reshape(this._cap, [NUM_NODES, 1])); // Change unit [W/K] to [/sec]
        arr_cdt = math.dotMultiply(arr_cdt, dtime); // Change unit [/sec] to [-]
        // Matrix B = Matrix for heat transfer between skin and environment
        let arr_b = math.zeros(NUM_NODES);
        arr_b = math.subset(arr_b, math.index(INDEX["skin"]), math.add(math.subset(arr_b, math.index(INDEX["skin"])), math.dotMultiply(math.dotDivide(1, r_t), this._bsa)));
        arr_b = math.dotDivide(arr_b, this._cap); // Change unit [W/K] to [/sec]
        arr_b = math.dotMultiply(arr_b, dtime); // Change unit [/sec] to [-]
        // Calculates the off-diagonal and diagonal elements of the matrix A,
        // which represents the heat transfer coefficients between different parts of the body,
        // and combines them to form the full matrix A (arrA).
        // Then, the inverse of matrix A is computed (arrA_inv).
        let arr_a_tria = math.dotMultiply(math.add(arr_cdt, arr_bf), -1);
        let arr_a_dia = math.add(arr_cdt, arr_bf);
        arr_a_dia = math.add(math.sum(arr_a_dia, 1), arr_b);
        arr_a_dia = math.diag(arr_a_dia);
        arr_a_dia = math.add(arr_a_dia, math.identity(NUM_NODES));
        let arr_a = math.add(arr_a_tria, arr_a_dia);
        let arr_a_inv = math.inv(arr_a);
        // Matrix Q = Matrix for heat generation rate from thermogenesis, respiratory, sweating,
        // and extra heat gain processes in different body parts.
        // Matrix Q [W] / [J/K] * [sec] = [-]
        // Thermogensis
        let arr_q = math.zeros(NUM_NODES);
        arr_q = math.subset(arr_q, math.index(INDEX["core"]), math.add(math.subset(arr_q, math.index(INDEX["core"])), q_thermogenesis_core));
        arr_q = math.subset(arr_q, math.index(INDEX["muscle"]), math.add(math.subset(arr_q, math.index(INDEX["muscle"])), math.subset(q_thermogenesis_muscle, math.index(VINDEX["muscle"]))));
        arr_q = math.subset(arr_q, math.index(INDEX["fat"]), math.add(math.subset(arr_q, math.index(INDEX["fat"])), math.subset(q_thermogenesis_fat, math.index(VINDEX["fat"]))));
        arr_q = math.subset(arr_q, math.index(INDEX["skin"]), math.add(math.subset(arr_q, math.index(INDEX["skin"])), q_thermogenesis_skin));
        // Respiratory [W]
        arr_q.set([INDEX["core"][2]], arr_q.get([INDEX["core"][2]]) - (res_sh + res_lh)); // chest core
        // Sweating [W]
        arr_q = math.subset(arr_q, math.index(INDEX["skin"]), math.subtract(math.subset(arr_q, math.index(INDEX["skin"])), e_sk));
        // Extra heat gain [W]
        arr_q = math.add(arr_q, this.ex_q.clone());
        arr_q = math.dotDivide(arr_q, this._cap); // Change unit [W]/[J/K] to [K/sec]
        arr_q = math.dotMultiply(arr_q, dtime); // Change unit [K/sec] to [K]
        // Boundary batrix [°C]
        let arr_to = math.zeros(NUM_NODES);
        arr_to = math.subset(arr_to, math.index(INDEX["skin"]), math.add(math.subset(arr_to, math.index(INDEX["skin"])), to));
        // Combines the current body temperature, the boundary matrix, and the heat generation matrix
        // to calculate the new body temperature distribution (arr).
        let arr = math.add(math.add(this._bodytemp, math.dotMultiply(arr_b, arr_to)), arr_q);
        // ------------------------------------------------------------------
        // New body temp. [°C]
        // ------------------------------------------------------------------
        this._bodytemp = math.multiply(arr_a_inv, arr);
        // ------------------------------------------------------------------
        // Output parameters
        // ------------------------------------------------------------------
        let dict_out = {};
        if (output) {
            dict_out["cycle_time"] = this._cycle;
            dict_out["simulation_time"] = this._t;
            dict_out["dt"] = dtime;
            dict_out["t_skin_mean"] = this.t_skin_mean;
            dict_out["t_skin"] = this.t_skin.toArray();
            dict_out["t_core"] = this.t_core.toArray();
            dict_out["w_mean"] =
                math.sum(math.dotMultiply(wet, JOS3Defaults.local_bsa)) /
                    math.sum(JOS3Defaults.local_bsa);
            dict_out["w"] = wet.toArray();
            dict_out["weight_loss_by_evap_and_res"] = math.sum(wlesk) + wleres;
            dict_out["cardiac_output"] = co;
            dict_out["q_thermogenesis_total"] = q_thermogenesis_total;
            dict_out["q_res"] = res_sh + res_lh;
            dict_out["q_skin2env"] = math.add(shl_sk, e_sk).toArray();
        }
        let detail_out = {};
        if (this._ex_output && output) {
            detail_out["name"] = this.model_name;
            detail_out["height"] = this._height;
            detail_out["weight"] = this._weight;
            detail_out["bsa"] = this._bsa.toArray();
            detail_out["fat"] = this._fat;
            detail_out["sex"] = this._sex;
            detail_out["age"] = this._age;
            detail_out["t_core_set"] = setpt_cr.toArray();
            detail_out["t_skin_set"] = setpt_sk.toArray();
            detail_out["t_cb"] = this.t_cb;
            detail_out["t_artery"] = this.t_artery.toArray();
            detail_out["t_vein"] = this.t_vein.toArray();
            detail_out["t_superficial_vein"] = this.t_superficial_vein.toArray();
            detail_out["t_muscle"] = this.t_muscle.toArray();
            detail_out["t_fat"] = this.t_fat.toArray();
            detail_out["to"] = to.toArray();
            detail_out["r_t"] = r_t.toArray();
            detail_out["r_et"] = r_et.toArray();
            detail_out["tdb"] = this._ta.clone().toArray();
            detail_out["tr"] = this._tr.clone().toArray();
            detail_out["rh"] = this._rh.clone().toArray();
            detail_out["v"] = this._va.clone().toArray();
            detail_out["par"] = this._par;
            detail_out["clo"] = this._clo.clone().toArray();
            detail_out["e_skin"] = e_sk.toArray();
            detail_out["e_max"] = e_max.toArray();
            detail_out["e_sweat"] = e_sweat.toArray();
            detail_out["bf_core"] = bf_core.toArray();
            detail_out["bf_muscle"] = math
                .subset(bf_muscle, math.index(VINDEX["muscle"]))
                .toArray();
            detail_out["bf_fat"] = math
                .subset(bf_fat, math.index(VINDEX["fat"]))
                .toArray();
            detail_out["bf_skin"] = bf_skin.toArray();
            detail_out["bf_ava_hand"] = bf_ava_hand;
            detail_out["bf_ava_foot"] = bf_ava_foot;
            detail_out["q_bmr_core"] = q_bmr_local[0].toArray();
            detail_out["q_bmr_muscle"] = math
                .subset(q_bmr_local[1], math.index(VINDEX["muscle"]))
                .toArray();
            detail_out["q_bmr_fat"] = math
                .subset(q_bmr_local[2], math.index(VINDEX["fat"]))
                .toArray();
            detail_out["q_bmr_skin"] = q_bmr_local[3].toArray();
            detail_out["q_work"] = q_work.toArray();
            detail_out["q_shiv"] = q_shiv.toArray();
            detail_out["q_nst"] = q_nst.toArray();
            detail_out["q_thermogenesis_core"] = q_thermogenesis_core.toArray();
            detail_out["q_thermogenesis_muscle"] = math
                .subset(q_thermogenesis_muscle, math.index(VINDEX["muscle"]))
                .toArray();
            detail_out["q_thermogenesis_fat"] = math
                .subset(q_thermogenesis_fat, math.index(VINDEX["fat"]))
                .toArray();
            detail_out["q_thermogenesis_skin"] = q_thermogenesis_skin.toArray();
            dict_out["q_skin2env_sensible"] = shl_sk.toArray();
            dict_out["q_skin2env_latent"] = e_sk.toArray();
            dict_out["q_res_sensible"] = res_sh;
            dict_out["q_res_latent"] = res_lh;
        }
        if (this._ex_output === "all") {
            dict_out = { ...dict_out, ...detail_out };
        }
        else if (Array.isArray(this._ex_output)) {
            const out_keys = Object.keys(detail_out);
            for (const key in this._ex_output) {
                if (out_keys.includes(key)) {
                    dict_out[key] = detail_out[key];
                }
            }
        }
        return dict_out;
    }
    /**
     * Get results as a dictionary with the model values.
     *
     * @returns {object}
     */
    dict_results() {
        if (!this._history || this._history.length === 0) {
            console.log("The model has no data.");
            return null;
        }
        const checkWordContain = (word, ...args) => {
            return args.some((arg) => word.includes(arg));
        };
        let key2keys = {}; // Column keys
        for (let [key, value] of Object.entries(this._history[0])) {
            let keys;
            if (value.length !== undefined) {
                if (typeof value === "string") {
                    keys = [key]; // string is iter. Convert to list without suffix
                }
                else if (checkWordContain(key, "sve", "sfv", "superficialvein")) {
                    keys = VINDEX["sfvein"].map((i) => `${key}_${BODY_NAMES[i]}`);
                }
                else if (checkWordContain(key, "ms", "muscle")) {
                    keys = VINDEX["muscle"].map((i) => `${key}_${BODY_NAMES[i]}`);
                }
                else if (checkWordContain(key, "fat")) {
                    keys = VINDEX["fat"].map((i) => `${key}_${BODY_NAMES[i]}`);
                }
                else if (value.length === 17) {
                    keys = BODY_NAMES.map((bn) => `${key}_${bn}`);
                }
                else {
                    keys = Array.from({ length: value.length }, (_, i) => `${key}_${BODY_NAMES[i]}`);
                }
            }
            else {
                keys = [key];
            }
            key2keys[key] = keys;
        }
        let data = this._history.map((dictout) => {
            let row = {};
            for (let [key, value] of Object.entries(dictout)) {
                let keys = key2keys[key];
                let values = keys.length === 1 ? [value] : value;
                keys.forEach((k, i) => {
                    row[k] = values[i];
                });
            }
            return row;
        });
        let outDict = {};
        Object.keys(data[0]).forEach((key) => {
            outDict[key] = data.map((row) => row[key]);
        });
        return outDict;
    }
    /**
     * Set extra heat gain by tissue name.
     *
     * @private
     *
     * @param {string} tissue - Tissue name. "core", "skin", or "artery".... If you set value to head muscle and other segment's core, set "all_muscle".
     * @param {number | math.MathCollection} value - Heat gain [W]
     *
     * @return {math.MathCollection} Extra heat gain of model.
     */
    _set_ex_q(tissue, value) {
        this.ex_q = math.subset(this.ex_q, math.index(INDEX[tissue]), value);
        return this.ex_q;
    }
    /**
     * Dry-bulb air temperature.
     *
     * @return {math.Matrix}
     */
    get tdb() {
        return this._ta;
    }
    /**
     * @param inp {number | number[] | object | math.Matrix}
     */
    set tdb(inp) {
        this._ta = _to17array(inp);
    }
    /**
     * Mean radiant temperature [°C].
     *
     * @return {math.Matrix}
     */
    get tr() {
        return this._tr;
    }
    /**
     * @param inp {number | number[] | object | math.Matrix}
     */
    set tr(inp) {
        this._tr = _to17array(inp);
    }
    /**
     * Operative temperature [°C].
     *
     * @return {math.Matrix}
     */
    get to() {
        const hc = fixed_hc(conv_coef(this._posture, this._va, this._ta, this.t_skin), this._va);
        const hr = fixed_hr(rad_coef(this._posture));
        return operative_temp(this._ta, this._tr, hc, hr);
    }
    /**
     * @param inp {number | number[] | object | math.Matrix}
     */
    set to(inp) {
        this._ta = _to17array(inp);
        this._tr = _to17array(inp);
    }
    /**
     * Relative humidity [%].
     *
     * @return {math.Matrix}
     */
    get rh() {
        return this._rh;
    }
    /**
     * @param inp {number | number[] | object | math.Matrix}
     */
    set rh(inp) {
        this._rh = _to17array(inp);
    }
    /**
     * Air velocity [m/s].
     *
     * @return {math.Matrix}
     */
    get v() {
        return this._va;
    }
    /**
     * @param inp {number | number[] | object | math.Matrix}
     */
    set v(inp) {
        this._va = _to17array(inp);
    }
    /**
     * Current JOS3 posture.
     *
     * @return {string}
     */
    get posture() {
        return this._posture;
    }
    /**
     * @param inp {number | string}
     */
    set posture(inp) {
        if (inp === 0) {
            this._posture = "standing";
        }
        else if (inp === 1) {
            this._posture = "sitting";
        }
        else if (inp === 2) {
            this._posture = "lying";
        }
        else if (inp.toLowerCase() === "standing") {
            this._posture = "standing";
        }
        else if (["sitting", "sedentary"].includes(inp.toLowerCase())) {
            this._posture = "sitting";
        }
        else if (["lying", "supine"].includes(inp.toLowerCase())) {
            this._posture = "lying";
        }
        else {
            this._posture = "standing";
            console.log('posture must be 0="standing", 1="sitting" or 2="lying".');
            console.log('posture was set "standing".');
        }
    }
    /**
     * Clothing insulation [clo].
     *
     * @return {math.Matrix}
     */
    get clo() {
        return this._clo;
    }
    /**
     * @param inp {number | number[] | object | math.Matrix}
     */
    set clo(inp) {
        this._clo = _to17array(inp);
    }
    /**
     * Physical activity ratio [-].This equals the ratio of metabolic rate to basal metabolic rate. par of sitting quietly is 1.2.
     *
     * @return {number}
     */
    get par() {
        return this._par;
    }
    /**
     * @param inp {number}
     */
    set par(inp) {
        this._par = inp;
    }
    /**
     * All segment temperatures of JOS-3.
     *
     * @return {math.Matrix}
     */
    get body_temp() {
        return this._bodytemp;
    }
    /**
     * @param inp {math.Matrix}
     */
    set body_temp(inp) {
        this._bodytemp = inp.clone();
    }
    /**
     * Body surface areas by local body segments [m2].
     *
     * @return {math.Matrix}
     */
    get bsa() {
        return this._bsa.clone();
    }
    /**
     * Dry heat resistances between the skin and ambience areas by local body segments [(m2*K)/W].
     *
     * @return {math.Matrix}
     */
    get r_t() {
        const hc = fixed_hc(conv_coef(this._posture, this._va, this._ta, this.t_skin), this._va);
        const hr = fixed_hr(rad_coef(this._posture));
        return dry_r(hc, hr, this._clo);
    }
    /**
     * w (Evaporative) heat resistances between the skin and ambience areas by local body segments [(m2*kPa)/W].
     *
     * @return {math.Matrix}
     */
    get r_et() {
        const hc = fixed_hc(conv_coef(this._posture, this._va, this._ta, this.t_skin), this._va);
        return wet_r(hc, this._clo, this._iclo);
    }
    /**
     * Skin wettedness on local body segments [-].
     *
     * @return {math.Matrix}
     */
    get w() {
        const err_cr = math.subtract(this.t_core, this.setpt_cr);
        const err_sk = math.subtract(this.t_skin, this.setpt_sk);
        const { wet } = evaporation(err_cr, err_sk, this.t_skin, this._ta, this._rh, this.r_et, this._bsa_rate, this._age);
        return wet;
    }
    /**
     * Mean skin wettedness of the whole body [-].
     *
     * @return {number}
     */
    get w_mean() {
        const wet = this.w;
        const bsa_sum = math.sum(JOS3Defaults.local_bsa);
        return math.sum(math.dotMultiply(wet, JOS3Defaults.local_bsa)) / bsa_sum;
    }
    /**
     * Mean skin temperature of the whole body [°C].
     *
     * @return {number}
     */
    get t_skin_mean() {
        return (math.sum(math.dotMultiply(math.subset(this._bodytemp, math.index(INDEX["skin"])), JOS3Defaults.local_bsa)) / math.sum(JOS3Defaults.local_bsa));
    }
    /**
     * Skin temperatures by the local body segments [°C].
     *
     * @returns {math.Matrix}
     */
    get t_skin() {
        return math.subset(this._bodytemp, math.index(INDEX["skin"]));
    }
    /**
     * @param inp {number | number[] | object | math.Matrix}
     */
    set t_skin(inp) {
        this._bodytemp = math.subset(this._bodytemp, math.index(INDEX["skin"]), _to17array(inp));
    }
    /**
     * Skin temperatures by the local body segments [°C].
     *
     * @returns {math.Matrix}
     */
    get t_core() {
        return math.subset(this._bodytemp, math.index(INDEX["core"]));
    }
    /**
     * Temperature at central blood pool [°C].
     *
     * @return {number}
     */
    get t_cb() {
        return this._bodytemp.get([0]);
    }
    /**
     * Arterial temperatures by the local body segments [°C].
     *
     * @return {math.Matrix}
     */
    get t_artery() {
        return math.subset(this._bodytemp, math.index(INDEX["artery"]));
    }
    /**
     * Vein temperatures by the local body segments [°C].
     *
     * @return {math.Matrix}
     */
    get t_vein() {
        return math.subset(this._bodytemp, math.index(INDEX["vein"]));
    }
    /**
     * Superficial vein temperatures by the local body segments [°C].
     *
     * @return {math.Matrix}
     */
    get t_superficial_vein() {
        return math.subset(this._bodytemp, math.index(INDEX["sfvein"]));
    }
    /**
     * Muscle temperatures of head and pelvis [°C].
     *
     * @return {math.Matrix}
     */
    get t_muscle() {
        return math.subset(this._bodytemp, math.index(INDEX["muscle"]));
    }
    /**
     * Fat temperatures of head and pelvis [°C].
     *
     * @return {math.Matrix}
     */
    get t_fat() {
        return math.subset(this._bodytemp, math.index(INDEX["fat"]));
    }
    /**
     * JOS3 body names
     *
     * @return {string[]}
     */
    get body_names() {
        return BODY_NAMES;
    }
    /**
     * Results of the model.
     *
     * @return {object}
     */
    get results() {
        return this.dict_results();
    }
    /**
     * Basal metabolic rate.
     * @returns {number}
     */
    get bmr() {
        const tcr = basal_met(this._height, this._weight, this._age, this._sex, this._bmr_equation);
        return tcr / math.sum(this._bsa);
    }
}
