import { require_numeric } from "../_numpy.ts";

// Upstream's message (thermoregulation.py:1104-1105 at v4.6.2); it used to
// read "par must be greater than or equal to 1". A ValueError for a value
// out of range, so a RangeError (ADR 0012).
/**
 * Calculate local thermogenesis by work [W]
 * (`pythermalcomfort/jos3_functions/thermoregulation.py:1084-1132` at v4.6.2).
 *
 * @param {number} bmr - Basal metabolic rate [W]
 * @param {number} par - Physical activity ratio [-]
 * @throws {RangeError} If par is less than 1
 *
 * @return {number[]} q_work - Local thermogenesis by work [W]
 */
export function local_q_work(bmr: number, par: number): number[] {
  require_numeric(par, "<", "comparison", "int");
  if (par < 1) {
    throw new RangeError("par must be 1 or more");
  }

  const q_work_all = (par - 1) * bmr;

  // Distribution coefficient of thermogenesis by work
  const workf = [
    0, 0, 0.091, 0.08, 0.129, 0.0262, 0.0139, 0.005, 0.0262, 0.0139, 0.005,
    0.201, 0.099, 0.005, 0.201, 0.099, 0.005,
  ];
  return workf.map((x) => q_work_all * x);
}
