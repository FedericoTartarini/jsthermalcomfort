# pmv_ppd_ashrae

Deviations of `pmv_ppd_ashrae` from pythermalcomfort v4.7.0. The format is in the [README](README.md).

| id  | part | upstream site | TS site | reason | class/ADR | status | date | parity |
| --- | ---- | ------------- | ------- | ------ | --------- | ------ | ---- | ------ |

## Notes

- `src/models/pmv_ppd_ashrae.ts` `pmv_ppd_ashrae`: upstream's ppd, `100.0 - 95.0 * np.exp(-0.03353 * pmv_array**4.0 - 0.2179 * pmv_array**2.0)`, runs through numpy, whose float exponent is the C library's `pow`, so it keeps `Math.pow`, as `pmv_ppd_iso`'s register measures for the same line (ADR 0009); the kernel is `pmv_ppd_iso`'s, and `cooling_effect` is the model, as their registers note. `tdb - ce`, `tr - ce` and the comparisons are correctly rounded, so they have no site. In the parity data, all 307 rounded cases with a finite pmv agree exactly, and of the 295 unrounded ones 283 pmv and 283 ppd are bit-identical, at most 1.8e-15 and 5.7e-14 apart, on Node 24.21.0 and 26.8.2; on Node 22.13.0 and 22.23.4, 274 pmv and 275 ppd, at most 3.6e-14 and 1.9e-12 apart.
- `src/models/pmv_ppd_ashrae.ts` `pmv_ppd_ashrae`: upstream's `np.asarray` calls, its `np.where` on `all_valid`, its `np.asarray(compliance_array, dtype=object)` with the comment above it, "Ensure object dtype for compliance array", and `_finalize_scalar_or_array` have no counterpart, since the model takes scalars (ADR 0019, whitelist items 8 and 9). `np.where(vr > 0.1, cooling_effect(…).ce, 0.0)` evaluates `cooling_effect` whatever `vr` is, so the library calls it on every call too and takes its `ce` only above 0.1 m/s. `units_converter(tdb=tdb, tr=tr, v=vr)` takes `from_units`' default, IP, which the library's positional call `units_converter(Units.IP, { tdb, tr, v: vr })` passes explicitly, with upstream's key `v`.
- `src/models/pmv_ppd_ashrae.ts` `pmv_ppd_ashrae`: upstream's still-air 0.1 m/s, in `vr > 0.1` and `np.where(ce > 0, 0.1, vr)` (`models/pmv_ppd_ashrae.py:175, :182`), is `ASHRAE_55_STILL_AIR_THRESHOLD` (`src/_internal/ashrae55.ts`), the speed `cooling_effect` reads too, as its register notes; the comment above them ties it to ASHRAE 55 ("if v_r is higher than 0.1 follow methodology ASHRAE Appendix H, H3", `:173`).
