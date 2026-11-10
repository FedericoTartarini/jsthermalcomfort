import { describe, expect, test } from "vitest";
import { classifyFromBins } from "../../src/models/index.ts";

/**
 * Test classifyFromBins function matching numpy.digitize behavior
 */

describe("classifyFromBins - right-inclusive (right=true)", () => {
  // Right-inclusive bins: (edge[i-1], edge[i]]
  // value <= edges[0] -> labels[0]
  // edges[i-1] < value <= edges[i] -> labels[i]
  // value > edges[-1] -> NaN

  const bins = {
    edges: [0, 10, 20, 30],
    labels: ["very low", "low", "medium", "high"],
    right: true,
  };

  // Test below first edge
  test("value well below first edge", () => {
    expect(classifyFromBins(-100, bins)).toBe("very low");
  });

  test("value just below first edge", () => {
    expect(classifyFromBins(-0.001, bins)).toBe("very low");
  });

  // Test at and around first edge
  test("value at first edge (inclusive)", () => {
    expect(classifyFromBins(0, bins)).toBe("very low");
  });

  test("value just above first edge", () => {
    expect(classifyFromBins(0.001, bins)).toBe("low");
  });

  // Test between edges
  test("value in first interval (0, 10]", () => {
    expect(classifyFromBins(5, bins)).toBe("low");
  });

  test("value at second edge (inclusive)", () => {
    expect(classifyFromBins(10, bins)).toBe("low");
  });

  test("value just above second edge", () => {
    expect(classifyFromBins(10.001, bins)).toBe("medium");
  });

  test("value in second interval (10, 20]", () => {
    expect(classifyFromBins(15, bins)).toBe("medium");
  });

  test("value at third edge (inclusive)", () => {
    expect(classifyFromBins(20, bins)).toBe("medium");
  });

  test("value just above third edge", () => {
    expect(classifyFromBins(20.001, bins)).toBe("high");
  });

  test("value in last interval (20, 30]", () => {
    expect(classifyFromBins(25, bins)).toBe("high");
  });

  test("value at last edge (inclusive)", () => {
    expect(classifyFromBins(30, bins)).toBe("high");
  });

  // Test above last edge
  test("value just above last edge (exclusive)", () => {
    expect(classifyFromBins(30.001, bins)).toBeNaN();
  });

  test("value well above last edge", () => {
    expect(classifyFromBins(100, bins)).toBeNaN();
  });

  // Test NaN input
  test("NaN input returns NaN", () => {
    expect(classifyFromBins(NaN, bins)).toBeNaN();
  });

  // Test infinity inputs (matching numpy.digitize)
  test("positive infinity returns NaN", () => {
    expect(classifyFromBins(Infinity, bins)).toBeNaN();
  });

  test("negative infinity returns first label (matches np.digitize)", () => {
    expect(classifyFromBins(-Infinity, bins)).toBe("very low");
  });
});

