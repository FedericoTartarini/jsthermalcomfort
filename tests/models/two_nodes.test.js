import { expect, describe, it } from "@jest/globals";
import { two_nodes } from "../../src/models/two_nodes.js";
import { deep_close_to_obj } from "../test_utilities";

describe("two_nodes", () => {
  it("should be a function", () => {
    expect(two_nodes).toBeInstanceOf(Function);
  });

  it.each([
    {
      tdb: 25,
      tr: 25,
      v: 0.3,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      expected: {
        e_skin: 10.7,
        e_rsw: 0.7,
        e_max: 167.3,
        q_sensible: 50.7,
        q_skin: 61.4,
        q_res: 5.2,
        t_core: 36.9,
        t_skin: 34.3,
        m_bl: 16.3,
        m_rsw: 1,
        w: 0.1,
        w_max: 0.6,
        set: 24,
        et: 25.0,
        pmv_gagge: -0.1,
        pmv_set: -0.2,
        disc: 0.7,
        t_sens: 0.7,
      },
    },
    {
      tdb: 30,
      tr: 30,
      v: 0.5,
      rh: 80,
      met: 1.2,
      clo: 0.5,
      expected: {
        e_skin: 8.9,
        e_rsw: 0.7,
        e_max: 138.5,
        q_sensible: 39.6,
        q_skin: 48.6,
        q_res: 3.0,
        t_core: 37.3,
        t_skin: 36.6,
        m_bl: 62.9,
        m_rsw: 1,
        w: 0.1,
        w_max: 0.6,
        set: 29.0,
        et: 30.7,
        pmv_gagge: 0.7,
        pmv_set: 0.8,
        disc: 3,
        t_sens: 3,
      },
    },
  ])(
    "returns $expected when tdb is $tdb, tr is $tr, v is $v, rh is $rh, met is $met, clo is $clo ",
    ({ tdb, tr, v, rh, met, clo, expected }) => {
      const result = two_nodes(tdb, tr, v, rh, met, clo);

      expect(result).toStrictEqual(expected, 1);
    },
  );
});
