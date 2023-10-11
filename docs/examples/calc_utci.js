import { utci } from "https://cdn.jsdelivr.net/gh/FedericoTartarini/jsthermalcomfort/lib/esm/models/utci.js";

const result_utci_1 = utci(29, 30, 1, 60);
console.log(result_utci_1);

const result_utci_2 = utci(60, 30, 1, 60);
console.log(result_utci_2);

const result_utci_limit_inputs_False = utci(
  60,
  30,
  1,
  60,
  undefined,
  undefined,
  false,
);
console.log(result_utci_limit_inputs_False);

const result_utci_units_IP = utci(77, 77, 6.56168, 60, "IP");
console.log(result_utci_units_IP);

//------------------------------------------------------------------------------------------
// examples of array version
import { utci_array } from "https://cdn.jsdelivr.net/gh/FedericoTartarini/jsthermalcomfort/lib/esm/models/utci.js";

const result_utci_array = utci_array(
  [29, 29, 25],
  [30, 30, 25],
  [1, 2, 1],
  [60, 60, 50],
);
console.log(result_utci_array);

const result_utci_array_return_stress_category_True = utci_array(
  [29, 29, 25],
  [30, 30, 25],
  [1, 2, 1],
  [60, 60, 50],
  undefined,
  true,
);
console.log(result_utci_array_return_stress_category_True);
console.log(result_utci_array_return_stress_category_True.utci);
console.log(result_utci_array_return_stress_category_True.stress_category);

//------------------------------------------------------------------------------------------
const iterations = 10000;
const tdb = Array(iterations).fill(25);
const tr = Array(iterations).fill(30);
const v = Array(iterations).fill(1);
const rh = Array(iterations).fill(60);

const startTime = performance.now();
utci_array(tdb, tr, v, rh);
const endTime = performance.now();
console.log((endTime - startTime) / 1000);
