/**
 * @typedef {Object} HeatwaveReturnType
 * @property {number} e_skin – Total rate of evaporative heat loss from skin, [W/m2]. Equal to e_rsw + e_diff
 * @property {number} e_rsw  – Rate of evaporative heat loss from sweat evaporation, [W/m2]
 * @property {number} e_diff  – Rate of evaporative heat loss from moisture diffused through the skin [W/m2]
 * @property {number} e_max  – Maximum rate of evaporative heat loss from skin, [W/m2]
 * @property {number} q_sensible  – Sensible heat loss from skin, [W/m2]
 * @property {number} q_skin  – Total rate of heat loss from skin, [W/m2]. Equal to q_sensible + e_skin
 * @property {number} q_res  – Total rate of heat loss through respiration, [W/m2]
 * @property {number} t_core  – Core temperature, [°C]
 * @property {number} t_skin  – Skin temperature, [°C]
 * @property {number} m_bl  – Skin blood flow, [kg/h/m2]
 * @property {number} m_rsw  – Rate at which regulatory sweat is generated, [kg/h/m2]
 * @property {number} w  – Skin wettedness, adimensional. Ranges from 0 and 1
 * @property {number} w_max  – Skin wettedness (w) practical upper limit, adimensional. Ranges from 0 and 1
 * @property {boolean | undefined} heat_strain  – True if the model predict that the person may be experiencing heat strain, undefined if the result of two nodes model is not a number
 * @property {boolean | undefined} heat_strain_blood_flow  – True if heat strain is caused by skin blood flow (m_bl) reaching its maximum value, undefined if the result of two nodes model is not a number
 * @property {boolean | undefined} heat_strain_w  – True if heat strain is caused by skin wettedness (w) reaching its maximum value, undefined if the result of two nodes model is not a number
 * @property {boolean | undefined} heat_strain_sweating  – True if heat strain is caused by regulatory sweating (m_rsw) reaching its maximum value, undefined if the result of two nodes model is not a number
 * @public
 */
/**
 * @typedef {Object} HeatwaveKwargs - a keywords argument set containing the additional arguments for use fans heatwave
 * @property {number} [max_sweating] - max sweating, [mL/h/m2] default 500
 * @property {boolean} [round=true] - if True rounds output value, if False it does not round it, default True
 * @property {boolean} [limit_inputs=true]  – By default, if the inputs are outsude the following limits the function returns nan. If
 * False returns values regardless of the input values, default True
 *
 * The applicability limits are 20 < tdb [°C] < 50, 20 < tr [°C] < 50, 0.1 < v [m/s] < 4.5, 0.7 < met [met] < 2, and 0 < clo [clo] < 1.
 * @public
 */
/**
 * @typedef {Object} HeatwaveKwargsRequired
 * @property {boolean} round
 * @property {number} max_sweating
 * @property {boolean} limit_inputs
 */
/**
 *
 * It helps you to estimate if the conditions you have selected would cause heat strain.
 * This occurs when either the following variables reaches its maximum value:
 *
 *  - m_rsw Rate at which regulatory sweat is generated, [mL/h/m2].
 *  - w : Skin wettedness, adimensional. Ranges from 0 and 1.
 *  - m_bl : Skin blood flow [kg/h/m2].
 *
 * @public
 * @memberof models
 * @docname Use Fans During Heatwaves
 *
 * @param {number} tdb dry bulb air temperature, default in [°C] in [°F] if units = ‘IP’
 * @param {number} tr mean radiant temperature, default in [°C] in [°F] if units = ‘IP’
 * @param {number} v air speed, default in [m/s] in [fps] if units = ‘IP’
 * @param {number} rh relative humidity, [%]
 * @param {number} met metabolic rate, [met]
 * @param {number} clo clothing insulation, [clo]
 * @param {number} [wme=0] external work, [met] default 0
 * @param {number} [body_surface_area] body surface area, default value 1.8258 [m2] in [ft2] if units = ‘IP’
 *
 * The body surface area can be calculated using the function pythermalcomfort.utilities.body_surface_area().
 * @param {number} [p_atm] atmospheric pressure, default value 101325 [Pa] in [atm] if units = ‘IP’
 * @param {"standing" | "sitting"} [body_position="standing"] select either “sitting” or “standing”
 * @param {"SI" | "IP"} [units="SI"] select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {number} [max_skin_blood_flow=80] maximum blood flow from the core to the skin
 * @param {HeatwaveKwargs} [kwargs]
 *
 * @returns {HeatwaveReturnType} object with results of use fans during heatwave
 *
 * @example
 * const results = use_fans_heatwaves(25, 25, 0.1, 50, 1.2, 0.5);
 * console.log(results); //
 * {
    e_skin: 18.1,
    e_rsw: 10.0,
    e_max: 145.0,
    q_sensible: 45.7,
    q_skin: 63.8,
    q_res: 5.2,
    t_core: 36.9,
    t_skin: 33.8,
    m_bl: 13.6,
    m_rsw: 14.6,
    w: 0.1,
    w_max: 0.7,
    heat_strain_blood_flow: 0.0,
    heat_strain_w: 0.0,
    heat_strain_sweating: 0.0,
    heat_strain: 0.0
    }
 *
 */
