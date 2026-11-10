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
 * NaN or ±Infinity `RangeError` (deviation _shared-7), and a number that is
 * not an integer for an `integer` entry `TypeError` (deviation _shared-80),
 * and a `series` entry, which takes an array, checks each element so;
 * every switch is
 * checked to be a boolean (deviation _shared-8); the keys are checked in
 * `INFO.inputs`' order, a missing key at its place too (deviation _shared-9);
 * and every message but a string option's is the library's (deviation
 * _shared-10). The messages are written out here, not imported from
 * `src/_internal/errors.ts`, so a changed message fails. The outputs are frozen
 * as upstream's return dataclass is (`@dataclass(frozen=True, repr=False)`:
 * `APMV`, `AdaptiveASHRAE`, `AnkleDraft`, `AT`, `ATHB`, `CloTOut`, `CE`,
 * `DI`, `EPMV`, `ESI`, `HI`, `Humidex`, `NET`, `PETSteady`, `PHS`, `PMVPPD`,
 * `PMVPPDAshrae`, `SET`, `SolarGain`, `GaggeTwoNodes`, `GaggeTwoNodesJi`,
 * `GaggeTwoNodesSleep`, `THI`, `UseFansHeatwaves`, `UTCI`, `VerticalTGradPPD`, `WBGT`, `WCI`,
 * `WCT`, `SportsHeatStressRisk`, `PredictedBodyTemperatures` and `IREQ` at
 * `classes_return.py:97, :111, :189, :207, :220, :234, :248, :261, :277,
 * :291, :304, :318, :334, :347, :360, :422, :442, :474, :487, :504, :569, :585,
 * :598, :638, :700, :716, :734, :747, :760, :1048, :1085, :1112`, and
 * `@dataclass(frozen=True)`: `WorkCapacity` at `:773`),
 * and as `AdaptiveEN` is, although upstream's is a plain `@dataclass`
 * (`:145`, deviation adaptive_en-5).
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
      const entry = info.inputs[key];
      const series = entry?.kind === "numeric" && entry.series === true;
      const fallback = entry?.default;
      // A series takes an array, each element checked as a number
      // (decision 277).
      const elements = series ? not_a_number.map((v) => [25, v]) : [];
      for (const bad of [
        ...not_a_number.filter(
          (v) => v !== fallback && !(series && Array.isArray(v)),
        ),
        ...elements,
      ])
        expect(call({ ...valid, [key]: bad })).toThrow(
          new TypeError(finiteMessage(key)),
        );
      for (const bad of [
        ...not_finite,
        ...(series ? not_finite.map((v) => [25, v]) : []),
      ])
        expect(call({ ...valid, [key]: bad })).toThrow(
          new RangeError(finiteMessage(key)),
        );
    });

    const integers = entries
      .filter(([, e]) => e.kind === "numeric" && e.integer === true)
      .map(([key]) => key);
    if (integers.length > 0)
      test.each(integers)("%s that is not an integer", (key) => {
        for (const bad of [0.5, 60.2])
          expect(call({ ...valid, [key]: bad })).toThrow(
            new TypeError(`${key} must be an integer.`),
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
