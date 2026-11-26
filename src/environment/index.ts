/**
 * Functions for environmental calculations.
 *
 * @sortStrategy kind
 * @packageDocumentation
 */
// `kind` keeps the export order below, whose functions follow the page
// order of pythermalcomfort v4.8.1's `docs/documentation/environment.rst`.
import { f_svv } from "./f_svv.ts";
import { mean_radiant_tmp } from "./mean_radiant_tmp.ts";
import { operative_tmp } from "./operative_tmp.ts";
import { running_mean_outdoor_temperature } from "./running_mean_outdoor_temperature.ts";
import { scale_wind_speed_log } from "./scale_wind_speed_log.ts";
import { transpose_sharp_altitude } from "./transpose_sharp_altitude.ts";
import { v_relative } from "./v_relative.ts";

export type { ScaleWindSpeedLog } from "./scale_wind_speed_log.ts";

export {
  mean_radiant_tmp,
  operative_tmp,
  running_mean_outdoor_temperature,
  transpose_sharp_altitude,
  f_svv,
  v_relative,
  scale_wind_speed_log,
};

/**
 * The named exports as one object, for `import pkg from "jsthermalcomfort"`.
 * Each member is documented under its own name.
 *
 * @hidden
 */
export default {
  mean_radiant_tmp,
  operative_tmp,
  running_mean_outdoor_temperature,
  transpose_sharp_altitude,
  f_svv,
  v_relative,
  scale_wind_speed_log,
};
