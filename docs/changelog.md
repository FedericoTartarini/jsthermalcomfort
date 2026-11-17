All notable changes to this project will be documented in this file.

## 2.0.0 (unreleased)

2.0.0 follows `pythermalcomfort` v4.8.1: its function names, its inputs and its values, with the additions the deviation registers list. The entries below are measured against 1.4.0. The [migration guide](./migration-v2.md) gives each 1.4.0 export's before and after.

- **Breaking:** a model takes one inputs object, whose keys are `pythermalcomfort`'s keyword arguments with `pythermalcomfort`'s defaults: `pmv_ppd_iso(25, 25, 0.1, 50, 1.2, 0.5)` becomes `pmv_ppd_iso({ tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 })`. The 1.4.0 options object (`kwargs` or `options`) is merged into it. Positional arguments, an unknown key and a missing required key each throw `TypeError`. A helper, such as `v_relative`, `p_sat` or `units_converter`, keeps `pythermalcomfort`'s positional parameters.
- **Breaking:** where 1.4.0 returned `NaN`, a model returns `null`, and a yes/no output is `true`, `false` or `null`: outside the limits `adaptive_en`'s `acceptability_cat_i` is `null`, where 1.4.0 gave `false`. The outputs of every model but `JOS3` include a `warnings` array, whose `range` rows name the input, its value and its bound. A model's outputs are frozen. `limit_inputs: false` still returns the value.
- **Breaking:** a model but `JOS3` given `NaN`, `Infinity` or `-Infinity` throws `RangeError`, where 1.4.0 threw `TypeError`. An exported helper now throws `TypeError` for an argument of the wrong type, such as `p_sat("25")`, which returned 0 in 1.4.0; `p_sat(NaN)` is still `NaN`.
- **Breaking:** standard identifiers are versioned. `pmv_ppd_iso`, `pmv_ppd_ashrae`, `phs`, `clo_dynamic_ashrae` and `clo_dynamic_iso` take theirs as `standard`, held by the new `Standard` constant: `"7730-2025"` (`Standard.iso_7730_2025`, the default of `pmv_ppd_iso`) or `"7730-2005"` in place of `"ISO"`, `"55-2023"` (`Standard.ashrae_55_2023`) in place of `"ASHRAE"`, and `"9920-2007"` (`Standard.iso_9920_2007`) for `clo_dynamic_iso`. An unversioned identifier throws `RangeError`. `phs`'s `model` is now `standard`. `operative_tmp` keeps `"ISO"` and `"ASHRAE"`, now in any case.
- **Breaking:** the package ships ES modules only, behind an exports map. Import a function by name from the root or from `jsthermalcomfort/models`, `jsthermalcomfort/environment`, `jsthermalcomfort/clothing`, `jsthermalcomfort/psychrometrics` or `jsthermalcomfort/utilities`; every path under `lib/` throws `ERR_PACKAGE_PATH_NOT_EXPORTED`. A name kept from 1.4.0 is still exported from the root.
- **Breaking:** functions take `pythermalcomfort`'s names: `a_pmv` is `pmv_a`, `athb` is `pmv_athb`, `e_pmv` is `pmv_e`, `heat_index` is `heat_index_rothfusz`, `two_nodes` is `two_nodes_gagge`, `wc` is `wci`, `enthalpy` is `enthalpy_air`, `t_dp` is `dew_point_tmp`, `t_wb` is `wet_bulb_tmp`, `t_mrt` is `mean_radiant_tmp` and `t_o` is `operative_tmp`. `v_relative`, `f_svv`, `running_mean_outdoor_temperature`, `mean_radiant_tmp` and `operative_tmp` are in `jsthermalcomfort/environment`. Inputs are renamed as well, such as `round` to `round_output` and `body_position` to `position`.
- **Breaking:** `pmv` and `pmv_ppd` are removed: use `pmv_ppd_iso` or `pmv_ppd_ashrae`, whose `pmv` is the value 1.4.0's `pmv` returned. `check_standard_compliance` is removed: read the model's `warnings`.
- **Breaking:** `heat_index_rothfusz`, `set_tmp`, `use_fans_heatwaves` and `vertical_tmp_grad_ppd` no longer take `units`: convert IP inputs with `units_converter`. `units_converter` takes `(from_units, values)`, in `pythermalcomfort`'s order, with no default for `from_units`, and returns only the converted keys.
- **Breaking:** `pet_steady`'s `position` and `sex` and `phs`'s `posture` take `pythermalcomfort`'s strings, such as `"standing"` and `"female"`, in place of 1.4.0's numbers; a number throws `TypeError`.
- **Breaking:** the keys of `met_typical_tasks` and `clo_individual_garments` are `pythermalcomfort`'s names, such as `"Seated, quiet"` for `Seated_Cquiet`, and `clo_typical_ensembles` is an object, not a function. The values are unchanged.
- **Breaking:** `clo_dynamic(clo, met, standard)` is removed, split in two as in `pythermalcomfort`, in `jsthermalcomfort/clothing`: `clo_dynamic_ashrae(clo, met)`, ASHRAE 55's correction above 1.2 met, and `clo_dynamic_iso(clo, met, v)`, ISO 7730 Annex C's correction from ISO 9920, which takes the air speed. `clo_dynamic_ashrae(1, 2)` is 0.8, as `clo_dynamic(1, 2)` was. 1.4.0's `"ISO"` returned the ASHRAE value, 0.8; `clo_dynamic_iso(1, 2, 0.1)` returns 0.8401838737198762. The helpers `clo_area_factor`, `clo_insulation_air_layer` and `clo_total_insulation` are exported with it.
- **Breaking:** `body_surface_area(weight, height, formula)` throws `RangeError` for an unknown `formula`, where 1.4.0 threw `Error`. The new `BodySurfaceAreaEquations` constant holds the four formula names, such as `BodySurfaceAreaEquations.takahira`.
- **Breaking:** models return new outputs, so a deep-equality assertion on 1.4.0's outputs fails: `heat_index_rothfusz` adds `stress_category`, `pmv_ppd_iso` adds `tsv` and `category`, `pmv_ppd_ashrae` adds `tsv` and `compliance`, and `utci` always returns `stress_category`, as its `return_stress_category` input is removed.
- **Breaking:** outputs follow `pythermalcomfort` v4.8.1 where 1.4.0's differed. `p_sat`, `psy_ta_rh`, `wet_bulb_tmp` and `mean_radiant_tmp` are unrounded. `dew_point_tmp` returns 13.851583599891661 at 25 °C and 50 %, where `t_dp` returned 13.8. `two_nodes_gagge` rounds to two decimals, where `two_nodes` rounded to one. Under its default `"7933-2023"`, `phs` returns different `sweat_loss_g`, `sweat_rate_watt` and `evap_load_wm2_min`. `operative_tmp` returns `NaN` for a negative `v`, where `t_o` threw. The migration guide gives each function's measured before and after.
- Fixed `pmv_ppd_iso` ignoring ISO 7730's limit on partial water vapour pressure, 0–2700 Pa: at `tdb` 30 °C and `rh` 70 % it returns `pmv` `null` with a `pa` range row, where 1.4.0 returned 1.8 (#195).
- Fixed `adaptive_ashrae` judging acceptability on the rounded comfort temperature: at a running mean of 20.05 °C the unrounded 80 % upper bound is 27.5155 °C, so an operative temperature of 27.51 °C is now acceptable, where 1.4.0 rejected it. In IP, the temperatures are rounded after the conversion: at a running mean of 50 °F, `tmp_cmf_90_low` is 65.1 °F, where 1.4.0 returned 65.12 °F.
- Fixed `v_relative` rounding at a tie: it rounds to three decimals as numpy's `around` does, so `v_relative(0, 1.005)` is 0.001, where 1.4.0 returned 0.002.
- Fixed `pet_steady` throwing "Newton Raphson did not converged" for a standing person: `pet_steady({ tdb: 20, tr: 20, v: 0.15, rh: 50, met: 1.37, clo: 0.5, position: "standing" })` returns 18.75.
- Fixed the type declarations: 1.4.0's `pet_steady.d.ts` had syntax errors (`TS1110`), which failed a strict TypeScript build without `skipLibCheck` (#196). Every export but `JOS3` is now written in TypeScript.
- Added the models `esi`, `heat_index_lu`, `heat_index_schoen`, `ireq`, `ridge_regression_predict_t_re_t_sk`, `sports_heat_stress_risk`, `thi`, `two_nodes_gagge_ji`, `two_nodes_gagge_sleep`, `work_capacity_dunne`, `work_capacity_hothaps`, `work_capacity_iso` and `work_capacity_niosh`, with `PMV_CATEGORY_BINS_ISO_7730`, `PHS_LIMITS_ISO_7933`, `Sports`, `_SportsValues` and `classifyFromBins`.
- Added a `*_INFO` constant for each model but `JOS3`, such as `PMV_PPD_ISO_INFO`, which describes the model's inputs and outputs, with their units and defaults.
- Added `scale_wind_speed_log` and `transpose_sharp_altitude` to `jsthermalcomfort/environment`, and `clo_correction_factor_environment` and `clo_intrinsic_insulation_ensemble` to `jsthermalcomfort/clothing`.
- Added `clo_dynamic_iso_vr(clo, met, vr, i_a = 0.7)`, which has no `pythermalcomfort` counterpart: ISO 7730's clothing correction for a caller that holds the relative air speed and not the air speed. `clo_dynamic_iso(clo, met, v)` is `clo_dynamic_iso_vr(clo, met, v_relative(v, met))`.
- Added `antoine`, `hr_to_rh`, `rh_from_dew_point`, `rh_from_vapour_pressure` and `rh_from_wet_bulb` to `jsthermalcomfort/psychrometrics`.
- Added to `jsthermalcomfort/utilities` the constants `Standard`, `Units`, `Postures`, `Sex`, `WorkIntensity`, `BodySurfaceAreaEquations`, `DefaultSkinTemperature`, `CLO_INDIVIDUAL_GARMENT_GROUPS` and `f_r_garments`, and the physical constants `c_to_k`, `cp_air`, `cp_vapour`, `cp_water`, `g`, `h_fg`, `met_to_w_m2` and `r_air`.

