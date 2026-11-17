# Migrating from 1.4.0 to 2.0.0

2.0.0 follows pythermalcomfort v4.8.1: its function names, its inputs and its values, with the additions the deviation registers list. Change a 1.4.0 call in two steps: apply the rules below, which hold for every function, then look up the function in the tables further down.

```text
1.4.0                                       2.0.0
pmv_ppd_iso(25, 25, 0.1, 50, 1.2, 0.5)  →  pmv_ppd_iso({ tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 })
{ pmv: NaN }  outside the limits        →  { pmv: null, warnings: [ … ] }
NaN input: TypeError                    →  NaN input: RangeError
"ISO", "ASHRAE"                         →  "7730-2025", "55-2023"
lib/esm/… and lib/cjs/… paths           →  the root and five subpaths
```

Every example on this page was run on the published 1.4.0 and on the `development` build that becomes 2.0.0, and its comment shows the value printed.

## Rules for every function

### 1. A model takes one inputs object

A model takes one object whose keys are pythermalcomfort's keyword arguments, with the same defaults. The 1.4.0 options object (`kwargs` or `options`) is merged into it.

```javascript
// 1.4.0
pmv_ppd_iso(25, 25, 0.1, 50, 1.2, 0.5, 0, { round_output: false });

// 2.0.0
pmv_ppd_iso({
  tdb: 25,
  tr: 25,
  vr: 0.1,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  round_output: false,
});
```

Positional arguments, an unknown key and a missing required key each throw `TypeError`:

```javascript
pmv_ppd_iso(25, 25, 0.1, 50, 1.2, 0.5);
// TypeError: pmv_ppd_iso() takes one inputs object.
pmv_ppd_iso({
  tdb: 25,
  tr: 25,
  vr: 0.1,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  round: false,
});
// TypeError: round is not an input of pmv_ppd_iso().
pmv_ppd_iso({ tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2 });
// TypeError: clo is required.
```

A helper, such as `v_relative`, `p_sat` or `units_converter`, keeps pythermalcomfort's positional parameters:

```javascript
v_relative(0.1, 1.2); // 0.16 in 1.4.0 and 2.0.0
v_relative({ v: 0.1, met: 1.2 }); // 2.0.0: TypeError: v must be a number.
```

### 2. `null` for a missing output

Where 1.4.0 returned `NaN`, a model returns `null`. A yes/no output is `true`, `false` or `null`. The outputs of every model but `JOS3` include a `warnings` array, which says why: a `range` row names the input, its value and its bound.

```javascript
// 1.4.0
pmv_ppd_iso(35, 25, 0.1, 50, 1.2, 0.5);
// { pmv: NaN, ppd: NaN }
adaptive_en(25, 25, 5, 0.1).acceptability_cat_i; // false

// 2.0.0
pmv_ppd_iso({ tdb: 35, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 });
// { pmv: null, ppd: null, tsv: null, category: null, warnings: [
//   { kind: "range", key: "tdb", role: "input", value: 35, unit: "°C", bound: { min: 10, max: 30 } },
//   { kind: "range", key: "pa", role: "derived", value: 2811.8682377947644, unit: "Pa", bound: { min: 0, max: 2700 } } ] }
adaptive_en({ tdb: 25, tr: 25, t_running_mean: 5, v: 0.1 }).acceptability_cat_i; // null
```

`limit_inputs: false` still returns the value: `pmv` is 1.71 for the call above in 1.4.0 and 2.0.0.

A model's outputs are frozen. Assigning to them throws in a module or in strict mode; 1.4.0 let the assignment through.

```javascript
const r = pmv_ppd_iso({ tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 });
r.pmv = 1;
// TypeError: Cannot assign to read only property 'pmv' of object '#<Object>'
```

### 3. `RangeError` on a non-finite input

A model given `NaN`, `Infinity` or `-Infinity` throws `RangeError`, where 1.4.0 threw `TypeError`. This holds for every model in the models table below but `JOS3`. A value of the wrong type still throws `TypeError`.

```javascript
// 1.4.0
pmv_ppd_iso(NaN, 25, 0.1, 50, 1.2, 0.5);
// TypeError: Parameter "tdb" must be a valid finite number

// 2.0.0
pmv_ppd_iso({ tdb: NaN, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 });
// RangeError: tdb must be a finite number.
pmv_ppd_iso({ tdb: "25", tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 });
// TypeError: tdb must be a finite number.
```

