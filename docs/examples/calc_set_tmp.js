// In this example I am calculating the Standard Effective Temperature (SET) with the jsthermalcomfort package

import { set_tmp } from "../../src/models/set_tmp.js";

const set1 = set_tmp(25, 25, 0.3, 60, 1.2, 0.5); // returns 23.8
console.log(
  "When tdb is 25, tr is 25, v is 0.3, rh is 50, met is 1.2 and clo is 0.5. The SET is: " +
    set1,
);

const set2 = set_tmp(25, 25, 0.5, 60, 1.2, 0.5); // returns 22.8
console.log(
  "When tdb is 25, tr is 25, v is 0.5, rh is 60, met is 1.2 and clo is 0.5. The SET is: " +
    set2,
);

const set3 = set_tmp(
  77,
  77,
  0.6,
  60,
  1.2,
  0.5,
  undefined,
  undefined,
  undefined,
  undefined,
  "IP",
); // returns 76.3
console.log(
  "When tdb is 77, tr is 77, v is 0.6, rh is 60, met is 1.2 clo is 0.5 and unit is IP. The SET is: " +
    set3,
);
