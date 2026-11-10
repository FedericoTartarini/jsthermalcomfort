/**
 * Writes a number as Python's `repr()` writes a float, which `str()` and an
 * f-string's `{x}` and `{x=}` also write, for a notice whose text upstream
 * builds with an f-string (decision 135): `sports_heat_stress_risk`'s "… for
 * tdb=23.0 and rh=0.0: …".
 *
 * Python writes the shortest digits that read back as the same double, as
 * ECMA-262's `Number::toString` and `toExponential()` do, in the fixed form
 * with at least one decimal ("23.0", "-0.0") where the decimal point falls
 * after the fourth zero past it and up to 16 digits before it, and in the
 * exponent form otherwise, with a sign and at least two exponent digits
 * ("1e-05", "1e+16"), where JavaScript keeps the fixed form from 1e-6 to 1e21
 * (CPython `Python/pystrtod.c`, `format_float_short`, format code 'r'); NaN
 * and ±Infinity are "nan", "inf" and "-inf".
 *
 * @param x - the number, which Python would hold as a float
 * @returns its text as Python's `repr()` writes the float
 */
export function floatRepr(x: number): string {
  if (Number.isNaN(x)) return "nan";
  if (!Number.isFinite(x)) return x > 0 ? "inf" : "-inf";
  if (Object.is(x, -0)) return "-0.0";
  const [mantissa, exponent] = x.toExponential().split("e") as [string, string];
  const decpt = Number(exponent) + 1;
  if (decpt > -4 && decpt <= 16) {
    const fixed = String(x);
    return fixed.includes(".") ? fixed : `${fixed}.0`;
  }
  return `${mantissa}e${exponent.slice(0, 1)}${exponent.slice(1).padStart(2, "0")}`;
}
