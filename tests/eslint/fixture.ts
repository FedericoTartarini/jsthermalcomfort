// Linted by tests/eslint.test.ts with the repo's ESLint config. It is in
// eslint.config.mjs' UNLINTED, so `npm run lint` skips it. Every name under
// "Mixed names" is meant to be reported, and no other.

import Path from "node:path";

// Names upstream spells, and names the library adds in TS conventions.
export const PMV_PPD_ISO_INFO = {
  name: "pmv_ppd_iso",
  limit_inputs: true,
  "tr - tdb": 0,
};
export const Units = { SI: "SI", IP: "IP" } as const;
export const SEPARATOR = Path.sep;
export const roundOutput = (value: number): number => Math.round(value);
export type Units = (typeof Units)[keyof typeof Units];
export interface PMVPPDInputs {
  tdb: number;
  limit_inputs?: boolean;
}
export function pmv_ppd_iso(tdb: number): number {
  const t_cl = tdb;
  return t_cl;
}
export function _pmv_ppd_optimized(tdb: number): number {
  return tdb;
}
export function classifyFromBins(value: number): number {
  return value;
}

// Mixed names.
export function badName_Mixed(x: number): number {
  return x;
}
export const Bad_Constant = 1;
export interface bad_Inputs {
  tdb: number;
}
export function snake_param(Bad_Param: number): number {
  return Bad_Param;
}
export const PROPERTY_HOLDER = { limit_Inputs: true };

// `restrict-template-expressions` allows a number and nothing else.
export function message(iterations: number, converged: boolean): string[] {
  return [`after ${iterations} iterations`, `converged: ${converged}`];
}

// `strictTypeChecked` and `stylisticTypeChecked` are on.
export function first(values: Array<number>): number {
  return values[0]!;
}