describe("classifyFromBins - left-inclusive (right=false)", () => {
  // Left-inclusive bins: [edge[i-1], edge[i])
  // value < edges[0] -> labels[0]
  // edges[i-1] <= value < edges[i] -> labels[i]
  // value >= edges[-1] -> NaN

  const bins = {
    edges: [0, 10, 20, 30],
    labels: ["very low", "low", "medium", "high"],
    right: false,
  };

  // Test below first edge
  test("value well below first edge", () => {
    expect(classifyFromBins(-100, bins)).toBe("very low");
  });

  test("value just below first edge (exclusive)", () => {
    expect(classifyFromBins(-0.001, bins)).toBe("very low");
  });

  // Test at and around first edge
  test("value at first edge (inclusive)", () => {
    expect(classifyFromBins(0, bins)).toBe("low");
  });

  test("value just above first edge", () => {
    expect(classifyFromBins(0.001, bins)).toBe("low");
  });

  // Test between edges
  test("value in first interval [0, 10)", () => {
    expect(classifyFromBins(5, bins)).toBe("low");
  });

  test("value just below second edge (inclusive)", () => {
    expect(classifyFromBins(9.999, bins)).toBe("low");
  });

  test("value at second edge (exclusive)", () => {
    expect(classifyFromBins(10, bins)).toBe("medium");
  });

  test("value just above second edge", () => {
    expect(classifyFromBins(10.001, bins)).toBe("medium");
  });

  test("value in second interval [10, 20)", () => {
    expect(classifyFromBins(15, bins)).toBe("medium");
  });

  test("value just below third edge", () => {
    expect(classifyFromBins(19.999, bins)).toBe("medium");
  });

  test("value at third edge (exclusive)", () => {
    expect(classifyFromBins(20, bins)).toBe("high");
  });

  test("value just above third edge", () => {
    expect(classifyFromBins(20.001, bins)).toBe("high");
  });

  test("value in last interval [20, 30)", () => {
    expect(classifyFromBins(25, bins)).toBe("high");
  });

  test("value just below last edge", () => {
    expect(classifyFromBins(29.999, bins)).toBe("high");
  });

  // Test at and above last edge
  test("value at last edge (exclusive, returns NaN)", () => {
    expect(classifyFromBins(30, bins)).toBeNaN();
  });

  test("value above last edge", () => {
    expect(classifyFromBins(30.001, bins)).toBeNaN();
  });

  test("value well above last edge", () => {
    expect(classifyFromBins(100, bins)).toBeNaN();
  });

  // Test NaN input
  test("NaN input returns NaN", () => {
    expect(classifyFromBins(NaN, bins)).toBeNaN();
  });

  // Test infinity inputs (matching numpy.digitize)
  test("positive infinity returns NaN", () => {
    expect(classifyFromBins(Infinity, bins)).toBeNaN();
  });

  test("negative infinity returns first label (matches np.digitize)", () => {
    expect(classifyFromBins(-Infinity, bins)).toBe("very low");
  });
});

describe("classifyFromBins - single edge", () => {
  const bins_right = {
    edges: [10],
    labels: ["low", "high"],
    right: true,
  };

  const bins_left = {
    edges: [10],
    labels: ["low", "high"],
    right: false,
  };

  test("right-inclusive: value <= edge -> labels[0]", () => {
    expect(classifyFromBins(10, bins_right)).toBe("low");
    expect(classifyFromBins(5, bins_right)).toBe("low");
  });

  test("right-inclusive: value > edge -> NaN", () => {
    expect(classifyFromBins(10.001, bins_right)).toBeNaN();
    expect(classifyFromBins(20, bins_right)).toBeNaN();
  });

  test("left-inclusive: value < edge -> labels[0]", () => {
    expect(classifyFromBins(5, bins_left)).toBe("low");
    expect(classifyFromBins(9.999, bins_left)).toBe("low");
  });

  test("left-inclusive: value >= edge -> NaN", () => {
    expect(classifyFromBins(10, bins_left)).toBeNaN();
    expect(classifyFromBins(20, bins_left)).toBeNaN();
  });
});

describe("classifyFromBins - mirroring heat_index bins", () => {
  // Heat index bins are right-inclusive
  const hi_bins = {
    edges: [27, 32, 41, 54, 1000],
    labels: [
      "no risk",
      "caution",
      "extreme caution",
      "danger",
      "extreme danger",
    ],
    right: true,
  };

  test("hi <= 27 -> no risk", () => {
    expect(classifyFromBins(20, hi_bins)).toBe("no risk");
    expect(classifyFromBins(27, hi_bins)).toBe("no risk");
  });

  test("27 < hi <= 32 -> caution", () => {
    expect(classifyFromBins(27.1, hi_bins)).toBe("caution");
    expect(classifyFromBins(32, hi_bins)).toBe("caution");
  });

  test("32 < hi <= 41 -> extreme caution", () => {
    expect(classifyFromBins(32.1, hi_bins)).toBe("extreme caution");
    expect(classifyFromBins(41, hi_bins)).toBe("extreme caution");
  });

  test("41 < hi <= 54 -> danger", () => {
    expect(classifyFromBins(41.1, hi_bins)).toBe("danger");
    expect(classifyFromBins(54, hi_bins)).toBe("danger");
  });

  test("54 < hi <= 1000 -> extreme danger", () => {
    expect(classifyFromBins(54.1, hi_bins)).toBe("extreme danger");
    expect(classifyFromBins(1000, hi_bins)).toBe("extreme danger");
  });

  test("hi > 1000 -> NaN", () => {
    expect(classifyFromBins(1000.1, hi_bins)).toBeNaN();
  });
});

