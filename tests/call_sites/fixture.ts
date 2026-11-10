// Calls the call-site check must report, and calls it must pass
// (tests/call_sites.test.ts). Never run; only parsed.

function helper(tdb: number, tr: number, v: number): number {
  return tdb + tr + v;
}

interface Params {
  tdb: number;
  tr: number;
  vr: number;
}

function model(params: Params): number {
  return params.tdb + params.tr + params.vr;
}

export function calls(tdb: number, tr: number, vr: number, _tr: number): void {
  // Reported: positional, transposed.
  helper(tr, tdb, vr);
  // Reported: built from a parameter's name.
  helper(tdb, -tdb, vr);
  helper(tdb, tdb + 1, vr);
  // Reported: a params object's property given another parameter's name.
  model({ tdb: tr, tr: tdb, vr });
  // Passed: the same names, the v/vr alias, other names and literals.
  helper(tdb, tr, vr);
  helper(tdb, _tr, 1);
  model({ tdb, tr: _tr, vr: vr });
  model({ tdb: 25, tr: 25 * 2, vr: Math.abs(vr) });
}
