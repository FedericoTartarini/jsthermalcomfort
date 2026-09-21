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
thi([30, 20], [70, 50]); // { thi: [81.4, 65.2] }
```

The optional third argument is `round_output`, a boolean defaulting to `true`.
Rounding to one decimal uses NumPy's ties-to-even rule: 65.25 becomes 65.2.
The result is an object with a `thi` field instead of a Python dataclass.

This implementation supports scalars and one-dimensional numeric arrays,
including scalar and single-element broadcasting. Nested arrays are not
supported. Non-finite values are rejected by the shared JS input validator.
Invalid types raise `TypeError`; humidity outside [0, 100] or incompatible
array lengths raise `RangeError` (used here for Python's `ValueError`).
Multidimensional broadcasting and non-finite input parity are awaiting
clarification in [#215](https://github.com/FedericoTartarini/jsthermalcomfort/issues/215).