describe("classifyFromBins - mirroring PMV bins (left-inclusive)", () => {
  // PMV ISO bins are left-inclusive
  const pmv_bins = {
    edges: [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 10],
    labels: [
      "Cold",
      "Cool",
      "Slightly Cool",
      "Neutral",
      "Slightly Warm",
      "Warm",
      "Hot",
    ],
    right: false,
  };

  test("pmv < -2.5 -> Cold", () => {
    expect(classifyFromBins(-3, pmv_bins)).toBe("Cold");
    expect(classifyFromBins(-2.5001, pmv_bins)).toBe("Cold");
  });

  test("-2.5 <= pmv < -1.5 -> Cool", () => {
    expect(classifyFromBins(-2.5, pmv_bins)).toBe("Cool");
    expect(classifyFromBins(-2, pmv_bins)).toBe("Cool");
    expect(classifyFromBins(-1.5001, pmv_bins)).toBe("Cool");
  });

  test("-1.5 <= pmv < -0.5 -> Slightly Cool", () => {
    expect(classifyFromBins(-1.5, pmv_bins)).toBe("Slightly Cool");
    expect(classifyFromBins(-1, pmv_bins)).toBe("Slightly Cool");
  });

  test("-0.5 <= pmv < 0.5 -> Neutral", () => {
    expect(classifyFromBins(-0.5, pmv_bins)).toBe("Neutral");
    expect(classifyFromBins(0, pmv_bins)).toBe("Neutral");
    expect(classifyFromBins(0.4999, pmv_bins)).toBe("Neutral");
  });

  test("0.5 <= pmv < 1.5 -> Slightly Warm", () => {
    expect(classifyFromBins(0.5, pmv_bins)).toBe("Slightly Warm");
    expect(classifyFromBins(1, pmv_bins)).toBe("Slightly Warm");
  });

  test("1.5 <= pmv < 2.5 -> Warm", () => {
    expect(classifyFromBins(1.5, pmv_bins)).toBe("Warm");
    expect(classifyFromBins(2, pmv_bins)).toBe("Warm");
  });

  test("2.5 <= pmv < 10 -> Hot", () => {
    expect(classifyFromBins(2.5, pmv_bins)).toBe("Hot");
    expect(classifyFromBins(5, pmv_bins)).toBe("Hot");
    expect(classifyFromBins(9.999, pmv_bins)).toBe("Hot");
  });

  test("pmv >= 10 -> NaN", () => {
    expect(classifyFromBins(10, pmv_bins)).toBeNaN();
    expect(classifyFromBins(11, pmv_bins)).toBeNaN();
  });
});

describe("classifyFromBins - mirroring PMV bins (right-inclusive)", () => {
  // PMV ASHRAE bins are right-inclusive
  const pmv_bins = {
    edges: [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 10],
    labels: [
      "Cold",
      "Cool",
      "Slightly Cool",
      "Neutral",
      "Slightly Warm",
      "Warm",
      "Hot",
    ],
    right: true,
  };

  test("pmv <= -2.5 -> Cold", () => {
    expect(classifyFromBins(-3, pmv_bins)).toBe("Cold");
    expect(classifyFromBins(-2.5, pmv_bins)).toBe("Cold");
  });

  test("-2.5 < pmv <= -1.5 -> Cool", () => {
    expect(classifyFromBins(-2.4999, pmv_bins)).toBe("Cool");
    expect(classifyFromBins(-2, pmv_bins)).toBe("Cool");
    expect(classifyFromBins(-1.5, pmv_bins)).toBe("Cool");
  });

  test("-1.5 < pmv <= -0.5 -> Slightly Cool", () => {
    expect(classifyFromBins(-1.4999, pmv_bins)).toBe("Slightly Cool");
    expect(classifyFromBins(-1, pmv_bins)).toBe("Slightly Cool");
    expect(classifyFromBins(-0.5, pmv_bins)).toBe("Slightly Cool");
  });

  test("-0.5 < pmv <= 0.5 -> Neutral", () => {
    expect(classifyFromBins(-0.4999, pmv_bins)).toBe("Neutral");
    expect(classifyFromBins(0, pmv_bins)).toBe("Neutral");
    expect(classifyFromBins(0.5, pmv_bins)).toBe("Neutral");
  });

  test("0.5 < pmv <= 1.5 -> Slightly Warm", () => {
    expect(classifyFromBins(0.5001, pmv_bins)).toBe("Slightly Warm");
    expect(classifyFromBins(1, pmv_bins)).toBe("Slightly Warm");
    expect(classifyFromBins(1.5, pmv_bins)).toBe("Slightly Warm");
  });

  test("1.5 < pmv <= 2.5 -> Warm", () => {
    expect(classifyFromBins(1.5001, pmv_bins)).toBe("Warm");
    expect(classifyFromBins(2, pmv_bins)).toBe("Warm");
    expect(classifyFromBins(2.5, pmv_bins)).toBe("Warm");
  });

  test("2.5 < pmv <= 10 -> Hot", () => {
    expect(classifyFromBins(2.5001, pmv_bins)).toBe("Hot");
    expect(classifyFromBins(5, pmv_bins)).toBe("Hot");
    expect(classifyFromBins(10, pmv_bins)).toBe("Hot");
  });

  test("pmv > 10 -> NaN", () => {
    expect(classifyFromBins(10.0001, pmv_bins)).toBeNaN();
    expect(classifyFromBins(11, pmv_bins)).toBeNaN();
  });
});

