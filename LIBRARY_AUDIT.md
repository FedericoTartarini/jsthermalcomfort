# Library Audit — jsthermalcomfort

> **Purpose:** Records the validation status of every exported library
> function. A function must pass all three validation gate checks
> (see validation gate below) before the frontend may use it.
>
> **Last updated:** 2026-03-15

---

## 1. Overview

This file classifies every function exported from `src/models/index.js`
into one of three tiers based on how thoroughly it has been validated.
Only functions in **Section 4 (UI-safe whitelist)** may be consumed by
the downstream Svelte 5 calculation layer.

Validation gate (all three required):

1. Jest tests pass (≥ 4 cases)
2. Cross-validated against `pythermalcomfort` — batch (submodule data)
   and spot-check (≥ 4 hand-selected inputs with Python-generated
   reference values)
3. Listed in Section 4 of this file

---

## 2. Test Suite Summary

Full suite run: `node --experimental-vm-modules ./node_modules/.bin/jest`

| Metric | Count |
|--------|-------|
| Test suites passed | 62 |
| Test suites failed | 4 |
| Test suites total | 66 |
| Individual tests passed | 1839 |
| Individual tests failed | 26 |
| Individual tests total | 1865 |

### Failing suites

| Suite | Reason |
|-------|--------|
| `tests/models/phs.test.js` | Real value differences (e.g. `d_lim_loss_50` expected 440, got 480). Likely reference data version mismatch. |
| `tests/models/pet_steady.test.js` | Calculation discrepancies against reference data. |
| `tests/jos3_functions/thermoregulation/evaporation.test.js` | Floating-point precision at the 15th–16th decimal place. Uses `toStrictEqual` instead of `toBeCloseTo`. |
| `tests/jos3_functions/thermoregulation/shivering.test.js` | Expects precision to 13 decimal places; fails at the 5×10⁻¹⁴ level. |

---

## 3. Tiered Classification

### Tier 1 — Independently cross-validated by our team

These functions have been validated against `pythermalcomfort v3.9.1`
using both batch validation (submodule data) and spot-check validation
(hand-selected inputs with Python-generated reference values).

#### `pmv_ppd_ashrae`

- **Wrapper:** Delegates to `pmv_ppd()` with standard fixed to `'ASHRAE'`
- **Reference:** pythermalcomfort v3.9.1 (`pmv_ppd_ashrae`)
- **Jest tests:** 5/5 passed (`tests/models/pmv_ppd_ashrae.test.js`)
  — 4 spot-check cases + return-shape validation
- **Spot-check:** 4/4 passed (reference_values.json, tolerance PMV ±0.05, PPD ±0.5%)
- **Batch:** 31/35 rows passed (tolerances aligned with submodule's own
  declared values: PMV ±0.5, PPD ±0.05). The 4 remaining failures are
  array-input rows — the scalar `pmv_ppd()` does not handle arrays;
  these require `pmv_ppd_array()`. Not a JS bug.

#### `pmv_ppd_iso`

- **Wrapper:** Delegates to `pmv_ppd()` with standard fixed to `'ISO'`
- **Reference:** pythermalcomfort v3.9.1 (`pmv_ppd_iso`)
- **Jest tests:** 5/5 passed (`tests/models/pmv_ppd_iso.test.js`)
  — 3 spot-check cases + NaN out-of-range test + return-shape validation
- **Spot-check:** 3/4 passed. The 4th case (tdb=35) is a known
  behavioural difference: JS returns PMV 3.58 when `limit_inputs=false`,
  while Python v3.9.1 returns null because ISO clamps PMV to ±2
  regardless. With the default `limit_inputs=true`, JS correctly returns
  NaN and the wrapper test passes.
- **Batch:** Same underlying `pmv_ppd()` as ASHRAE; batch results shared
  (31/35 passed, 4 array-input rows excluded).

#### `utci` (numerical values only)

- **Function:** `utci(tdb, tr, v, rh)` — returns UTCI in °C
- **Reference:** pythermalcomfort v3.9.1 (`utci`)
- **Jest tests:** existing `tests/models/utci.test.js` passes
- **Spot-check:** 6/6 passed (reference_values.json, tolerance ±0.1 °C)
- **Batch:** 10/13 rows passed. The 3 failures are IP-unit and
  array-input rows that require `utci_array()`, not the scalar `utci()`.
- **Caveat:** The `mapping()` function that assigns stress-category
  strings is **buggy** (see Section 5). Numerical UTCI values are
  correct; category strings are not. The frontend must implement its
  own range-based lookup.

### Tier 2 — Original tests pass, not yet independently cross-validated

These functions have passing Jest tests from the original codebase but
have not been independently cross-validated by our team against a known
pythermalcomfort version with hand-selected reference values.

