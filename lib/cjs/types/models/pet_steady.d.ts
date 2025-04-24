/**
 * @typedef {object} PetSteadyResult
 * @property {number} pet - Steady-state PET under the given ambient conditions
 * @public
 */
/**
 * The steady physiological equivalent temperature (PET) is calculated using the Munich
 * Energy-balance Model for Individuals (MEMI), which simulates the human body's thermal
 * circumstances in a medically realistic manner. PET is defined as the air temperature
 * at which, in a typical indoor setting the heat budget of the human body is balanced
 * with the same core and skin temperature as under the complex outdoor conditions to be
 * assessed {@link #ref_20|[20]}.
 *
 * The following assumptions are made for the indoor reference climate: tdb = tr, v = 0.1
 * m/s, water vapour pressure = 12 hPa, clo = 0.9 clo, and met = 1.37 met + basic
 * metabolism.
 *
 * PET allows a layperson to compare the total effects of complex thermal circumstances
 * outside with his or her own personal experience indoors in this way. This function
 * solves the heat balances without accounting for heat storage in the human body.
 *
 * The PET was originally proposed by Hoppe {@link #ref_20|[20]}. In 2018, Walther and Goestchel {@link #ref_21|[21]}
 * proposed a correction of the original model, purging the errors in the
 * PET calculation routine, and implementing a state-of-the-art vapour diffusion model.
 * Walther and Goestchel (2018) model is therefore used to calculate the PET.
 *
 * **Warning:** Some tests are currently failing for this function. Please refer to the test
 * suite or the project's issue tracker for more details.
 *
 * @public
 * @memberof models
 * @docname Physiological Equivalent Temperature (PET)
 *
 * @param {number} tdb - dry bulb air temperature, [°C]
 * @param {number} tr - mean radiant temperature, [°C]
 * @param {number} v - air speed, [m/s]
 * @param {number} rh - relative humidity, [%]
 * @param {number} met - metabolic rate, [met]
 * @param {number} clo - clothing insulation, [clo]
 * @param {number} [p_atm=1013.25] - atmospheric pressure, default value 1013.25 [hPa]
 * @param {1 | 2 | 3} [position=1] - position of the individual (1=sitting, 2=standing, 3=standing, forced convection)
 * @param {number} [age=23] - age in years
 * @param {1 | 2} [sex=1] - male (1) or female (2).
 * @param {number} [weight=75] - body mass, [kg]
 * @param {number} [height=1.8] - height, [m]
 * @param {number} [wme=0] - external work, [W/(m2)]
 *
 * @returns {PetSteadyResult} set containing results for the model
 *
 * @example
 * const result = pet_steady(20, 20, 50, 0.15, 1.37, 0.5);
 * console.log(result); // {pet: 18.85}
 */
export function pet_steady(tdb: number, tr: number, v: number, rh: number, met: number, clo: number, p_atm?: number, position?: 1 | 2 | 3, age?: number, sex?: 1 | 2, weight?: number, height?: number, wme?: number): PetSteadyResult;
export type PetSteadyResult = {
    /**
     * - Steady-state PET under the given ambient conditions
     */
    pet: number;
};
export type NewtonRaphsonFunction = (: [number, number, number]) => [number, number, number];
export type NewtonRaphsonSingleFunction = (: [number]) => [number];
export type VasomotricitytRet = {
    /**
     * - Blood flow rate, [kg/m2/h]
     */
    m_blood: number;
    /**
     * - repartition of body mass between core and skin [].
     */
    alpha: number;
};
//# sourceMappingURL=pet_steady.d.ts.map