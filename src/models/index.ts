import { heat_index_lu, HEAT_INDEX_LU_INFO } from "./heat_index_lu.ts";
import {
  heat_index_rothfusz,
  HEAT_INDEX_ROTHFUSZ_INFO,
} from "./heat_index_rothfusz.ts";
import {
  heat_index_schoen,
  HEAT_INDEX_SCHOEN_INFO,
} from "./heat_index_schoen.ts";
import { phs, PHS_INFO, PHS_LIMITS_ISO_7933 } from "./phs.ts";
import { humidex, HUMIDEX_INFO } from "./humidex.ts";
import { ireq, IREQ_INFO } from "./ireq.ts";
import {
  ridge_regression_predict_t_re_t_sk,
  RIDGE_REGRESSION_PREDICT_T_RE_T_SK_INFO,
} from "./ridge_regression_predict_t_re_t_sk.ts";
import { net, NET_INFO } from "./net.ts";
import { wbgt, WBGT_INFO } from "./wbgt.ts";
import { discomfort_index, DISCOMFORT_INDEX_INFO } from "./discomfort_index.ts";
import { esi, ESI_INFO } from "./esi.ts";
import { thi, THI_INFO } from "./thi.ts";
import { set_tmp, SET_TMP_INFO } from "./set_tmp.ts";
import { wci, WCI_INFO } from "./wci.ts";
import {
  wind_chill_temperature,
  WIND_CHILL_TEMPERATURE_INFO,
} from "./wind_chill_temperature.ts";
import { adaptive_en, ADAPTIVE_EN_INFO } from "./adaptive_en.ts";
import { at, AT_INFO } from "./at.ts";
import { pmv_ppd_ashrae, PMV_PPD_ASHRAE_INFO } from "./pmv_ppd_ashrae.ts";
import {
  pmv_ppd_iso,
  PMV_CATEGORY_BINS_ISO_7730,
  PMV_PPD_ISO_INFO,
} from "./pmv_ppd_iso.ts";
import { adaptive_ashrae, ADAPTIVE_ASHRAE_INFO } from "./adaptive_ashrae.ts";
import { solar_gain, SOLAR_GAIN_INFO } from "./solar_gain.ts";
import {
  _SportsValues,
  Sports,
  sports_heat_stress_risk,
  SPORTS_HEAT_STRESS_RISK_INFO,
} from "./sports_heat_stress_risk.ts";
import { cooling_effect, COOLING_EFFECT_INFO } from "./cooling_effect.ts";
import { pmv_a, PMV_A_INFO } from "./pmv_a.ts";
import { pmv_athb, PMV_ATHB_INFO } from "./pmv_athb.ts";
import { ankle_draft, ANKLE_DRAFT_INFO } from "./ankle_draft.ts";
import { pmv_e, PMV_E_INFO } from "./pmv_e.ts";
import {
  vertical_tmp_grad_ppd,
  VERTICAL_TMP_GRAD_PPD_INFO,
} from "./vertical_tmp_grad_ppd.ts";
import {
  use_fans_heatwaves,
  USE_FANS_HEATWAVES_INFO,
} from "./use_fans_heatwaves.ts";
import { clo_tout, CLO_TOUT_INFO } from "./clo_tout.ts";
import { utci, UTCI_INFO } from "./utci.ts";
import { two_nodes_gagge, TWO_NODES_GAGGE_INFO } from "./two_nodes_gagge.ts";
import {
  two_nodes_gagge_ji,
  TWO_NODES_GAGGE_JI_INFO,
} from "./two_nodes_gagge_ji.ts";
import {
  two_nodes_gagge_sleep,
  TWO_NODES_GAGGE_SLEEP_INFO,
} from "./two_nodes_gagge_sleep.ts";
import {
  work_capacity_dunne,
  WORK_CAPACITY_DUNNE_INFO,
} from "./work_capacity_dunne.ts";
import {
  work_capacity_hothaps,
  WORK_CAPACITY_HOTHAPS_INFO,
} from "./work_capacity_hothaps.ts";
import {
  work_capacity_iso,
  WORK_CAPACITY_ISO_INFO,
} from "./work_capacity_iso.ts";
import {
  work_capacity_niosh,
  WORK_CAPACITY_NIOSH_INFO,
} from "./work_capacity_niosh.ts";
import { pet_steady, PET_STEADY_INFO } from "./pet_steady.ts";
import { JOS3 } from "./JOS3.js";
import { classifyFromBins } from "../_internal/classifierBins.ts";