A helper such as `p_sat` returns `NaN` for `NaN`, as in 1.4.0, and now throws `TypeError` for a string:

```javascript
p_sat(NaN); // NaN in 1.4.0 and 2.0.0
p_sat("25"); // 1.4.0: 0; 2.0.0: TypeError: tdb must be a number.
```

### 4. Versioned standard identifiers

`pmv_ppd_iso`, `pmv_ppd_ashrae`, `phs`, `clo_dynamic_ashrae` and `clo_dynamic_iso` take their standard as `standard`, a versioned identifier. The `Standard` constant holds them: `Standard.ashrae_55_2023` is `"55-2023"` and `Standard.iso_7730_2025` is `"7730-2025"`. `phs`'s `model` is now `standard`.

```javascript
// 1.4.0
pmv(25, 25, 0.1, 50, 1.2, 0.5, 0, "ASHRAE"); // { pmv: 0.08 }
phs(40, 40, 0.3, 33.85, 2.5, 0.5, "standing", 0, "7933-2004").t_re; // 37.5

// 2.0.0
pmv_ppd_ashrae({
  tdb: 25,
  tr: 25,
  vr: 0.1,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  standard: Standard.ashrae_55_2023,
}).pmv; // 0.08
phs({
  tdb: 40,
  tr: 40,
  v: 0.3,
  rh: 33.85,
  met: 2.5,
  clo: 0.5,
  posture: "standing",
  standard: "7933-2004",
}).t_re; // 37.5
```

An unversioned identifier throws:

```javascript
pmv_ppd_iso({
  tdb: 25,
  tr: 25,
  vr: 0.1,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  standard: "ISO",
});
// RangeError: PMV calculations can only be performed in compliance with ISO 7730-2005 or ISO 7730-2025
```

`operative_tmp` keeps pythermalcomfort's `"ISO"` and `"ASHRAE"`, now in any case: `operative_tmp(25, 30, 0.3, "ashrae")` is 27, as `t_o(25, 30, 0.3, "ASHRAE")` was. `mean_radiant_tmp` keeps `"Mixed Convection"` and `"ISO"`, in any case, as `t_mrt` did.

### 5. Import paths

Import a function by name, from the root or from the subpath of its pythermalcomfort module: `jsthermalcomfort/models`, `jsthermalcomfort/environment`, `jsthermalcomfort/clothing`, `jsthermalcomfort/psychrometrics` or `jsthermalcomfort/utilities`.

```javascript
// 1.4.0
import { pmv_ppd_iso, t_o } from "jsthermalcomfort";
import { pmv_ppd_iso } from "jsthermalcomfort/lib/esm/models/pmv_ppd_iso.js";

// 2.0.0
import { pmv_ppd_iso, operative_tmp } from "jsthermalcomfort";
import { pmv_ppd_iso } from "jsthermalcomfort/models";
import { operative_tmp } from "jsthermalcomfort/environment";
```

- Every path under `lib/` throws `ERR_PACKAGE_PATH_NOT_EXPORTED`, `lib/esm/index.js` and `lib/cjs/index.js` included: the package ships ES modules only, behind an exports map.
- A name kept from 1.4.0 is still exported from the root.
- The 1.4.0 `utilities` and `psychrometrics` held functions that now sit in `environment` or `clothing`: `v_relative`, `f_svv` and `running_mean_outdoor_temperature` from `utilities`, and `t_o` and `t_mrt` from `psychrometrics`, as `operative_tmp` and `mean_radiant_tmp`, are in `jsthermalcomfort/environment`; the clothing functions are in `jsthermalcomfort/clothing`.
- From 2.0.0-next.1: `clo_area_factor`, `clo_dynamic_ashrae`, `clo_dynamic_iso`, `clo_dynamic_iso_vr`, `clo_insulation_air_layer` and `clo_total_insulation` moved from `jsthermalcomfort/utilities` to `jsthermalcomfort/clothing`, with no alias. Their root names are unchanged.

## Function by function

