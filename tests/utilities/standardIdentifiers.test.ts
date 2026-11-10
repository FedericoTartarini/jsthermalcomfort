import { describe, expect, test } from "vitest";
import { Standard } from "../../src/utilities/options.ts";
import * as pkg from "../../src/index.ts";

// These identifiers are shared with pythermalcomfort, which is the reference
// implementation. Its `pythermalcomfort.utilities.Models` enum is the source:
// the member NAME is the canonical key (also the key used by the limits file
// in #182), and the VALUE is the string a caller passes.
//
// Transcribed from pythermalcomfort/utilities.py. If pythermalcomfort adds a
// standard, this test fails until the two are reconciled deliberately, which
// is the point — silent divergence here is what #193 exists to prevent.
const PYTHERMALCOMFORT_MODELS: Record<string, string> = {
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
const NOT_IMPLEMENTED_IN_JS: string[] = [];

// Identifiers jsthermalcomfort has and pythermalcomfort does not, for a
// standard a model takes that upstream's Models names no member for
// (deviations _shared-51, _shared-78 and _shared-79). If pythermalcomfort
// adds one under another key or value, the first test below fails until this
// one is renamed to match.
const JS_ONLY: Record<string, string> = {
  iso_7243_2017: "7243-2017",
  iso_11079_2007: "11079-2007",
  en_16798_1_2019: "16798-1-2019",
};

describe("Standard mirrors pythermalcomfort's Models enum", () => {
  test("every JS identifier exists in pythermalcomfort with the same value", () => {
    for (const [name, value] of Object.entries(Standard)) {
      if (name in JS_ONLY) {
        expect(JS_ONLY[name]).toBe(value);
        expect(Object.values(PYTHERMALCOMFORT_MODELS)).not.toContain(value);
        continue;
      }
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

  test("every JS-only identifier is in Standard with its value", () => {
    expect(Standard).toMatchObject(JS_ONLY);
  });

  test("names are canonical and values are the API strings, never swapped", () => {
    for (const [name, value] of Object.entries(Standard)) {
      // Canonical: <body>_<number>_<year>, lowercase, with a part number
      // kept in the number (en_16798_1_2019).
      expect(name).toMatch(/^(iso|ashrae|en)_\d+(_\d+)?_\d{4}$/);
      // API string: the short form pythermalcomfort accepts.
      expect(value).toMatch(/^\d+(-\d+)?-\d{4}$/);
      expect(name).not.toBe(value);
    }
  });

  test("the unversioned identifiers are gone", () => {
    // Removed in v2. Their absence is the breaking change, so assert it rather
    // than trusting that nobody re-adds them for convenience.
    const values: string[] = Object.values(Standard);
    expect(values).not.toContain("ISO");
    expect(values).not.toContain("ASHRAE");
    expect(values).not.toContain("ANKLE_DRAFT");
    expect(values).not.toContain("FAN_HEATWAVES");
  });
});

describe("public API surface", () => {
  test("Standard is importable from the package root", () => {
    expect(pkg.Standard).toBe(Standard);
  });

  test("Standard is frozen", () => {
    expect(Object.isFrozen(Standard)).toBe(true);
  });
});

// Upstream's `Units` enum (utilities.py), added as a constant (deviation
// _shared-1).
describe("Units mirrors pythermalcomfort's Units enum", () => {
  test("has upstream's members and values, frozen, from the package root", () => {
    expect(pkg.Units).toEqual({ SI: "SI", IP: "IP" });
    expect(Object.isFrozen(pkg.Units)).toBe(true);
  });
});

// Upstream's `Postures` enum (utilities.py:48-57), added as a constant
// (deviation _shared-29).
describe("Postures mirrors pythermalcomfort's Postures enum", () => {
  test("has upstream's members and values, in its order, frozen, from the package root", () => {
    expect(Object.entries(pkg.Postures)).toEqual([
      ["standing", "standing"],
      ["sitting", "sitting"],
      ["sedentary", "sedentary"],
      ["reclining", "reclining"],
      ["lying", "lying"],
      ["supine", "supine"],
      ["crouching", "crouching"],
    ]);
    expect(Object.isFrozen(pkg.Postures)).toBe(true);
  });
});

// Upstream's `WorkIntensity` enum (classes_input.py:41-46), added as a
// constant (deviation _shared-77).
describe("WorkIntensity mirrors pythermalcomfort's WorkIntensity enum", () => {
  test("has upstream's members and values, in its order, frozen, from the package root", () => {
    expect(Object.entries(pkg.WorkIntensity)).toEqual([
      ["HEAVY", "heavy"],
      ["MODERATE", "moderate"],
      ["LIGHT", "light"],
    ]);
    expect(Object.isFrozen(pkg.WorkIntensity)).toBe(true);
  });
});

// Upstream's `Sex` enum (utilities.py:41-45), added as a constant (deviation
// _shared-81).
describe("Sex mirrors pythermalcomfort's Sex enum", () => {
  test("has upstream's members and values, in its order, frozen, from the package root", () => {
    expect(Object.entries(pkg.Sex)).toEqual([
      ["male", "male"],
      ["female", "female"],
    ]);
    expect(Object.isFrozen(pkg.Sex)).toBe(true);
  });
});
