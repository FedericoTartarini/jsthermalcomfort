import { local_bsa } from "../../src/jos3_functions/local_bsa";
import JOS3Defaults from "../../src/jos3_functions/JOS3Defaults";
import { describe, it, expect } from "@jest/globals";

describe("local_bsa", () => {
  it("should use the correct defaults", () => {
    const withDefaults = local_bsa();
    const withoutDefaults = local_bsa(
      JOS3Defaults.height,
      JOS3Defaults.weight,
      JOS3Defaults.bsa_equation,
    );

    expect(withoutDefaults).toEqual(withDefaults);
  });

  it.each([
    {
      height: 1.72,
      weight: 74.43,
      bsa_equation: "dubois",
      expected: [
        0.11005713796319246, 0.02901506364484165, 0.1750909013050789,
        0.1610836292006726, 0.22111479536241394, 0.09604986585878615,
        0.06303272446982841, 0.05002597180145112, 0.09604986585878615,
        0.06303272446982841, 0.05002597180145112, 0.20910856213006568,
        0.1120581768352505, 0.05602908841762525, 0.20910856213006568,
        0.1120581768352505, 0.05602908841762525,
      ],
    },
    {
      height: 1.72,
      weight: 74.43,
      bsa_equation: "takahira",
      expected: [
        0.1112557800598213, 0.029331069288498345, 0.17699783191335206,
        0.1628380053602839, 0.2235229763020046, 0.09709595350675314,
        0.06371921948880674, 0.05057080911810059, 0.09709595350675314,
        0.06371921948880674, 0.05057080911810059, 0.21138598211366047,
        0.11327861242454533, 0.056639306212272665, 0.21138598211366047,
        0.11327861242454533, 0.056639306212272665,
      ],
    },
    {
      height: 1.72,
      weight: 74.43,
      bsa_equation: "fujimoto",
      expected: [
        0.10760858312017771, 0.028369535549865033, 0.17119547314573727,
        0.1574998352940783, 0.21619542608690248, 0.09391294526851873,
        0.06163037033246542, 0.04891299232735351, 0.09391294526851873,
        0.06163037033246542, 0.04891299232735351, 0.20445630792833763,
        0.10956510281327185, 0.054782551406635925, 0.20445630792833763,
        0.10956510281327185, 0.054782551406635925,
      ],
    },
    {
      height: 1.72,
      weight: 74.43,
      bsa_equation: "kurazumi",
      expected: [
        0.10902004189454918, 0.02874164740856297, 0.17344097574132825,
        0.159565697682022, 0.21903117507904882, 0.09514476383524292,
        0.06243875126687817, 0.04955456449752236, 0.09514476383524292,
        0.06243875126687817, 0.04955456449752236, 0.20713807959964345,
        0.11100222447445009, 0.05550111223722504, 0.20713807959964345,
        0.11100222447445009, 0.05550111223722504,
      ],
    },
  ])(
    "should return $expected when height is $height, weight is $weight, and bsa_equation is $bsa_equation",
    ({ height, weight, bsa_equation, expected }) => {
      const result = local_bsa(height, weight, bsa_equation).toArray();

      expect(result).toHaveLength(expected.length);

      for (let i = 0; i < result.length; i++) {
        expect(result[i]).toBeCloseTo(expected[i]);
      }
    },
  );
});
