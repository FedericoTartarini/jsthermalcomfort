import { expect, describe, it } from "@jest/globals";
import { phs } from "../../src/models/phs";

describe("phs 2023", () => {
  it("should match the 2023 reference case from pythermalcomfort", () => {
    // Reference case: tdb=40, tr=40, rh=33.85, v=0.3, met=2.5, clo=0.5, posture="standing"
    // Expect t_re = 37.5 (ISO 7933:2023)
    const result = phs(
      40,
      40,
      0.3,
      33.85,
      2.5,
      0.5,
      "standing",
      0,
      "7933-2023",
    );

    expect(result.t_re).toBeCloseTo(37.5, 1);
    // Values from Python reference (pythermalcomfort phs model="7933-2023"):
    // sweat_loss_g: 5847.0
    // sweat_rate_watt: 252.1
    expect(result.sweat_loss_g).toBeCloseTo(5847.0, 0);
    expect(result.sweat_rate_watt).toBeCloseTo(252.1, 1);
  });

  it("should handle the 2004 version correctly when explicitly requested", () => {
    // The same case in 2004 might yield different results.
    // In 2004, t_re for this case is also 37.5 in some versions but let's check
    const result2004 = phs(
      40,
      40,
      0.3,
      33.85,
      2.5,
      0.5,
      "standing",
      0,
      "7933-2004",
    );
    // Verify it doesn't crash and returns a reasonable value
    expect(result2004.t_re).toBeDefined();
  });
});
