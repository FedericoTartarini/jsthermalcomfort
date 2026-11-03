import { describe, expect, expectTypeOf, test } from "vitest";
import { buildOutputs, deepFreeze } from "../../src/_internal/modelInfo.ts";
import type {
  InputsOf,
  ModelWarning,
  OutputsInfo,
  OutputsOf,
  ResolvedOf,
} from "../../src/_internal/modelInfo.ts";

describe("deepFreeze", () => {
  // The cycle guard from #197: without it, a self-reference recurses until
  // the stack overflows.
  test("a cyclic object returns, frozen, without recursing forever", () => {
    const child: { parent?: object } = {};
    const obj = { child, self: undefined as unknown };
    obj.self = obj;
    child.parent = obj;

    expect(deepFreeze(obj)).toBe(obj);
    expect(Object.isFrozen(obj)).toBe(true);
    expect(Object.isFrozen(child)).toBe(true);
  });

  test("a symbol-keyed child comes back frozen", () => {
    const key = Symbol("child");
    const obj = { [key]: { nested: {} } };

    deepFreeze(obj);

    expect(Object.isFrozen(obj[key])).toBe(true);
    expect(Object.isFrozen(obj[key].nested)).toBe(true);
  });
});

describe("buildOutputs", () => {
  const INFO = {
    outputs: {
      n: { kind: "numeric", unit: null },
      nm: { kind: "numeric", masked: true, unit: null },
      f: { kind: "flag", masked: true, unit: null },
      l: { kind: "label", masked: true, unit: null },
      ln: { kind: "label_or_numeric", masked: true, unit: "h" },
      s: { kind: "numeric", masked: true, series: true, unit: "°C" },
      c: { kind: "label", none: true, unit: null },
    },
  } as const satisfies { outputs: OutputsInfo };
  const ROW: ModelWarning = { kind: "notice", message: "fell back" };

  // Decision 310.
  test("reads a flag's 1.0, 0.0 and NaN as true, false and null", () => {
    const values = [1.0, 0.0, NaN].map(
      (f) =>
        buildOutputs(
          INFO,
          { n: 1, nm: 1, f, l: "a", ln: 1, s: [1], c: null },
          [],
        ).f,
    );
    expect(values).toEqual([true, false, null]);
  });

  test("turns a NaN into null only in an output declared masked", () => {
    const result = buildOutputs(
      INFO,
      { n: NaN, nm: NaN, f: 1.0, l: NaN, ln: NaN, s: [NaN, 2.5], c: null },
      [],
    );
    expect(result.n).toBeNaN();
    expect(result.nm).toBe(null);
    expect(result.l).toBe(null);
    expect(result.ln).toBe(null);
    expect(result.s).toEqual([null, 2.5]);
    expect(result.c).toBe(null);
  });

  test("keeps every other value as it is", () => {
    const result = buildOutputs(
      INFO,
      {
        n: 1.5,
        nm: 2.5,
        f: 0.0,
        l: "cold",
        ln: "more than 8",
        s: [3],
        c: null,
      },
      [],
    );
    expect(result).toEqual({
      n: 1.5,
      nm: 2.5,
      f: false,
      l: "cold",
      ln: "more than 8",
      s: [3],
      c: null,
      warnings: [],
    });
    expect(
      buildOutputs(
        INFO,
        { n: 1, nm: 1, f: 1, l: "a", ln: 4.5, s: [], c: null },
        [],
      ).ln,
    ).toBe(4.5);
  });

  test("returns the outputs in INFO's order, then warnings, all frozen", () => {
    const warnings = [ROW];
    const result = buildOutputs(
      INFO,
      { c: null, s: [1], ln: 1, l: "a", f: 1, nm: 1, n: 1 },
      warnings,
    );
    expect(Object.keys(result)).toEqual([
      ...Object.keys(INFO.outputs),
      "warnings",
    ]);
    expect(result.warnings).toEqual([ROW]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.warnings)).toBe(true);
    expect(Object.isFrozen(result.s)).toBe(true);
  });
});