One row per 1.4.0 export, under its 1.4.0 namespace. In the Parameters column, "Same keys" or "Same" means the 2.0.0 call takes the 1.4.0 parameters under the 1.4.0 names, once the rules above are applied. In the Returned values column, "Same" means the measured 2.0.0 call returned the 1.4.0 value.

### models

Each 2.0.0 name but `JOS3` is in `jsthermalcomfort/models` and the root, and its outputs include `warnings` (rule 2).

| 1.4.0                    | 2.0.0                    | Parameters                                                                                                                                                                                                     | Returned values                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `a_pmv`                  | `pmv_a`                  | Same keys; `units` and `limit_inputs` move out of `kwargs`.                                                                                                                                                    | Same: `{ a_pmv }`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `adaptive_ashrae`        | `adaptive_ashrae`        | Same keys.                                                                                                                                                                                                     | Same, in SI and IP.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `adaptive_en`            | `adaptive_en`            | Same keys.                                                                                                                                                                                                     | Same inside the limits. Outside them, the temperatures are `null` and the acceptabilities `null`, where 1.4.0 gave `NaN` and `false`.                                                                                                                                                                                                                                                                                                                                                 |
| `ankle_draft`            | `ankle_draft`            | Same keys, and a new `limit_inputs`, default `true`.                                                                                                                                                           | Same.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `at`                     | `at`                     | `round` becomes `round_output`.                                                                                                                                                                                | Same, with and without `q`.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `athb`                   | `pmv_athb`               | Same keys, and a new optional `clo`.                                                                                                                                                                           | Same: `{ athb_pmv }`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `clo_tout`               | `clo_tout`               | Same keys.                                                                                                                                                                                                     | Same.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `cooling_effect`         | `cooling_effect`         | Same keys.                                                                                                                                                                                                     | Same.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `discomfort_index`       | `discomfort_index`       | Same keys.                                                                                                                                                                                                     | Same.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `e_pmv`                  | `pmv_e`                  | Same keys; `units` and `limit_inputs` move out of `kwargs`.                                                                                                                                                    | Same: `{ e_pmv }`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `heat_index`             | `heat_index_rothfusz`    | `round` becomes `round_output`; `limit_inputs` stays; `units` is removed: convert IP inputs with `units_converter`.                                                                                            | Adds `stress_category`: `{ hi: 29.7, stress_category: "caution" }` for `tdb: 29, rh: 50`.                                                                                                                                                                                                                                                                                                                                                                                             |
| `humidex`                | `humidex`                | `round` becomes `round_output`; a new `model`, `"rana"` (default) or `"masterson"`.                                                                                                                            | Same.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `net`                    | `net`                    | `round` becomes `round_output`.                                                                                                                                                                                | Same.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `pet_steady`             | `pet_steady`             | `position` takes `"sitting"`, `"standing"` or `"standing, forced convection"` for 1, 2 and 3; `sex` takes `"male"` or `"female"` for 1 and 2. A number for either throws `TypeError`.                          | Same with the defaults (18.85). For `sex: "female"`, 18.88 where 1.4.0 gave 18.63. For `position: "standing"`, 18.75 where 1.4.0 threw "Newton Raphson did not converged". For `position: "standing, forced convection"`, 19.1 where 1.4.0 gave 20.48 for 3.                                                                                                                                                                                                                          |
| `phs`                    | `phs`                    | `posture` takes `"sitting"`, `"standing"` or `"crouching"`; a number throws `TypeError`. `model` becomes `standard`; `round` becomes `round_output`; the other `kwargs` keys become keys of the inputs object. | Same names. Under `"7933-2004"`, same. Under the default `"7933-2023"`, three outputs moved: `sweat_loss_g` 5847 to 5841.9, `sweat_rate_watt` 252.1 to 251.9 and `evap_load_wm2_min` 122044.5 to 121938.3, for `tdb: 40, rh: 33.85, met: 2.5`. With `round_output: false`, `t_re` is 37.50295 where 1.4.0 gave 37.49678. With `limit_inputs: false`, `met: 1e10` or `rh: 6e11` throws `Error: Max iterations exceeded`, where 1.4.0 returned `t_re` 49064452044.1 and 610158315730.4. |
| `pmv`                    | removed                  | Use `pmv_ppd_iso` or `pmv_ppd_ashrae`.                                                                                                                                                                         | Their `pmv` is the same value.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `pmv_ppd`                | removed                  | Use `pmv_ppd_iso` for `"ISO"`, `pmv_ppd_ashrae` for `"ASHRAE"`.                                                                                                                                                | Same `pmv` and `ppd`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `pmv_ppd_ashrae`         | `pmv_ppd_ashrae`         | `units`, `limit_inputs`, `airspeed_control` and `round_output` move out of `kwargs`; a new `standard`, `"55-2023"` only.                                                                                       | Adds `tsv` and `compliance`: `{ pmv: 0.08, ppd: 5.1, tsv: "Neutral", compliance: true }`.                                                                                                                                                                                                                                                                                                                                                                                             |
| `pmv_ppd_iso`            | `pmv_ppd_iso`            | `units`, `limit_inputs` and `round_output` move out of `kwargs`; a new `standard`, `"7730-2025"` (default) or `"7730-2005"`.                                                                                   | Adds `tsv` and `category`: `{ pmv: 0.08, ppd: 5.1, tsv: "Neutral", category: "I" }`. With `round_output: false`, `pmv` is 0.084137 where 1.4.0 gave 0.084252. Under `"7730-2005"`, `category` is `"A"` for the same call.                                                                                                                                                                                                                                                             |
| `set_tmp`                | `set_tmp`                | `body_position` becomes `position`; `round` becomes `round_output`; `calculate_ce` moves out of `kwargs`; `units` is removed: convert IP inputs with `units_converter`.                                        | Same in SI. 1.4.0's IP call for 77 °F gave 75.8 °F; 2.0.0 on the converted inputs gives 75.77 °F.                                                                                                                                                                                                                                                                                                                                                                                     |
| `solar_gain`             | `solar_gain`             | Same keys, and a new `round_output`, default `true`.                                                                                                                                                           | Same.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `two_nodes`              | `two_nodes_gagge`        | `body_position` becomes `position`; `p_atmospheric` becomes `p_atm`; `round` becomes `round_output`; `max_sweating`, `w_max` and `calculate_ce` move out of `kwargs`.                                          | Rounded to two decimals, where 1.4.0 rounded to one: `e_skin` 18.06 where 1.4.0 gave 18.1. Unrounded values agree to within 1e-14, under snake_case names where 1.4.0's unrounded outputs used camelCase (`eSkin`, `tCore`).                                                                                                                                                                                                                                                          |
| `use_fans_heatwaves`     | `use_fans_heatwaves`     | `body_position` becomes `position`; `round` becomes `round_output`; `limit_inputs` and `max_sweating` move out of `kwargs`; `units` is removed.                                                                | Same.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `utci`                   | `utci`                   | `return_stress_category` is removed; a new `round_output`, default `true`.                                                                                                                                     | Always has `stress_category`: `{ utci: 24.6, stress_category: "no thermal stress" }`.                                                                                                                                                                                                                                                                                                                                                                                                 |
| `vertical_tmp_grad_ppd`  | `vertical_tmp_grad_ppd`  | `units` is removed; new `round_output` and `limit_inputs`, default `true`.                                                                                                                                     | Same.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `wbgt`                   | `wbgt`                   | `tdb`, `with_solar_load` and `round_output` move out of `options`.                                                                                                                                             | Same, with and without solar load.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `wc`                     | `wci`                    | `round` becomes `round_output`.                                                                                                                                                                                | Same: `{ wci }`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `wind_chill_temperature` | `wind_chill_temperature` | Same keys.                                                                                                                                                                                                     | Same.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `JOS3`                   | `JOS3`                   | Unchanged. In 1.4.0 and 2.0.0 it is not a named export but `models.JOS3` of the default export.                                                                                                                | Same: `dict_results()` after ten 60-second steps at `tdb` 30 is identical.                                                                                                                                                                                                                                                                                                                                                                                                            |

