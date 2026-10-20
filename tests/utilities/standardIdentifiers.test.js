import { describe, expect, test } from "@jest/globals";
import {
  check_standard_compliance,
  is_iso_7730,
  Standard,
} from "../../src/utilities/utilities.js";
import * as utilitiesModule from "../../src/utilities/utilities.js";
import * as pkg from "../../src/index.js";

// These identifiers are shared with pythermalcomfort, which is the reference
// implementation, apart from the JS-only ones below. Its
// `pythermalcomfort.utilities.Models` enum is the source:
// the member NAME is the canonical key (also the key used by the limits file
// in #182), and the VALUE is the string a caller passes.
//
// Transcribed from pythermalcomfort/utilities.py. If pythermalcomfort adds a
// standard, this test fails until the two are reconciled deliberately, which
// is the point — silent divergence here is what #193 exists to prevent.
const PYTHERMALCOMFORT_MODELS = {
  ashrae_55_2023: "55-2023",
  iso_7730_2005: "7730-2005",
  iso_7730_2025: "7730-2025",
  iso_9920_2007: "9920-2007",
  iso_7933_2004: "7933-2004",
  iso_7933_2023: "7933-2023",
};

// Identifiers pythermalcomfort has and jsthermalcomfort does not implement,
// listed explicitly rather than left as an unexplained absence. Empty since
// `clo_dynamic_iso` brought ISO 9920 in.
const NOT_IMPLEMENTED_IN_JS = [];

// Identifiers jsthermalcomfort has and pythermalcomfort does not (ADR 0003 as
// amended): EN 16798-1, which adaptive_en implements and ADAPTIVE_EN_INFO
// names. Once PYTHERMALCOMFORT_MODELS is updated with an upstream member of
// the same name or value, the test below fails until the two are reconciled.
const JS_ONLY = { en_16798_1_2019: "16798-1-2019" };

describe("Standard mirrors pythermalcomfort's Models enum", () => {
  test("every JS identifier exists in pythermalcomfort with the same value, apart from the JS-only ones", () => {
    for (const [name, value] of Object.entries(Standard)) {
      if (name in JS_ONLY) continue;
      expect(PYTHERMALCOMFORT_MODELS).toHaveProperty(name);
      expect(PYTHERMALCOMFORT_MODELS[name]).toBe(value);
    }
  });

  test("the JS-only identifiers are in Standard and not in pythermalcomfort", () => {
    for (const [name, value] of Object.entries(JS_ONLY)) {
      expect(Standard[name]).toBe(value);
      expect(PYTHERMALCOMFORT_MODELS).not.toHaveProperty(name);
      expect(Object.values(PYTHERMALCOMFORT_MODELS)).not.toContain(value);
    }
  });

  test("the only identifiers JS omits are the ones it does not implement", () => {
    const missing = Object.keys(PYTHERMALCOMFORT_MODELS).filter(
      (name) => !(name in Standard),
    );
    expect(missing.sort()).toEqual([...NOT_IMPLEMENTED_IN_JS].sort());
  });

  test("names are canonical and values are the API strings, never swapped", () => {
    for (const [name, value] of Object.entries(Standard)) {
      // Canonical: <body>_<number>_<year>, lowercase; a part number stays in
      // the number (en_16798_1_2019).
      expect(name).toMatch(/^(iso|ashrae|en)_\d+(_\d+)?_\d{4}$/);
      // API string: the key without its body, "_" written "-", as
      // pythermalcomfort's values are (a JS-only value has the same form).
      expect(value).toMatch(/^\d+(-\d+)?-\d{4}$/);
      expect(value).toBe(name.replace(/^[a-z]+_/, "").replaceAll("_", "-"));
      expect(name).not.toBe(value);
    }
  });
});

describe("the removed identifiers and limit sets", () => {
  test("the unversioned identifiers are gone", () => {
    // Removed in v2. Their absence is the breaking change, so assert it rather
    // than trusting that nobody re-adds them for convenience.
    const values = Object.values(Standard);
    expect(values).not.toContain("ISO");
    expect(values).not.toContain("ASHRAE");
    expect(values).not.toContain("ANKLE_DRAFT");
    expect(values).not.toContain("FAN_HEATWAVES");
  });

  // pythermalcomfort v4.6.2 has no ankle-draft limit set (met <= 1.3,
  // clo <= 0.7); ankle_draft checks the ASHRAE 55 limits only.
  test("the ankle_draft limit set is gone", () => {
    expect(() =>
      check_standard_compliance("ankle_draft", { met: 1.2 }),
    ).toThrow('Unknown standard "ankle_draft"');
  });

  // pythermalcomfort v4.6.2 has no fan-use limit set: use_fans_heatwaves
  // calls _valid_range inline (models/use_fans_heatwaves.py:178-195), and
  // use_fans_heatwaves here reads its own USE_FANS_HEATWAVES_LIMITS.
  test("the use_fans_heatwaves limit set is gone", () => {
    expect(() =>
      check_standard_compliance("use_fans_heatwaves", { tdb: 60 }),
    ).toThrow(
      'Unknown standard "use_fans_heatwaves". Expected one of: 55-2023, ' +
        "7730-2005, 7730-2025, 9920-2007, 7933-2004, 7933-2023, " +
        '16798-1-2019. The unversioned "ISO" and "ASHRAE" identifiers were ' +
        'removed in v2 -- use "7730-2025" and "55-2023".',
    );
  });

  test("LimitSet is gone from the utilities module and the package root", () => {
    expect(utilitiesModule).not.toHaveProperty("LimitSet");
    expect(pkg).not.toHaveProperty("LimitSet");
    expect(pkg.default.utilities).not.toHaveProperty("LimitSet");
  });
});

describe("public API surface", () => {
  test("Standard and is_iso_7730 are importable from the package root", () => {
    // check_standard_compliance is public and requires one of these values, so
    // leaving them unreachable forced callers to pass bare strings and hope.
    expect(pkg.Standard).toBe(Standard);
    expect(typeof pkg.is_iso_7730).toBe("function");
  });

  test("Standard is frozen", () => {
    expect(Object.isFrozen(Standard)).toBe(true);
  });
});

describe("is_iso_7730", () => {
  test("accepts both editions and nothing else", () => {
    expect(is_iso_7730(Standard.iso_7730_2005)).toBe(true);
    expect(is_iso_7730(Standard.iso_7730_2025)).toBe(true);
    expect(is_iso_7730(Standard.ashrae_55_2023)).toBe(false);
    expect(is_iso_7730(Standard.iso_7933_2004)).toBe(false);
    expect(is_iso_7730("ISO")).toBe(false);
  });
});
