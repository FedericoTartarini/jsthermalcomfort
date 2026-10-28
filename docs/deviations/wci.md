# wci

Deviations of `wci` from pythermalcomfort v4.7.0. The format is in the [README](README.md).

| id    | part        | upstream site | TS site                            | reason                                                                                                                                                                                                                                             | class/ADR                       | status   | date       | parity |
| ----- | ----------- | ------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------- | ---------- | ------ |
| wci-1 | v2-addition | none          | `src/models/wci.ts` `WCI_INFO`     | `WCI_INFO`, which holds every keyword argument with its kind, unit and default, and the output's unit. `standards` is `[]`: the model's one reference key, `[ashrae2017]`, is the ASHRAE Handbook Fundamentals, which no member of `Models` names. | addition: model info (ADR 0024) | approved | 2026-10-29 | none   |
| wci-2 | v2-addition | none          | `src/models/wci.ts` `WCI.warnings` | The result's `warnings`, which `WCI` takes from `ModelOutputs`, is always empty: upstream checks no range and calls no `warnings.warn`.                                                                                                            | addition: warnings (ADR 0024)   | approved | 2026-10-29 | none   |

## Notes

- `src/models/wci.ts` `wci`: upstream's `v**0.5` is numpy's float64 power on a 0-d array, the C library's `pow`, where the library's `v ** 0.5` is V8's own (ADR 0009). On 100,000 (`tdb`, `v`) drawn from [-60, 40) °C and [0, 40) m/s, half of them rounded to one decimal, and 8 chosen points (`v` 0, 1e-12 and 100 m/s, `tdb` 33 °C), the unrounded `wci` equals upstream's on all 100,008, as it does with `Math.sqrt(v)` (numpy 2.5.4 in the parity image, node v26.8.2). In the parity data, all 478 unrounded and all 522 rounded cases equal upstream's.
- `src/models/wci.ts` `wci`: upstream's `np.asarray(tdb)` and `np.asarray(v)` have no counterpart, since the model takes scalars (ADR 0019, whitelist item 8). A negative `v` gives NaN, as upstream's does; numpy's `RuntimeWarning` "invalid value encountered in power" has no counterpart (decision 86).
