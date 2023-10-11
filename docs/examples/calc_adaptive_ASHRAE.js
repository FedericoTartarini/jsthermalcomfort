import { adaptive_ashrae } from "https://cdn.jsdelivr.net/gh/FedericoTartarini/jsthermalcomfort/lib/esm/models/adaptive_ashrae.js";
import { running_mean_outdoor_temperature } from "https://cdn.jsdelivr.net/gh/FedericoTartarini/jsthermalcomfort/lib/esm/utilities/utilities.js";

const adaptive_ashrae1 = adaptive_ashrae(25, 25, 23, 0.3);
console.table(adaptive_ashrae1);
console.table(
  "When tdb is 25, tr is 25, t_running_mean is 23, v is 0.3. Acceptability_80: " +
    adaptive_ashrae1.acceptability_80,
);

const adaptive_ashrae2 = adaptive_ashrae(77, 77, 73.5, 1, "IP");
console.table(adaptive_ashrae2);
console.table(
  "When tdb is 77, tr is 77, t_running_mean is 73.5, v is 1, unit is IP. Acceptability_80: " +
    adaptive_ashrae2.acceptability_80,
);

const rmt_value = running_mean_outdoor_temperature(
  [29, 28, 30, 29, 28, 30, 27],
  0.9,
);
const adaptive_ashrae3 = adaptive_ashrae(25, 25, rmt_value, 0.3);
console.table(adaptive_ashrae3);
