import { validateInputs } from "../utilities/utilities.js";

/**
 * Round to a fixed precision using NumPy's ties-to-even rule.
 *
 * @param {number} value - value to round
 * @param {number} precision - number of decimal places
 * @returns {number} rounded value
 * @private
 */
function roundToEven(value, precision) {
  const factor = 10 ** precision;
  const scaled = value * factor;
  const lower = Math.floor(scaled);

  if (scaled - lower === 0.5) {
    return (lower + (Math.abs(lower) % 2)) / factor;
  }

  return Math.round(scaled) / factor;
}

/**
 * @typedef {object} HeatIndexLuResult
 * @property {number} hi - Heat Index, [°C]
 * @property {null} stress_category - Always null. stress_category is null because the Lu and Romps
 *   model does not provide a stress category.
 * @public
 */

const HEAT_INDEX_LU_SCHEMA = {
  tdb: { type: "number" },
  rh: { type: "number" },
  round_output: { type: "boolean" },
};

/**
 * Calculates the Heat Index (HI) in accordance with the Lu and Romps (2022) model
 * {@link #ref_28|[28]}. This model extends the first version of Steadman's (1979)
 * apparent temperature {@link #ref_13|[13]}.
 *
 * Accepts scalar inputs. For multiple readings, use Array.map() over this function.
 *
 * @public
 * @memberof models
 * @docname Heat Index (Lu and Romps)
 *
 * @param {number} tdb - Dry bulb air temperature, [°C].
 * @param {number} rh - Relative humidity, [%].
 * @param {boolean} [round_output=true] - If true, rounds the output value to one decimal place,
 *   using NumPy's ties-to-even rule. If false, it does not round it.
 * @returns {HeatIndexLuResult} Heat Index, [°C], and stress_category (always null).
 * @throws {TypeError} If `tdb` or `rh` is not a finite number, or `round_output` is not a boolean.
 * @throws {Error} If the internal root solver cannot find a solution for the inputs.
 *
 * @example
 * import { heat_index_lu } from "jsthermalcomfort";
 * const result = heat_index_lu(25, 50);
 * console.log(result.hi); // 25.0
 */
export function heat_index_lu(tdb, rh, round_output = true) {
  validateInputs({ tdb, rh, round_output }, HEAT_INDEX_LU_SCHEMA);

  let hi = luHeatIndex(tdb + 273.15, rh / 100) - 273.15;

  if (round_output) {
    hi = roundToEven(hi, 1);
  }

  return { hi, stress_category: null };
}

// Thermodynamic parameters
const T_C_K = 273.16; // K
const P_TRIPLE_POINT = 611.65; // Pa
const E0V = 2.374e6; // J/kg
const E0S = 0.3337e6; // J/kg
const RGASA = 287.04; // J/kg/K
const RGASV = 461.0; // J/kg/K
const CVA = 719.0; // J/kg/K
const CVV = 1418.0; // J/kg/K
const CVL = 4119.0; // J/kg/K
const CVS = 1861.0; // J/kg/K
const CPA = CVA + RGASA;
const CPV = CVV + RGASV;

// Thermo-regulatory parameters
const SIGMA = 5.67e-8; // W/m^2/K^4, Stefan-Boltzmann constant
const EPSILON = 0.97; // emissivity of surface, steadman1979
const MASS = 83.6; // kg, mass of average US adults, fryar2018
const HEIGHT = 1.69; // m, height of average US adults, fryar2018
const AREA = 0.202 * MASS ** 0.425 * HEIGHT ** 0.725; // m^2, DuBois formula, parson2014
const CPC = 3492.0; // J/kg/K, specific heat capacity of core, gagge1972
const HC_CORE = (MASS * CPC) / AREA; // heat capacity of core
const R = 124.0; // Pa/K, Zf/rf, steadman1979
const Q = 180.0; // W/m^2, metabolic rate per skin area, steadman1979
const PHI_SALT = 0.9; // vapor saturation pressure level of saline solution, steadman1979
const T_CR = 310.0; // K, core temperature, steadman1979
const P = 1.013e5; // Pa, atmospheric pressure
const ETA = 1.43e-6; // kg/J, "inhaled mass" / "metabolic rate", steadman1979
const PA0 = 1.6e3; // Pa, reference air vapor pressure in regions III, IV, V, VI, steadman1979