export type { ClassifierBins } from "../_internal/classifierBins.ts";
// deepFreeze is internal, so modelInfo contributes its types only.
export type {
  BoolField,
  Bound,
  ChoiceField,
  DerivedField,
  DerivedInfo,
  InputsInfo,
  InstanceField,
  Interval,
  ModelInfo,
  ModelOutputs,
  ModelWarning,
  NumericField,
  OutputField,
  OutputsInfo,
  StandardId,
  UnitSymbol,
} from "../_internal/modelInfo.ts";
export type { AdaptiveASHRAE, ASHRAEInputs } from "./adaptive_ashrae.ts";
export type { AdaptiveEN, ENInputs } from "./adaptive_en.ts";
export type { AnkleDraft, AnkleDraftInputs } from "./ankle_draft.ts";
export type { AT, ATInputs } from "./at.ts";
export type { CloTOut, CloTOutInputs } from "./clo_tout.ts";
export type { CE, CEInputs } from "./cooling_effect.ts";
export type { DI, DIInputs } from "./discomfort_index.ts";
export type { ESI, ESIInputs } from "./esi.ts";
export type { HILu, HILuInputs } from "./heat_index_lu.ts";
export type { HI, HIInputs } from "./heat_index_rothfusz.ts";
export type { HISchoenInputs } from "./heat_index_schoen.ts";
export type { Humidex, HumidexInputs } from "./humidex.ts";
export type { IREQ, IREQInputs } from "./ireq.ts";
export type {
  PredictedBodyTemperatures,
  RidgeRegressionInputs,
} from "./ridge_regression_predict_t_re_t_sk.ts";
export type { NET, NETInputs } from "./net.ts";
export type { PETSteady, PETSteadyInputs } from "./pet_steady.ts";
export type { APMV, APMVInputs } from "./pmv_a.ts";
export type { ATHB, ATHBInputs } from "./pmv_athb.ts";
export type { EPMV, EPMVInputs } from "./pmv_e.ts";
export type { PMVPPDAshrae, PMVPPDAshraeInputs } from "./pmv_ppd_ashrae.ts";
export type { PHS, PHSInputs } from "./phs.ts";
export type { PMVPPD, PMVPPDInputs } from "./pmv_ppd_iso.ts";
export type { SETInputs } from "./set_tmp.ts";
export type { SolarGain, SolarGainInputs } from "./solar_gain.ts";
export type {
  SportsHeatStressInputs,
  SportsHeatStressRisk,
} from "./sports_heat_stress_risk.ts";
export type { THI, THIInputs } from "./thi.ts";
export type {
  GaggeTwoNodes,
  GaggeTwoNodesInputs,
  SET,
} from "./two_nodes_gagge.ts";
export type {
  GaggeTwoNodesJi,
  GaggeTwoNodesJiInputs,
} from "./two_nodes_gagge_ji.ts";
export type {
  GaggeTwoNodesSleep,
  GaggeTwoNodesSleepInputs,
} from "./two_nodes_gagge_sleep.ts";
export type {
  UseFansHeatwaves,
  UseFansHeatwavesInputs,
} from "./use_fans_heatwaves.ts";
export type { UTCI, UTCIInputs } from "./utci.ts";
export type {
  VerticalTGradPPD,
  VerticalTGradPPDInputs,
} from "./vertical_tmp_grad_ppd.ts";
export type { WBGT, WBGTInputs } from "./wbgt.ts";
export type { WCI, WCIInputs } from "./wci.ts";
export type { WCT, WCTInputs } from "./wind_chill_temperature.ts";
export type {
  WorkCapacity,
  WorkCapacityDunneInputs,
} from "./work_capacity_dunne.ts";
export type { WorkCapacityHothapsInputs } from "./work_capacity_hothaps.ts";
export type { WorkCapacityStandardsInputs } from "./work_capacity_iso.ts";

