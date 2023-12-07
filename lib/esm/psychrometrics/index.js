"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const p_sat_js_1 = require("./p_sat.js");
const p_sat_torr_js_1 = require("./p_sat_torr.js");
const t_o_js_1 = require("./t_o.js");
const enthalpy_js_1 = require("./enthalpy.js");
const t_wb_js_1 = require("./t_wb.js");
const t_dp_js_1 = require("./t_dp.js");
const t_mrt_js_1 = require("./t_mrt.js");
const psy_ta_rh_js_1 = require("./psy_ta_rh.js");
/**
 * @public
 * @name psychrometrics
 * @docname Psychrometrics
 */
exports.default = {
    p_sat: p_sat_js_1.p_sat,
    p_sat_torr: p_sat_torr_js_1.p_sat_torr,
    p_sat_torr_array: p_sat_torr_js_1.p_sat_torr_array,
    psy_ta_rh: psy_ta_rh_js_1.psy_ta_rh,
    t_o: t_o_js_1.t_o,
    t_o_array: t_o_js_1.t_o_array,
    enthalpy: enthalpy_js_1.enthalpy,
    t_wb: t_wb_js_1.t_wb,
    t_dp: t_dp_js_1.t_dp,
    t_mrt: t_mrt_js_1.t_mrt,
    t_mrt_array: t_mrt_js_1.t_mrt_array,
};