const ZA = 60.6 / 17.4; // Pa m^2/W, mass transfer resistance through air, exposed skin
const ZA_BAR = 60.6 / 11.6; // Pa m^2/W, mass transfer resistance through air, clothed skin
const ZA_UN = 60.6 / 12.3; // Pa m^2/W, mass transfer resistance through air, naked

// Tolerance and maximum iteration for the root solver
const TOL = 1e-8;
const TOL_T = 1e-8;
const MAX_ITER = 100;

// Equivalent-variable codes returned by findEqVar
const EQ_PHI = 1;
const EQ_RF = 2;
const EQ_RS = 3;
const EQ_DTCDT = 4;

// Residual-function codes dispatched by residual and bisect
const R_TS = 1;
const R_TF = 2;
const R_TF_REGION_II_III = 3;
const R_TS_REGION_IV_V = 4;
const R_TS_REGION_V = 5;
const R_T_PHI = 6;
const R_T_RF = 7;
const R_T_RS = 8;
const R_T_DTCDT = 9;

// Saturation vapor pressure, over ice below the triple point and over liquid above it
function pvStar(t) {
  if (t === 0.0) {
    return 0.0;
  }
  if (t < T_C_K) {
    return (
      P_TRIPLE_POINT *
      (t / T_C_K) ** ((CPV - CVS) / RGASV) *
      Math.exp(
        ((E0V + E0S - (CVV - CVS) * T_C_K) / RGASV) * (1.0 / T_C_K - 1.0 / t),
      )
    );
  }
  return (
    P_TRIPLE_POINT *
    (t / T_C_K) ** ((CPV - CVL) / RGASV) *
    Math.exp(((E0V - (CVV - CVL) * T_C_K) / RGASV) * (1.0 / T_C_K - 1.0 / t))
  );
}

// Latent heat of vaporization of water
function latentHeatVap(t) {
  return E0V + (CVV - CVL) * (t - T_C_K) + RGASV * t;
}

const P_CR = PHI_SALT * pvStar(T_CR); // core vapor pressure
const LAT_HEAT = latentHeatVap(310.0); // latent heat of vaporization at 310 K

// Respiratory heat loss, W/m^2
function qv(ta, pa) {
  return (
    ETA *
    Q *
    (CPA * (T_CR - ta) + ((LAT_HEAT * RGASA) / (P * RGASV)) * (P_CR - pa))
  );
}

// Mass transfer resistance through skin, Pa m^2/W
function zs(rs) {
  return rs === 0.0387 ? 52.1 : 6.0e8 * rs ** 5;
}

// Heat transfer resistance through air, exposed skin, K m^2/W
function ra(ts, ta) {
  const hc = 17.4;
  const phi_rad = 0.85;
  const hr = EPSILON * phi_rad * SIGMA * (ts ** 2 + ta ** 2) * (ts + ta);
  return 1.0 / (hc + hr);
}

// Heat transfer resistance through air, clothed skin, K m^2/W
function raBar(tf, ta) {
  const hc = 11.6;
  const phi_rad = 0.79;
  const hr = EPSILON * phi_rad * SIGMA * (tf ** 2 + ta ** 2) * (tf + ta);
  return 1.0 / (hc + hr);
}

// Heat transfer resistance through air, when naked, K m^2/W
function raUn(ts, ta) {
  const hc = 12.3;
  const phi_rad = 0.8;
  const hr = EPSILON * phi_rad * SIGMA * (ts ** 2 + ta ** 2) * (ts + ta);
  return 1.0 / (hc + hr);
}

/**
 * Given air temperature [K] and relative humidity [0-1], find the physiological
 * region of the model and the equivalent variable that defines the heat index.
 *
 * @param {number} ta - air temperature, [K]
 * @param {number} rh - relative humidity, [0-1]
 * @returns {number[]} [eq_var_code, phi, rf, rs, d_tc_dt]
 * @private
 */
