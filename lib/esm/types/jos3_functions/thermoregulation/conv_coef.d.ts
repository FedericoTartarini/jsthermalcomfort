/**
 * Calculate convective heat transfer coefficient (hc) [W/(m2*K)]
 *
 * @param {string} [posture=JOS3Defaults.posture] - Select posture from standing, sitting, lying, sedentary or supine. The default is "standing".
 * @param {math.Matrix} [v=JOS3Defaults.air_speed] - Air velocity [m/s]. If Iterable is input, its length should be 17. The default is 0.1.
 * @param {math.Matrix} [tdb=JOS3Defaults.dry_bulb_air_temperature] - Air temperature [°C]. If Iterable is input, its length should be 17. The default is 28.8.
 * @param {math.Matrix} [t_skin=JOS3Defaults.skin_temperature] - Skin temperature [°C]. If Iterable is input, its length should be 17. The default is 34.0.
 *
 * @returns {math.Matrix} Convective heat transfer coefficient (hc) [W/(m2*K)].
 *
 * @see {@link https://doi.org/10.3130/aija.62.45_5 | Ichihara et al., 1997}
 * @see {@link https://doi.org/10.20718/jjpa.13.1_17 | Kurazumi et al., 2008}
 */
export function conv_coef(posture?: string, v?: math.Matrix, tdb?: math.Matrix, t_skin?: math.Matrix): math.Matrix;
import * as math from "mathjs";
//# sourceMappingURL=conv_coef.d.ts.map