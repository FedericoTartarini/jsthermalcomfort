/**
 * @typedef {Object} TwoNodesReturnType
 * @property {number} e_skin – Total rate of evaporative heat loss from skin, [W/m2]. Equal to e_rsw + e_diff
 * @property {number} e_rsw  – Rate of evaporative heat loss from sweat evaporation, [W/m2]
 * @property {number} e_max  – Maximum rate of evaporative heat loss from skin, [W/m2]
 * @property {number} q_sensible  – Sensible heat loss from skin, [W/m2]
 * @property {number} q_skin  – Total rate of heat loss from skin, [W/m2]. Equal to q_sensible + e_skin
 * @property {number} q_res  – Total rate of heat loss through respiration, [W/m2]
 * @property {number} t_core  – Core temperature, [°C]
 * @property {number} t_skin  – Skin temperature, [°C]
 * @property {number} m_bl  – Skin blood flow, [kg/h/m2]
 * @property {number} m_rsw  – Rate at which regulatory sweat is generated, [kg/h/m2]
 * @property {number} w  – Skin wettedness, adimensional. Ranges from 0 and 1.
 * @property {number} w_max  – Skin wettedness (w) practical upper limit, adimensional. Ranges from 0 and 1.
 * @property {number} set  – Standard Effective Temperature (SET)
 * @property {number} et  – New Effective Temperature (ET)
 * @property {number} pmv_gagge  – PMV Gagge
 * @property {number} pmv_set  – PMV SET
 * @property {number} disc  – Thermal discomfort
 * @property {number} t_sens  – Predicted Thermal Sensation
 * @public
 */
/**
 * @typedef {Object} TwoNodesKwargs - a keywords argument set containing the additional arguments for Two nodes model calculation
 * @property {boolean} [round=true] - round the result of two nodes model
 * @property {boolean} [calculate_ce=false] - select if SET is used to calculate Cooling Effect
 * @property {number} [max_sweating] - maximum rate at which regulatory sweat is generated, [kg/h/m2]
 * @property {number} [w_max]  – maximum skin wettedness (w) adimensional. Ranges from 0 and 1
 * @public
 */
/**
 * @typedef {Object} TwoNodesKwargsRequired
 * @property {boolean} round
 * @property {boolean} calculate_ce
 * @property {number} max_sweating
 * @property {number} w_max
 */
/**
 *
 * Two-node model of human temperature regulation Gagge et al. (1986).
 *
 * {@link #ref_10|[10]} This model can be used to calculate a variety of indices, including:
 *
 *  - Gagge’s version of Fanger’s Predicted Mean Vote (PMV). This function uses
 * the Fanger’s PMV equations but it replaces the heat loss and gain terms
 * with those calculated by the two node model developed by Gagge et al. (1986) {@link #ref_10|[10]}.
 *  - PMV SET and the predicted thermal sensation based on SET {@link #ref_10|[10]}. This function is
 * similar in all aspects to the pythermalcomfort.models.pmv_gagge(). However, it uses the
 * pythermalcomfort.models.set() equation to calculate the dry heat loss by convection.
 *  - Thermal discomfort (DISC) as the relative thermoregulatory strain necessary
 * to restore a state of comfort and thermal equilibrium by sweating {@link #ref_10|[10]}. DISC is
 * described numerically as: comfortable and pleasant (0), slightly uncomfortable but acceptable (1),
 * uncomfortable and unpleasant (2), very uncomfortable (3), limited tolerance (4), and intolerable (S).
 * The range of each category is ± 0.5 numerically. In the cold, the classical negative category
 * descriptions used for Fanger’s PMV apply {@link #ref_10|[10]}.
 *  - Heat gains and losses via convection, radiation and conduction.
 *  - The Standard Effective Temperature (SET)
 *  - The New Effective Temperature (ET)
 *  - The Predicted Thermal Sensation (TSENS)
 *  - The Predicted Percent Dissatisfied Due to Draft (PD)
 *  - Predicted Percent Satisfied With the Level of Air Movement” (PS)
 *
 * @public
 * @memberof models
 * @docname Gagge et al. two-node model
 *
 * @see {@link two_nodes_array} for a version that supports arrays
 *
 * @param {number} tdb Dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'.
 * @param {number} tr Mean radiant temperature, default in [°C]
 * @param {number} v Air speed, default in [m/s]
 * @param {number} rh Relative humidity, [%].
 * @param {number} met Metabolic rate, [W/(m2)]
 * @param {number} clo Clothing insulation, [clo]
 * @param {number} [wme=0] External work, [W/(m2)] default 0
 * @param {number} [body_surface_area=1.8258] Body surface area, default value 1.8258 [m2] in [ft2] if units = ‘IP’
 * @param {number} [p_atmospheric=101325] Atmospheric pressure, default value 101325 [Pa] in [atm] if units = ‘IP’
 * @param {"standing" | "sitting"} [body_position="standing"] Select either “sitting” or “standing”
 * @param {number} [max_skin_blood_flow=80] Maximum blood flow from the core to the skin, [kg/h/m2] default 80
 * @param {TwoNodesKwargs} [kwargs]
 *
 * @returns {TwoNodesReturnType} object with results of two_nodes
 *
 * @example
 * const results = two_nodes(25, 25, 0.3, 50, 1.2, 0.5);
 * console.log(results); // {
  e_skin: 16.2,
  e_rsw: 7,
  e_max: 159.9,
  q_sensible: 47.6,
  q_skin: 63.8,
  q_res: 5.2,
  t_core: 36.9,
  t_skin: 33.7,
  m_bl: 12.9,
  m_rsw: 10.3,
  w: 0.1,
  w_max: 0.6,
  set: 23.6,
  et: 25,
  pmv_gagge: 0.1,
  pmv_set: -0,
  disc: 0.1,
  t_sens: 0.1
}
 *
 */