function findEqVar(ta, rh) {
  const pa = rh * pvStar(ta); // air vapor pressure
  let rs = 0.0387; // m^2K/W, heat transfer resistance through skin
  let phi = 0.84; // covering fraction
  let d_tc_dt = 0.0; // K/s, rate of change in Tc
  let eq_var_code;
  let rf;

  const m = (P_CR - pa) / (zs(rs) + ZA);
  const m_bar = (P_CR - pa) / (zs(rs) + ZA_BAR);

  const lo_ts = Math.max(0.0, Math.min(T_CR, ta) - rs * Math.abs(m));
  const hi_ts = Math.max(T_CR, ta) + rs * Math.abs(m);
  let ts = bisect(R_TS, ta, pa, rs, 0.0, lo_ts, hi_ts, TOL);

  const lo_tf = Math.max(0.0, Math.min(T_CR, ta) - rs * Math.abs(m_bar));
  const hi_tf = Math.max(T_CR, ta) + rs * Math.abs(m_bar);
  let tf = bisect(R_TF, ta, pa, rs, 0.0, lo_tf, hi_tf, TOL);

  const q_minus_qv = Q - qv(ta, pa);
  const flux1 = q_minus_qv - ((1.0 - phi) * (T_CR - ts)) / rs; // C*dTc/dt when rf=Zf=inf
  const flux2 =
    q_minus_qv - ((1.0 - phi) * (T_CR - ts)) / rs - (phi * (T_CR - tf)) / rs; // C*dTc/dt when rf=Zf=0

  if (flux1 <= 0.0) {
    // region I
    eq_var_code = EQ_PHI;
    phi = 1.0 - (q_minus_qv * rs) / (T_CR - ts);
    rf = Infinity;
  } else if (flux2 <= 0.0) {
    // region II and III
    eq_var_code = EQ_RF;
    const ts_bar =
      T_CR - (q_minus_qv * rs) / phi + (1.0 / phi - 1.0) * (T_CR - ts);
    tf = bisect(R_TF_REGION_II_III, ta, pa, rs, ts_bar, ta, ts_bar, TOL);
    rf = (raBar(tf, ta) * (ts_bar - tf)) / (tf - ta);
  } else {
    // region IV, V and VI
    rf = 0.0;
    const flux3 =
      q_minus_qv -
      (T_CR - ta) / raUn(T_CR, ta) -
      (PHI_SALT * pvStar(T_CR) - pa) / ZA_UN;
    if (flux3 < 0.0) {
      // region IV and V
      ts = bisect(R_TS_REGION_IV_V, ta, pa, 0.0, 0.0, 0.0, T_CR, TOL);
      rs = (T_CR - ts) / q_minus_qv;
      eq_var_code = EQ_RS;
      const ps = P_CR - ((P_CR - pa) * zs(rs)) / (zs(rs) + ZA_UN);
      if (ps > PHI_SALT * pvStar(ts)) {
        // region V
        ts = bisect(R_TS_REGION_V, ta, pa, 0.0, 0.0, 0.0, T_CR, TOL);
        rs = (T_CR - ts) / q_minus_qv;
        eq_var_code = EQ_RS;
      }
    } else {
      // region VI
      rs = 0.0;
      eq_var_code = EQ_DTCDT;
      d_tc_dt = (1.0 / HC_CORE) * flux3;
    }
  }

  return [eq_var_code, phi, rf, rs, d_tc_dt];
}

