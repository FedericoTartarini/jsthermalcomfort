import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  buildOutputs,
  toComputedOutputs,
} from "../../src/_internal/modelInfo.ts";
import type { OutputsInfo } from "../../src/_internal/modelInfo.ts";
import {
  work_capacity_hothaps,
  WORK_CAPACITY_HOTHAPS_INFO,
} from "../../src/models/index.ts";
import {
  compare_case,
  DEFAULT_TOLERANCE,
  flag_mapping,
  nullable_mapping,
  read_data,
  upstream_returns,
} from "./harness.ts";
import type { CompareOptions, UpstreamCase } from "./harness.ts";

// The representation mappings (R) the harness applies by INFO's outputs
// (ADR 0028, docs/deviations/README.md).

const NAN = { float: "nan" } as const;

const root = fileURLToPath(new URL("../..", import.meta.url));

const OPTIONS: CompareOptions = {
  rounded: [],
  tolerance: DEFAULT_TOLERANCE,
  warnings: false,
  exempt: { outputs: [], warnings: [], throws: [] },
  outputs: {
    f: { kind: "flag", nullable: true, unit: null },
    l: { kind: "label", nullable: true, unit: null },
    s: { kind: "numeric", nullable: true, series: true, unit: "°C" },
    t: { kind: "numeric", unit: "°C" },
  } satisfies OutputsInfo,
};

function upstream(outputs: UpstreamCase["outputs"]): UpstreamCase {
  return { inputs: {}, outputs, warnings: [] };
}

describe("flag_mapping", () => {
  test("maps 1.0, 0.0 and NaN to true, false and null", () => {
    expect([1.0, 0.0, NaN].map(flag_mapping)).toEqual([true, false, null]);
  });

  test("gives undefined for any value outside its domain", () => {
    expect([0.5, -0, 2, true, false, null, "1"].map(flag_mapping)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });
});

describe("nullable_mapping", () => {
  test("maps NaN to null and keeps any other value", () => {
    expect([NaN, 24.1, "Neutral", true].map(nullable_mapping)).toEqual([
      null,
      24.1,
      "Neutral",
      true,
    ]);
  });

  // ADR 0028: a mapping is one-to-one on upstream's domain.
  test("gives undefined for null, outside its domain", () => {
    expect(nullable_mapping(null)).toBe(undefined);
  });
});

describe("compare_case, with the mappings", () => {
  test("passes a case equal through the mappings", () => {
    expect(
      compare_case(
        upstream({ f: 1.0, l: NAN, s: [NAN, 25.5], t: 24.1 }),
        { f: true, l: null, s: [null, 25.5], t: 24.1, warnings: [] },
        OPTIONS,
      ),
    ).toEqual([]);
    expect(
      compare_case(
        upstream({ f: 0.0, l: "Neutral", s: [], t: 25.5 }),
        { f: false, l: "Neutral", s: [], t: 25.5, warnings: [] },
        OPTIONS,
      ),
    ).toEqual([]);
  });

  test("fails a flag whose upstream value is outside the flag mapping's domain", () => {
    expect(
      compare_case(
        upstream({ f: 0.5, l: "Neutral", s: [], t: 24.1 }),
        { f: true, l: "Neutral", s: [], t: 24.1, warnings: [] },
        OPTIONS,
      ),
    ).toEqual([
      "output f: upstream 0.5 is outside the flag mapping's domain, 1.0, 0.0 or NaN",
    ]);
  });

  test("fails a nullable output whose upstream value is None", () => {
    expect(
      compare_case(
        upstream({ f: 1.0, l: null, s: [null], t: 24.1 }),
        { f: true, l: null, s: [null], t: 24.1, warnings: [] },
        OPTIONS,
      ),
    ).toEqual([
      "output l: upstream null is outside the nullable mapping's domain, any value but None",
      "output s[0]: upstream null is outside the nullable mapping's domain, any value but None",
    ]);
  });

  test("fails a library null for an output not declared nullable", () => {
    expect(
      compare_case(
        upstream({ f: 1.0, l: "Neutral", s: [], t: 24.1 }),
        { f: true, l: "Neutral", s: [], t: null, warnings: [] },
        OPTIONS,
      ),
    ).toEqual([
      "output t: library null, but INFO.outputs does not declare t nullable",
    ]);
  });

  test("fails a library NaN where a nullable output maps upstream's NaN to null", () => {
    expect(
      compare_case(
        upstream({ f: NAN, l: NAN, s: [NAN], t: 24.1 }),
        { f: NaN, l: NaN, s: [NaN], t: 24.1, warnings: [] },
        OPTIONS,
      ),
    ).toEqual([
      "output f: library NaN, upstream NaN as null",
      "output l: library NaN, upstream NaN as null",
      "output s[0]: library NaN, upstream NaN as null",
    ]);
  });

  // Decision 327: upstream's NaN fails in an output not declared nullable,
  // whatever the library returns.
  test("fails an upstream NaN for an output not declared nullable", () => {
    const undeclared_flag: CompareOptions = {
      ...OPTIONS,
      outputs: { ...OPTIONS.outputs, f: { kind: "flag", unit: null } },
    };
    expect(
      compare_case(
        upstream({ f: 1.0, l: "Neutral", s: [], t: NAN }),
        { f: true, l: "Neutral", s: [], t: NaN, warnings: [] },
        undeclared_flag,
      ),
    ).toEqual([
      "output t: upstream NaN, but INFO.outputs does not declare t nullable",
    ]);
    expect(
      compare_case(
        upstream({ f: NAN, l: "Neutral", s: [], t: 24.1 }),
        { f: null, l: "Neutral", s: [], t: 24.1, warnings: [] },
        undeclared_flag,
      ),
    ).toEqual([
      "output f: upstream NaN, but INFO.outputs does not declare f nullable",
    ]);
  });

  // The known positive: case 0 of tests/parity/data/work_capacity_hothaps.json
  // (wbgt -0.4), whose capacity upstream returns as NaN, through the model's own INFO and through
  // that INFO with capacity's declaration removed, where the model would return
  // the NaN as it is.
  test("fails a model's NaN case once its declaration is removed", () => {
    const [expected] = read_data(root, "work_capacity_hothaps").cases.filter(
      upstream_returns,
    );
    if (expected === undefined) throw new Error("no case 0");
    const result = work_capacity_hothaps(
      expected.inputs as Parameters<typeof work_capacity_hothaps>[0],
    );
    const options = { ...OPTIONS, outputs: WORK_CAPACITY_HOTHAPS_INFO.outputs };
    expect(compare_case(expected, result, options)).toEqual([]);

    const undeclared_info = {
      outputs: {
        capacity: {
          kind: "numeric",
          unit: WORK_CAPACITY_HOTHAPS_INFO.outputs.capacity.unit,
        },
      },
    } as const satisfies { outputs: OutputsInfo };
    const computed = toComputedOutputs(WORK_CAPACITY_HOTHAPS_INFO, result);
    const returned = buildOutputs(undeclared_info, computed, result.warnings);
    expect(returned.capacity).toBeNaN();
    expect(
      compare_case(expected, returned, {
        ...options,
        outputs: undeclared_info.outputs,
      }),
    ).toEqual([
      "output capacity: upstream NaN, but INFO.outputs does not declare capacity nullable",
    ]);
  });
});
