---
title: Examples
---

# Examples

## Code snippets

Each function's page has a few examples.

## Example files

The two examples below follow pythermalcomfort's example files `examples/calc_phs.py` and `examples/calc_jos3.py`, with values printed instead of plotted.

### PHS

The rectal temperature `t_re` of {@link models.phs | `phs`} over a grid of air temperatures from 30 to 51 °C and relative humidities from 0 to 99 %.

```javascript
import { phs } from "jsthermalcomfort/models";

const tdb_array = Array.from({ length: 22 }, (_, i) => 30 + i); // 30 to 51 °C
const rh_array = Array.from({ length: 100 }, (_, i) => i); // 0 to 99 %

// t_re[rh][i] is the rectal temperature at rh and tdb_array[i]
const t_re = rh_array.map((rh) =>
  tdb_array.map(
    (tdb) =>
      phs({
        tdb,
        tr: tdb,
        rh,
        v: 0.3,
        met: 2,
        clo: 0.5,
        posture: "sitting",
      }).t_re,
  ),
);

// the row at 50 %
console.log(JSON.stringify(t_re[50]));
// [37.3,37.3,37.3,37.3,37.3,37.3,37.3,37.3,37.3,38.1,39.1,40.2,41.2,42.3,
// null,null,null,null,null,null,null,null]
```

`t_re` is `null` where an input or the water vapour partial pressure is outside ISO 7933's limits, and the outputs' `warnings` names it: at 44 °C and 50 %, the partial pressure is 4.55 kPa, above 4.5 kPa.

### JOS3

A simple simulation with {@link models.JOS3 | `JOS3`}: one hour at an operative temperature of 28 °C, then one hour at 20 °C.

```javascript
import { JOS3 } from "jsthermalcomfort/models";

// Build a model and set a body built: height 1.7 m, weight 60 kg, age 30
const model = new JOS3(1.7, 60, undefined, 30);

// Set the first phase
model.to = 28; // Operative temperature [°C]
model.rh = 40; // Relative humidity [%]
model.v = 0.2; // Air velocity [m/s]
model.par = 1.2; // Physical activity ratio [-]
model.simulate(60); // Exposure time = 60 [min]

// Set the next condition (You only need to change the parameters that you want to change)
model.to = 20; // Change only operative temperature
model.simulate(60); // Additional exposure time = 60 [min]

// Show the results: the mean skin temperature [°C] at the last step
const results = model.dict_results();
console.log(results.t_skin_mean.at(-1)); // 29.721938905082947

// Print the BMR value using the getter
console.log(model.bmr); // 44.633216149855436
console.log(model.body_names.join(", "));
// head, neck, chest, back, pelvis, left_shoulder, left_arm, left_hand,
// right_shoulder, right_arm, right_hand, left_thigh, left_leg, left_foot,
// right_thigh, right_leg, right_foot
```

A detailed simulation, with conditions set per body part: 30 minutes at an air temperature of 28 °C, 60 minutes at an operative temperature of 20 °C, then 30 minutes at an air temperature of 30 °C and a mean radiant temperature of 35 °C.

```javascript
import { JOS3 } from "jsthermalcomfort/models";

const model = new JOS3(
  1.7, // height [m]
  60, // weight [kg]
  20, // fat [%]
  30, // age [years]
  "male", // sex
  undefined, // ci, the default
  "japanese", // bmr_equation
  "fujimoto", // bsa_equation
  "all", // ex_output
);

// Set the first condition
model.tdb = 28; // Air temperature [°C]
model.tr = 30; // Mean radiant temperature [°C]
model.rh = 40; // Relative humidity [%]
model.v = [
  0.2, // head
  0.4, // neck
  0.4, // chest
  0.1, // back
  0.1, // pelvis
  0.4, // left shoulder
  0.4, // left arm
  0.4, // left hand
  0.4, // right shoulder
  0.4, // right arm
  0.4, // right hand
  0.1, // left thigh
  0.1, // left leg
  0.1, // left foot
  0.1, // right thigh
  0.1, // right leg
  0.1, // right foot
];
// Local clothing insulation [clo] of the ensemble "briefs, socks, undershirt,
// work jacket, work pants, safety shoes"
model.clo = {
  head: 0.0,
  neck: 0.0,
  chest: 1.25,
  back: 1.39,
  pelvis: 1.78,
  left_shoulder: 0.84,
  left_arm: 0.71,
  left_hand: 0.08,
  right_shoulder: 0.84,
  right_arm: 0.71,
  right_hand: 0.08,
  left_thigh: 0.65,
  left_leg: 0.59,
  left_foot: 1.12,
  right_thigh: 0.65,
  right_leg: 0.59,
  right_foot: 1.12,
};
model.par = 1.2; // Physical activity ratio [-], assuming a sitting position
model.posture = "sitting"; // Posture

// Run JOS-3 model
model.simulate(
  30, // Number of loops of a simulation
  60, // Time delta [sec]
); // Exposure time = 30 [loops] * 60 [sec] = 30 [min]

// Set the next condition (You only need to change the parameters that you want to change)
model.to = 20; // Change operative temperature
model.v = {
  // Air velocity [m/s], assuming to use a desk fan
  head: 0.2,
  neck: 0.4,
  chest: 0.4,
  back: 0.1,
  pelvis: 0.1,
  left_shoulder: 0.4,
  left_arm: 0.4,
  left_hand: 0.4,
  right_shoulder: 0.4,
  right_arm: 0.4,
  right_hand: 0.4,
  left_thigh: 0.1,
  left_leg: 0.1,
  left_foot: 0.1,
  right_thigh: 0.1,
  right_leg: 0.1,
  right_foot: 0.1,
};
model.simulate(60, 60); // Additional exposure time = 60 [loops] * 60 [sec] = 60 [min]

// Set the next condition
model.tdb = 30; // Change air temperature [°C]
model.tr = 35; // Change mean radiant temperature [°C]
model.simulate(30, 60); // Additional exposure time = 30 [loops] * 60 [sec] = 30 [min]

// Show the results: the skin temperatures [°C] at the last step
const results = model.dict_results();
console.log(results.t_skin_mean.at(-1)); // 35.640570595560185
console.log(results.t_skin_head.at(-1)); // 35.518773279214116
console.log(results.t_skin_chest.at(-1)); // 35.86780379148024
console.log(results.t_skin_left_hand.at(-1)); // 35.16151132163328
```
