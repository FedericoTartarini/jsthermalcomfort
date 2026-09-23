export * from "./utilities/index.js";
export * from "./psychrometrics/index.js";
export * from "./models/index.js";

// Re-export only the types from modelDocs; deepFreeze is @internal and not exported
/**
 * @typedef {import("./models/modelDocs.js").Bound} Bound
 */
/**
 * @typedef {import("./models/modelDocs.js").ApplicabilityWarning} ApplicabilityWarning
 */
/**
 * @typedef {import("./models/modelDocs.js").VariableInfo} VariableInfo
 */
/**
 * @typedef {import("./models/modelDocs.js").ModelInfo} ModelInfo
 */
/**
 * @typedef {import("./models/modelDocs.js").ClassifierBins} ClassifierBins
 */
/**
 * @typedef {import("./models/adaptive_ashrae.js").AdaptiveAshraeParams} AdaptiveAshraeParams
 */
/**
 * @typedef {import("./models/adaptive_ashrae.js").AdaptiveAshraeResult} AdaptiveAshraeResult
 */

import utilities from "./utilities/index.js";
import psychrometrics from "./psychrometrics/index.js";
import models from "./models/index.js";

export default { utilities, psychrometrics, models };