export function use_fans_heatwaves(tdb: number, tr: number, v: number, rh: number, met: number, clo: number, wme?: number, body_surface_area?: number, p_atm?: number, body_position?: "standing" | "sitting", units?: "SI" | "IP", max_skin_blood_flow?: number, kwargs?: HeatwaveKwargs): HeatwaveReturnType;
export type HeatwaveReturnType = {
    /**
     * – Total rate of evaporative heat loss from skin, [W/m2]. Equal to e_rsw + e_diff
     */
    e_skin: number;
    /**
     * – Rate of evaporative heat loss from sweat evaporation, [W/m2]
     */
    e_rsw: number;
    /**
     * – Rate of evaporative heat loss from moisture diffused through the skin [W/m2]
     */
    e_diff: number;
    /**
     * – Maximum rate of evaporative heat loss from skin, [W/m2]
     */
    e_max: number;
    /**
     * – Sensible heat loss from skin, [W/m2]
     */
    q_sensible: number;
    /**
     * – Total rate of heat loss from skin, [W/m2]. Equal to q_sensible + e_skin
     */
    q_skin: number;
    /**
     * – Total rate of heat loss through respiration, [W/m2]
     */
    q_res: number;
    /**
     * – Core temperature, [°C]
     */
    t_core: number;
    /**
     * – Skin temperature, [°C]
     */
    t_skin: number;
    /**
     * – Skin blood flow, [kg/h/m2]
     */
    m_bl: number;
    /**
     * – Rate at which regulatory sweat is generated, [kg/h/m2]
     */
    m_rsw: number;
    /**
     * – Skin wettedness, adimensional. Ranges from 0 and 1
     */
    w: number;
    /**
     * – Skin wettedness (w) practical upper limit, adimensional. Ranges from 0 and 1
     */
    w_max: number;
    /**
     * – True if the model predict that the person may be experiencing heat strain, undefined if the result of two nodes model is not a number
     */
    heat_strain: boolean | undefined;
    /**
     * – True if heat strain is caused by skin blood flow (m_bl) reaching its maximum value, undefined if the result of two nodes model is not a number
     */
    heat_strain_blood_flow: boolean | undefined;
    /**
     * – True if heat strain is caused by skin wettedness (w) reaching its maximum value, undefined if the result of two nodes model is not a number
     */
    heat_strain_w: boolean | undefined;
    /**
     * – True if heat strain is caused by regulatory sweating (m_rsw) reaching its maximum value, undefined if the result of two nodes model is not a number
     */
    heat_strain_sweating: boolean | undefined;
};
/**
 * - a keywords argument set containing the additional arguments for use fans heatwave
 */
export type HeatwaveKwargs = {
    /**
     * - max sweating, [mL/h/m2] default 500
     */
    max_sweating?: number;
    /**
     * - if True rounds output value, if False it does not round it, default True
     */
    round?: boolean;
    /**
     * – By default, if the inputs are outsude the following limits the function returns nan. If
     * False returns values regardless of the input values, default True
     *
     * The applicability limits are 20 < tdb [°C] < 50, 20 < tr [°C] < 50, 0.1 < v [m/s] < 4.5, 0.7 < met [met] < 2, and 0 < clo [clo] < 1.
     */
    limit_inputs?: boolean;
};
export type HeatwaveKwargsRequired = {
    round: boolean;
    max_sweating: number;
    limit_inputs: boolean;
};
//# sourceMappingURL=use_fans_heatwave.d.ts.map