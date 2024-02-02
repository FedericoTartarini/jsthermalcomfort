import { JOS3 } from "../../src/models/JOS3.js";
import { describe, it, expect } from "@jest/globals";
import single_iteration from "./1_run_dict.json";
import twenty_iterations from "./20_runs_dict.json";
import getters from "./1_run_getters.json";
import setters from "./1_run_setters.json";
import * as math from "mathjs";
import { BODY_NAMES } from "../../src/jos3_functions/matrix.js";

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

    const checkProperty = (prop, expected) => {
      if (math.isMatrix(prop)) {
        prop = prop.toArray();
      }

      if (Array.isArray(expected)) {
        for (let i = 0; i < expected.length; i++) {
          expect(prop[i]).toBeCloseTo(expected[i], 10);
        }
      } else if (typeof expected === "string") {
        expect(prop).toBe(expected);
      } else if (typeof expected === "number") {
        expect(prop).toBeCloseTo(expected, 10);
      } else {
        throw new Error(`whoops, not implemented for "${typeof expected}"`);
      }
    }

    describe("getters return correct values", () => {
      const jos = new JOS3();

      it("body_names", () => {
        expect(jos.body_names).toBe(BODY_NAMES);
      });

      it("results", () => {
        expect(jos.results).toStrictEqual(jos.dict_results());
      });

      it.each(getters)("$property", ({ property, expected }) => {
        checkProperty(jos[property], expected);
      });
    });

    describe("setters operate appropriately", () => {
      it.each(setters)("$property", ({ property, operations }) => {
        for (const { next, expected } of operations) {
          const jos = new JOS3();
          let set = next;

          if (Array.isArray(set)) {
            set = math.matrix(set);
          }

          jos[property] = set;
          checkProperty(jos[property], expected);
        }
      });
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
  });
});
