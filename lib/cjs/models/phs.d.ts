/**
 * @typedef {Object} PhsReturnType
 * @property {number} t_re - rectal temperature, [°C]
 * @property {number} t_sk - skin temperature, [°C]
 * @property {number} t_cr - core temperature, [°C]
 * @property {number} t_cr_eq - core temperature as a function of the metabolic rate, [°C]
 * @property {number} t_sk_t_cr_wg - fraction of the body mass at the skin temperature
 * @property {number} d_lim_loss_50 - maximum allowable exposure time for water loss, mean subject, [minutes]
 * @property {number} d_lim_loss_95 - maximum allowable exposure time for water loss, 95% of the working population, [minutes]
 * @property {number} d_lim_t_re - maximum allowable exposure time for heat storage, [minutes]
 * @property {number} water_loss_watt - maximum water loss in watts, [W]
 * @property {number} water_loss - maximum water loss, [g]
 * @public
 */
/**
 * @typedef {Object} PhsKwargs
 * @property {number} [i_mst=0.38] - static moisture permeability index, [dimensionless]
 * @property {number} [a_p=0.54] - fraction of the body surface covered by the reflective clothing, [dimensionless]
 * @property {0 | 1} [drink=1] - 1 if workers can drink freely, 0 otherwise
 * @property {number} [weight=75] - body weight, [kg]
 * @property {number} [height=1.8] - height, [m]
 * @property {number} [walk_sp=0] - walking speed, [m/s]
 * @property {number} [theta=0] - angle between walking direction and wind direction [degrees]
 * @property {number} [acclimatized=100] - 100 if acclimatized subject, 0 otherwise
 * @property {number} [duration=480] - duration of the work sequence, [minutes]
 * @property {number} [f_r=0.97] - emissivity of the reflective clothing, [dimensionless]
 * @property {number} [t_sk=34.1] - mean skin temperature when worker starts working, [°C]
 * @property {number} [t_cr=36.8] - mean core temperature when worker starts working, [°C]
 * @property {number} [t_re] - mean rectal temperature when worker starts working, [°C]
 * @property {number} [t_cr_eq] -  mean core temperature as a function of met when worker starts working, [°C]
 * @property {number} [sweat_rate=0] - sweat rate
 * @property {boolean} [round=true] - round the result of the PHS model
 * @public
 */
/**
 * @typedef {Object} PhsKwargsRequired
 * @property {number} i_mst
 * @property {number} a_p
 * @property {0 | 1} drink
 * @property {number} weight
 * @property {number} height
 * @property {number} walk_sp
 * @property {number} theta
 * @property {number} acclimatized
 * @property {number} duration
 * @property {number} f_r
 * @property {number} t_sk
 * @property {number} t_cr
 * @property {number} t_re
 * @property {number} t_cr_eq
 * @property {number} sweat_rate
 * @property {boolean} round
 */
/**
 * Calculates the Predicted Heat Strain (PHS) index based in compliace with
 * the ISO 7933:2004 Standard {@link #ref_8|[8]}. The ISO 7933 provides a method for the
 * analytical evaluation and interpretation of the thermal stress experienced
 * by a subject in a hot environment. It describes a method for predicting the
 * sweat rate and the internal core temperature that the human body will
 * develop in response to the working conditions.
 *
 * The PHS model can be used to predict the: heat by respiratory convection, heat flow
 * by respiratory evaporation, steady state mean skin temperature, instantaneous value
 * of skin temperature, heat accumulation associated with the metabolic rate, maximum
 * evaporative heat flow at the skin surface, predicted sweat rate, predicted evaporative
 * heat flow, and rectal temperature.
 *
 * @public
 * @memberof models
 * @docname Predicted Heat Strain (PHS) Index
 *
 * @param {number} tdb - dry bulb air temperature, default in [°C]
 * @param {number} tr - mean radiant temperature, default in [°C]
 * @param {number} v - air speed, default in [m/s]
 * @param {number} rh - relative humidity, [%]
 * @param {number} met - metabolic rate, [W/(m2)]
 * @param {number} clo - clothing insulation, [clo]
 * @param {1 | 2 | 3} posture - a numeric value presenting posture of person [sitting=1, standing=2, crouching=3]
 * @param {number} [wme=0] - external work, [W/(m2)] default 0
 * @param {PhsKwargs} [kwargs] - additional arguments
 *
 * @returns {PhsReturnType} object with results of phs
 *
 * @example
 * import { phs } from "jsthermalcomfort";
 * const results = phs(40, 40, 33.85, 0.3, 150, 0.5, 2);
 * console.log(results); // {t_re: 37.5, d_lim_loss_50: 440, d_lim_loss_95: 298, d_lim_t_re: 480, water_loss: 6166.0}
 */