### utilities

| 1.4.0                              | 2.0.0                                                     | Parameters                                                                                                                                                                                                                                           | Returned values                                                                                                                                        |
| ---------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `body_surface_area`                | `body_surface_area`                                       | Same. The new `BodySurfaceAreaEquations` holds the four `formula` names.                                                                                                                                                                             | Same. An unknown `formula` throws `RangeError`, where 1.4.0 threw `Error`.                                                                             |
| `check_standard_compliance`        | removed                                                   | Read the model's `warnings`.                                                                                                                                                                                                                         | A `range` row per input outside its bound, where 1.4.0 returned message strings.                                                                       |
| `clo_dynamic`                      | `clo_dynamic_ashrae` and `clo_dynamic_iso`, in `clothing` | `clo_dynamic(clo, met)` becomes `clo_dynamic_ashrae(clo, met)`. `clo_dynamic_iso(clo, met, v)` takes the air speed. `clo_dynamic_ashrae`'s `standard` takes `"55-2023"` and `clo_dynamic_iso`'s takes `"9920-2007"`; `"ASHRAE"` throws `RangeError`. | `clo_dynamic_ashrae(1, 2)` is 0.8, as `clo_dynamic(1, 2)` was. 1.4.0's `"ISO"` gave the ASHRAE value, 0.8; `clo_dynamic_iso(1, 2, 0.1)` gives 0.84018. |
| `clo_individual_garments`          | `clo_individual_garments`                                 | Keys are pythermalcomfort's garment names (table below).                                                                                                                                                                                             | Same values.                                                                                                                                           |
| `clo_typical_ensembles`            | `clo_typical_ensembles`                                   | An object, not a function: `clo_typical_ensembles["Trousers, long-sleeve shirt"]`. The nine keys are 1.4.0's nine names.                                                                                                                             | Same values.                                                                                                                                           |
| `f_svv`                            | `f_svv`, in `environment`                                 | Same.                                                                                                                                                                                                                                                | Same.                                                                                                                                                  |
| `met_typical_tasks`                | `met_typical_tasks`                                       | Keys are pythermalcomfort's task names (table below).                                                                                                                                                                                                | Same values.                                                                                                                                           |
| `running_mean_outdoor_temperature` | `running_mean_outdoor_temperature`, in `environment`      | Same.                                                                                                                                                                                                                                                | Same, in SI and IP.                                                                                                                                    |
| `units_converter`                  | `units_converter`                                         | Arguments swap: `units_converter(from_units, values)`. `from_units` has no default: `units_converter({ tdb: 77 })` throws `TypeError: from_units must be a string.`                                                                                  | Only the converted keys: `units_converter("IP", { tdb: 77, rh: 50 })` is `{ tdb: 25 }`, where 1.4.0 kept `rh`.                                         |
| `v_relative`                       | `v_relative`, in `environment`                            | Same.                                                                                                                                                                                                                                                | Rounding differs at a tie: `v_relative(0, 1.005)` is 0.001, where 1.4.0 gave 0.002.                                                                    |

