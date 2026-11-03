import { parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
import type { InputsOf, ModelInfo, OutputsOf } from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";

// Thermodynamic parameters
const _T_C_K = 273.16; // K
const _P_TRIPLE_POINT = 611.65; // Pa
const _E0V = 2.374e6; // J/kg
const _E0S = 0.3337e6; // J/kg
const _RGASA = 287.04; // J/kg/K
const _RGASV = 461.0; // J/kg/K
const _CVA = 719.0; // J/kg/K
const _CVV = 1418.0; // J/kg/K
const _CVL = 4119.0; // J/kg/K
const _CVS = 1861.0; // J/kg/K
const _CPA = _CVA + _RGASA;
const _CPV = _CVV + _RGASV;

// Thermo-regulatory parameters
const _SIGMA = 5.67e-8; // W/m^2/K^4 , Stefan-Boltzmann constant
const _EPSILON = 0.97; // emissivity of surface, steadman1979
const _MASS = 83.6; // kg, mass of average US adults, fryar2018
const _HEIGHT = 1.69; // m, height of average US adults, fryar2018
const _AREA = 0.202 * _MASS ** 0.425 * _HEIGHT ** 0.725; // m^2, DuBois formula, parson2014
const _CPC = 3492.0; // J/kg/K, specific heat capacity of core, gagge1972
const _HC_CORE = (_MASS * _CPC) / _AREA; // heat capacity of core
const _R = 124.0; // Pa/K, Zf/rf, steadman1979
const _Q = 180.0; // W/m^2, metabolic rate per skin area, steadman1979
const _PHI_SALT = 0.9; // vapor saturation pressure level of saline solution, steadman1979
const _T_CR = 310.0; // K, core temperature, steadman1979
const _P = 1.013e5; // Pa, atmospheric pressure
const _ETA = 1.43e-6; // kg/J, "inhaled mass" / "metabolic rate", steadman1979
const _PA0 = 1.6e3; // Pa, reference air vapor pressure in regions III, IV, V, VI, steadman1979

const _ZA = 60.6 / 17.4; // Pa m^2/W, mass transfer resistance through air, exposed skin
const _ZA_BAR = 60.6 / 11.6; // Pa m^2/W, mass transfer resistance through air, clothed skin
const _ZA_UN = 60.6 / 12.3; // Pa m^2/W, mass transfer resistance through air, naked

// tolerance and maximum iteration for the root solver
const _TOL = 1e-8;
const _TOL_T = 1e-8;
const _MAX_ITER = 100;

// equivalent-variable codes, replacing the original string keys so this can be
// jitted in nopython mode ("rs" and "rs*" collapse to the same code because
// find_t/_find_t treats them identically; only the (unused) region label differed)
const _EQ_PHI = 1;
const _EQ_RF = 2;
const _EQ_RS = 3;
const _EQ_DTCDT = 4;

// residual-function codes dispatched by _residual/_bisect
const _R_TS = 1;
const _R_TF = 2;
const _R_TF_REGION_II_III = 3;
const _R_TS_REGION_IV_V = 4;
const _R_TS_REGION_V = 5;
const _R_T_PHI = 6;
const _R_T_RF = 7;
const _R_T_RS = 8;
const _R_T_DTCDT = 9;

// .py_func calls the plain-Python version of these njit functions, so computing
// these two module-level constants doesn't trigger numba compilation at import
// time (which would otherwise add a noticeable, unnecessary import-time cost).
const _P_CR = _PHI_SALT * _pv_star(_T_CR); // core vapor pressure
const _LAT_HEAT = _latent_heat_vap(310.0); // latent heat of vaporization at 310 K

export const HEAT_INDEX_LU_INFO = deepFreeze({
  name: "heat_index_lu",
  label: "Heat Index (Lu and Romps)",
  standards: [],
  inputs: {
    tdb: { kind: "numeric", unit: "°C" },
    rh: { kind: "numeric", unit: "%" },
    round_output: { kind: "bool", default: true },
  },
  outputs: {
    hi: { kind: "numeric", unit: "°C" },
    stress_category: { kind: "label", none: true, unit: null },
  },
} as const satisfies ModelInfo);

/** @interface */
export type HILuInputs = InputsOf<typeof HEAT_INDEX_LU_INFO>;

/**
 * Dataclass to represent the Heat Index (HI).
 *
 * @interface
 */
export type HILu = OutputsOf<typeof HEAT_INDEX_LU_INFO>;

/**
 * Calculate the Heat Index (HI) in accordance with the Lu and Romps (2022) model
 * [lu](../../docs/references.md#lu).
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, [°C].
 * @param inputs.rh - Relative humidity, [%].
 * @param inputs.round_output - If True, rounds output value. If False, it does not round it. Defaults to True.
 *
 * @returns A dataclass containing the Heat Index. See {@link HILu} for more details.
 * To access the `hi` value, use the `hi` attribute of the returned `HI` instance, e.g., `result.hi`.
 *
 * - `hi` - Heat Index, [°C].
 * - `stress_category`
 *
 * @example
 * ```ts
 * import { heat_index_lu } from "jsthermalcomfort/models";
 *
 * const result = heat_index_lu({ tdb: 25, rh: 50 });
 * console.log(result.hi); // 25
 * ```
 */
export function heat_index_lu(inputs: HILuInputs): HILu {
  // Validate inputs using the HIInputs class
  const { tdb, rh, round_output } = parseInputs(HEAT_INDEX_LU_INFO, inputs);

  let hi = _lu_heat_index_optimized(tdb + 273.15, rh / 100) - 273.15;

  if (round_output) {
    hi = round(hi, 1);
  }

  return buildOutputs(HEAT_INDEX_LU_INFO, { hi, stress_category: null }, []);
}

function _pv_star(t: number): number {
  // The saturation vapor pressure
  if (t === 0.0) {
    return 0.0;
  }
  if (t < _T_C_K) {
    return (
      _P_TRIPLE_POINT *
      (t / _T_C_K) ** ((_CPV - _CVS) / _RGASV) *
      Math.exp(
        ((_E0V + _E0S - (_CVV - _CVS) * _T_C_K) / _RGASV) *
          (1.0 / _T_C_K - 1.0 / t),
      )
    );
  }
  return (
    _P_TRIPLE_POINT *
    (t / _T_C_K) ** ((_CPV - _CVL) / _RGASV) *
    Math.exp(
      ((_E0V - (_CVV - _CVL) * _T_C_K) / _RGASV) * (1.0 / _T_C_K - 1.0 / t),
    )
  );
}

function _latent_heat_vap(t: number): number {
  // The latent heat of vaporization of water
  return _E0V + (_CVV - _CVL) * (t - _T_C_K) + _RGASV * t;
}

function _qv(ta: number, pa: number): number {
  // respiratory heat loss, W/m^2
  return (
    _ETA *
    _Q *
    (_CPA * (_T_CR - ta) +
      ((_LAT_HEAT * _RGASA) / (_P * _RGASV)) * (_P_CR - pa))
  );
}

function _zs(rs: number): number {
  // mass transfer resistance through skin, Pa m^2/W
  return rs === 0.0387 ? 52.1 : 6.0e8 * (rs * (rs * rs * (rs * rs)));
}

function _ra(ts: number, ta: number): number {
  // heat transfer resistance through air, exposed skin, K m^2/W
  const hc = 17.4;
  const phi_rad = 0.85;
  const hr = _EPSILON * phi_rad * _SIGMA * (ts * ts + ta * ta) * (ts + ta);
  return 1.0 / (hc + hr);
}

function _ra_bar(tf: number, ta: number): number {
  // heat transfer resistance through air, clothed skin, K m^2/W
  const hc = 11.6;
  const phi_rad = 0.79;
  const hr = _EPSILON * phi_rad * _SIGMA * (tf * tf + ta * ta) * (tf + ta);
  return 1.0 / (hc + hr);
}

function _ra_un(ts: number, ta: number): number {
  // heat transfer resistance through air, when naked, K m^2/W
  const hc = 12.3;
  const phi_rad = 0.8;
  const hr = _EPSILON * phi_rad * _SIGMA * (ts * ts + ta * ta) * (ts + ta);
  return 1.0 / (hc + hr);
}

/**
 * Given air temperature [K] and relative humidity, return the equivalent variable.
 *
 * Returns (eq_var_code, phi, rf, rs, d_tc_dt).
 */
function _find_eq_var(
  ta: number,
  rh: number,
): [number, number, number, number, number] {
  const pa = rh * _pv_star(ta); // air vapor pressure
  let rs = 0.0387; // m^2K/W, heat transfer resistance through skin
  let phi = 0.84; // covering fraction
  let d_tc_dt = 0.0; // K/s, rate of change in Tc

  const m = (_P_CR - pa) / (_zs(rs) + _ZA);
  const m_bar = (_P_CR - pa) / (_zs(rs) + _ZA_BAR);

  let lo_ts = (ta < _T_CR ? ta : _T_CR) - rs * Math.abs(m);
  lo_ts = lo_ts > 0.0 ? lo_ts : 0.0;
  const hi_ts = (ta > _T_CR ? ta : _T_CR) + rs * Math.abs(m);
  let ts = _bisect(_R_TS, ta, pa, rs, 0.0, lo_ts, hi_ts, _TOL);

  let lo_tf = (ta < _T_CR ? ta : _T_CR) - rs * Math.abs(m_bar);
  lo_tf = lo_tf > 0.0 ? lo_tf : 0.0;
  const hi_tf = (ta > _T_CR ? ta : _T_CR) + rs * Math.abs(m_bar);
  let tf = _bisect(_R_TF, ta, pa, rs, 0.0, lo_tf, hi_tf, _TOL);

  const q_minus_qv = _Q - _qv(ta, pa);
  const flux1 = q_minus_qv - ((1.0 - phi) * (_T_CR - ts)) / rs; // C*dTc/dt when rf=Zf=inf
  const flux2 =
    q_minus_qv - ((1.0 - phi) * (_T_CR - ts)) / rs - (phi * (_T_CR - tf)) / rs; // C*dTc/dt when rf=Zf=0

  let eq_var_code: number;
  let rf: number;
  if (flux1 <= 0.0) {
    // region I
    eq_var_code = _EQ_PHI;
    phi = 1.0 - (q_minus_qv * rs) / (_T_CR - ts);
    rf = Infinity;
  } else if (flux2 <= 0.0) {
    // region II&III
    eq_var_code = _EQ_RF;
    const ts_bar =
      _T_CR - (q_minus_qv * rs) / phi + (1.0 / phi - 1.0) * (_T_CR - ts);
    tf = _bisect(_R_TF_REGION_II_III, ta, pa, rs, ts_bar, ta, ts_bar, _TOL);
    rf = (_ra_bar(tf, ta) * (ts_bar - tf)) / (tf - ta);
  } else {
    // region IV,V,VI
    rf = 0.0;
    const flux3 =
      q_minus_qv -
      (_T_CR - ta) / _ra_un(_T_CR, ta) -
      (_PHI_SALT * _pv_star(_T_CR) - pa) / _ZA_UN;
    if (flux3 < 0.0) {
      // region IV,V
      ts = _bisect(_R_TS_REGION_IV_V, ta, pa, 0.0, 0.0, 0.0, _T_CR, _TOL);
      rs = (_T_CR - ts) / q_minus_qv;
      eq_var_code = _EQ_RS;
      const ps = _P_CR - ((_P_CR - pa) * _zs(rs)) / (_zs(rs) + _ZA_UN);
      if (ps > _PHI_SALT * _pv_star(ts)) {
        // region V
        ts = _bisect(_R_TS_REGION_V, ta, pa, 0.0, 0.0, 0.0, _T_CR, _TOL);
        rs = (_T_CR - ts) / q_minus_qv;
        eq_var_code = _EQ_RS;
      }
    } else {
      // region VI
      rs = 0.0;
      eq_var_code = _EQ_DTCDT;
      d_tc_dt = (1.0 / _HC_CORE) * flux3;
    }
  }

  return [eq_var_code, phi, rf, rs, d_tc_dt];
}

function _residual(
  kind: number,
  x: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number,
): number {
  if (kind === _R_TS) {
    // x=ts, p0=ta, p1=pa, p2=rs
    const ta = p0;
    const pa = p1;
    const rs = p2;
    return (
      (x - ta) / _ra(x, ta) + (_P_CR - pa) / (_zs(rs) + _ZA) - (_T_CR - x) / rs
    );
  }
  if (kind === _R_TF) {
    // x=tf, p0=ta, p1=pa, p2=rs
    const ta = p0;
    const pa = p1;
    const rs = p2;
    return (
      (x - ta) / _ra_bar(x, ta) +
      (_P_CR - pa) / (_zs(rs) + _ZA_BAR) -
      (_T_CR - x) / rs
    );
  }
  if (kind === _R_TF_REGION_II_III) {
    // x=tf, p0=ta, p1=pa, p2=rs, p3=ts_bar
    const ta = p0;
    const pa = p1;
    const rs = p2;
    const ts_bar = p3;
    return (
      (x - ta) / _ra_bar(x, ta) +
      ((_P_CR - pa) * (x - ta)) /
        ((_zs(rs) + _ZA_BAR) * (x - ta) + _R * _ra_bar(x, ta) * (ts_bar - x)) -
      (_T_CR - ts_bar) / rs
    );
  }
  if (kind === _R_TS_REGION_IV_V) {
    // x=ts, p0=ta, p1=pa
    const ta = p0;
    const pa = p1;
    const q_minus_qv = _Q - _qv(ta, pa);
    return (
      (x - ta) / _ra_un(x, ta) +
      (_P_CR - pa) / (_zs((_T_CR - x) / q_minus_qv) + _ZA_UN) -
      q_minus_qv
    );
  }
  if (kind === _R_TS_REGION_V) {
    // x=ts, p0=ta, p1=pa
    const ta = p0;
    const pa = p1;
    const q_minus_qv = _Q - _qv(ta, pa);
    return (
      (x - ta) / _ra_un(x, ta) +
      (_PHI_SALT * _pv_star(x) - pa) / _ZA_UN -
      q_minus_qv
    );
  }
  if (kind === _R_T_PHI) {
    // x=t, p0=eq_var
    const [, phi] = _find_eq_var(x, 1.0);
    return phi - p0;
  }
  if (kind === _R_T_RF) {
    // x=t, p0=eq_var
    let rh_trial = _PA0 / _pv_star(x);
    rh_trial = rh_trial < 1.0 ? rh_trial : 1.0;
    const [, , rf] = _find_eq_var(x, rh_trial);
    return rf - p0;
  }
  if (kind === _R_T_RS) {
    // x=t, p0=eq_var
    const rh_trial = _PA0 / _pv_star(x);
    const [, , , rs] = _find_eq_var(x, rh_trial);
    return rs - p0;
  }
  // kind == _R_T_DTCDT: x=t, p0=eq_var
  const rh_trial = _PA0 / _pv_star(x);
  const [, , , , d_tc_dt] = _find_eq_var(x, rh_trial);
  return d_tc_dt - p0;
}

function _bisect(
  kind: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  x1: number,
  x2: number,
  tol: number,
): number {
  let a = x1;
  let b = x2;
  const fa = _residual(kind, a, p0, p1, p2, p3);
  let fb = _residual(kind, b, p0, p1, p2, p3);
  if (fa * fb > 0.0) {
    throw new RangeError("wrong initial interval in the root solver");
  }
  let c = b;
  for (let i = 0; i < _MAX_ITER; i++) {
    c = (a + b) / 2.0;
    const fc = _residual(kind, c, p0, p1, p2, p3);
    if (fb * fc > 0.0) {
      b = c;
      fb = fc;
    } else {
      a = c;
    }
    if (Math.abs(a - b) < tol) {
      return c;
    }
    if (i === _MAX_ITER - 1) {
      throw new Error("reaching maximum iteration in the root solver");
    }
  }
  return c;
}

function _find_t(eq_var_code: number, eq_var: number): number {
  if (eq_var_code === _EQ_PHI) {
    return _bisect(_R_T_PHI, eq_var, 0.0, 0.0, 0.0, 0.0, 240.0, _TOL_T);
  }
  if (eq_var_code === _EQ_RF) {
    return _bisect(_R_T_RF, eq_var, 0.0, 0.0, 0.0, 230.0, 300.0, _TOL_T);
  }
  if (eq_var_code === _EQ_RS) {
    return _bisect(_R_T_RS, eq_var, 0.0, 0.0, 0.0, 295.0, 350.0, _TOL_T);
  }
  return _bisect(_R_T_DTCDT, eq_var, 0.0, 0.0, 0.0, 340.0, 1000.0, _TOL_T);
}

function _lu_heat_index_optimized(tdb: number, rh: number): number {
  // combining the two functions find_eq_var and find_t
  const [eq_var_code, phi, rf, rs, d_tc_dt] = _find_eq_var(tdb, rh);
  let eq_var: number;
  if (eq_var_code === _EQ_PHI) {
    eq_var = phi;
  } else if (eq_var_code === _EQ_RF) {
    eq_var = rf;
  } else if (eq_var_code === _EQ_RS) {
    eq_var = rs;
  } else {
    eq_var = d_tc_dt;
  }
  let hi = _find_t(eq_var_code, eq_var);
  if (tdb === 0.0) {
    hi = 0.0;
  }
  return hi;
}
