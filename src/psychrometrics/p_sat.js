/**
 * Calculates vapour pressure of water at different temperatures
 *
 * @public
 * @memberof psychrometrics
 *
 * @param {number} tdb - air temperature, [°C]
 * @returns {number} - vapour pressure of water, [Pa]
 *
 * @category Psychrometrics
 */
export function p_sat(tdb) {
  const c_to_k = 273.15;

  const ta_k = tdb + c_to_k;
  const c1 = -5674.5359;
  const c2 = 6.3925247;
  const c3 = -0.009677843; // = -0.9677843 * math.pow(10, -2)
  const c4 = 6.2215701e-7; // = 0.62215701 * math.pow(10, -6)
  const c5 = 2.0747825e-9; // = 0.20747825 * math.pow(10, -8)
  const c6 = -9.484024e-13; // = -0.9484024 * math.pow(10, -12)
  const c7 = 4.1635019;
  const c8 = -5800.2206;
  const c9 = 1.3914993;
  const c10 = -0.048640239;
  // Upstream's product, not the literal 0.000041764767999999996 it evaluates
  // near: that literal is one ulp lower and moved p_sat(25) by 1.1e-11 Pa.
  const c11 = 0.41764768 * 1e-4;
  const c12 = -1.4452093e-8; // = -0.14452093 * math.pow(10, -7)
  const c13 = 6.5459673;

  // Math.exp and Math.log can differ from numpy's by one ulp (ADR 0009).
  // p_sat(0) is 611.2128674511871 here and 611.212867451187 in
  // pythermalcomfort v4.6.2, from the same exponent. Over 11,101 points from
  // -100 to 100 °C the result differs by at most 64 ulp, 7.1e-10 Pa; at the
  // two 64-ulp points Math.log is one ulp off numpy's log.
  if (ta_k < c_to_k) {
    return Math.exp(
      c1 / ta_k +
        c2 +
        ta_k * (c3 + ta_k * (c4 + ta_k * (c5 + c6 * ta_k))) +
        c7 * Math.log(ta_k),
    );
  }

  return Math.exp(
    c8 / ta_k +
      c9 +
      ta_k * (c10 + ta_k * (c11 + ta_k * c12)) +
      c13 * Math.log(ta_k),
  );
}
