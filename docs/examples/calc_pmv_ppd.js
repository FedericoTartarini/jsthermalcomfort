import { pmv_ppd } from "../../src/models/pmv_ppd.js";
import {
  v_relative,
  clo_dynamic,
  met_typical_tasks,
  clo_individual_garments,
} from "../../src/utilities/utilities.js";

const tdb = 27; // dry bulb air temperature, °C
const tr = 25; // mean radiant temperature, °C
const v = 0.3; // average air speed, m/s
const rh = 50; // relative humidity, %
const activity = "Typing"; // participant's activity description
const garments = ["Sweatpants", "T_shirt", "Shoes_or_sandals"];

// activity met, [met]
const met = met_typical_tasks[activity];
// calculate total clothing insulation
let icl = garments.reduce(
  (acc, item) => acc + clo_individual_garments[item],
  0,
);

// calculate the relative air velocity
const vr = v_relative(v, met);
// calculate the dynamic clothing insulation
const clo = clo_dynamic(icl, met);

// calculate PMV in accordance with the ASHRAE 55 2020
const results_pmv_ppd = pmv_ppd(tdb, tr, vr, rh, met, clo, undefined, "ASHRAE");

//print the results
console.log(results_pmv_ppd);

//print PMV and PPD value
console.log("pmv=" + results_pmv_ppd.pmv + ", ppd=" + results_pmv_ppd.ppd);

//for users who want to use the IP system
const results_ip = pmv_ppd(77, 77, 0.6, 50, 1.1, 0.5, undefined, undefined, {
  units: "IP",
});
console.log(results_ip);

//------------------------------------------------------------------------------------------
//If you want you can also pass an array of inputs
import { pmv_ppd_array } from "../../src/models/pmv_ppd.js";
import {
  v_relative_array,
  clo_dynamic_array,
} from "../../src/utilities/utilities.js";

const tdb_array = [25, 26, 27, 28, 29, 20, 21];
const tr_array = [25, 25, 25, 25, 25, 25, 25];
const vel_array = [0.15, 0.15, 0.15, 0.15, 0.15, 0.15];
const rh_array = [50, 50, 50, 50, 50, 50, 50];
const met_array = [1, 1.3, 1.6, 1.9, 2.2, 2.5, 2.8];
const clo_array = [1, 1, 1, 1, 1, 1, 1];

const v_rel = v_relative_array(vel_array, met_array);
const clo_d = clo_dynamic_array(clo_array, met_array);

const results_pmv_ppd_array = pmv_ppd_array(
  tdb_array,
  tr_array,
  v_rel,
  rh_array,
  met_array,
  clo_d,
  undefined,
  "ASHRAE",
  { units: "SI" },
);
console.log(results_pmv_ppd_array);

//------------------------------------------------------------------------------------------
// This method is extremely fast and can perform a lot of calculations in very little time
const iterations = 10000;
const tdb_test = new Array(iterations).fill(25); //tdb
const tr_test = new Array(iterations).fill(23); // tr
const rh_test = new Array(iterations).fill(40); //rh
const met_test = new Array(iterations).fill(1.5); //met

const v_rel_test = met_test.map((value) => v_relative(0.1, value)); //vr
const clo_d_test_ASHRAE = met_test.map((value) => clo_dynamic(1, value)); //clo with the standard of ASHRAE
const clo_d_test_ISO = met_test.map((value) => clo_dynamic(1, value, "ISO")); //clo with the standard of ISO

// ASHRAE PMV
const startAshrae = new Date().getTime();
pmv_ppd_array(
  tdb_test,
  tr_test,
  v_rel_test,
  rh_test,
  met_test,
  clo_d_test_ASHRAE,
  undefined,
  "ASHRAE",
);
const endAshrae = new Date().getTime();
console.log("ASHRAE PMV: " + (endAshrae - startAshrae) / 1000);

// ISO PMV
const startISO = new Date().getTime();
pmv_ppd_array(
  tdb_test,
  tr_test,
  v_rel_test,
  rh_test,
  met_test,
  clo_d_test_ISO,
  undefined,
  "ISO",
);
const endISO = new Date().getTime();
console.log("ISO PMV: " + (endISO - startISO) / 1000);
