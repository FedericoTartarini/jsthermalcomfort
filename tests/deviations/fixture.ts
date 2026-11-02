// The declarations tests/deviations.test.ts resolves a TS site's symbol in.

interface Base {
  readonly inherited: number;
}

export interface Result extends Base {
  readonly own: number;
}

export const INFO = { inputs: { tdb: { unit: "°C" } } } as const;

export type Params = { [K in keyof typeof INFO.inputs]: number };

export function model(params: Params): Result {
  return { inherited: params.tdb, own: 0 };
}

function _kernel(x: number): number {
  return x;
}

export const kernel = _kernel;
