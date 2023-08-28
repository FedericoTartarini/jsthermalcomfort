import {
    units_converter,
    _ankle_draft_compliance,
    check_standard_compliance,
    _ashrae_compliance,
    _iso7933_compliance
  } from "../src/utilities";
import {
    p_sat_torr
} from "../src/psychrometrics"

/**
 * @typedef {Object} TwoNodesReturnType
 * @property {number} e_skin – Total rate of evaporative heat loss from skin, [W/m2]. Equal to e_rsw + e_diff
 * @property {number} e_rsw (float or array-like) – Rate of evaporative heat loss from sweat evaporation, [W/m2]
 * @property {number} e_diff (float or array-like) – Rate of evaporative heat loss from moisture diffused through the skin, [W/m2]
 * @property {number} e_max (float or array-like) – Maximum rate of evaporative heat loss from skin, [W/m2]
 * @property {number} q_sensible (float or array-like) – Sensible heat loss from skin, [W/m2]
 * @property {number} q_skin (float or array-like) – Total rate of heat loss from skin, [W/m2]. Equal to q_sensible + e_skin
 * @property {number} q_res (float or array-like) – Total rate of heat loss through respiration, [W/m2]
 * @property {number} t_core (float or array-like) – Core temperature, [°C]
 * @property {number} t_skin (float or array-like) – Skin temperature, [°C]
 * @property {number} m_bl (float or array-like) – Skin blood flow, [kg/h/m2]
 * @property {number} m_rsw (float or array-like) – Rate at which regulatory sweat is generated, [kg/h/m2]
 * @property {number} w (float or array-like) – Skin wettedness, adimensional. Ranges from 0 and 1.
 * @property {number} w_max (float or array-like) – Skin wettedness (w) practical upper limit, adimensional. Ranges from 0 and 1.
 * @property {number} set (float or array-like) – Standard Effective Temperature (SET)
 * @property {number} et (float or array-like) – New Effective Temperature (ET)
 * @property {number} pmv_gagge (float or array-like) – PMV Gagge
 * @property {number} pmv_set (float or array-like) – PMV SET
 * @property {number} pd (float or array-like) – Predicted Percent Dissatisfied Due to Draft”
 * @property {number} ps (float or array-like) – Predicted Percent Satisfied With the Level of Air Movement
 * @property {number} disc (float or array-like) – Thermal discomfort
 * @property {number} t_sens (float or array-like) – Predicted Thermal Sensation
 */


/**
 * Two-node model of human temperature regulation: 
 * this model it can be used to calculate a variety of indices, including:
 * Gagge’s version of Fanger’s Predicted Mean Vote (PMV). This function uses
 * the Fanger’s PMV equations but it replaces the heat loss and gain terms 
 * with those calculated by the two node model PMV SET and the predicted 
 * thermal sensation based on SET. This function is similar in all aspects 
 * to the pythermalcomfort.models.pmv_gagge() however, it uses the 
 * pythermalcomfort.models.set() equation to calculate the dry heat loss by 
 * convection.
 * Thermal discomfort (DISC) as the relative thermoregulatory strain necessary 
 * to restore a state of comfort and thermal equilibrium by sweating. DISC is 
 * described numerically as: comfortable and pleasant (0), slightly 
 * uncomfortable but acceptable (1), uncomfortable and unpleasant (2), 
 * very uncomfortable (3), limited tolerance (4), and intolerable (S). 
 * The range of each category is ± 0.5 numerically. In the cold, the classical 
 * negative category descriptions used for Fanger’s PMV apply.
 * Heat gains and losses via convection, radiation and conduction.
 * The Standard Effective Temperature (SET)
 * The New Effective Temperature (ET)
 * The Predicted Thermal Sensation (TSENS)
 * The Predicted Percent Dissatisfied Due to Draft (PD)
 * Predicted Percent Satisfied With the Level of Air Movement” (PS)
 * 
 * @param {number} tdb Dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'.
 * @param {number} tr Mean radiant temperature, default in [°C]
 * @param {number} v Air speed, default in [m/s]
 * @param {number} rh Relative humidity, [%].
 * @param {number} met Metabolic rate, [W/(m2)]
 * @param {number} clo Clothing insulation, [clo]
 * @param {number} wme External work, [W/(m2)] default 0
 * @param {number} body_surface_area Body surface area, default value 1.8258 [m2] in [ft2] if units = ‘IP’
 * @param {number} p_atm Atmospheric pressure, default value 101325 [Pa] in [atm] if units = ‘IP’
 * @param {"standing" | "sitting"} body_position Select either “sitting” or “standing”
 * @param {number} max_skin_blood_flow Maximum blood flow from the core to the skin, [kg/h/m2] default 80
 * @param  {...any} kwargs 
 * @returns {TwoNodesReturnType} object with results of two_nodes
 * 
 * @example
 * const results = two_nodes(25, 25, 0.3, 50, 1.2, 0.5);
 * console.log(results); // {e_skin: 16.2, e_rsw: 7.0, e_max: 159.9, q_sensible: 47.6, q_skin: 63.8, q_res: 5.2, 
 * t_core: 36.9, t_skin: 33.7, m_bl: 12.9, m_rsw: 10.3, w: 0.1, w_max: 0.6, _set: 23.6, et: 25.0, pmv_gagge: 0.1, 
 * pmv_set: -0.0, disc: 0.1, t_sens: 0.1}
 * 
 */
