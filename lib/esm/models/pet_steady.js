import { body_surface_area } from "../utilities/utilities.js";
import { p_sat } from "../psychrometrics/p_sat.js";
import { round } from "../utilities/utilities.js";
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
 * @returns {number} Steady-state PET under the given ambient conditions
 *
 * @example
 * const result = pet_steady(20, 20, 50, 0.15, 1.37, 0.5);
 * console.log(result); // 18.85
 */
export function pet_steady(tdb, tr, v, rh, met, clo, p_atm = 1013.25, position = 1, age = 23, sex = 1, weight = 75, height = 1.8, wme = 0) {
    const met_factor = 58.2; // met conversion factor
    met = met * met_factor; // metabolic rate
    // initial guess
    const t_guess = [36.7, 34, 0.5 * (tdb + tr)];
    // solve for Tc, Tsk, Tcl temperatures
    const t_stable = newtonRaphson((tx) => solve_pet(tx, tdb, tr, v, rh, met, clo, true, p_atm, position, age, sex, weight, height, wme), t_guess);
    return pet_fc(t_stable);
}
/**
 * Function to find the solution.
 *
 * @param {[number,number,number]} _t_stable
 * @returns {number}
 */
function pet_fc(_t_stable) {
    // solving for PET
    const pet_guess = _t_stable[2]; // start with the clothing temperature
    const result = newtonRaphsonSingleEquation((tx) => {
        const result = solve_pet(_t_stable, tx[0], tx[0], undefined, undefined, undefined, undefined, false);
        return [result];
    }, [pet_guess]);
    return round(result[0], 2);
}
/**
 * @typedef {Object} VasomotricitytRet
 * @property {number} m_blood - Blood flow rate, [kg/m2/h]
 * @property {number} alpha - repartition of body mass between core and skin [].
 */
// skin and core temperatures set values
const tc_set = 36.6;
const tsk_set = 34;
/**
 * Defines the vasomotricity (blood flow) in function of the core and skin temperatures.
 * @param {number} t_cr - The body core temperature, [°C]
 * @param {number} t_sk - The body skin temperature, [°C]
 * @returns {VasomotricitytRet}
 */
function vasomotricity(t_cr, t_sk) {
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
    return { m_blood: m_blood, alpha: alpha };
}
/**
 * Defines the sweating mechanism depending on the body and core temperatures.
 * @param {number} t_body - weighted average between skin and core temperatures, [°C]
 * @returns {number} m_rsw - The sweating flow rate, [g/m2/h].
 */
function sweat_rate(t_body) {
    const tbody_set = 0.1 * tsk_set + 0.9 * tc_set; // Calculation of the body temperature through a weighted average
    let sig_body = t_body - tbody_set;
    if (sig_body < 0) {
        // In this case, Tbody < Tbody_set --> The sweat flow is 0 from Gagge's model
        sig_body = 0.0;
    }
    let m_rsw = 304.94 * Math.pow(10, -3) * sig_body;
    // 500 g/m^2/h is the upper sweat rate limit
    if (m_rsw > 500) {
        m_rsw = 500;
    }
    return m_rsw;
}
/**
 * This function allows solving for the PET : either it solves the vectorial balance
        of the 3 unknown temperatures (T_core, T_sk, T_clo) or it solves for the
        environment operative temperature that would yield the same energy balance as the
        actual environment.
 * @param {[number, number, number]} t_arr - [T_core, T_sk, T_clo], [°C]
 * @param {number} _tdb - dry bulb air temperature, [°C]
 * @param {number} _tr - mean radiant temperature, [°C]
 * @param {number} _v - default 0.1 m/s for the reference environment air speed, [m/s]
 * @param {number} _rh - default 50 % for the reference environment relative humidity, [%]
 * @param {number} _met - default 80 W for the reference environment metabolic rate, [W/m2]
 * @param {number} _clo - default 0.9 clo for the reference environment clothing insulation, [clo]
 * @param {boolean} actual_environment - default False. True=solve 3eqs/3unknowns, False=solve for PET
 * @param {number} p_atm - atmospheric pressure, default value 1013.25 [hPa]
 * @param {number} age - age in years. default=23
 * @param {1 | 2 | 3} position - position of the individual (1=sitting, 2=standing, 3=standing, forced convection)
 * @param {1 | 2} sex - default 1. male (1) or female (2).
 * @param {number} weight - default 75. body mass, [kg]
 * @param {number} height - default 1.8. height, [m]
 * @param {number} wme - external work, [W/(m2)] default 0
 * @returns {number | [number, number, number]} - PET (scalar) or energy balance (calculated core, skin, and clo temperatures).
 */
