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

## Adjusted PMV with expectancy factor

Use `pmv_e` for the Python-aligned name; `e_pmv` remains available for existing
callers. The result field is still `e_pmv`. Pass relative air speed and intrinsic
clothing insulation appropriate to the calculation conditions.

```javascript
import { pmv_e } from "jsthermalcomfort";

const result = pmv_e(24, 30, 0.22, 50, 1.4, 0.5, 0.6);
console.log(result.e_pmv); // 0.29

// Same conditions in IP units. wme defaults to zero; units defaults to SI.
const imperial = pmv_e(75.2, 86, 0.72182, 50, 1.4, 0.5, 0.6, 0, {
  units: "IP",
});
console.log(imperial.e_pmv); // 0.29

// Batch calculations use the scalar function, not NumPy broadcasting.
const batch = [24, 30].map(
  (tdb) => pmv_e(tdb, 30, 0.22, 50, 1.4, 0.5, 0.6).e_pmv,
);
console.log(batch); // [0.29, 0.91]
```

`limit_inputs` defaults to `true`: an input combination outside ISO 7730
applicability returns `{ e_pmv: NaN }`. Pass `{ limit_inputs: false }` to
calculate outside that range. Invalid input types, arrays and non-finite input
numbers are rejected. The final result always uses two-decimal ties-to-even
rounding, following Python; there is no model-level `round_output` option.
