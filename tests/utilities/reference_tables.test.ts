import { describe, expect, test } from "vitest";
import {
  CLO_INDIVIDUAL_GARMENT_GROUPS,
  clo_individual_garments,
  clo_typical_ensembles,
  DefaultSkinTemperature,
  f_r_garments,
  met_typical_tasks,
} from "../../src/utilities/index.ts";

// JS-only: upstream has no test of `met_typical_tasks`, `clo_typical_ensembles`,
// `clo_individual_garments`, `f_r_garments` or `DefaultSkinTemperature`. The
// expected entries are copied from pythermalcomfort v4.8.1
// `utilities.py:160-307`, in its order.

// An ES module is strict-mode code, so a write to a frozen table throws.
function expectFrozen(table: object) {
  expect(Object.isFrozen(table)).toBe(true);
  const writable = table as Record<string, number>;
  const [key] = Object.keys(table);
  expect(() => {
    writable.Sleeping = 0;
  }).toThrow(TypeError);
  expect(() => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete writable[key ?? ""];
  }).toThrow(TypeError);
}

// deviation _shared-154
describe("met_typical_tasks", () => {
  test("holds upstream's entries in upstream's order", () => {
    expect(Object.entries(met_typical_tasks)).toEqual([
      ["Sleeping", 0.7],
      ["Reclining", 0.8],
      ["Seated, quiet", 1.0],
      ["Reading, seated", 1.0],
      ["Writing", 1.0],
      ["Typing", 1.1],
      ["Standing, relaxed", 1.2],
      ["Filing, seated", 1.2],
      ["Flying aircraft, routine", 1.2],
      ["Filing, standing", 1.4],
      ["Driving a car", 1.5],
      ["Walking about", 1.7],
      ["Cooking", 1.8],
      ["Table sawing", 1.8],
      ["Walking 2mph (3.2kmh)", 2.0],
      ["Lifting/packing", 2.1],
      ["Seated, heavy limb movement", 2.2],
      ["Light machine work", 2.2],
      ["Flying aircraft, combat", 2.4],
      ["Walking 3mph (4.8kmh)", 2.6],
      ["House cleaning", 2.7],
      ["Driving, heavy vehicle", 3.2],
      ["Dancing", 3.4],
      ["Calisthenics", 3.5],
      ["Walking 4mph (6.4kmh)", 3.8],
      ["Tennis", 3.8],
      ["Heavy machine work", 4.0],
      ["Handling 100lb (45 kg) bags", 4.0],
      ["Pick and shovel work", 4.4],
      ["Basketball", 6.3],
      ["Wrestling", 7.8],
    ]);
  });

  test("is frozen", () => {
    expectFrozen(met_typical_tasks);
  });
});

// deviation _shared-155
describe("clo_typical_ensembles", () => {
  test("holds upstream's entries in upstream's order", () => {
    expect(Object.entries(clo_typical_ensembles)).toEqual([
      ["Walking shorts, short-sleeve shirt", 0.36],
      ["Typical summer indoor clothing", 0.5],
      ["Knee-length skirt, short-sleeve shirt, sandals, underwear", 0.54],
      ["Trousers, short-sleeve shirt, socks, shoes, underwear", 0.57],
      ["Trousers, long-sleeve shirt", 0.61],
      ["Knee-length skirt, long-sleeve shirt, full slip", 0.67],
      ["Sweat pants, long-sleeve sweatshirt", 0.74],
      ["Jacket, Trousers, long-sleeve shirt", 0.96],
      ["Typical winter indoor clothing", 1.0],
    ]);
  });

  test("is frozen", () => {
    expectFrozen(clo_typical_ensembles);
  });
});

// deviation _shared-156
describe("clo_individual_garments", () => {
  test("holds upstream's entries in upstream's order", () => {
    expect(Object.entries(clo_individual_garments)).toEqual([
      ["Metal chair", 0.0],
      ["Bra", 0.01],
      ["Wooden stool", 0.01],
      ["Ankle socks", 0.02],
      ["Shoes or sandals", 0.02],
      ["Slippers", 0.03],
      ["Panty hose", 0.02],
      ["Calf length socks", 0.03],
      ["Women's underwear", 0.03],
      ["Men's underwear", 0.04],
      ["Knee socks (thick)", 0.06],
      ["Short shorts", 0.06],
      ["Walking shorts", 0.08],
      ["T-shirt", 0.08],
      ["Standard office chair", 0.1],
      ["Executive chair", 0.15],
      ["Boots", 0.1],
      ["Sleeveless scoop-neck blouse", 0.12],
      ["Half slip", 0.14],
      ["Long underwear bottoms", 0.15],
      ["Full slip", 0.16],
      ["Short-sleeve knit shirt", 0.17],
      ["Sleeveless vest (thin)", 0.1],
      ["Sleeveless vest (thick)", 0.17],
      ["Sleeveless short gown (thin)", 0.18],
      ["Short-sleeve dress shirt", 0.19],
      ["Sleeveless long gown (thin)", 0.2],
      ["Long underwear top", 0.2],
      ["Thick skirt", 0.23],
      ["Long-sleeve dress shirt", 0.25],
      ["Long-sleeve flannel shirt", 0.34],
      ["Long-sleeve sweat shirt", 0.34],
      ["Short-sleeve hospital gown", 0.31],
      ["Short-sleeve short robe (thin)", 0.34],
      ["Short-sleeve pajamas", 0.42],
      ["Long-sleeve long gown", 0.46],
      ["Long-sleeve short wrap robe (thick)", 0.48],
      ["Long-sleeve pajamas (thick)", 0.57],
      ["Long-sleeve long wrap robe (thick)", 0.69],
      ["Thin trousers", 0.15],
      ["Thick trousers", 0.24],
      ["Sweatpants", 0.28],
      ["Overalls", 0.3],
      ["Coveralls", 0.49],
      ["Thin skirt", 0.14],
      ["Long-sleeve shirt dress (thin)", 0.33],
      ["Long-sleeve shirt dress (thick)", 0.47],
      ["Short-sleeve shirt dress", 0.29],
      ["Sleeveless, scoop-neck shirt (thin)", 0.23],
      ["Sleeveless, scoop-neck shirt (thick)", 0.27],
      ["Long sleeve shirt (thin)", 0.25],
      ["Long sleeve shirt (thick)", 0.36],
      ["Single-breasted coat (thin)", 0.36],
      ["Single-breasted coat (thick)", 0.44],
      ["Double-breasted coat (thin)", 0.42],
      ["Double-breasted coat (thick)", 0.48],
    ]);
  });

  test("is frozen", () => {
    expectFrozen(clo_individual_garments);
  });
});