## 1.4.0 (2026-05-18)

- Added `wind_chill_temperature(tdb, v)`, which returns the Wind Chill Temperature in °C using the North American formula adopted by the US National Weather Service and Environment Canada. Mirrors `pythermalcomfort` 3.9.3 `wind_chill_temperature`. Wind speed `v` is in km/h, which differs from the existing `wc()` Wind Chill Index that uses m/s. Returns `{ wct }`.
- Added optional `round_output` parameter to `adaptive_ashrae(tdb, tr, t_running_mean, v, units, limit_inputs, round_output)` and `adaptive_en(tdb, tr, t_running_mean, v, units, limit_inputs, round_output)`. Defaults to `true`, preserving current behaviour. Passing `false` returns full-precision comfort temperatures and bounds, useful when chaining downstream calculations or when the caller applies its own formatting. This parameter is a jsthermalcomfort-specific enhancement and is not present in `pythermalcomfort`.

## 1.3.1 (2026-05-05)

- `heat_index` now returns `{ hi: NaN }` by default when `tdb < 27 °C`, matching `pythermalcomfort` 3.9.3 `heat_index_rothfusz`. IP mode uses the equivalent threshold, `tdb < 80.6 °F`, so the same physical temperature is accepted or rejected regardless of unit system. This is a breaking change compared with previous versions; callers needing the previous behaviour should pass `{ limit_inputs: false }`.