export function two_nodes(
    tdb, 
    tr, 
    v, 
    rh, 
    met, 
    clo, 
    wme = 0, 
    body_surface_area = 1.8258, 
    p_atm = 101325, 
    body_position = 'standing', 
    max_skin_blood_flow = 90, 
    ...kwargs
){
    const default_kwargs = {
        round: true,
        calculate_ce: false,
        max_sweating: 500,
        w_max: false,
    };
    
    let kwargs = { ...default_kwargs, ...kwargs };

    const tdbArr = [...tdb];
    const trArr = [...tr];
    const vArr = [...v];
    const rhArr = [...rh];
    const metArr = [...met];
    const cloArr = [...clo];
    const wmeArr = [...wme];
    const bodyPositionArr = [...body_position];

    const vapor_pressure = rhArr.map((rhValue, index) => (
        rhValue * p_sat_torr(tdbArr[index]) / 100
    ));

    const output = {
        "e_skin": e_skin,
        "e_rsw": e_rsw,
        "e_max": e_max,
        "q_sensible": q_sensible,
        "q_skin": q_skin,
        "q_res": q_res,
        "t_core": t_core,
        "t_skin": t_skin,
        "m_bl": m_bl,
        "m_rsw": m_rsw,
        "w": w,
        "w_max": w_max,
        "_set": _set,
        "et": et,
        "pmv_gagge": pmv_gagge,
        "pmv_set": pmv_set,
        "disc": disc,
        "t_sens": t_sens,
    };

    if (kwargs.round) {
        for (const key in output) {
            output[key] = Math.round(output[key] * 10 + Number.EPSILON) / 10;
        }
    }

    return output;
}


/**
 * Calculates the Standard Effective Temperature (SET). The SET is the 
 * temperature of a hypothetical isothermal environment at 50% (rh), 
 * <0.1 m/s (20 fpm) average air speed (v), and tr = tdb, in which the 
 * total heat loss from the skin of an imaginary occupant wearing 
 * clothing, standardized for the activity concerned is the same as 
 * that from a person in the actual environment with actual clothing 
 * and activity level.
 * 
 * @param {number} tdb Dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'.
 * @param {number} tr Mean radiant temperature, default in [°C]
 * @param {number} v Air speed, default in [m/s]
 * @param {number} rh Relative humidity, [%].
 * @param {number} met Metabolic rate, [W/(m2)]
 * @param {number} clo Clothing insulation, [clo]
 * @param {number} wme External work, [W/(m2)] default 0
 * @param {number} body_surface_area Body surface area, default value 1.8258 [m2] in [ft2] if units = ‘IP’
 * @param {number} p_atm Atmospheric pressure, default value 101325 [Pa] in [atm] if units = ‘IP’
 * @param {string} body_position Select either “sitting” or “standing”
 * @param {"SI" | "IP"} units Select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {boolean} limit_inputs By default, if the inputs are outsude the following limits the function returns nan. If False returns values regardless of the input values. 
 * @param {Object} [options] (Optional) Other parameters.
 * @param  {...any} kwargs
 * @returns {number} SET (float or array-like) – Standard effective temperature, [°C]
 * 
 * @example
 * const set = set_tmp(25, 25, 0.1, 50, 1.2, 0.5); // returns 24.3 
 */
export function set_tmp(
    tdb, 
    tr, 
    v, 
    rh, 
    met, 
    clo, 
    wme = 0, 
    body_surface_area = 1.8258, 
    p_atm = 101325, 
    body_position = 'standing', 
    units = "SI",
    limit_inputs = true,
    options = { round: true, calculate_ce: false }
){
    // const default_kwargs = {
    //     round: true,
    //     calculate_ce: false,
    // };
    
    // let kwargs = { ...default_kwargs, ...kwargs };

    if (units === "IP") {
        if (body_surface_area === 1.8258) {
            body_surface_area = 19.65;
        }
        if (p_atm === 101325) {
            p_atm = 1;
        }
        const unit_convert = units_converter({
            tdb,
            tr,
            v,
            area: body_surface_area,
            pressure: p_atm,
        });
        tdb = unit_convert.tdb;
        tr = unit_convert.tr;
        v = unit_convert.v;
        body_surface_area = unit_convert.area;
        p_atm = unit_convert.pressure;
    }

    const tdbArr = [...tdb];
    const trArr = [...tr];
    const vArr = [...v];
    const rhArr = [...rh];
    const metArr = [...met];
    const cloArr = [...clo];
    const wmeArr = [...wme];

    set_array = two_nodes(
        tdb=tdbArr,
        tr=trArr,
        v=vArr,
        rh=rhArr,
        met=metArr,
        clo=cloArr,
        wme=wmeArr,
        body_surface_area=body_surface_area,
        p_atmospheric=p_atm,
        body_position=body_position,
        calculate_ce=false,
        round=false,
    )._set;
    
    return options.round === undefined || options.round ? round(set_array, 1) : set_array;
}