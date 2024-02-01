import { JOS3 } from "../../src/models/JOS3.js";
import { describe, it, expect } from "@jest/globals";
import single_iteration from "./1_run_dict.json";
import twenty_iterations from "./20_runs_dict.json";

describe("JOS3", () => {
  describe("state after single iteration", () => {
    describe("results should have correct values", () => {
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

      const results = jos.dict_results();
      for (const [key, value] of Object.entries(single_iteration)) {
        it(key, () => {
          const res = results[key];
          expect(res).not.toBeUndefined();

          const ex = value[0];
          const ac = res[0];

          switch (typeof ex) {
            case "string":
              expect(ac).toBe(ex);
              break;
            default:
              expect(ac).toBeCloseTo(ex, 10);
          }
        });
      }
    });
  });

  describe("state after 20 iterations", () => {
    describe("results should have correct values", () => {
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

      jos.simulate(20);

      const results = jos.dict_results();
      for (const [key, value] of Object.entries(twenty_iterations)) {
        it(key, () => {
          const res = results[key];
          expect(res).not.toBeUndefined();


          for (let i = 0; i < value.length; i++) {
            const ex = value[i];
            const ac = res[i];

            switch (typeof ex) {
              case "string":
                expect(ac).toBe(ex);
                break;
              default:
                expect(ac).toBeCloseTo(ex, 10);
            }
          }
        });
      }
    });
  })
});
