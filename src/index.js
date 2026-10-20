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
/**
 * @typedef {import("./models/clo_tout.js").CloToutParams} CloToutParams
 */
/**
 * @typedef {import("./models/clo_tout.js").CloToutResult} CloToutResult
 */
/**
 * @typedef {import("./models/cooling_effect.js").CoolingEffectParams} CoolingEffectParams
 */
/**
 * @typedef {import("./models/cooling_effect.js").CoolingEffectResult} CoolingEffectResult
 */
/**
 * @typedef {import("./models/heat_index_rothfusz.js").HeatIndexRothfuszParams} HeatIndexRothfuszParams
 */
/**
 * @typedef {import("./models/heat_index_rothfusz.js").HeatIndexRothfuszResult} HeatIndexRothfuszResult
 */
/**
 * @typedef {import("./models/pmv_ppd_ashrae.js").PmvPpdAshraeParams} PmvPpdAshraeParams
 */
/**
 * @typedef {import("./models/pmv_ppd_ashrae.js").PmvPpdAshraeResult} PmvPpdAshraeResult
 */
/**
 * @typedef {import("./models/pmv_ppd_iso.js").PmvPpdIsoParams} PmvPpdIsoParams
 */
/**
 * @typedef {import("./models/pmv_ppd_iso.js").PmvPpdIsoResult} PmvPpdIsoResult
 */
/**
 * @typedef {import("./models/set_tmp.js").SetTmpParams} SetTmpParams
 */
/**
 * @typedef {import("./models/set_tmp.js").SetTmpResult} SetTmpResult
 */
/**
 * @typedef {import("./models/solar_gain.js").SolarGainParams} SolarGainParams
 */
/**
 * @typedef {import("./models/solar_gain.js").SolarGainResult} SolarGainResult
 */
/**
 * @typedef {import("./models/two_nodes_gagge.js").TwoNodesGaggeParams} TwoNodesGaggeParams
 */
/**
 * @typedef {import("./models/two_nodes_gagge.js").TwoNodesGaggeResult} TwoNodesGaggeResult
 */
/**
 * @typedef {import("./models/two_nodes_gagge.js").TwoNodesGaggeSetResult} TwoNodesGaggeSetResult
 */
/**
 * @typedef {import("./models/utci.js").UtciParams} UtciParams
 */
/**
 * @typedef {import("./models/utci.js").UtciResult} UtciResult
 */

import utilities from "./utilities/index.js";
import psychrometrics from "./psychrometrics/index.js";
import models from "./models/index.js";

export default { utilities, psychrometrics, models };
