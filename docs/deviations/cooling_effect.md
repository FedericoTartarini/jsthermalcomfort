# cooling_effect

Deviations of `cooling_effect` from pythermalcomfort v4.7.0. The format is in the [README](README.md).

| id  | part | upstream site | TS site | reason | class/ADR | status | date | parity |
| --- | ---- | ------------- | ------- | ------ | --------- | ------ | ---- | ------ |

## Notes

- `src/models/cooling_effect.ts` `_cooling_effect_vectorised`: upstream's `_set_for_cooling_effect` runs under numba, whose `math.exp` in `_p_sat_torr` is the C library's `exp`, where the library's `Math.exp` is V8's own (ADR 0009); it calls `_gagge_two_nodes_optimized`, as `two_nodes_gagge`'s register notes, and `optimize.brentq` is the library's port (deviation _shared-45). On 20,000 seeded cases (tdb 5-50 °C, tr 5-60 °C, vr 0-3 m/s, rh 0-100 %, met 0.7-4, clo 0-2, wme 0 or 0-1 met; numba 0.68.0 in the parity image, node v26.8.2), the unrounded `_ce` equals upstream's on 7,060, the others at most 1.1e-11 apart (7.5e-10 relative), and the rounded `ce` equals it on all 20,000; all 1,000 parity cases agree.
- `src/models/cooling_effect.ts` `cooling_effect`: upstream's `np.asarray` calls and its `@np.vectorize` on `_cooling_effect_vectorised` have no counterpart, since the model takes scalars (ADR 0019, whitelist items 8 and 9). `units_converter(tdb=tdb, tr=tr, v=vr)` takes `from_units`' default, IP, which the library's positional call `units_converter(Units.IP, { tdb, tr, v: vr })` passes explicitly, with upstream's key `v`.
- `src/models/cooling_effect.ts` `_cooling_effect_vectorised`: upstream's nested `function` is `func`, since `function` is a reserved word in JavaScript.
- `src/models/cooling_effect.ts` `_BODY_SURFACE_AREA`: upstream's `_BODY_SURFACE_AREA = 1.8258` and `_P_ATM = 101325` are, by their comment, "set_tmp()/two_nodes_gagge() defaults that cooling_effect() relies on", so the library reads them from `TWO_NODES_GAGGE_INFO.inputs`' defaults, one definition of the fact (decision 127). Upstream's still-air 0.1 m/s, written as `still_air_threshold = 0.1` and in `vr <= 0.1`, is `ASHRAE_55_STILL_AIR_THRESHOLD` (`src/_internal/ashrae55.ts`), as the docstring ties it to ASHRAE 55 and `pmv_ppd_ashrae` uses it too (`models/pmv_ppd_ashrae.py:173-182`); `still_air_threshold` keeps upstream's name and reads it.