export function two_nodes(tdb: number, tr: number, v: number, rh: number, met: number, clo: number, wme?: number, body_surface_area?: number, p_atmospheric?: number, body_position?: "standing" | "sitting", max_skin_blood_flow?: number, kwargs?: TwoNodesKwargs): TwoNodesReturnType;
/**
 * @typedef {Object} TwoNodesArrayReturnType
 * @property {number[]} e_skin – Array of total rate of evaporative heat loss from skin, [W/m2]. Equal to e_rsw + e_diff
 * @property {number[]} e_rsw  – Array of rate of evaporative heat loss from sweat evaporation, [W/m2]
 * @property {number[]} e_max  – Array of maximum rate of evaporative heat loss from skin, [W/m2]
 * @property {number[]} q_sensible  – Array of sensible heat loss from skin, [W/m2]
 * @property {number[]} q_skin  – Array of total rate of heat loss from skin, [W/m2]. Equal to q_sensible + e_skin
 * @property {number[]} q_res  – Array of total rate of heat loss through respiration, [W/m2]
 * @property {number[]} t_core  – Array of core temperature, [°C]
 * @property {number[]} t_skin  – Array of skin temperature, [°C]
 * @property {number[]} m_bl  – Array of skin blood flow, [kg/h/m2]
 * @property {number[]} m_rsw  – Array of rate at which regulatory sweat is generated, [kg/h/m2]
 * @property {number[]} w  – Array of skin wettedness, adimensional. Ranges from 0 and 1.
 * @property {number[]} w_max  – Array of skin wettedness (w) practical upper limit, adimensional. Ranges from 0 and 1.
 * @property {number[]} set  – Array of standard Effective Temperature (SET)
 * @property {number[]} et  – Array of new Effective Temperature (ET)
 * @property {number[]} pmv_gagge  – Array of PMV Gagge
 * @property {number[]} pmv_set  – Array of PMV SET
 * @property {number[]} disc  – Array of Thermal discomfort
 * @property {number[]} t_sens  – Array of Predicted Thermal Sensation
 * @public
 */
/**
 * @typedef {Object} TwoNodesArrayKwargs
 * @property {boolean} [round=true]
 * @property {boolean} [calculate_ce=false]
 * @property {number[]} [max_sweating]
 * @property {number[]} [w_max]
 * @public
 */
/**
 * @typedef {Object} TwoNodesArrayKwargsRequired
 * @property {boolean} round
 * @property {boolean} calculate_ce
 * @property {number[]} max_sweating
 * @property {number[]} w_max
 */
