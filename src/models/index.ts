import {
  heat_index_rothfusz,
  HEAT_INDEX_ROTHFUSZ_INFO,
} from "./heat_index_rothfusz.ts";
import { phs } from "./phs.js";
import { humidex } from "./humidex.js";
import { net } from "./net.js";
import { wbgt } from "./wbgt.js";
import { discomfort_index } from "./discomfort_index.js";
import { two_nodes } from "./two_nodes.js";
import { set_tmp } from "./set_tmp.js";
import { wc } from "./wc.js";
import { wind_chill_temperature } from "./wind_chill_temperature.js";
import { adaptive_en } from "./adaptive_en.js";
import { at } from "./at.js";
import { pmv_ppd_ashrae, PMV_PPD_ASHRAE_INFO } from "./pmv_ppd_ashrae.ts";
import { pmv_ppd_iso, PMV_PPD_ISO_INFO } from "./pmv_ppd_iso.ts";
import { adaptive_ashrae, ADAPTIVE_ASHRAE_INFO } from "./adaptive_ashrae.ts";
import { solar_gain, SOLAR_GAIN_INFO } from "./solar_gain.ts";
import { cooling_effect } from "./cooling_effect.ts";
import { athb } from "./athb.js";
import { pmv } from "./pmv.js";
import { a_pmv } from "./a_pmv.js";
import { ankle_draft } from "./ankle_draft.js";
import { e_pmv } from "./e_pmv.js";
import { vertical_tmp_grad_ppd } from "./vertical_tmp_grad_ppd.js";
import { use_fans_heatwaves } from "./use_fans_heatwave.js";
import { clo_tout, CLO_TOUT_INFO } from "./clo_tout.ts";
import { utci, UTCI_INFO } from "./utci.ts";
import { pet_steady } from "./pet_steady.js";
import { JOS3 } from "./JOS3.js";
import {
  PMV_CATEGORY_BINS_ISO_7730_2005,
  PMV_CATEGORY_BINS_ISO_7730_2025,
  PMV_COMPLIANCE_INTERVAL_ASHRAE,
  PMV_THERMAL_SENSATION_VOTE_BINS_ISO,
  PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE,
} from "./pmv_ppd.ts";
import { classifyFromBins } from "../_internal/classifierBins.ts";

export type {
  BoolField,
  ChoiceField,
  InputsInfo,
  NumericField,
} from "../_internal/define.ts";
// deepFreeze is internal, so modelDocs contributes its types only.
export type {
  ApplicabilityWarning,
  Bound,
  ClassifierBins,
  ModelInfo,
  ModelResult,
  ModelWarning,
  OutputField,
  OutputInfo,
  UnitSymbol,
} from "../_internal/modelDocs.ts";
export type { AdaptiveASHRAE, ASHRAEInputs } from "./adaptive_ashrae.ts";
export type { CloTOut, CloTOutInputs } from "./clo_tout.ts";
export type {
  CoolingEffectParams,
  CoolingEffectResult,
} from "./cooling_effect.ts";
export type { HI, HIInputs } from "./heat_index_rothfusz.ts";
export type {
  PmvPpdAshraeParams,
  PmvPpdAshraeResult,
} from "./pmv_ppd_ashrae.ts";
export type { PmvPpdIsoParams, PmvPpdIsoResult } from "./pmv_ppd_iso.ts";
export type { SolarGain, SolarGainInputs } from "./solar_gain.ts";
export type { UTCI, UTCIInputs } from "./utci.ts";

/**
 * @public
 * @name models
 * @docname Comfort Models
 */
export {
  adaptive_ashrae,
  ADAPTIVE_ASHRAE_INFO,
  adaptive_en,
  a_pmv,
  athb,
  e_pmv,
  at,
  ankle_draft,
  classifyFromBins,
  clo_tout,
  CLO_TOUT_INFO,
  cooling_effect,
  discomfort_index,
  heat_index_rothfusz,
  HEAT_INDEX_ROTHFUSZ_INFO,
  humidex,
  net,
  phs,
  pet_steady,
  pmv_ppd_ashrae,
  pmv_ppd_iso,
  pmv,
  PMV_CATEGORY_BINS_ISO_7730_2005,
  PMV_CATEGORY_BINS_ISO_7730_2025,
  PMV_COMPLIANCE_INTERVAL_ASHRAE,
  PMV_PPD_ASHRAE_INFO,
  PMV_PPD_ISO_INFO,
  PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE,
  PMV_THERMAL_SENSATION_VOTE_BINS_ISO,
  solar_gain,
  SOLAR_GAIN_INFO,
  set_tmp,
  two_nodes,
  utci,
  UTCI_INFO,
  use_fans_heatwaves,
  vertical_tmp_grad_ppd,
  wbgt,
  wc,
  wind_chill_temperature,
};

export default {
  adaptive_ashrae,
  ADAPTIVE_ASHRAE_INFO,
  adaptive_en,
  a_pmv,
  athb,
  e_pmv,
  at,
  ankle_draft,
  classifyFromBins,
  clo_tout,
  CLO_TOUT_INFO,
  cooling_effect,
  discomfort_index,
  heat_index_rothfusz,
  HEAT_INDEX_ROTHFUSZ_INFO,
  humidex,
  net,
  phs,
  pet_steady,
  pmv_ppd_ashrae,
  pmv_ppd_iso,
  pmv,
  PMV_CATEGORY_BINS_ISO_7730_2005,
  PMV_CATEGORY_BINS_ISO_7730_2025,
  PMV_COMPLIANCE_INTERVAL_ASHRAE,
  PMV_PPD_ASHRAE_INFO,
  PMV_PPD_ISO_INFO,
  PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE,
  PMV_THERMAL_SENSATION_VOTE_BINS_ISO,
  solar_gain,
  SOLAR_GAIN_INFO,
  set_tmp,
  two_nodes,
  utci,
  UTCI_INFO,
  use_fans_heatwaves,
  vertical_tmp_grad_ppd,
  wbgt,
  wc,
  wind_chill_temperature,
  JOS3,
};