describe("classifyFromBins - divergence at boundary (intentional)", () => {
  // Verify that left-inclusive and right-inclusive give different results at boundary
  // This mirrors the pythermalcomfort #382 inconsistency between ISO and ASHRAE models
  const pmv_edges = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 10];
  const pmv_labels = [
    "Cold",
    "Cool",
    "Slightly Cool",
    "Neutral",
    "Slightly Warm",
    "Warm",
    "Hot",
  ];

  const bins_right = {
    edges: pmv_edges,
    labels: pmv_labels,
    right: true,
  };

  const bins_left = {
    edges: pmv_edges,
    labels: pmv_labels,
    right: false,
  };

  test("at pmv=-0.5: left-inclusive gives Neutral, right-inclusive gives Slightly Cool", () => {
    // At -0.5 (a bin edge), the two models give different categories.
    // Left-inclusive: -0.5 <= pmv < 0.5 -> "Neutral" (labels[3])
    // Right-inclusive: -1.5 < pmv <= -0.5 -> "Slightly Cool" (labels[2])
    // This is the intentional divergence between ISO (left) and ASHRAE (right).
    expect(classifyFromBins(-0.5, bins_left)).toBe("Neutral");
    expect(classifyFromBins(-0.5, bins_right)).toBe("Slightly Cool");
  });

  test("at pmv=0.5: left-inclusive gives Slightly Warm, right-inclusive gives Neutral", () => {
    // Similar divergence at pmv=0.5.
    // Left-inclusive: 0.5 <= pmv < 1.5 -> "Slightly Warm" (labels[4])
    // Right-inclusive: -0.5 < pmv <= 0.5 -> "Neutral" (labels[3])
    expect(classifyFromBins(0.5, bins_left)).toBe("Slightly Warm");
    expect(classifyFromBins(0.5, bins_right)).toBe("Neutral");
  });
});

// np.digitize also takes decreasing edges; the library throws unless they are
// strictly increasing (deviation _shared-2).
describe("classifyFromBins - edges must be strictly increasing", () => {
  test.each([
    ["equal", [0, 10, 10, 20]],
    ["decreasing", [20, 10, 0]],
    ["NaN", [0, NaN, 20]],
  ])("throws RangeError for %s edges, whatever the value", (_, edges) => {
    const bins = { edges, labels: edges.map(String), right: true };
    for (const value of [-100, 5, 15, 100, NaN]) {
      expect(() => classifyFromBins(value, bins)).toThrow(
        new RangeError("edges must be strictly increasing."),
      );
    }
  });

  test("accepts strictly increasing edges, a single edge and infinite edges", () => {
    const labels = ["a", "b", "c"];
    expect(
      classifyFromBins(5, { edges: [0, 10, 20], labels, right: true }),
    ).toBe("b");
    expect(classifyFromBins(5, { edges: [10], labels, right: true })).toBe("a");
    expect(
      classifyFromBins(5, {
        edges: [-Infinity, 0, Infinity],
        labels,
        right: true,
      }),
    ).toBe("c");
  });
});
