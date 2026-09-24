import { describe, expect, test } from "@jest/globals";
import { deepFreeze } from "../../src/models/modelDocs.ts";

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
