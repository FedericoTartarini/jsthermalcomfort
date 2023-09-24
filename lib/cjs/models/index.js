"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const heat_index_js_1 = require("./heat_index.js");
const phs_js_1 = require("./phs.js");
const humidex_js_1 = require("./humidex.js");
const net_js_1 = require("./net.js");
const wbgt_js_1 = require("./wbgt.js");
const discomfort_index_js_1 = require("./discomfort_index.js");
const two_nodes_js_1 = require("./two_nodes.js");
const set_tmp_js_1 = require("./set_tmp.js");
const wc_js_1 = require("./wc.js");
const adaptive_en_js_1 = require("./adaptive_en.js");
const at_js_1 = require("./at.js");
const pmv_ppd_js_1 = require("./pmv_ppd.js");
const adaptive_ashrae_js_1 = require("./adaptive_ashrae.js");
const solar_gain_js_1 = require("./solar_gain.js");
const cooling_effect_js_1 = require("./cooling_effect.js");
const athb_js_1 = require("./athb.js");
const pmv_js_1 = require("./pmv.js");
const a_pmv_js_1 = require("./a_pmv.js");
/**
 * @public
 * @name models
 * @docname Comfort Models
 */
exports.default = {
    heat_index: heat_index_js_1.heat_index,
    phs: phs_js_1.phs,
    humidex: humidex_js_1.humidex,
    net: net_js_1.net,
    wbgt: wbgt_js_1.wbgt,
    discomfort_index: discomfort_index_js_1.discomfort_index,
    discomfort_index_array: discomfort_index_js_1.discomfort_index_array,
    two_nodes: two_nodes_js_1.two_nodes,
    two_nodes_array: two_nodes_js_1.two_nodes_array,
    wc: wc_js_1.wc,
    adaptive_en: adaptive_en_js_1.adaptive_en,
    adaptive_en_array: adaptive_en_js_1.adaptive_en_array,
    at: at_js_1.at,
    set_tmp: set_tmp_js_1.set_tmp,
    set_tmp_array: set_tmp_js_1.set_tmp_array,
    adaptive_ashrae: adaptive_ashrae_js_1.adaptive_ashrae,
    adaptive_ashrae_array: adaptive_ashrae_js_1.adaptive_ashrae_array,
    solar_gain: solar_gain_js_1.solar_gain,
    cooling_effect: cooling_effect_js_1.cooling_effect,
    pmv_ppd: pmv_ppd_js_1.pmv_ppd,
    pmv_ppd_array: pmv_ppd_js_1.pmv_ppd_array,
    pmv: pmv_js_1.pmv,
    pmv_array: pmv_js_1.pmv_array,
    athb: athb_js_1.athb,
    athb_array: athb_js_1.athb_array,
    a_pmv: a_pmv_js_1.a_pmv,
    a_pmv_array: a_pmv_js_1.a_pmv_array,
};