function solve_pet(t_arr, _tdb, _tr, _v = 0.1, _rh = 50, _met = 80, _clo = 0.9, actual_environment = false, p_atm = 1013.25, position = 1, age = 23, sex = 1, weight = 75, height = 1.8, wme = 0) {
    // Constants
    const e_skin = 0.99; // Skin emissivity
    const e_clo = 0.95; // Clothing emissivity
    const h_vap = 2.42 * Math.pow(10, 6); // Latent heat of evaporation [J/Kg]
    const sbc = 5.67 * Math.pow(10, -8); // Stefan-Boltzmann constant [W/(m2*K^(-4))]
    const cb = 3640; // Blood specific heat [J/kg/k]
    // Initialize e_bal_vec and other variables
    const e_bal_vec = [0, 0, 0]; // required for the vectorial expression of the balance
    const a_dubois = body_surface_area(weight, height);
    //Base metabolism for men and women in [W]
    const met_female = 3.19 *
        Math.pow(weight, 0.75) *
        (1.0 +
            0.004 * (30.0 - age) +
            0.018 * ((height * 100.0) / Math.pow(weight, 1.0 / 3.0) - 42.1));
    const met_male = 3.45 *
        Math.pow(weight, 0.75) *
        (1.0 +
            0.004 * (30.0 - age) +
            0.01 * ((height * 100.0) / Math.pow(weight, 1.0 / 3.0) - 43.4));
    //Attribution of internal energy depending on the sex of the subject
    const met_correction = sex === 1 ? met_male : met_female;
    // Source term : metabolic activity
    const he = (_met + met_correction) / a_dubois;
    // impact of efficiency
    const h = he * (1.0 - wme); // [W/m2]
    // correction for wind
    const i_m = 0.38; // Woodcock ratio for vapour transfer through clothing [-]
    // Calculation of the Burton surface increase coefficient, k = 0.31 for Hoeppe:
    const fcl = 1 + 0.31 * _clo; // Increase heat exchange surface depending on clothing level
    const f_a_cl = (173.51 * _clo - 2.36 - 100.76 * _clo * _clo + 19.28 * _clo ** 3.0) / 100;
    const a_clo = a_dubois * f_a_cl + a_dubois * (fcl - 1.0); // clothed body surface area
    const f_eff = position === 2 ? 0.696 : 0.725; // effective radiation factor
    const a_r_eff = a_dubois * f_eff; // Effective radiative area depending on the position of the subject
    // Partial pressure of water in the air
    let vpa = 12; // [hPa] vapour pressure of the standard environment
    if (actual_environment) {
        // mode=True means we are solving for 3eqs/3unknowns
        vpa = ((_rh / 100.0) * p_sat(_tdb)) / 100;
    }
    // Convection coefficient depending on wind velocity and subject position
    let hc = 0;
    switch (position) {
        case 1:
            hc = 2.67 + 6.5 * Math.pow(_v, 0.67); // sitting
            break;
        case 2:
            // standing
            hc = 2.26 + 7.42 * Math.pow(_v, 0.67);
            break;
        case 3:
            // standing, forced convection
            hc = 8.6 * Math.pow(_v, 0.513);
            break;
    }
    // h_cc corrected convective heat transfer coefficient
    const h_cc = 3.0 * Math.pow(p_atm / 1013.25, 0.53);
    hc = Math.max(h_cc, hc);
    // modification of hc with the total pressure
    hc = hc * Math.pow(p_atm / 1013.25, 0.55);
    // Respiratory energy losses
    const t_exp = 0.47 * _tdb + 21.0; // Expired air temperature calculation [degC]
    const d_vent_pulm = he * 1.44 * Math.pow(10.0, -6.0); // breathing flow rate
    const c_res = 1010 * (_tdb - t_exp) * d_vent_pulm; // Sensible heat energy loss [W/m2]
    const vpexp = p_sat(t_exp) / 100; // Latent heat energy loss [hPa]
    const q_res = ((0.623 * h_vap) / p_atm) * (vpa - vpexp) * d_vent_pulm; // [W/m2]
    const ere = c_res + q_res; // [W/m2]
    // Calculation of the equivalent thermal resistance of body tissues
    let alpha = vasomotricity(t_arr[0], t_arr[1]).alpha;
    let tbody = alpha * t_arr[1] + (1 - alpha) * t_arr[0];
    // Clothed fraction of the body approximation
    const r_cl = _clo / 6.45; // Conversion in [m2.K/W]
    let y = 0;
    if (f_a_cl > 1.0) {
        f_a_cl = 1.0;
    }
    if (_clo >= 2.0) {
        y = 1.0;
    }
    if (0.6 < _clo < 2.0) {
        y = (height - 0.2) / height;
    }
    if (0.6 >= _clo > 0.3) {
        y = 0.5;
    }
    if (0.3 >= _clo > 0.0) {
        y = 0.1;
    }
    // calculation of the clothing radius depending on the clothing level (6.28 = 2*
    // pi !)
    const r2 = (a_dubois * (fcl - 1.0 + f_a_cl)) / (6.28 * height * y); // External radius
    const r1 = (f_a_cl * a_dubois) / (6.28 * height * y); // Internal radius
    const di = r2 - r1;
    // Calculation of the equivalent thermal resistance of body tissues
    const htcl = (6.28 * height * y * di) / (r_cl * Math.log(r2 / r1) * a_clo); // [W/(m2.K)]
    // Calculation of sweat losses
    const qmsw = sweat_rate(tbody);
    // h_vap/1000 = 2400 000[J/kg] divided by 1000 = [J/g] // qwsw/3600 for [g/m2/h]
    // to [
    // g/m2/s]
    let esw = ((h_vap / 1000) * qmsw) / 3600; // [W/m2]
    // Saturation vapor pressure at temperature Tsk
    const p_v_sk = p_sat(t_arr[1]) / 100; // hPa
    // Calculation of vapour transfer
    const lr = 16.7 * Math.pow(10, -1); // [K/hPa] Lewis ratio
    const he_diff = hc * lr; // diffusion coefficient of air layer
    const fecl = 1 / (1 + 0.92 * hc * r_cl); // Burton efficiency factor
    let e_max = he_diff * fecl * (p_v_sk - vpa); // maximum diffusion at skin surface
    if (e_max < 0.001 && e_max >= 0) {
        // added this otherwise e_req / e_max cannot be calculated
        e_max = 0.001;
    }
    let w = esw / e_max; // skin wetness
    if (w > 1) {
        w = 1;
        if (esw - e_max < 0) {
            esw = e_max;
        }
    }
    if (esw < 0) {
        esw = 0;
    }
    // i_m= Woodcock's ratio (see above)
    const r_ecl = (1 / (fcl * hc) + r_cl) / (lr * i_m); // clothing vapour transfer resistance after Woodcock's method
    const ediff = ((1 - w) * (p_v_sk - vpa)) / r_ecl; // diffusion heat transfer
    const evap = -(ediff + esw); // [W/m2]
    // Radiation losses bare skin
    const r_bare = (a_r_eff *
        (1.0 - f_a_cl) *
        e_skin *
        sbc *
        ((_tr + 273.15) ** 4.0 - (t_arr[1] + 273.15) ** 4.0)) /
        a_dubois;
    // ... for clothed area
    const r_clo = (f_eff *
        a_clo *
        e_clo *
        sbc *
        ((_tr + 273.15) ** 4.0 - (t_arr[2] + 273.15) ** 4.0)) /
        a_dubois;
    const r_sum = r_clo + r_bare; // radiation total
    // Convection losses for bare skin
    const c_bare = (hc * (_tdb - t_arr[1]) * a_dubois * (1.0 - f_a_cl)) / a_dubois; // [W/m^2]
    // ... for clothed area
    const c_clo = (hc * (_tdb - t_arr[2]) * a_clo) / a_dubois; // [W/m^2]
    const csum = c_clo + c_bare; // convection total
    // Balance equations of the 3-nodes model
    e_bal_vec[0] =
        h +
            ere -
            ((vasomotricity(t_arr[0], t_arr[1]).m_blood / 3600) * cb + 5.28) *
                (t_arr[0] - t_arr[1]); // Core balance [W/m^2]
    e_bal_vec[1] =
        r_bare +
            c_bare +
            evap +
            ((vasomotricity(t_arr[0], t_arr[1]).m_blood / 3600) * cb + 5.28) *
                (t_arr[0] - t_arr[1]) -
            htcl * (t_arr[1] - t_arr[2]); // Skin balance [W/m^2]
    e_bal_vec[2] = c_clo + r_clo + htcl * (t_arr[1] - t_arr[2]); // Clothes balance [W/m^2]
    const e_bal_scal = h + ere + r_sum + csum + evap;
    // Return either the calculated core, skin, and clo temperatures or the PET
    if (actual_environment) {
        return e_bal_vec;
    }
    else {
        return e_bal_scal;
    }
}
/**
 *
 * @param {NewtonRaphsonSingleFunction} func
 * @param initialGuess {[number]} initialGuess
 * @param tolerance {number} [tolerance=1e-3]
 * @param maxIterations {number} [maxIterations=1000]
 *
 * @returns {[number]}
 */
