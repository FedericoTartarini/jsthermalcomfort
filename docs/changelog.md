---
title: Changelog
---

# Changelog

All notable changes to this project will be documented in this file.

## 2.0.0 (unreleased)

2.0.0 follows `pythermalcomfort` v4.8.1: its function names, its inputs and its values, with the additions the deviation registers list. The entries below are the rules that apply to every function and one fix, measured against 1.4.0. The [migration guide](./migration-v2.md) gives each 1.4.0 export's before and after, and lists the exports new in 2.0.0.

- **Breaking:** a model takes one inputs object, whose keys are `pythermalcomfort`'s keyword arguments with `pythermalcomfort`'s defaults: `pmv_ppd_iso(25, 25, 0.1, 50, 1.2, 0.5)` becomes `pmv_ppd_iso({ tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 })`. The 1.4.0 options object (`kwargs` or `options`) is merged into it. Positional arguments, an unknown key and a missing required key each throw `TypeError`. A helper, such as `v_relative`, `p_sat` or `units_converter`, keeps `pythermalcomfort`'s positional parameters.
- **Breaking:** where 1.4.0 returned `NaN`, a model returns `null`, and a yes/no output is `true`, `false` or `null`: outside the limits `adaptive_en`'s `acceptability_cat_i` is `null`, where 1.4.0 gave `false`. The outputs of every model but `JOS3` include a `warnings` array, whose `range` rows name the input, its value and its bound. A model's outputs are frozen. `limit_inputs: false` still returns the value.
- **Breaking:** a model but `JOS3` given `NaN`, `Infinity` or `-Infinity` throws `RangeError`, where 1.4.0 threw `TypeError`. An exported helper now throws `TypeError` for an argument of the wrong type, such as `p_sat("25")`, which returned 0 in 1.4.0; `p_sat(NaN)` is still `NaN`.
- **Breaking:** standard identifiers are versioned. `pmv_ppd_iso`, `pmv_ppd_ashrae`, `phs`, `clo_dynamic_ashrae` and `clo_dynamic_iso` take theirs as `standard`, held by the new `Standard` constant: `"7730-2025"` (`Standard.iso_7730_2025`, the default of `pmv_ppd_iso`) or `"7730-2005"` in place of `"ISO"`, `"55-2023"` (`Standard.ashrae_55_2023`) in place of `"ASHRAE"`, and `"9920-2007"` (`Standard.iso_9920_2007`) for `clo_dynamic_iso`. An unversioned identifier throws `RangeError`. `phs`'s `model` is now `standard`. `operative_tmp` keeps `"ISO"` and `"ASHRAE"`, now in any case.
- **Breaking:** the package ships ES modules only, behind an exports map. Import a function by name from the root or from `jsthermalcomfort/models`, `jsthermalcomfort/environment`, `jsthermalcomfort/clothing`, `jsthermalcomfort/psychrometrics` or `jsthermalcomfort/utilities`; every path under `lib/` throws `ERR_PACKAGE_PATH_NOT_EXPORTED`. A name kept from 1.4.0 is still exported from the root.
- **Added:** `"sideEffects": false` in `package.json`, so a bundler can leave out the modules an application does not import.
- **Fixed:** `cooling_effect` with `units: "IP"` returns the SI value times 1.8, as `pythermalcomfort` does, where 1.4.0 multiplied it by 3.28 / 1.8 (#249): 3.9 for `tdb: 77, tr: 77, vr: 1.64, rh: 50, met: 1, clo: 0.6`, where 1.4.0 gave 3.95.

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
