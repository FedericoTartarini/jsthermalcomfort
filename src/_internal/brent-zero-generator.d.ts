// brent-zero-generator 1.1.1 ships no types. This declares the one function
// brentq.ts calls, as node_modules/brent-zero-generator/zero_generator.js
// defines and exports it.
declare module "brent-zero-generator" {
  export function zero(
    f: (x: number) => number,
    a: number,
    b: number,
    macheps?: number,
    t?: number,
  ): number;
}
