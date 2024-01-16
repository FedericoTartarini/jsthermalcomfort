import { JOS3 } from "../../src/models/JOS3.js";
import { describe, it, expect } from "@jest/globals";

describe("JOS3", () => {
  describe("inital values", () => {
    it("should have the appropriate values", () => {
      const jos = new JOS3(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        "all",
      );
    });
  });
});
