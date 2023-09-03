import { expect, describe, it } from "@jest/globals";
import { two_nodes } from "../../src/models/set_tmp";

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
            e_skin: 16.2, 
            e_rsw: 7.0, 
            e_max: 159.9, 
            q_sensible: 47.6, 
            q_skin: 63.8, 
            q_res: 5.2, 
            t_core: 36.9, 
            t_skin: 33.7, 
            m_bl: 12.9, 
            m_rsw: 10.3, 
            w: 0.1, 
            w_max: 0.6, 
            _set: 23.6, 
            et: 25.0, 
            pmv_gagge: 0.1, 
            pmv_set: -0.0, 
            disc: 0.1, 
            t_sens: 0.1
        },
    },
    {
        tdb: 50,
        tr: 50,
        v: 0.5,
        rh: 150,
        met: 1.2,
        clo: 0.5,
        expected: {
            'e_skin': array([16.2, 16.2]), 
            'e_rsw': array([7., 7.]), 
            'e_max': array([159.9, 159.9]), 
            'q_sensible': array([47.6, 47.6]), 
            'q_skin': array([63.8, 63.8]), 
            'q_res': array([5.2, 5.2]), 
            't_core': array([36.9, 36.9]), 
            't_skin': array([33.7, 33.7]), 
            'm_bl': array([12.9, 12.9]), 
            'm_rsw': array([10.3, 10.3]), 
            'w': array([0.1, 0.1]), 
            'w_max': array([0.6, 0.6]), 
            '_set': array([23.6, 23.6]), 
            'et': array([25., 25.]), 
            'pmv_gagge': array([0.1, 0.1]), 
            'pmv_set': array([-0., -0.]), 
            'disc': array([0.1, 0.1]), 
            't_sens': array([0.1, 0.1])},
    },
    {
      tdb: 50,
      tr: 50,
      v: 0.5,
      rh: 150,
      met: 1.2,
      clo: 0.5,
      expected: {
          'e_skin': array([16.2, 16.2]), 
          'e_rsw': array([7., 7.]), 
          'e_max': array([159.9, 159.9]), 
          'q_sensible': array([47.6, 47.6]), 
          'q_skin': array([63.8, 63.8]), 
          'q_res': array([5.2, 5.2]), 
          't_core': array([36.9, 36.9]), 
          't_skin': array([33.7, 33.7]), 
          'm_bl': array([12.9, 12.9]), 
          'm_rsw': array([10.3, 10.3]), 
          'w': array([0.1, 0.1]), 
          'w_max': array([0.6, 0.6]), 
          '_set': array([23.6, 23.6]), 
          'et': array([25., 25.]), 
          'pmv_gagge': array([0.1, 0.1]), 
          'pmv_set': array([-0., -0.]), 
          'disc': array([0.1, 0.1]), 
          't_sens': array([0.1, 0.1])},
  },
  {
    tdb: 50,
    tr: 50,
    v: 0.5,
    rh: 150,
    met: 1.2,
    clo: 0.5,
    expected: {
        'e_skin': array([16.2, 16.2]), 
        'e_rsw': array([7., 7.]), 
        'e_max': array([159.9, 159.9]), 
        'q_sensible': array([47.6, 47.6]), 
        'q_skin': array([63.8, 63.8]), 
        'q_res': array([5.2, 5.2]), 
        't_core': array([36.9, 36.9]), 
        't_skin': array([33.7, 33.7]), 
        'm_bl': array([12.9, 12.9]), 
        'm_rsw': array([10.3, 10.3]), 
        'w': array([0.1, 0.1]), 
        'w_max': array([0.6, 0.6]), 
        '_set': array([23.6, 23.6]), 
        'et': array([25., 25.]), 
        'pmv_gagge': array([0.1, 0.1]), 
        'pmv_set': array([-0., -0.]), 
        'disc': array([0.1, 0.1]), 
        't_sens': array([0.1, 0.1])},
},
  ])(
    "returns $expected when tdb is $tdb, tr is $tr, v is $v, rh is $rh, met is $met, clo is $clo ",
    ({ tdb, tr, v, rh, met, clo, expected }) => {
      const result = two_nodes(tdb, tr, v, rh, met, clo);

      expect(result).toBeCloseTo(expected, 1);
    },
  );

});