export {
  adaptive_ashrae,
  ADAPTIVE_ASHRAE_INFO,
  adaptive_en,
  ADAPTIVE_EN_INFO,
  at,
  AT_INFO,
  ankle_draft,
  ANKLE_DRAFT_INFO,
  classifyFromBins,
  clo_tout,
  CLO_TOUT_INFO,
  cooling_effect,
  COOLING_EFFECT_INFO,
  discomfort_index,
  DISCOMFORT_INDEX_INFO,
  esi,
  ESI_INFO,
  heat_index_lu,
  HEAT_INDEX_LU_INFO,
  heat_index_rothfusz,
  HEAT_INDEX_ROTHFUSZ_INFO,
  heat_index_schoen,
  HEAT_INDEX_SCHOEN_INFO,
  humidex,
  HUMIDEX_INFO,
  ireq,
  IREQ_INFO,
  net,
  NET_INFO,
  phs,
  PHS_INFO,
  PHS_LIMITS_ISO_7933,
  pet_steady,
  PET_STEADY_INFO,
  pmv_ppd_ashrae,
  pmv_ppd_iso,
  PMV_CATEGORY_BINS_ISO_7730,
  PMV_PPD_ASHRAE_INFO,
  PMV_PPD_ISO_INFO,
  pmv_a,
  PMV_A_INFO,
  pmv_athb,
  PMV_ATHB_INFO,
  pmv_e,
  PMV_E_INFO,
  ridge_regression_predict_t_re_t_sk,
  RIDGE_REGRESSION_PREDICT_T_RE_T_SK_INFO,
  solar_gain,
  SOLAR_GAIN_INFO,
  _SportsValues,
  Sports,
  sports_heat_stress_risk,
  SPORTS_HEAT_STRESS_RISK_INFO,
  set_tmp,
  SET_TMP_INFO,
  thi,
  THI_INFO,
  two_nodes_gagge,
  two_nodes_gagge_ji,
  two_nodes_gagge_sleep,
  TWO_NODES_GAGGE_INFO,
  TWO_NODES_GAGGE_JI_INFO,
  TWO_NODES_GAGGE_SLEEP_INFO,
  utci,
  UTCI_INFO,
  use_fans_heatwaves,
  USE_FANS_HEATWAVES_INFO,
  vertical_tmp_grad_ppd,
  VERTICAL_TMP_GRAD_PPD_INFO,
  wbgt,
  WBGT_INFO,
  wci,
  WCI_INFO,
  wind_chill_temperature,
  WIND_CHILL_TEMPERATURE_INFO,
  work_capacity_dunne,
  WORK_CAPACITY_DUNNE_INFO,
  work_capacity_hothaps,
  WORK_CAPACITY_HOTHAPS_INFO,
  work_capacity_iso,
  WORK_CAPACITY_ISO_INFO,
  work_capacity_niosh,
  WORK_CAPACITY_NIOSH_INFO,
};

/**
 * The named exports as one object, for `import pkg from "jsthermalcomfort"`.
 * Each member is documented under its own name.
 *
 * @hidden
 */
export default {
  adaptive_ashrae,
  ADAPTIVE_ASHRAE_INFO,
  adaptive_en,
  ADAPTIVE_EN_INFO,
  at,
  AT_INFO,
  ankle_draft,
  ANKLE_DRAFT_INFO,
  classifyFromBins,
  clo_tout,
  CLO_TOUT_INFO,
  cooling_effect,
  COOLING_EFFECT_INFO,
  discomfort_index,
  DISCOMFORT_INDEX_INFO,
  esi,
  ESI_INFO,
  heat_index_lu,
  HEAT_INDEX_LU_INFO,
  heat_index_rothfusz,
  HEAT_INDEX_ROTHFUSZ_INFO,
  heat_index_schoen,
  HEAT_INDEX_SCHOEN_INFO,
  humidex,
  HUMIDEX_INFO,
  ireq,
  IREQ_INFO,
  net,
  NET_INFO,
  phs,
  PHS_INFO,
  PHS_LIMITS_ISO_7933,
  pet_steady,
  PET_STEADY_INFO,
  pmv_ppd_ashrae,
  pmv_ppd_iso,
  PMV_CATEGORY_BINS_ISO_7730,
  PMV_PPD_ASHRAE_INFO,
  PMV_PPD_ISO_INFO,
  pmv_a,
  PMV_A_INFO,
  pmv_athb,
  PMV_ATHB_INFO,
  pmv_e,
  PMV_E_INFO,
  ridge_regression_predict_t_re_t_sk,
  RIDGE_REGRESSION_PREDICT_T_RE_T_SK_INFO,
  solar_gain,
  SOLAR_GAIN_INFO,
  _SportsValues,
  Sports,
  sports_heat_stress_risk,
  SPORTS_HEAT_STRESS_RISK_INFO,
  set_tmp,
  SET_TMP_INFO,
  thi,
  THI_INFO,
  two_nodes_gagge,
  two_nodes_gagge_ji,
  two_nodes_gagge_sleep,
  TWO_NODES_GAGGE_INFO,
  TWO_NODES_GAGGE_JI_INFO,
  TWO_NODES_GAGGE_SLEEP_INFO,
  utci,
  UTCI_INFO,
  use_fans_heatwaves,
  USE_FANS_HEATWAVES_INFO,
  vertical_tmp_grad_ppd,
  VERTICAL_TMP_GRAD_PPD_INFO,
  wbgt,
  WBGT_INFO,
  wci,
  WCI_INFO,
  wind_chill_temperature,
  WIND_CHILL_TEMPERATURE_INFO,
  work_capacity_dunne,
  WORK_CAPACITY_DUNNE_INFO,
  work_capacity_hothaps,
  WORK_CAPACITY_HOTHAPS_INFO,
  work_capacity_iso,
  WORK_CAPACITY_ISO_INFO,
  work_capacity_niosh,
  WORK_CAPACITY_NIOSH_INFO,
  JOS3,
};
