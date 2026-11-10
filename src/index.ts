// Each subpath index lists what is public, and the root re-exports them all.
// A name exported by two of them is a TS2308 error here (ADR 0021).
export * from "./utilities/index.ts";
export * from "./environment/index.ts";
export * from "./psychrometrics/index.ts";
export * from "./models/index.ts";

import utilities from "./utilities/index.ts";
import environment from "./environment/index.ts";
import psychrometrics from "./psychrometrics/index.ts";
import models from "./models/index.ts";

/**
 * The four subpath default exports as one object, for
 * `import pkg from "jsthermalcomfort"`. Each of their members is documented
 * under its own name.
 *
 * @hidden
 */
export default { utilities, environment, psychrometrics, models };
