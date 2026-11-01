import { describe, expect, test } from "vitest";
import type { ModelInfo } from "../../src/models/index.ts";

const not_a_number = ["25", {}, () => 25, 25n, true, false, null, [25]];
const not_finite = [NaN, Infinity, -Infinity];
const not_a_boolean = ["true", 1, null];

const finiteMessage = (key: string) => `${key} must be a finite number.`;
const booleanMessage = (key: string) => `${key} must be a boolean.`;

/** Whether `value` and every object it holds are frozen. */
export function isDeepFrozen(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return true;
  return Object.isFrozen(value) && Object.values(value).every(isDeepFrozen);
}

/**
 * The checks every v2 model shares, generated from its INFO: the parse's
 * errors and their order, `undefined` taking a default, deeply frozen outputs
 * keyed as `INFO.outputs` then `warnings`, and a deeply frozen INFO. A model's
 * own test keeps only what is the model's: upstream's messages, values, rows
 * and gates.
 *
 * The parse's checks are the library's: an array (deviation _shared-5), a
 * boolean or `null` (deviation _shared-6) for a quantity throws `TypeError`,
 * except `false` or `null` for one whose default is that value, upstream's
 * `False` or `None`, and
 * NaN or ±Infinity `RangeError` (deviation _shared-7); every switch is
 * checked to be a boolean (deviation _shared-8); the keys are checked in
 * `INFO.inputs`' order, a missing key at its place too (deviation _shared-9);
 * and every message but a string option's is the library's (deviation
 * _shared-10). The messages are written out here, not imported from
 * `src/_internal/errors.ts`, so a changed message fails. The outputs are frozen
 * as upstream's return dataclass is (`@dataclass(frozen=True, repr=False)`:
 * `APMV`, `AdaptiveASHRAE`, `AnkleDraft`, `AT`, `ATHB`, `CloTOut`, `CE`,
 * `DI`, `EPMV`, `ESI`, `HI`, `Humidex`, `PHS`, `PMVPPD`, `PMVPPDAshrae`,
 * `SET`, `SolarGain`, `GaggeTwoNodes`, `UseFansHeatwaves`, `UTCI`,
 * `VerticalTGradPPD`, `WCI`, `WCT` and `SportsHeatStressRisk` at
 * `classes_return.py:97, :111, :184, :200, :213, :227, :241, :254, :270,
 * :284, :297, :311, :353, :415, :435, :467, :480, :497, :631, :689, :705,
 * :735, :748, :1073`, and `@dataclass(frozen=True)`: `WorkCapacity` at `:761`),
 * and as `AdaptiveEN` is, although upstream's is a plain `@dataclass`
 * (`:143`, deviation adaptive_en-5).
 *
 * Every case calls the model the subpath index exports, the seam of every
 * behaviour test (decision 93, S1), so the contract holds for what a consumer
 * calls, not for the parse alone.
 *
 * @param model - The model, as the subpath index exports it.
 * @param info - Its `*_INFO`.
 * @param valid - Inputs that pass the parse.
 * @param flagged - Inputs that give at least one row, for a model that has
 *   range checks.
 */
export function describeModelContract(
  model: (inputs: never) => object,
  info: ModelInfo,
  valid: Readonly<Record<string, unknown>>,
  flagged?: Readonly<Record<string, unknown>>,
): void {
  const run = model as (inputs: unknown) => {
    readonly warnings: readonly object[];
  };
  const call = (inputs: unknown) => () => run(inputs);
  const entries = Object.entries(info.inputs);
  const keysOf = (kind: string) =>
    entries.filter(([, e]) => e.kind === kind).map(([key]) => key);
  const required = entries.filter(([, e]) => e.default === undefined);
  const optional = entries.filter(([, e]) => e.default !== undefined);
  const omit = (key: string) =>
    Object.fromEntries(Object.entries(valid).filter(([k]) => k !== key));
  const invalid = (key: string): [unknown, Error] => {
    const entry = info.inputs[key];
    if (entry?.kind === "numeric")
      return ["x", new TypeError(finiteMessage(key))];
    if (entry?.kind === "bool")
      return ["x", new TypeError(booleanMessage(key))];
    const message = entry?.message;
    return [
      1,
      new TypeError(typeof message === "function" ? message("1") : message),
    ];
  };

  describe(`${info.name} contract (JS-only)`, () => {
    test("anything but an inputs object throws TypeError", () => {
      for (const bad of [30, null, undefined, [30], "tdb"])
        expect(call(bad)).toThrow(
          new TypeError(`${info.name}() takes one inputs object.`),
        );
    });

    test("an unknown key throws TypeError, naming the first", () => {
      const unknown = new TypeError(`foo is not an input of ${info.name}().`);
      expect(call({ ...valid, foo: 1, bar: 2 })).toThrow(unknown);
      expect(call({ foo: 1, bar: 2 })).toThrow(unknown);
    });

    test.each(required.map(([key]) => key))(
      "%s left out throws TypeError",
      (key) => {
        const missing = new TypeError(`${key} is required.`);
        expect(call(omit(key))).toThrow(missing);
        expect(call({ ...valid, [key]: undefined })).toThrow(missing);
      },
    );

    test.each(keysOf("numeric"))("%s that is not a number", (key) => {
      const fallback = info.inputs[key]?.default;
      for (const bad of not_a_number.filter((v) => v !== fallback))
        expect(call({ ...valid, [key]: bad })).toThrow(
          new TypeError(finiteMessage(key)),
        );
      for (const bad of not_finite)
        expect(call({ ...valid, [key]: bad })).toThrow(
          new RangeError(finiteMessage(key)),
        );
    });

    test.each(keysOf("bool"))("%s that is not a boolean", (key) => {
      for (const bad of not_a_boolean)
        expect(call({ ...valid, [key]: bad })).toThrow(
          new TypeError(booleanMessage(key)),
        );
    });

    test("checks run in INFO.inputs' order", () => {
      const bad = Object.fromEntries(
        entries.map(([key]) => [key, invalid(key)[0]]),
      );
      for (const [i, [key]] of entries.entries()) {
        const fixed = Object.fromEntries(
          entries.slice(0, i).map(([k]) => [k, valid[k]]),
        );
        expect(call({ ...bad, ...fixed })).toThrow(invalid(key)[1]);
        if (info.inputs[key]?.default === undefined)
          expect(call({ ...bad, ...fixed, [key]: undefined })).toThrow(
            new TypeError(`${key} is required.`),
          );
      }
    });

    test.each(optional.map(([key, e]) => [key, e.default]))(
      "%s undefined takes its default, %s",
      (key, value) => {
        expect(run({ ...valid, [key]: undefined })).toEqual(
          run({ ...valid, [key]: value }),
        );
      },
    );

    test("the outputs are frozen deeply, keyed as INFO.outputs then warnings", () => {
      const outputs = run(flagged ?? valid);
      if (flagged) expect(outputs.warnings.length).toBeGreaterThan(0);
      expect(isDeepFrozen(outputs)).toBe(true);
      expect(Object.keys(outputs)).toEqual([
        ...Object.keys(info.outputs),
        "warnings",
      ]);
    });

    test("INFO is frozen deeply", () => {
      expect(isDeepFrozen(info)).toBe(true);
    });
  });
}
