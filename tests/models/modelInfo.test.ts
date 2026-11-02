import { describe, expect, expectTypeOf, test } from "vitest";
import { deepFreeze } from "../../src/_internal/modelInfo.ts";
import type {
  InputsOf,
  ModelWarning,
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
  // `masked` adds the NaN `number` of a masked output (ADR 0023).
  test("maps each kind to its value type, then warnings", () => {
    type Fields = OutputsOf<{
      outputs: {
        n: { kind: "numeric"; unit: null };
        b: { kind: "bool"; unit: null };
        bm: { kind: "bool"; unit: null; masked: true };
        l: { kind: "label"; unit: null };
        lm: { kind: "label"; unit: null; masked: true };
      };
    }>;
    expectTypeOf<Fields>().toEqualTypeOf<{
      readonly n: number;
      readonly b: boolean;
      readonly bm: boolean | number;
      readonly l: string;
      readonly lm: string | number;
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
      readonly m: readonly number[];
      readonly warnings: readonly ModelWarning[];
    }>();
    expectTypeOf<OutputsOf<Info, number | readonly number[]>>().toEqualTypeOf<{
      readonly s: number | readonly number[];
      readonly n: number;
      readonly m: readonly number[];
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
