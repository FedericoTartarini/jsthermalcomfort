import { describe, expect, test } from "@jest/globals";
import { classifyFromBins } from "../../src/models/classifierBins";

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
  const binsRight = {
    edges: [10],
    labels: ["low", "high"],
    right: true,
  };

  const binsLeft = {
    edges: [10],
    labels: ["low", "high"],
    right: false,
  };

  test("right-inclusive: value <= edge -> labels[0]", () => {
    expect(classifyFromBins(10, binsRight)).toBe("low");
    expect(classifyFromBins(5, binsRight)).toBe("low");
  });

  test("right-inclusive: value > edge -> NaN", () => {
    expect(classifyFromBins(10.001, binsRight)).toBeNaN();
    expect(classifyFromBins(20, binsRight)).toBeNaN();
  });

  test("left-inclusive: value < edge -> labels[0]", () => {
    expect(classifyFromBins(5, binsLeft)).toBe("low");
    expect(classifyFromBins(9.999, binsLeft)).toBe("low");
  });

  test("left-inclusive: value >= edge -> NaN", () => {
    expect(classifyFromBins(10, binsLeft)).toBeNaN();
    expect(classifyFromBins(20, binsLeft)).toBeNaN();
  });
});

describe("classifyFromBins - mirroring heat_index bins", () => {
  // Heat index bins are right-inclusive
  const hiBins = {
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
    expect(classifyFromBins(20, hiBins)).toBe("no risk");
    expect(classifyFromBins(27, hiBins)).toBe("no risk");
  });

  test("27 < hi <= 32 -> caution", () => {
    expect(classifyFromBins(27.1, hiBins)).toBe("caution");
    expect(classifyFromBins(32, hiBins)).toBe("caution");
  });

  test("32 < hi <= 41 -> extreme caution", () => {
    expect(classifyFromBins(32.1, hiBins)).toBe("extreme caution");
    expect(classifyFromBins(41, hiBins)).toBe("extreme caution");
  });

  test("41 < hi <= 54 -> danger", () => {
    expect(classifyFromBins(41.1, hiBins)).toBe("danger");
    expect(classifyFromBins(54, hiBins)).toBe("danger");
  });

  test("54 < hi <= 1000 -> extreme danger", () => {
    expect(classifyFromBins(54.1, hiBins)).toBe("extreme danger");
    expect(classifyFromBins(1000, hiBins)).toBe("extreme danger");
  });

  test("hi > 1000 -> NaN", () => {
    expect(classifyFromBins(1000.1, hiBins)).toBeNaN();
  });
});

describe("classifyFromBins - mirroring PMV bins (left-inclusive)", () => {
  // PMV ISO bins are left-inclusive
  const pmvBins = {
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
    expect(classifyFromBins(-3, pmvBins)).toBe("Cold");
    expect(classifyFromBins(-2.5001, pmvBins)).toBe("Cold");
  });

  test("-2.5 <= pmv < -1.5 -> Cool", () => {
    expect(classifyFromBins(-2.5, pmvBins)).toBe("Cool");
    expect(classifyFromBins(-2, pmvBins)).toBe("Cool");
    expect(classifyFromBins(-1.5001, pmvBins)).toBe("Cool");
  });

  test("-1.5 <= pmv < -0.5 -> Slightly Cool", () => {
    expect(classifyFromBins(-1.5, pmvBins)).toBe("Slightly Cool");
    expect(classifyFromBins(-1, pmvBins)).toBe("Slightly Cool");
  });

  test("-0.5 <= pmv < 0.5 -> Neutral", () => {
    expect(classifyFromBins(-0.5, pmvBins)).toBe("Neutral");
    expect(classifyFromBins(0, pmvBins)).toBe("Neutral");
    expect(classifyFromBins(0.4999, pmvBins)).toBe("Neutral");
  });

  test("0.5 <= pmv < 1.5 -> Slightly Warm", () => {
    expect(classifyFromBins(0.5, pmvBins)).toBe("Slightly Warm");
    expect(classifyFromBins(1, pmvBins)).toBe("Slightly Warm");
  });

  test("1.5 <= pmv < 2.5 -> Warm", () => {
    expect(classifyFromBins(1.5, pmvBins)).toBe("Warm");
    expect(classifyFromBins(2, pmvBins)).toBe("Warm");
  });

  test("2.5 <= pmv < 10 -> Hot", () => {
    expect(classifyFromBins(2.5, pmvBins)).toBe("Hot");
    expect(classifyFromBins(5, pmvBins)).toBe("Hot");
    expect(classifyFromBins(9.999, pmvBins)).toBe("Hot");
  });

  test("pmv >= 10 -> NaN", () => {
    expect(classifyFromBins(10, pmvBins)).toBeNaN();
    expect(classifyFromBins(11, pmvBins)).toBeNaN();
  });
});