/**
 *
 * Two nodes model of human temperature regulation Gagge et al. when the input parameters are arrays.
 *
 * {@link #ref_10|[10]} This model can be used to calculate a variety of indices, including:
 *
 *  - Gagge’s version of Fanger’s Predicted Mean Vote (PMV). This function uses
 * the Fanger’s PMV equations but it replaces the heat loss and gain terms
 * with those calculated by the two node model developed by Gagge et al. (1986) {@link #ref_10|[10]}.
 *  - PMV SET and the predicted thermal sensation based on SET {@link #ref_10|[10]}. This function is
 * similar in all aspects to the pythermalcomfort.models.pmv_gagge(). However, it uses the
 * pythermalcomfort.models.set() equation to calculate the dry heat loss by convection.
 *  - Thermal discomfort (DISC) as the relative thermoregulatory strain necessary
 * to restore a state of comfort and thermal equilibrium by sweating {@link #ref_10|[10]}. DISC is
 * described numerically as: comfortable and pleasant (0), slightly uncomfortable but acceptable (1),
 * uncomfortable and unpleasant (2), very uncomfortable (3), limited tolerance (4), and intolerable (S).
 * The range of each category is ± 0.5 numerically. In the cold, the classical negative category
 * descriptions used for Fanger’s PMV apply {@link #ref_10|[10]}.
 *  - Heat gains and losses via convection, radiation and conduction.
 *  - The Standard Effective Temperature (SET)
 *  - The New Effective Temperature (ET)
 *  - The Predicted Thermal Sensation (TSENS)
 *  - The Predicted Percent Dissatisfied Due to Draft (PD)
 *  - Predicted Percent Satisfied With the Level of Air Movement” (PS)
 *
 * @public
 * @memberof models
 * @docname Gagge et al. two-node model (array version)
 *
 * @see {@link two_nodes} for a version that supports scalar arguments
 *
 * @param {number[]} tdbArray Dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'.
 * @param {number[]} trArray Mean radiant temperature, default in [°C]
 * @param {number[]} vArray Air speed, default in [m/s]
 * @param {number[]} rhArray Relative humidity, [%].
 * @param {number[]} metArray Metabolic rate, [W/(m2)]
 * @param {number[]} cloArray Clothing insulation, [clo]
 * @param {number[]} wmeArray External work, [W/(m2)] default 0
 * @param {number[]} bodySurfaceArray Body surface area, default value 1.8258 [m2] in [ft2] if units = ‘IP’
 * @param {number[]} pAtmArray Atmospheric pressure, default value 101325 [Pa] in [atm] if units = ‘IP’
 * @param {"standing" | "sitting"} bodyPositionArray Select either “sitting” or “standing”
 * @param {number[]} maxSkinBloodFlowArray Maximum blood flow from the core to the skin, [kg/h/m2] default 80
 * @param {TwoNodesKwargs} [kwargs]
 *
 * @returns {TwoNodesArrayReturnType} object with results of two_nodes_array
 *
 * @example
 * const results = two_nodes_array([25,30], [25,35], [0.3,0.5], [50,60], [1.2,1.5], [0.5, 0.3], [0], [1.8258], [101325], ["standing"], [90])
 * console.log(results); // {
  e_skin: [ 16.2, 60.4 ],
  e_rsw: [ 7, 51.9 ],
  e_max: [ 159.9, 193.8 ],
  q_sensible: [ 47.6, 21.1 ],
  q_skin: [ 63.8, 81.5 ],
  q_res: [ 5.2, 5 ],
  t_core: [ 36.9, 37 ],
  t_skin: [ 33.7, 35.1 ],
  m_bl: [ 12.9, 31.6 ],
  m_rsw: [ 10.3, 76.3 ],
  w: [ 0.1, 0.3 ],
  w_max: [ 0.6, 0.6 ],
  set: [ 23.6, 29.3 ],
  et: [ 25, 32.5 ],
  pmv_gagge: [ 0.1, 1.6 ],
  pmv_set: [ -0, 1.1 ],
  disc: [ 0.1, 1.9 ],
  t_sens: [ 0.1, 1.4 ]
}
 *
 */
export function two_nodes_array(tdbArray: number[], trArray: number[], vArray: number[], rhArray: number[], metArray: number[], cloArray: number[], wmeArray: number[], bodySurfaceArray: number[], pAtmArray: number[], bodyPositionArray: "standing" | "sitting", maxSkinBloodFlowArray: number[], kwargs?: TwoNodesKwargs): TwoNodesArrayReturnType;
/**
 * Round all elments in a given array to the given precision.
 *
 * @param {number[]} array - the array to round
 * @param {number} precision - the number of decimal places to round to
 * @returns the rounded result
 */
