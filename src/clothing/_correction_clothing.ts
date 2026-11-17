/**
 * Correction factor for the insulation of a nude person, ISO 9920.
 * pythermalcomfort's `_correction_nude`.
 */
export function _correction_nude(_vr: number, _vw: number): number {
  return Math.exp(
    -0.533 * (_vr - 0.15) +
      0.069 * (_vr - 0.15) ** 2 -
      0.462 * _vw +
      0.201 * _vw ** 2,
  );
}

/**
 * Correction factor for normal clothing, ISO 9920. pythermalcomfort's
 * `_correction_normal_clothing`.
 */
export function _correction_normal_clothing(_vr: number, _vw: number): number {
  return Math.exp(
    -0.281 * (_vr - 0.15) +
      0.044 * (_vr - 0.15) ** 2 -
      0.492 * _vw +
      0.176 * _vw ** 2,
  );
}
