import { $map } from "../../supa.js";

/**
 * Calculate operative temperature [°C]
 *
 * @param {number[]} tdb - Air temperature [°C]
 * @param {number[]} tr - Mean radiant temperature [°C]
 * @param {number[]} hc - Convective heat transfer coefficient [W/(m2*K)]
 * @param {number[]} hr - Radiative heat transfer coefficient [W/(m2*K)]

 * @returns {number[]} Operative temperature [°C]
 */
export function operative_temp(tdb, tr, hc, hr) {
  return $map(
    [tdb, tr, hc, hr],
    ([tdb, tr, hc, hr]) => (hc * tdb + hr * tr) / (hc + hr),
  );
}
