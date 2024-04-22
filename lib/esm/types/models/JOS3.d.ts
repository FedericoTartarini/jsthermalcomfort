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
    constructor(height?: number, weight?: number, fat?: number, age?: number, sex?: "male" | "female", ci?: number, bmr_equation?: "harris-benedict" | "harris-benedict_origin" | "japanese" | "ganpule", bsa_equation?: "dubois" | "fujimoto" | "kruazumi" | "takahira", ex_output?: [] | "all");
    _height: number;
    _weight: number;
    _fat: number;
    _age: number;
    _sex: "male" | "female";
    _ci: number;
    _bmr_equation: "harris-benedict" | "harris-benedict_origin" | "japanese" | "ganpule";
    _bsa_equation: "dubois" | "takahira" | "fujimoto" | "kruazumi";
    _ex_output: [] | "all";
    _bsa_rate: number;
    _bsa: math.Matrix;
    _bfb_rate: number;
    _cdt: math.Matrix;
    _cap: number[];
    setpt_cr: math.MathType;
    setpt_sk: math.MathType;
    _bodytemp: math.MathType;
    _ta: math.MathType;
    _tr: math.MathType;
    _rh: math.MathType;
    _va: math.MathType;
    _clo: math.MathType;
    _iclo: math.MathType;
    _par: number;
    _posture: string;
    _hc: any;
    _hr: any;
    ex_q: math.MathCollection;
    _t: number;
    _cycle: number;
    model_name: string;
    options: {
        nonshivering_thermogenesis: boolean;
        cold_acclimated: boolean;
        shivering_threshold: boolean;
        "limit_dshiv/dt": boolean;
        bat_positive: boolean;
        ava_zero: boolean;
        shivering: boolean;
    };
    _history: any[];
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
    private _calculate_operative_temp_when_pmv_is_zero;
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
    private _reset_setpt;
    /**
     * @param inp {number | number[] | object | math.Matrix}
     */
    set to(arg: math.Matrix);
    /**
     * Operative temperature [°C].
     *
     * @return {math.Matrix}
     */
    get to(): math.Matrix;
    /**
     * @param inp {number | number[] | object | math.Matrix}
     */
    set rh(arg: math.Matrix);
    /**
     * Relative humidity [%].
     *
     * @return {math.Matrix}
     */
    get rh(): math.Matrix;
    /**
     * @param inp {number | number[] | object | math.Matrix}
     */
    set v(arg: math.Matrix);
    /**
     * Air velocity [m/s].
     *
     * @return {math.Matrix}
     */
    get v(): math.Matrix;
    /**
     * @param inp {number | number[] | object | math.Matrix}
     */
    set clo(arg: math.Matrix);
    /**
     * Clothing insulation [clo].
     *
     * @return {math.Matrix}
     */
    get clo(): math.Matrix;
    /**
     * @param inp {number}
     */
    set par(arg: number);
    /**
     * Physical activity ratio [-].This equals the ratio of metabolic rate to basal metabolic rate. par of sitting quietly is 1.2.
     *
     * @return {number}
     */
    get par(): number;
    /**
     * Run JOS-3 model.
     *
     * @property {number} times - Number of loops of a simulation.
     * @property {number} [dtime=60] - Time delta in seconds.
     * @property {boolean} [output=true] - If you don't want to record parameters, set False.
     */
    simulate(times: any, dtime?: number, output?: boolean): void;
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
    private _run;
    /**
     * Get results as a dictionary with the model values.
     *
     * @returns {object}
     */
    dict_results(): object;
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
    private _set_ex_q;
    /**
     * @param inp {number | number[] | object | math.Matrix}
     */
    set tdb(arg: math.Matrix);
    /**
     * Dry-bulb air temperature.
     *
     * @return {math.Matrix}
     */
    get tdb(): math.Matrix;
    /**
     * @param inp {number | number[] | object | math.Matrix}
     */
    set tr(arg: math.Matrix);
    /**
     * Mean radiant temperature [°C].
     *
     * @return {math.Matrix}
     */
    get tr(): math.Matrix;
    /**
     * @param inp {number | string}
     */
    set posture(arg: string);
    /**
     * Current JOS3 posture.
     *
     * @return {string}
     */
    get posture(): string;
    /**
     * @param inp {math.Matrix}
     */
    set body_temp(arg: math.Matrix);
    /**
     * All segment temperatures of JOS-3.
     *
     * @return {math.Matrix}
     */
    get body_temp(): math.Matrix;
    /**
     * Body surface areas by local body segments [m2].
     *
     * @return {math.Matrix}
     */
    get bsa(): math.Matrix;
    /**
     * Dry heat resistances between the skin and ambience areas by local body segments [(m2*K)/W].
     *
     * @return {math.Matrix}
     */
    get r_t(): math.Matrix;
    /**
     * w (Evaporative) heat resistances between the skin and ambience areas by local body segments [(m2*kPa)/W].
     *
     * @return {math.Matrix}
     */
    get r_et(): math.Matrix;
    /**
     * Skin wettedness on local body segments [-].
     *
     * @return {math.Matrix}
     */
    get w(): math.Matrix;
    /**
     * Mean skin wettedness of the whole body [-].
     *
     * @return {number}
     */
    get w_mean(): number;
    /**
     * Mean skin temperature of the whole body [°C].
     *
     * @return {number}
     */
    get t_skin_mean(): number;
    /**
     * @param inp {number | number[] | object | math.Matrix}
     */
    set t_skin(arg: math.Matrix);
    /**
     * Skin temperatures by the local body segments [°C].
     *
     * @returns {math.Matrix}
     */
    get t_skin(): math.Matrix;
    /**
     * Skin temperatures by the local body segments [°C].
     *
     * @returns {math.Matrix}
     */
    get t_core(): math.Matrix;
    /**
     * Temperature at central blood pool [°C].
     *
     * @return {number}
     */
    get t_cb(): number;
    /**
     * Arterial temperatures by the local body segments [°C].
     *
     * @return {math.Matrix}
     */
    get t_artery(): math.Matrix;
    /**
     * Vein temperatures by the local body segments [°C].
     *
     * @return {math.Matrix}
     */
    get t_vein(): math.Matrix;
    /**
     * Superficial vein temperatures by the local body segments [°C].
     *
     * @return {math.Matrix}
     */
    get t_superficial_vein(): math.Matrix;
    /**
     * Muscle temperatures of head and pelvis [°C].
     *
     * @return {math.Matrix}
     */
    get t_muscle(): math.Matrix;
    /**
     * Fat temperatures of head and pelvis [°C].
     *
     * @return {math.Matrix}
     */
    get t_fat(): math.Matrix;
    /**
     * JOS3 body names
     *
     * @return {string[]}
     */
    get body_names(): string[];
    /**
     * Results of the model.
     *
     * @return {object}
     */
    get results(): any;
    /**
     * Basal metabolic rate.
     * @returns {number}
     */
    get bmr(): number;
}
import * as math from "mathjs";
//# sourceMappingURL=JOS3.d.ts.map