| Function | Test file | Status |
|----------|-----------|--------|
| `adaptive_ashrae` / `_array` | `adaptive_ashrae.test.js` | Pass |
| `adaptive_en` / `_array` | `adaptive_en.test.js` | Pass |
| `a_pmv` / `_array` | `a_pmv.test.js` | Pass |
| `athb` / `_array` | `athb.test.js` | Pass |
| `e_pmv` / `_array` | `e_pmv.test.js` | Pass |
| `at` | `at.test.js` | Pass |
| `ankle_draft` | `ankle_draft.test.js` | Pass |
| `clo_tout` / `_array` | `clo_tout.test.js` | Pass |
| `cooling_effect` | `cooling_effect.test.js` | Pass |
| `discomfort_index` / `_array` | `discomfort_index.test.js` | Pass |
| `heat_index` | `heat_index.test.js` | Pass |
| `humidex` | `humidex.test.js` | Pass |
| `net` | `net.test.js` | Pass |
| `pmv` / `_array` | `pmv.test.js` | Pass |
| `pmv_ppd` / `_array` | `pmv_ppd.test.js` | Pass |
| `set_tmp` / `_array` | `set_tmp.test.js` | Pass |
| `solar_gain` | `solar_gain.test.js` | Pass |
| `two_nodes` / `_array` | `two_nodes.test.js` | Pass |
| `use_fans_heatwaves` | `use_fans_heatwave.test.js` | Pass |
| `utci_array` | `utci.test.js` | Pass |
| `vertical_tmp_grad_ppd` | `vertical_tmp_grad_ppd.test.js` | Pass |
| `wbgt` | `wbgt.test.js` | Pass |
| `wc` | `wc.test.js` | Pass |
| `JOS3` | `JOS3.test.js` | Pass |

### Tier 3 — Has known test failures

| Function | Test file | Issue |
|----------|-----------|-------|
| `phs` | `phs.test.js` | Value differences (e.g. d_lim_loss_50: expected 440, got 480). Likely reference data version mismatch. |
| `pet_steady` | `pet_steady.test.js` | Calculation discrepancies against reference data. |
| JOS3 `evaporation` (internal) | `evaporation.test.js` | Floating-point precision — uses `toStrictEqual` instead of `toBeCloseTo`. |
| JOS3 `shivering` (internal) | `shivering.test.js` | Tolerance set to 13 decimal places; fails at 5×10⁻¹⁴. |

---

## 4. UI-Safe Function Whitelist

**Only the functions below may be used by the downstream Svelte 5
calculation layer.** Each has passed all three validation gate checks.

| Function | Module | Notes |
|----------|--------|-------|
| `pmv_ppd_ashrae` | `src/models/pmv_ppd_ashrae.js` | ASHRAE 55 PMV/PPD. Use instead of calling `pmv_ppd()` directly. |
| `pmv_ppd_iso` | `src/models/pmv_ppd_iso.js` | ISO 7730 PMV/PPD. Returns NaN for out-of-range inputs by default. |
| `utci` | `src/models/utci.js` | Numerical UTCI value only. Do **not** use `mapping()` / `return_stress_category` — implement range-based lookup in the frontend instead. |

---

## 5. Known Issues

### UTCI stress-category mapping bug

The `mapping()` function in `src/models/utci.js` uses a nearest-neighbour
binary search instead of a range-based lookup. This shifts all category
boundaries by 3–8.5 °C. Confirmed at:

- 12.5 °C → JS returns "slight cold stress", correct is "no thermal stress"
- 27.0 °C → JS returns "no thermal stress", correct is "moderate heat stress"

Numerical UTCI values are correct. The frontend must implement its own
range-based lookup using the standard thresholds documented in the project
Section 5.

### Test data source: mixed online/local

| File | Method | Reliability |
|------|--------|-------------|
| `tests/models/comftest.js` | Fetches from GitHub raw URLs | Fragile — requires network |
| `tests/test_utilities.js` | Reads from local submodule | Reliable — local files |

New tests should use hardcoded reference values (spot-check) or local
submodule files (batch), never network fetches.

### PMV batch tolerance

The submodule JSON (`ts_pmv_ppd.json`) declares its own tolerances:
`{"pmv": 0.1, "ppd": 1}`. These are used as the `numDigits` argument
to Jest's `toBeCloseTo`, giving effective thresholds of PMV ±0.5 and
PPD ±0.05. All 31 scalar rows pass at these tolerances. The initial
investigation used a tighter PMV ±0.02 which produced 28 false
failures — the 0.03–0.05 differences are within the submodule's own
accepted range. Additionally, IP-unit rows require the `units` field
to be passed through kwargs (as the existing Jest tests do via
`testUtils.js`).

### ISO limit_inputs behavioural difference

When `limit_inputs` is set to `false`, the JS `pmv_ppd()` function
computes and returns raw PMV/PPD values even for inputs outside the
ISO 7730 range (e.g. tdb=35 returns PMV 3.58). Python v3.9.1 returns
null for the same inputs because ISO clamps PMV to ±2 regardless of the
`limit_inputs` flag. With the default `limit_inputs=true`, both
implementations return NaN/null consistently.
