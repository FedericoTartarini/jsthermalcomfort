import dsumpw from "@stdlib/blas-ext-base-dsumpw";
import { notOfType } from "../_internal/errors.ts";

/**
 * Calculate the intrinsic insulation of a clothing ensemble based on individual
 * garments.
 *
 * This equation is in accordance with the ISO 9920:2009 standard
 * [ISO9920](../../docs/references.md#iso9920) Section 4.3. It should be noted
 * that this equation is only valid for clothing ensembles with rather uniform
 * insulation values across the body.
 *
 * @param clo_garments - list of floats containing the clothing insulation for
 * each individual garment
 * @returns intrinsic insulation of the clothing ensemble, [clo]
 */
export function clo_intrinsic_insulation_ensemble(
  clo_garments: number | readonly number[],
): number {
  const garments =
    typeof (clo_garments as unknown) === "number"
      ? [clo_garments as number]
      : clo_garments;
  if (!Array.isArray(garments)) {
    throw notOfType("clo_garments", "a number or an array of numbers");
  }
  for (const clo of garments) {
    if (typeof (clo as unknown) !== "number")
      throw notOfType("clo_garments", "a number or an array of numbers");
  }
  // numpy's add.reduce starts from its identity 0.0, where dsumpw starts from
  // the first element (ADR 0026; the note in docs/deviations/_shared.md).
  const sum = 0 + dsumpw(garments.length, Float64Array.from(garments), 1);
  return sum * 0.835 + 0.161;
}