// deviation _shared-171
describe("f_r_garments", () => {
  test("holds upstream's entries in upstream's order", () => {
    expect(Object.entries(f_r_garments)).toEqual([
      ["Cotton with aluminium paint", 0.42],
      ["Viscose with glossy aluminium foil", 0.19],
      ["Aramid (Kevlar) with glossy aluminium foil", 0.14],
      ["Wool with glossy aluminium foil", 0.12],
      ["Cotton with glossy aluminium foil", 0.04],
      ["Viscose vacuum metallized with aluminium", 0.06],
      ["Aramid vacuum metallized with aluminium", 0.04],
      ["Wool vacuum metallized with aluminium", 0.05],
      ["Cotton vacuum metallized with aluminium", 0.05],
      ["Glass fiber vacuum metallized with aluminium", 0.07],
    ]);
  });

  test("is frozen", () => {
    expectFrozen(f_r_garments);
  });
});

// deviation _shared-172
describe("DefaultSkinTemperature", () => {
  test("holds upstream's defaults in upstream's field order", () => {
    expect(Object.entries(DefaultSkinTemperature)).toEqual([
      ["head", 35.3],
      ["neck", 35.6],
      ["chest", 35.1],
      ["back", 35.3],
      ["pelvis", 35.3],
      ["left_shoulder", 34.2],
      ["left_arm", 34.6],
      ["left_hand", 34.4],
      ["right_shoulder", 34.2],
      ["right_arm", 34.6],
      ["right_hand", 34.4],
      ["left_thigh", 34.3],
      ["left_leg", 32.8],
      ["left_foot", 33.3],
      ["right_thigh", 34.3],
      ["right_leg", 32.8],
      ["right_foot", 33.3],
    ]);
  });

  test("is frozen", () => {
    expectFrozen(DefaultSkinTemperature);
  });
});

// deviation _shared-153
describe("CLO_INDIVIDUAL_GARMENT_GROUPS", () => {
  test("lists the garment table's eight headings in order, then the chairs", () => {
    expect(CLO_INDIVIDUAL_GARMENT_GROUPS.map(({ group }) => group)).toEqual([
      "Underwear",
      "Footwear",
      "Shirts and Blouses",
      "Trousers and Coveralls",
      "Dress and Skirts",
      "Sweaters",
      "Suit Jackets and Vests",
      "Sleepwear and Robes",
      "Chairs",
    ]);
  });

  const listed = CLO_INDIVIDUAL_GARMENT_GROUPS.flatMap(
    ({ garments }) => garments,
  );

  test("places every key of clo_individual_garments in exactly one group", () => {
    for (const key of Object.keys(clo_individual_garments)) {
      expect([key, listed.filter((g) => g === key).length]).toEqual([key, 1]);
    }
  });

  test("lists only keys of clo_individual_garments", () => {
    for (const garment of listed) {
      expect(Object.hasOwn(clo_individual_garments, garment)).toBe(true);
    }
  });

  test("ends with the four chairs, in the chair table's order", () => {
    expect(CLO_INDIVIDUAL_GARMENT_GROUPS.at(-1)).toEqual({
      group: "Chairs",
      garments: [
        "Metal chair",
        "Wooden stool",
        "Standard office chair",
        "Executive chair",
      ],
    });
  });

  test("is frozen, each group and its garments too", () => {
    expect(Object.isFrozen(CLO_INDIVIDUAL_GARMENT_GROUPS)).toBe(true);
    for (const entry of CLO_INDIVIDUAL_GARMENT_GROUPS) {
      expect(Object.isFrozen(entry)).toBe(true);
      expect(Object.isFrozen(entry.garments)).toBe(true);
    }
  });
});
