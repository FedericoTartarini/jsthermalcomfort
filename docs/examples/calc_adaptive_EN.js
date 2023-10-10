import {
  adaptive_en,
  adaptive_en_array,
} from "../../src/models/adaptive_en.js";
import { running_mean_outdoor_temperature } from "../../src/utilities/utilities.js";

const result_adaptive_en = adaptive_en(25, 25, 24, 0.1);
console.table(result_adaptive_en);

const result_adaptive_en_array = adaptive_en_array(
  [22.5, 25],
  [22.5, 25],
  [24, 24],
  [0.1, 0.1],
);
console.table(result_adaptive_en_array);

console.table(result_adaptive_en_array.tmp_cmf);

const result_adaptive_en_ip = adaptive_en(72.5, 72.5, 75, 0.1, "IP");
console.table(result_adaptive_en_ip);

const rmt_value = running_mean_outdoor_temperature(
  [29, 28, 30, 29, 28, 30, 27],
  0.9,
);
const result_adaptive_en_rmt_value = adaptive_en(25, 25, rmt_value, 0.3);
console.table(result_adaptive_en_rmt_value);