describe("classifyFromBins - mirroring PMV bins (right-inclusive)", () => {
  // PMV ASHRAE bins are right-inclusive
  const pmvBins = {
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
    expect(classifyFromBins(-3, pmvBins)).toBe("Cold");
    expect(classifyFromBins(-2.5, pmvBins)).toBe("Cold");
  });

  test("-2.5 < pmv <= -1.5 -> Cool", () => {
    expect(classifyFromBins(-2.4999, pmvBins)).toBe("Cool");
    expect(classifyFromBins(-2, pmvBins)).toBe("Cool");
    expect(classifyFromBins(-1.5, pmvBins)).toBe("Cool");
  });

  test("-1.5 < pmv <= -0.5 -> Slightly Cool", () => {
    expect(classifyFromBins(-1.4999, pmvBins)).toBe("Slightly Cool");
    expect(classifyFromBins(-1, pmvBins)).toBe("Slightly Cool");
    expect(classifyFromBins(-0.5, pmvBins)).toBe("Slightly Cool");
  });

  test("-0.5 < pmv <= 0.5 -> Neutral", () => {
    expect(classifyFromBins(-0.4999, pmvBins)).toBe("Neutral");
    expect(classifyFromBins(0, pmvBins)).toBe("Neutral");
    expect(classifyFromBins(0.5, pmvBins)).toBe("Neutral");
  });

  test("0.5 < pmv <= 1.5 -> Slightly Warm", () => {
    expect(classifyFromBins(0.5001, pmvBins)).toBe("Slightly Warm");
    expect(classifyFromBins(1, pmvBins)).toBe("Slightly Warm");
    expect(classifyFromBins(1.5, pmvBins)).toBe("Slightly Warm");
  });

  test("1.5 < pmv <= 2.5 -> Warm", () => {
    expect(classifyFromBins(1.5001, pmvBins)).toBe("Warm");
    expect(classifyFromBins(2, pmvBins)).toBe("Warm");
    expect(classifyFromBins(2.5, pmvBins)).toBe("Warm");
  });

  test("2.5 < pmv <= 10 -> Hot", () => {
    expect(classifyFromBins(2.5001, pmvBins)).toBe("Hot");
    expect(classifyFromBins(5, pmvBins)).toBe("Hot");
    expect(classifyFromBins(10, pmvBins)).toBe("Hot");
  });

  test("pmv > 10 -> NaN", () => {
    expect(classifyFromBins(10.0001, pmvBins)).toBeNaN();
    expect(classifyFromBins(11, pmvBins)).toBeNaN();
  });
});

describe("classifyFromBins - divergence at boundary (intentional)", () => {
  // Verify that left-inclusive and right-inclusive give different results at boundary
  // This mirrors the pyth ermalcomfort #382 inconsistency between ISO and ASHRAE models
  const pmvEdges = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 10];
  const pmvLabels = [
    "Cold",
    "Cool",
    "Slightly Cool",
    "Neutral",
    "Slightly Warm",
    "Warm",
    "Hot",
  ];

  const binsRight = {
    edges: pmvEdges,
    labels: pmvLabels,
    right: true,
  };

  const binsLeft = {
    edges: pmvEdges,
    labels: pmvLabels,
    right: false,
  };

  test("at pmv=-0.5: left-inclusive gives Neutral, right-inclusive gives Slightly Cool", () => {
    // At -0.5 (a bin edge), the two models give different categories.
    // Left-inclusive: -0.5 <= pmv < 0.5 -> "Neutral" (labels[3])
    // Right-inclusive: -1.5 < pmv <= -0.5 -> "Slightly Cool" (labels[2])
    // This is the intentional divergence between ISO (left) and ASHRAE (right).
    expect(classifyFromBins(-0.5, binsLeft)).toBe("Neutral");
    expect(classifyFromBins(-0.5, binsRight)).toBe("Slightly Cool");
  });

  test("at pmv=0.5: left-inclusive gives Slightly Warm, right-inclusive gives Neutral", () => {
    // Similar divergence at pmv=0.5.
    // Left-inclusive: 0.5 <= pmv < 1.5 -> "Slightly Warm" (labels[4])
    // Right-inclusive: -0.5 < pmv <= 0.5 -> "Neutral" (labels[3])
    expect(classifyFromBins(0.5, binsLeft)).toBe("Slightly Warm");
    expect(classifyFromBins(0.5, binsRight)).toBe("Neutral");
  });
});
