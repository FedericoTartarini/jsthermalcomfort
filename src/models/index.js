import { heat_index } from "./heat_index.js";
import { phs } from "./phs.js";
import { humidex } from "./humidex.js";
import { net } from "./net.js";
import { wbgt } from "./wbgt.js";
import {
  discomfort_index,
  discomfort_index_array,
} from "./discomfort_index.js";
import { two_nodes, two_nodes_array } from "./two_nodes.js";
import { set_tmp, set_tmp_array } from "./set_tmp.js";
import { wc } from "./wc.js";
import { adaptive_en, adaptive_en_array } from "./adaptive_en.js";
import { at } from "./at.js";
import { pmv_ppd, pmv_ppd_array } from "./pmv_ppd.js";
import { adaptive_ashrae, adaptive_ashrae_array } from "./adaptive_ashrae.js";
import { solar_gain } from "./solar_gain.js";
import { cooling_effect } from "./cooling_effect.js";
import { athb, athb_array } from "./athb.js";
import { pmv, pmv_array } from "./pmv.js";
import { a_pmv, a_pmv_array } from "./a_pmv.js";
import { ankle_draft } from "./ankle_draft.js";
import { e_pmv, e_pmv_array } from "./e_pmv.js";
import { vertical_tmp_grad_ppd } from "./vertical_tmp_grad_ppd";
import { use_fans_heatwaves } from "./use_fans_heatwave.js";

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
  vertical_tmp_grad_ppd,
  set_tmp,
  set_tmp_array,
  adaptive_ashrae,
  adaptive_ashrae_array,
  solar_gain,
  cooling_effect,
  pmv_ppd,
  pmv_ppd_array,
  pmv,
  pmv_array,
  athb,
  athb_array,
  a_pmv,
  a_pmv_array,
  ankle_draft,
  e_pmv,
  e_pmv_array,
  use_fans_heatwaves,
};