// The type `as const` gives an inputs table.
type Inputs = Readonly<{
  n: { readonly kind: "numeric"; readonly unit: null };
  nd: { readonly kind: "numeric"; readonly unit: null; readonly default: 1 };
  b: { readonly kind: "bool"; readonly default: false };
  c: {
    readonly kind: "choice";
    readonly allowed: readonly ["SI", "IP"];
    readonly message: "";
  };
  cd: {
    readonly kind: "choice";
    readonly allowed: readonly ["a", "b"];
    readonly default: "a";
    readonly message: "";
  };
}>;

describe("InputsOf", () => {
  // ADR 0019, whitelist item 6: `undefined` takes the default.
  test("a key with a default is optional, a choice takes its allowed", () => {
    expectTypeOf<InputsOf<{ inputs: Inputs }>>().toEqualTypeOf<{
      n: number;
      c: "SI" | "IP";
      nd?: number | undefined;
      b?: boolean | undefined;
      cd?: "a" | "b" | undefined;
    }>();
  });
});

describe("ResolvedOf", () => {
  // define.ts' parseChoice returns a choice in the case the caller gave.
  test("every key is required, and a choice is a string", () => {
    expectTypeOf<ResolvedOf<Inputs>>().toEqualTypeOf<{
      n: number;
      nd: number;
      b: boolean;
      c: string;
      cd: string;
    }>();
  });
});

describe("OutputsOf", () => {
  // `masked` adds `null`, an output's "no value" (decision 310).
  test("maps each kind to its value type, then warnings", () => {
    type Fields = OutputsOf<{
      outputs: {
        n: { kind: "numeric"; unit: null };
        nm: { kind: "numeric"; unit: null; masked: true };
        f: { kind: "flag"; unit: null };
        fm: { kind: "flag"; unit: null; masked: true };
        l: { kind: "label"; unit: null };
        lm: { kind: "label"; unit: null; masked: true };
        ln: { kind: "label_or_numeric"; unit: "h"; masked: true };
      };
    }>;
    expectTypeOf<Fields>().toEqualTypeOf<{
      readonly n: number;
      readonly nm: number | null;
      readonly f: boolean;
      readonly fm: boolean | null;
      readonly l: string;
      readonly lm: string | null;
      readonly ln: string | number | null;
      readonly warnings: readonly ModelWarning[];
    }>();
  });

  // A second type argument types every series output as that type, a
  // one-step call's number where upstream returns one (decisions 276, 277).
  test("types a series output as the series type given", () => {
    interface Info {
      outputs: {
        s: { kind: "numeric"; unit: "°C"; series: true };
        n: { kind: "numeric"; unit: null };
        m: { kind: "numeric"; unit: null; series: true; masked: true };
      };
    }
    expectTypeOf<OutputsOf<Info, number>>().toEqualTypeOf<{
      readonly s: number;
      readonly n: number;
      readonly m: readonly (number | null)[];
      readonly warnings: readonly ModelWarning[];
    }>();
    expectTypeOf<OutputsOf<Info, number | readonly number[]>>().toEqualTypeOf<{
      readonly s: number | readonly number[];
      readonly n: number;
      readonly m: readonly (number | null)[];
      readonly warnings: readonly ModelWarning[];
    }>();
  });

  // `none` keeps a dataclass field at its `None` default (decision 279).
  test("maps a none output to null", () => {
    type Fields = OutputsOf<{
      outputs: {
        h: { kind: "numeric"; unit: "°C" };
        c: { kind: "label"; unit: null; none: true };
      };
    }>;
    expectTypeOf<Fields>().toEqualTypeOf<{
      readonly h: number;
      readonly c: null;
      readonly warnings: readonly ModelWarning[];
    }>();
  });

  // `series` makes an output a time series (decision 269).
  test("maps a series output to a readonly array of its kind", () => {
    type Fields = OutputsOf<{
      outputs: { s: { kind: "numeric"; unit: "°C"; series: true } };
    }>;
    expectTypeOf<Fields>().toEqualTypeOf<{
      readonly s: readonly number[];
      readonly warnings: readonly ModelWarning[];
    }>();
  });
});
