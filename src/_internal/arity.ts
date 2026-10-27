import { missingArguments, surplusArguments } from "./errors.ts";

/**
 * Binds a helper's positional arguments as Python binds them, throwing
 * Python's `TypeError` where the call would not bind (ADR 0022, deviation
 * _shared-22). An explicit `undefined` counts as omitted, as a trailing one
 * would in a shorter call.
 *
 * TypeScript rejects a surplus argument written out (TS2554) but not one a
 * callback passes, as `[a, b].map(p_sat)` passes the index; this check is what
 * catches it.
 *
 * @param name - The helper's name, for the message.
 * @param args - The helper's `arguments`.
 * @param params - The helper's positional parameters, in order.
 * @param required - How many of them, from the first, have no default.
 * @throws `TypeError` for a surplus argument, or for a required one omitted,
 * naming every one omitted.
 */
export function checkArity(
  name: string,
  args: ArrayLike<unknown>,
  params: readonly string[],
  required: number,
): void {
  let given = args.length;
  while (given > 0 && args[given - 1] === undefined) given--;
  if (given > params.length) {
    throw surplusArguments(name, required, params.length, given);
  }
  const missing = params
    .slice(0, required)
    .filter((_, i) => args[i] === undefined);
  if (missing.length > 0) throw missingArguments(name, missing);
}