## 1.2.0 (not published)

- Removed `check_standard_compliance_array` from public exports. This is a breaking change for consumers that imported the array helper directly. Internal callers (`adaptive_ashrae`, `pmv_ppd`, `set_tmp`, `use_fans_heatwaves`) have been migrated to the scalar `check_standard_compliance` helper, which now also covers the ASHRAE `airspeed_control` cross-field check (pass `airspeed_control: false` to enable) and the `FAN_HEATWAVES` standard.
- Migration: replace `check_standard_compliance_array(standard, kwargs)` with `check_standard_compliance(standard, kwargs)` and check `warnings.length === 0` for compliance.
- Removed `t_o_array` public export. The function was retained in 1.1.0 as an internal helper for `check_standard_compliance_array`; with that helper now removed, `t_o_array` no longer has any in-tree caller. Migration: use scalar `t_o` instead.

## 1.1.0 (2026-03-30)

- Removed all `*_array` function exports from models, utilities and psychrometrics. This is a breaking change compared with previous versions.
- Removed functions: `adaptive_ashrae_array`, `adaptive_en_array`, `a_pmv_array`, `athb_array`, `clo_tout_array`, `discomfort_index_array`, `e_pmv_array`, `pmv_array`, `pmv_ppd_array`, `set_tmp_array`, `two_nodes_array`, `utci_array`, `v_relative_array`, `clo_dynamic_array`, `units_converter_array`, `p_sat_torr_array`, `t_mrt_array`.
- Migration: use `Array.map()` with the scalar equivalent. See PR #141 for before/after examples.

