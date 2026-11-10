// The tag pythermalcomfort's tests/conftest.py pins, so a change to the
// fixture repository cannot move this suite before the pin is bumped with it.
// An unset or empty VALIDATION_DATA_REF takes the pin.
const validation_data_ref =
  process.env.VALIDATION_DATA_REF === undefined ||
  process.env.VALIDATION_DATA_REF === ""
    ? "v1.1.0"
    : process.env.VALIDATION_DATA_REF;
const unit_test_data_prefix = `https://raw.githubusercontent.com/FedericoTartarini/validation-data-comfort-models/${validation_data_ref}/`;

export const test_data_urls = {
  adaptiveEn: unit_test_data_prefix + "ts_adaptive_en.json",
  adaptiveAshrae: unit_test_data_prefix + "ts_adaptive_ashrae.json",
  aPmv: unit_test_data_prefix + "ts_a_pmv.json",
  ankleDraft: unit_test_data_prefix + "ts_ankle_draft.json",
  at: unit_test_data_prefix + "ts_at.json",
  athb: unit_test_data_prefix + "ts_athb.json",
  cloTout: unit_test_data_prefix + "ts_clo_tout.json",
  coolingEffect: unit_test_data_prefix + "ts_cooling_effect.json",
  discomfortIndex: unit_test_data_prefix + "ts_discomfort_index.json",
  ePmv: unit_test_data_prefix + "ts_e_pmv.json",
  heatIndex: unit_test_data_prefix + "ts_heat_index.json",
  humidex: unit_test_data_prefix + "ts_humidex.json",
  net: unit_test_data_prefix + "ts_net.json",
  petSteady: unit_test_data_prefix + "ts_pet_steady.json",
  phs: unit_test_data_prefix + "ts_phs.json",
  pmvPpd: unit_test_data_prefix + "ts_pmv_ppd.json",
  use_fans_heatwaves: unit_test_data_prefix + "ts_use_fans_heatwaves.json",
  utci: unit_test_data_prefix + "ts_utci.json",
  verticalTmpGradPpd: unit_test_data_prefix + "ts_vertical_tmp_grad_ppd.json",
  windChill: unit_test_data_prefix + "ts_wind_chill.json",
  windChillTemperature:
    unit_test_data_prefix + "ts_wind_chill_temperature.json",
  wbgt: unit_test_data_prefix + "ts_wbgt.json",
  twoNodes: unit_test_data_prefix + "ts_two_nodes_gagge.json",
  solarGain: unit_test_data_prefix + "ts_solar_gain.json",
  setTmp: unit_test_data_prefix + "ts_set.json",
};
