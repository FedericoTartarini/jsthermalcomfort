We developed a few [examples](https://github.com/FedericoTartarini/jsthermalcomfort/tree/main/docs/examples) files on how to use some of the functions.

Here is a list of examples running in the browser:
- [PHS](../examples/phs.html)
- [JOS3](../examples/jos3.html)
- [Heat Index](../examples/heat_index.html)
- [Humidex](../examples/humidex.html)
- [Solar Gain](../examples/solar_gain.html)
- [Adaptive ASHRAE](../examples/adaptive_ashrae.html)
- [Adaptive EN](../examples/adaptive_en.html)
- [PMV/PPD](../examples/pmv_ppd.html)
- [SET](../examples/set.html)
- [UTCI](../examples/utci.html)

## Temperature-Humidity Index (THI)

`thi` follows the equation, parameter names, defaults and result field of
`pythermalcomfort.models.thi`. Supply temperature in Celsius and relative
humidity in percent (0 to 100).

```javascript
import { thi } from "jsthermalcomfort";

thi(30, 70); // { thi: 81.4 }
thi(30, 70, false); // { thi: 81.38 }, without rounding
[30, 20].map((t, i) => thi(t, [70, 50][i]).thi); // [81.4, 65.2]
```

The optional third argument is `round_output`, a boolean defaulting to `true`.
Rounding to one decimal uses NumPy's ties-to-even rule: 65.25 becomes 65.2.
The result is an object with a `thi` field instead of a Python dataclass.

Inputs must be finite scalar numbers. Arrays (including one-dimensional arrays),
`NaN` and `Infinity` are rejected by the shared JS input validator. Use
`Array.map()` over the scalar function for multiple readings, as shown above.
Invalid types raise `TypeError`; humidity outside [0, 100] raises `RangeError`
(used here for Python's `ValueError`).

## Work Capacity (Dunne)

`work_capacity_dunne(wbgt, work_intensity = "heavy")` estimates work capacity
as a percentage using the same equation as `pythermalcomfort.models.work_capacity_dunne`.
100% means work is unaffected by heat; 0% means no work is done.

```javascript
import { work_capacity_dunne } from "jsthermalcomfort";

work_capacity_dunne(25); // { capacity: 100 }
work_capacity_dunne(30, "moderate").capacity; // approximately 53.7991
[20, 25, 35].map((t) => work_capacity_dunne(t).capacity); // [100, 100, 0]
```

Use a package version containing this model, or build the local checkout and
import from `./lib/esm/index.js`. WBGT is in Celsius and must be a finite scalar.
The case-insensitive work intensity choices are `"heavy"`, `"moderate"` and
`"light"`. Python's string enum values correspond to these strings in JS;
Python enum objects are not a JS input type. No extra rounding is applied.

The JS API is scalar-only: use `Array.map()` instead of NumPy broadcasting.
Arrays and non-finite WBGT inputs raise `TypeError`, as do non-string intensity
inputs. Unsupported intensity strings raise `RangeError`, corresponding to
Python's invalid-choice `ValueError`.