// Residual functions whose roots are found by bisect, selected by `kind`
function residual(kind, x, p0, p1, p2, p3) {
  if (kind === R_TS) {
    // x=ts, p0=ta, p1=pa, p2=rs
    const [ta, pa, rs] = [p0, p1, p2];
    return (x - ta) / ra(x, ta) + (P_CR - pa) / (zs(rs) + ZA) - (T_CR - x) / rs;
  }
  if (kind === R_TF) {
    // x=tf, p0=ta, p1=pa, p2=rs
    const [ta, pa, rs] = [p0, p1, p2];
    return (
      (x - ta) / raBar(x, ta) +
      (P_CR - pa) / (zs(rs) + ZA_BAR) -
      (T_CR - x) / rs
    );
  }
  if (kind === R_TF_REGION_II_III) {
    // x=tf, p0=ta, p1=pa, p2=rs, p3=ts_bar
    const [ta, pa, rs, ts_bar] = [p0, p1, p2, p3];
    return (
      (x - ta) / raBar(x, ta) +
      ((P_CR - pa) * (x - ta)) /
        ((zs(rs) + ZA_BAR) * (x - ta) + R * raBar(x, ta) * (ts_bar - x)) -
      (T_CR - ts_bar) / rs
    );
  }
  if (kind === R_TS_REGION_IV_V) {
    // x=ts, p0=ta, p1=pa
    const [ta, pa] = [p0, p1];
    const q_minus_qv = Q - qv(ta, pa);
    return (
      (x - ta) / raUn(x, ta) +
      (P_CR - pa) / (zs((T_CR - x) / q_minus_qv) + ZA_UN) -
      q_minus_qv
    );
  }
  if (kind === R_TS_REGION_V) {
    // x=ts, p0=ta, p1=pa
    const [ta, pa] = [p0, p1];
    const q_minus_qv = Q - qv(ta, pa);
    return (
      (x - ta) / raUn(x, ta) + (PHI_SALT * pvStar(x) - pa) / ZA_UN - q_minus_qv
    );
  }
  if (kind === R_T_PHI) {
    // x=t, p0=eq_var
    const phi = findEqVar(x, 1.0)[1];
    return phi - p0;
  }
  if (kind === R_T_RF) {
    // x=t, p0=eq_var
    const rh_trial = Math.min(1.0, PA0 / pvStar(x));
    const rf = findEqVar(x, rh_trial)[2];
    return rf - p0;
  }
  if (kind === R_T_RS) {
    // x=t, p0=eq_var
    const rh_trial = PA0 / pvStar(x);
    const rs = findEqVar(x, rh_trial)[3];
    return rs - p0;
  }
  // kind === R_T_DTCDT: x=t, p0=eq_var
  const rh_trial = PA0 / pvStar(x);
  const d_tc_dt = findEqVar(x, rh_trial)[4];
  return d_tc_dt - p0;
}

// Bisection root solver on [x1, x2] for the residual selected by `kind`
function bisect(kind, p0, p1, p2, p3, x1, x2, tol) {
  let a = x1;
  let b = x2;
  const fa = residual(kind, a, p0, p1, p2, p3);
  let fb = residual(kind, b, p0, p1, p2, p3);
  if (fa * fb > 0.0) {
    throw new Error("wrong initial interval in the root solver");
  }
  let c = b;
  for (let i = 0; i < MAX_ITER; i++) {
    c = (a + b) / 2.0;
    const fc = residual(kind, c, p0, p1, p2, p3);
    if (fb * fc > 0.0) {
      b = c;
      fb = fc;
    } else {
      a = c;
    }
    if (Math.abs(a - b) < tol) {
      return c;
    }
    if (i === MAX_ITER - 1) {
      throw new Error("reaching maximum iteration in the root solver");
    }
  }
  return c;
}

// Find the air temperature [K] that gives the equivalent variable at the reference humidity
function findT(eq_var_code, eq_var) {
  if (eq_var_code === EQ_PHI) {
    return bisect(R_T_PHI, eq_var, 0.0, 0.0, 0.0, 0.0, 240.0, TOL_T);
  }
  if (eq_var_code === EQ_RF) {
    return bisect(R_T_RF, eq_var, 0.0, 0.0, 0.0, 230.0, 300.0, TOL_T);
  }
  if (eq_var_code === EQ_RS) {
    return bisect(R_T_RS, eq_var, 0.0, 0.0, 0.0, 295.0, 350.0, TOL_T);
  }
  return bisect(R_T_DTCDT, eq_var, 0.0, 0.0, 0.0, 340.0, 1000.0, TOL_T);
}

/**
 * Heat index [K] for air temperature [K] and relative humidity [0-1].
 *
 * @param {number} tdb - air temperature, [K]
 * @param {number} rh - relative humidity, [0-1]
 * @returns {number} heat index, [K]
 * @private
 */
function luHeatIndex(tdb, rh) {
  const [eq_var_code, phi, rf, rs, d_tc_dt] = findEqVar(tdb, rh);
  let eq_var;
  if (eq_var_code === EQ_PHI) {
    eq_var = phi;
  } else if (eq_var_code === EQ_RF) {
    eq_var = rf;
  } else if (eq_var_code === EQ_RS) {
    eq_var = rs;
  } else {
    eq_var = d_tc_dt;
  }
  let hi = findT(eq_var_code, eq_var);
  if (tdb === 0.0) {
    hi = 0.0;
  }
  return hi;
}