export function phs(tdb: number, tr: number, v: number, rh: number, met: number, clo: number, posture: 1 | 2 | 3, wme?: number, kwargs?: PhsKwargs): PhsReturnType;
export type PhsReturnType = {
    /**
     * - rectal temperature, [°C]
     */
    t_re: number;
    /**
     * - skin temperature, [°C]
     */
    t_sk: number;
    /**
     * - core temperature, [°C]
     */
    t_cr: number;
    /**
     * - core temperature as a function of the metabolic rate, [°C]
     */
    t_cr_eq: number;
    /**
     * - fraction of the body mass at the skin temperature
     */
    t_sk_t_cr_wg: number;
    /**
     * - maximum allowable exposure time for water loss, mean subject, [minutes]
     */
    d_lim_loss_50: number;
    /**
     * - maximum allowable exposure time for water loss, 95% of the working population, [minutes]
     */
    d_lim_loss_95: number;
    /**
     * - maximum allowable exposure time for heat storage, [minutes]
     */
    d_lim_t_re: number;
    /**
     * - maximum water loss in watts, [W]
     */
    water_loss_watt: number;
    /**
     * - maximum water loss, [g]
     */
    water_loss: number;
};
export type PhsKwargs = {
    /**
     * - static moisture permeability index, [dimensionless]
     */
    i_mst?: number;
    /**
     * - fraction of the body surface covered by the reflective clothing, [dimensionless]
     */
    a_p?: number;
    /**
     * - 1 if workers can drink freely, 0 otherwise
     */
    drink?: 0 | 1;
    /**
     * - body weight, [kg]
     */
    weight?: number;
    /**
     * - height, [m]
     */
    height?: number;
    /**
     * - walking speed, [m/s]
     */
    walk_sp?: number;
    /**
     * - angle between walking direction and wind direction [degrees]
     */
    theta?: number;
    /**
     * - 100 if acclimatized subject, 0 otherwise
     */
    acclimatized?: number;
    /**
     * - duration of the work sequence, [minutes]
     */
    duration?: number;
    /**
     * - emissivity of the reflective clothing, [dimensionless]
     */
    f_r?: number;
    /**
     * - mean skin temperature when worker starts working, [°C]
     */
    t_sk?: number;
    /**
     * - mean core temperature when worker starts working, [°C]
     */
    t_cr?: number;
    /**
     * - mean rectal temperature when worker starts working, [°C]
     */
    t_re?: number;
    /**
     * -  mean core temperature as a function of met when worker starts working, [°C]
     */
    t_cr_eq?: number;
    /**
     * - sweat rate
     */
    sweat_rate?: number;
    /**
     * - round the result of the PHS model
     */
    round?: boolean;
};
export type PhsKwargsRequired = {
    i_mst: number;
    a_p: number;
    drink: 0 | 1;
    weight: number;
    height: number;
    walk_sp: number;
    theta: number;
    acclimatized: number;
    duration: number;
    f_r: number;
    t_sk: number;
    t_cr: number;
    t_re: number;
    t_cr_eq: number;
    sweat_rate: number;
    round: boolean;
};
export type Speeds = {
    v: number;
    walk_speed: number;
};
export type VariablesForLoop = {
    sw_max: number;
    w_max: number;
    fcl: number;
    i_cl_dyn: number;
    r_t_dyn: number;
    c_res: number;
    e_res: number;
    hc_dyn: number;
    aux_r: number;
    f_cl_r: number;
    a_dubois: number;
    sp_heat: number;
    d_lim_t_re: number;
    d_lim_loss_50: number;
    d_lim_loss_95: number;
    d_max_50: number;
    d_max_95: number;
    const_t_eq: number;
    const_t_sk: number;
    const_sw: number;
};
//# sourceMappingURL=phs.d.ts.map