## 1.0.2 (not published)

- Integrated `Lunr.js` to provide high-performance, client-side indexing and searching across all documentation pages.
- Added a search button to the top navigation bar with a `Ctrl + K` keyboard shortcut.
- Implemented a modern modal overlay for quick search results with snippets and direct links.
- Created a persistent search results page (`search.html`) that supports deep searching and query parameters.
- Modified the build script to automatically generate `search-data.json` during every `npm run docs` execution.
- Developed three new browser-runnable interactive examples:
  - **Heat Index**: Apparent temperature calculation.
  - **Humidex**: Canadian index for perceived heat discomfort.
  - **Solar Gain**: Detailed impacts of solar radiation on human MRT.
- Updated the "Examples" page to provide consistent links to all 10 available browser-runnable demos.
- Fixed several redundant and broken relative paths to ensure seamless navigation across the documentation.
- Aligned table aesthetics with the `pythermalcomfort` reference, including:
  - Header background color (`#f3f4f5`) and text color.
  - A continuous teal/blue border (`#038699`) at the bottom of every table header.
  - Zebra-striping and refined cell borders for improved readability.
- Unified the font sizes of "Section Navigation" and "On this page" sidebar items.
- Adjusted margins, padding, and Flexbox containers to prevent content overlap and ensure a premium, modern feel.

## 1.0.1 (not published)

- Standardized the layout, margins, and padding of all documentation pages (including `models.html` and `psychrometrics.html`) to achieve 100% visual consistency with the `pythermalcomfort` reference documentation and the `clo.html` layout.
- Transitioned to a robust Flexbox-based layout which ensures the primary sidebar, main article, and secondary sidebar (TOC) remain perfectly aligned without overlapping, even on wider viewports.
- Reordered the "Section Navigation" items to prioritize core documentation.
- Aligned the font sizes and weights of the "Section Navigation" and "On this page" headers and list items to be identical (0.9rem).
- Increased the `levelIndex1` font size to 2.5rem for improved readability.
- Removed checkboxes from the "Quick checklist" on the home page for a cleaner aesthetic.
- Updated the Surveys documentation with revised sections on "Point-in-time" and "Satisfaction" surveys.
- Integrated a new visual reference image for "Clothing and activity" levels directly into the Surveys page.
- Implemented text-wrapping and overflow handling for the Table of Contents (TOC) links to prevent them from obscuring main text on smaller screens or with long section titles.
- Refined the theme color palette to ensure code blocks, tags, and navigation elements have optimal contrast and premium aesthetics in dark mode.

## 1.0.0 (not published)

- Redesigned the entire documentation site to match the professional and modern aesthetic of `pythermalcomfort`.
- Transitioned the documentation from a single-page layout to a multi-page structure with dedicated sections for Models, Psychrometrics, Surveys, and Reference Values, directly mirroring the content organization of `pythermalcomfort`.
- Added a dedicated "Section Navigation" sidebar on the left for all internal documentation pages, facilitating easier movement between core sections.
- Restored the right-side Table of Contents for all pages, including JSDoc-generated ones like Models and Psychrometrics. Added sticky positioning and scroll-spy highlighting.
- Implemented a breadcrumb navigation bar at the top of every page (except the landing page) for better site-wide orientation.
- Updated the top banner to include the project version and quick-links/icons for GitHub, LinkedIn, and Google Scholar.
- Adjusted header sizes (e.g., 3rem for main titles) and branding elements for a cleaner, more readable hierarchy.
- Standardized the appearance of all code blocks, JSDoc function signatures, and `<pre>` tags with a custom dark/light theme background and a teal left-accent border.
- Fine-tuned syntax highlighting for dark mode, specifically improving the readability of script tags (#FFD900) and inline code backticks (#3fb1c5).
- Applied a consistent professional look to all data tables (alternating row colors, teal header accents, removed vertical borders).
- Set the main background to a pure white (#ffffff) and updated block containers to utilize subtle grey tones and borders.
- Successfully divided the "Clo and Met reference values" into two separate, dedicated pages for clearer reference.
- Added the detailed Surveys documentation page content to mirror the reference implementation in `pythermalcomfort`.
- Optimized the EJS/CSS logic to remove JSDoc artifacts like the `fill-light` class, ensuring a cleaner final output.