export function roundArray(array: number[], precision: number): number[];
export type TwoNodesReturnType = {
    /**
     * – Total rate of evaporative heat loss from skin, [W/m2]. Equal to e_rsw + e_diff
     */
    e_skin: number;
    /**
     * – Rate of evaporative heat loss from sweat evaporation, [W/m2]
     */
    e_rsw: number;
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
     * – Skin wettedness, adimensional. Ranges from 0 and 1.
     */
    w: number;
    /**
     * – Skin wettedness (w) practical upper limit, adimensional. Ranges from 0 and 1.
     */
    w_max: number;
    /**
     * – Standard Effective Temperature (SET)
     */
    set: number;
    /**
     * – New Effective Temperature (ET)
     */
    et: number;
    /**
     * – PMV Gagge
     */
    pmv_gagge: number;
    /**
     * – PMV SET
     */
    pmv_set: number;
    /**
     * – Thermal discomfort
     */
    disc: number;
    /**
     * – Predicted Thermal Sensation
     */
    t_sens: number;
};
/**
 * - a keywords argument set containing the additional arguments for Two nodes model calculation
 */
export type TwoNodesKwargs = {
    /**
     * - round the result of two nodes model
     */
    round?: boolean;
    /**
     * - select if SET is used to calculate Cooling Effect
     */
    calculate_ce?: boolean;
    /**
     * - maximum rate at which regulatory sweat is generated, [kg/h/m2]
     */
    max_sweating?: number;
    /**
     * – maximum skin wettedness (w) adimensional. Ranges from 0 and 1
     */
    w_max?: number;
};
export type TwoNodesKwargsRequired = {
    round: boolean;
    calculate_ce: boolean;
    max_sweating: number;
    w_max: number;
};
export type TwoNodesArrayReturnType = {
    /**
     * – Array of total rate of evaporative heat loss from skin, [W/m2]. Equal to e_rsw + e_diff
     */
    e_skin: number[];
    /**
     * – Array of rate of evaporative heat loss from sweat evaporation, [W/m2]
     */
    e_rsw: number[];
    /**
     * – Array of maximum rate of evaporative heat loss from skin, [W/m2]
     */
    e_max: number[];
    /**
     * – Array of sensible heat loss from skin, [W/m2]
     */
    q_sensible: number[];
    /**
     * – Array of total rate of heat loss from skin, [W/m2]. Equal to q_sensible + e_skin
     */
    q_skin: number[];
    /**
     * – Array of total rate of heat loss through respiration, [W/m2]
     */
    q_res: number[];
    /**
     * – Array of core temperature, [°C]
     */
    t_core: number[];
    /**
     * – Array of skin temperature, [°C]
     */
    t_skin: number[];
    /**
     * – Array of skin blood flow, [kg/h/m2]
     */
    m_bl: number[];
    /**
     * – Array of rate at which regulatory sweat is generated, [kg/h/m2]
     */
    m_rsw: number[];
    /**
     * – Array of skin wettedness, adimensional. Ranges from 0 and 1.
     */
    w: number[];
    /**
     * – Array of skin wettedness (w) practical upper limit, adimensional. Ranges from 0 and 1.
     */
    w_max: number[];
    /**
     * – Array of standard Effective Temperature (SET)
     */
    set: number[];
    /**
     * – Array of new Effective Temperature (ET)
     */
    et: number[];
    /**
     * – Array of PMV Gagge
     */
    pmv_gagge: number[];
    /**
     * – Array of PMV SET
     */
    pmv_set: number[];
    /**
     * – Array of Thermal discomfort
     */
    disc: number[];
    /**
     * – Array of Predicted Thermal Sensation
     */
    t_sens: number[];
};
export type TwoNodesArrayKwargs = {
    round?: boolean;
    calculate_ce?: boolean;
    max_sweating?: number[];
    w_max?: number[];
};
export type TwoNodesArrayKwargsRequired = {
    round: boolean;
    calculate_ce: boolean;
    max_sweating: number[];
    w_max: number[];
};
//# sourceMappingURL=two_nodes.d.ts.map