function newtonRaphsonSingleEquation(func, initialGuess, tolerance = 1e-3, maxIterations = 1000) {
    let solution = [...initialGuess];
    let iteration = 0;
    const n = solution.length;
    let J = createMatrix(n);
    while (iteration < maxIterations) {
        const fValue = func(solution);
        if (Math.abs(fValue[0]) < tolerance) {
            return solution;
        }
        const dfdx = numericalDerivatives(func, solution, fValue, undefined, J);
        solution[0] -= fValue[0] / dfdx[0][0];
        iteration++;
    }
    throw new Error("Newton Raphson Single equation did not converged");
}
/**
 * Derived from this method: {@link https://en.wikipedia.org/wiki/Newton's_method}
 * We approximate the derivatives so not truly Newton's method.
 *
 * @param {NewtonRaphsonFunction} f
 * @param initialGuess {[number, number, number]} initialGuess
 * @param tolerance {number} [tolerance=1e-3]
 * @param maxIterations {number} [maxIterations=1000]
 *
 * @returns {[number, number, number]}
 */
function newtonRaphson(f, initialGuess, tolerance = 1e-3, maxIterations = 1000) {
    let iteration = 0;
    let solution = [...initialGuess];
    const n = solution.length;
    let J = createMatrix(n);
    while (iteration < maxIterations) {
        const fValue = f(solution);
        if (Math.abs(fValue[0]) < tolerance &&
            Math.abs(fValue[1]) < tolerance &&
            Math.abs(fValue[2]) < tolerance) {
            return solution;
        }
        J = numericalDerivatives(f, solution, fValue, undefined, J);
        const jacobian00SemiDeterminant = J[1][1] * J[2][2] - J[1][2] * J[2][1];
        const jacobian10SemiDeterminant = J[1][0] * J[2][2] - J[1][2] * J[2][0];
        const jacobian20SemiDeterminant = J[1][0] * J[2][1] - J[1][1] * J[2][0];
        const detJ = J[0][0] * jacobian00SemiDeterminant -
            J[0][1] * jacobian10SemiDeterminant +
            J[0][2] * jacobian20SemiDeterminant;
        const d0 = jacobian00SemiDeterminant * fValue[0] -
            (J[0][1] * J[2][2] - J[0][2] * J[2][1]) * fValue[1] +
            (J[0][1] * J[1][2] - J[0][2] * J[1][1]) * fValue[2];
        const d1 = -jacobian10SemiDeterminant * fValue[0] +
            (J[0][0] * J[2][2] - J[0][2] * J[2][0]) * fValue[1] -
            (J[0][0] * J[1][2] - J[0][2] * J[1][0]) * fValue[2];
        const d2 = jacobian20SemiDeterminant * fValue[0] -
            (J[0][0] * J[2][1] - J[0][1] * J[2][0]) * fValue[1] +
            (J[0][0] * J[1][1] - J[0][1] * J[1][0]) * fValue[2];
        solution[0] -= d0 / detJ;
        solution[1] -= d1 / detJ;
        solution[2] -= d2 / detJ;
        ++iteration;
    }
    throw new Error("Newton Raphson did not converged");
}
/**
 *
 * @param {NewtonRaphsonFunction} f
 * @param values {[number, number, number]} values
 * @param evaluated {[number, number, number]} [evaluated] - result of f(values)
 * @param h {number} [h=1e-2]
 * @param matrix {number[][]} [matrix]
 * @returns {number[][]}
 */
function numericalDerivatives(f, values, evaluated, h = 1e-2, matrix) {
    const n = values.length;
    let aux = [...values];
    if (evaluated === undefined) {
        evaluated = f(values);
    }
    if (matrix === undefined) {
        matrix = createMatrix(n);
    }
    for (let i = 0; i < n; ++i) {
        aux[i] += h;
        const iWithH = f(aux);
        aux[i] = values[i];
        for (let j = 0; j < n; ++j) {
            matrix[j][i] = (iWithH[j] - evaluated[j]) / h;
        }
    }
    return matrix;
}
/**
 * @callback NewtonRaphsonFunction
 * @param numbers {[number, number, number]}
 * @returns {[number, number, number]}
 */
/**
 * @callback NewtonRaphsonSingleFunction
 * @param numbers {[number]}
 * @returns {[number]}
 */
function createMatrix(numbers) {
    const matrix = [];
    for (let i = 0; i < n; ++i) {
        const row = [];
        for (let j = 0; j < n; ++j) {
            row.push(NaN);
        }
        matrix.push(row);
    }
    return matrix;
}