### psychrometrics

| 1.4.0        | 2.0.0                                | Parameters                                                                             | Returned values                                                                                                                                                                                    |
| ------------ | ------------------------------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enthalpy`   | `enthalpy_air`                       | Same.                                                                                  | Same.                                                                                                                                                                                              |
| `p_sat`      | `p_sat`                              | Same.                                                                                  | Unrounded: `p_sat(25)` is 3169.2164701436163, where 1.4.0 gave 3169.2.                                                                                                                             |
| `p_sat_torr` | `p_sat_torr`                         | Same.                                                                                  | Same.                                                                                                                                                                                              |
| `psy_ta_rh`  | `psy_ta_rh`                          | Same.                                                                                  | `t_wb` becomes `wet_bulb_tmp` and `t_dp` becomes `dew_point_tmp`, with `dew_point_tmp`'s values (row `t_dp`). The other values are unrounded: `p_sat` 3169.2164701436163, where 1.4.0 gave 3169.2. |
| `t_dp`       | `dew_point_tmp`                      | Same.                                                                                  | Different values: 13.851583599891661 where 1.4.0 gave 13.8 at (25, 50), and 26.168845923147636 where 1.4.0 gave 26 at (30, 80).                                                                    |
| `t_mrt`      | `mean_radiant_tmp`, in `environment` | Same.                                                                                  | Unrounded: 86.55207537920296, where 1.4.0 gave 86.6.                                                                                                                                               |
| `t_o`        | `operative_tmp`, in `environment`    | `standard` is `"ISO"` or `"ASHRAE"` in any case, where 1.4.0 took the upper case only. | Same for a non-negative `v`. A negative `v` returns `NaN`, where 1.4.0 threw "v cannot be negative".                                                                                               |
| `t_wb`       | `wet_bulb_tmp`                       | Same.                                                                                  | Unrounded: 17.99814746834343, where 1.4.0 gave 18.                                                                                                                                                 |

### Renamed keys of the reference tables

The values are unchanged.

`met_typical_tasks`:

| 1.4.0                        | 2.0.0                           |
| ---------------------------- | ------------------------------- |
| `Seated_Cquiet`              | `"Seated, quiet"`               |
| `Reading_seated`             | `"Reading, seated"`             |
| `Standing_relaxed`           | `"Standing, relaxed"`           |
| `Filing_seated`              | `"Filing, seated"`              |
| `Flying_aircraft_routine`    | `"Flying aircraft, routine"`    |
| `Filing_standing`            | `"Filing, standing"`            |
| `Driving_a_car`              | `"Driving a car"`               |
| `Walking_about`              | `"Walking about"`               |
| `Table_sawing`               | `"Table sawing"`                |
| `Walking_2mph_3_2kmh`        | `"Walking 2mph (3.2kmh)"`       |
| `Lifting_packing`            | `"Lifting/packing"`             |
| `Seated_heavy_limb_movement` | `"Seated, heavy limb movement"` |
| `Light_machine_work`         | `"Light machine work"`          |
| `Flying_aircraft_combat`     | `"Flying aircraft, combat"`     |
| `Walking_3mph_4_8kmh`        | `"Walking 3mph (4.8kmh)"`       |
| `House_cleaning`             | `"House cleaning"`              |
| `Driving_heavy_vehicle`      | `"Driving, heavy vehicle"`      |
| `Walking_4mph_6_4kmh`        | `"Walking 4mph (6.4kmh)"`       |
| `Heavy_machine_work`         | `"Heavy machine work"`          |
| `Handling_100lb_45_kg_bags`  | `"Handling 100lb (45 kg) bags"` |
| `Pick_and_shovel_work`       | `"Pick and shovel work"`        |

The other ten keys are unchanged: `Sleeping`, `Reclining`, `Writing`, `Typing`, `Cooking`, `Dancing`, `Calisthenics`, `Tennis`, `Basketball` and `Wrestling`.

`clo_individual_garments`:

| 1.4.0                               | 2.0.0                                    |
| ----------------------------------- | ---------------------------------------- |
| `Metal_chair`                       | `"Metal chair"`                          |
| `Wooden_stool`                      | `"Wooden stool"`                         |
| `Ankle_socks`                       | `"Ankle socks"`                          |
| `Shoes_or_sandals`                  | `"Shoes or sandals"`                     |
| `Panty_hose`                        | `"Panty hose"`                           |
| `Calf_length_socks`                 | `"Calf length socks"`                    |
| `Women_underwear`                   | `"Women's underwear"`                    |
| `Men_underwear`                     | `"Men's underwear"`                      |
| `Knee_socks_thick`                  | `"Knee socks (thick)"`                   |
| `Short_shorts`                      | `"Short shorts"`                         |
| `Walking_shorts`                    | `"Walking shorts"`                       |
| `T_shirt`                           | `"T-shirt"`                              |
| `Standard_office_chair`             | `"Standard office chair"`                |
| `Executive_chair`                   | `"Executive chair"`                      |
| `Sleeveless_scoop_neck_blouse`      | `"Sleeveless scoop-neck blouse"`         |
| `Half_slip`                         | `"Half slip"`                            |
| `Long_underwear_bottoms`            | `"Long underwear bottoms"`               |
| `Full_slip`                         | `"Full slip"`                            |
| `Short_sleeve_knit_shirt`           | `"Short-sleeve knit shirt"`              |
| `Sleeveless_vest_thin`              | `"Sleeveless vest (thin)"`               |
| `Sleeveless_vest_thick`             | `"Sleeveless vest (thick)"`              |
| `Sleeveless_short_gown_thin`        | `"Sleeveless short gown (thin)"`         |
| `Short_sleeve_dress_shirt`          | `"Short-sleeve dress shirt"`             |
| `Sleeveless_long_gown_thin`         | `"Sleeveless long gown (thin)"`          |
| `Long_underwear_top`                | `"Long underwear top"`                   |
| `Thick_skirt`                       | `"Thick skirt"`                          |
| `Long_sleeve_dress_shirt`           | `"Long-sleeve dress shirt"`              |
| `Long_sleeve_flannel_shirt`         | `"Long-sleeve flannel shirt"`            |
| `Long_sleeve_sweat_shirt`           | `"Long-sleeve sweat shirt"`              |
| `Short_sleeve_hospital_gown`        | `"Short-sleeve hospital gown"`           |
| `Short_sleeve_short_robe_thin`      | `"Short-sleeve short robe (thin)"`       |
| `Short_sleeve_pajamas`              | `"Short-sleeve pajamas"`                 |
| `Long_sleeve_long_gown`             | `"Long-sleeve long gown"`                |
| `Long_sleeve_short_wrap_robe_thick` | `"Long-sleeve short wrap robe (thick)"`  |
| `Long_sleeve_pajamas_thick`         | `"Long-sleeve pajamas (thick)"`          |
| `Long_sleeve_long_wrap_robe_thick`  | `"Long-sleeve long wrap robe (thick)"`   |
| `Thin_trousers`                     | `"Thin trousers"`                        |
| `Thick_trousers`                    | `"Thick trousers"`                       |
| `Thin_skirt`                        | `"Thin skirt"`                           |
| `Long_sleeve_shirt_dress_thin`      | `"Long-sleeve shirt dress (thin)"`       |
| `Long_sleeve_shirt_dress_thick`     | `"Long-sleeve shirt dress (thick)"`      |
| `Short_sleeve_shirt_dress`          | `"Short-sleeve shirt dress"`             |
| `Sleeveless_scoop_neck_shirt_thin`  | `"Sleeveless, scoop-neck shirt (thin)"`  |
| `Sleeveless_scoop_neck_shirt_thick` | `"Sleeveless, scoop-neck shirt (thick)"` |
| `Long_sleeve_shirt_thin`            | `"Long sleeve shirt (thin)"`             |
| `Long_sleeve_shirt_thick`           | `"Long sleeve shirt (thick)"`            |
| `Single_breasted_coat_thin`         | `"Single-breasted coat (thin)"`          |
| `Single_breasted_coat_thick`        | `"Single-breasted coat (thick)"`         |
| `Double_breasted_coat_thin`         | `"Double-breasted coat (thin)"`          |
| `Double_breasted_coat_thick`        | `"Double-breasted coat (thick)"`         |

The other six keys are unchanged: `Bra`, `Slippers`, `Boots`, `Sweatpants`, `Overalls` and `Coveralls`.

## New in 2.0.0

- **models:** `esi`, `heat_index_lu`, `heat_index_schoen`, `ireq`, `ridge_regression_predict_t_re_t_sk`, `sports_heat_stress_risk`, `thi`, `two_nodes_gagge_ji`, `two_nodes_gagge_sleep`, `work_capacity_dunne`, `work_capacity_hothaps`, `work_capacity_iso` and `work_capacity_niosh`. Each model but `JOS3` has a `*_INFO` constant that describes its inputs and outputs, with their units and defaults, such as `PMV_PPD_ISO_INFO`. Also `PMV_CATEGORY_BINS_ISO_7730`, `PHS_LIMITS_ISO_7933`, `Sports`, `_SportsValues` and `classifyFromBins`. `_SportsValues` is upstream's name.
- **environment:** `scale_wind_speed_log` and `transpose_sharp_altitude`.
- **clothing:** `clo_area_factor`, `clo_correction_factor_environment`, `clo_dynamic_iso_vr`, `clo_insulation_air_layer`, `clo_intrinsic_insulation_ensemble` and `clo_total_insulation`.
- **psychrometrics:** `antoine`, `hr_to_rh`, `rh_from_dew_point`, `rh_from_vapour_pressure` and `rh_from_wet_bulb`.
- **utilities:** the constants `Standard`, `Units`, `Postures`, `Sex`, `WorkIntensity`, `BodySurfaceAreaEquations`, `DefaultSkinTemperature`, `CLO_INDIVIDUAL_GARMENT_GROUPS` and `f_r_garments`, and the physical constants `c_to_k`, `cp_air`, `cp_vapour`, `cp_water`, `g`, `h_fg`, `met_to_w_m2` and `r_air`.
