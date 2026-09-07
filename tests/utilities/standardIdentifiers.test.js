import { describe, expect, test } from "@jest/globals";
import {
  is_iso_7730,
  LimitSet,
  Standard,
} from "../../src/utilities/utilities.js";
import * as pkg from "../../src/index.js";

// These identifiers are shared with pythermalcomfort, which is the reference
// implementation. Its `pythermalcomfort.utilities.Models` enum is the source:
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

// jsthermalcomfort does not implement clothing insulation from ISO 9920, so it
// has no reason to carry that identifier. Listed explicitly rather than left
// as an unexplained absence.
const NOT_IMPLEMENTED_IN_JS = ["iso_9920_2007"];

describe("Standard mirrors pythermalcomfort's Models enum", () => {
  test("every JS identifier exists in pythermalcomfort with the same value", () => {
    for (const [name, value] of Object.entries(Standard)) {
      expect(PYTHERMALCOMFORT_MODELS).toHaveProperty(name);
      expect(PYTHERMALCOMFORT_MODELS[name]).toBe(value);
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
      // Canonical: <body>_<number>_<year>, lowercase.
      expect(name).toMatch(/^(iso|ashrae)_\d+_\d{4}$/);
      // API string: the short form pythermalcomfort accepts.
      expect(value).toMatch(/^\d+-\d{4}$/);
      expect(name).not.toBe(value);
    }
  });
});

describe("LimitSet is separate from Standard", () => {
  test("limit sets are not standards and do not leak into Standard", () => {
    for (const key of Object.keys(LimitSet)) {
      expect(Standard).not.toHaveProperty(key);
    }
    for (const value of Object.values(LimitSet)) {
      expect(Object.values(Standard)).not.toContain(value);
    }
  });

  test("the unversioned identifiers are gone", () => {
    // Removed in v2. Their absence is the breaking change, so assert it rather
    // than trusting that nobody re-adds them for convenience.
    const values = [...Object.values(Standard), ...Object.values(LimitSet)];
    expect(values).not.toContain("ISO");
    expect(values).not.toContain("ASHRAE");
    expect(values).not.toContain("ANKLE_DRAFT");
    expect(values).not.toContain("FAN_HEATWAVES");
  });
});

describe("public API surface", () => {
  test("Standard, LimitSet and is_iso_7730 are importable from the package root", () => {
    // check_standard_compliance is public and requires one of these values, so
    // leaving them unreachable forced callers to pass bare strings and hope.
    expect(pkg.Standard).toBe(Standard);
    expect(pkg.LimitSet).toBe(LimitSet);
    expect(typeof pkg.is_iso_7730).toBe("function");
  });

  test("Standard and LimitSet are frozen", () => {
    expect(Object.isFrozen(Standard)).toBe(true);
    expect(Object.isFrozen(LimitSet)).toBe(true);
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
