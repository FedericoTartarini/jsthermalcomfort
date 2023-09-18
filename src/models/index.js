import { heat_index } from "./heat_index";
import { phs } from "./phs";
import { humidex } from "./humidex";
import { net } from "./net";
import { wbgt } from "./wbgt";
import { discomfort_index, discomfort_index_array } from "./discomfort_index";
import { two_nodes, two_nodes_array } from "./two_nodes";
import { set_tmp, set_tmp_array } from "./set_tmp";
import { wc } from "./wc";
import { adaptive_en, adaptive_en_array } from "./adaptive_en";
import { at } from "./at";
import { adaptive_ashrae, adaptive_ashrae_array } from "./adaptive_ashrae";
import { solar_gain } from "./solar_gain";
import { cooling_effect } from "./cooling_effect.js";

/**
 * @public
 * @name models
 * @docname Comfort Models
 */
export default {
  heat_index,
  phs,
  humidex,
  net,
  wbgt,
  discomfort_index,
  discomfort_index_array,
  two_nodes,
  two_nodes_array,
  wc,
  adaptive_en,
  adaptive_en_array,
  at,
  set_tmp,
  set_tmp_array,
  adaptive_ashrae,
  adaptive_ashrae_array,
  solar_gain,
  cooling_effect,
};
