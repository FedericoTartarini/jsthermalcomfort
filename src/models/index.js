import { heat_index } from "./heat_index.js";
import { phs } from "./phs.js";
import { humidex } from "./humidex.js";
import { net } from "./net.js";
import { wbgt } from "./wbgt.js";
import { discomfort_index } from "./discomfort_index.js";
import { two_nodes } from "./two_nodes.js";
import { set_tmp } from "./set_tmp.js";
import { wc } from "./wc.js";
import { adaptive_en } from "./adaptive_en.js";
import { at } from "./at.js";
import { pmv_ppd } from "./pmv_ppd.js";
import { pmv_ppd_ashrae } from "./pmv_ppd_ashrae.js";
import { pmv_ppd_iso } from "./pmv_ppd_iso.js";
import { adaptive_ashrae } from "./adaptive_ashrae.js";
import { solar_gain } from "./solar_gain.js";
import { cooling_effect } from "./cooling_effect.js";
import { athb } from "./athb.js";
import { pmv } from "./pmv.js";
import { a_pmv } from "./a_pmv.js";
import { ankle_draft } from "./ankle_draft.js";
import { e_pmv } from "./e_pmv.js";
import { vertical_tmp_grad_ppd } from "./vertical_tmp_grad_ppd.js";
import { use_fans_heatwaves } from "./use_fans_heatwave.js";
import { clo_tout } from "./clo_tout.js";
import { utci } from "./utci.js";
import { pet_steady } from "./pet_steady.js";
import { JOS3 } from "./JOS3.js";

/**
 * @public
 * @name models
 * @docname Comfort Models
 */
export default {
  adaptive_ashrae,
  adaptive_en,
  a_pmv,
  athb,
  e_pmv,
  at,
  ankle_draft,
  clo_tout,
  cooling_effect,
  discomfort_index,
  heat_index,
  humidex,
  net,
  phs,
  pet_steady,
  pmv_ppd,
  pmv_ppd_ashrae,
  pmv_ppd_iso,
  pmv,
  solar_gain,
  set_tmp,
  two_nodes,
  utci,
  use_fans_heatwaves,
  vertical_tmp_grad_ppd,
  wbgt,
  wc,
  JOS3,
};
