All notable changes to this project will be documented in this file.

## 1.2.0

- Removed `check_standard_compliance_array` from public exports. This is a breaking change for consumers that imported the array helper directly. Internal callers (`adaptive_ashrae`, `pmv_ppd`, `set_tmp`, `use_fans_heatwaves`) have been migrated to the scalar `check_standard_compliance` helper, which now also covers the ASHRAE `airspeed_control` cross-field check (pass `airspeed_control: false` to enable) and the `FAN_HEATWAVES` standard.
- Migration: replace `check_standard_compliance_array(standard, kwargs)` with `check_standard_compliance(standard, kwargs)` and check `warnings.length === 0` for compliance.
- Removed `t_o_array` public export. The function was retained in 1.1.0 as an internal helper for `check_standard_compliance_array`; with that helper now removed, `t_o_array` no longer has any in-tree caller. Migration: use scalar `t_o` instead.

## 1.1.0 (2026-06-31)

- Removed all `*_array` function exports from models, utilities and psychrometrics. This is a breaking change compared with previous versions.
- Removed functions: `adaptive_ashrae_array`, `adaptive_en_array`, `a_pmv_array`, `athb_array`, `clo_tout_array`, `discomfort_index_array`, `e_pmv_array`, `pmv_array`, `pmv_ppd_array`, `set_tmp_array`, `two_nodes_array`, `utci_array`, `v_relative_array`, `clo_dynamic_array`, `units_converter_array`, `p_sat_torr_array`, `t_mrt_array`.
- Migration: use `Array.map()` with the scalar equivalent. See PR #141 for before/after examples.

## 1.0.2 (2026-03-19)

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

## 1.0.1 (2026-03-18)

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

## 1.0.0 (2026-03-17)

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
