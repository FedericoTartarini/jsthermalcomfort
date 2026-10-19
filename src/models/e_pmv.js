import { pmv_e } from "./pmv_e.js";

/**
 * @typedef {import('./pmv_e.js').EPmvResult} EPmvResult
 * @typedef {import('./pmv_e.js').E_pmvKwargs} E_pmvKwargs
 */

/**
 * Legacy name for pmv_e, retained for existing imports and calls.
 * Uses the same implementation and final ties-to-even rounding as pmv_e.
 *
 * @public
 * @memberof models
 * @docname Adjusted PMV with Expectancy Factor (legacy name)
 * @deprecated Use pmv_e instead, matching the pythermalcomfort name.
 * @param {number} tdb - Dry bulb air temperature [°C], or [°F] in IP units.
 * @param {number} tr - Mean radiant temperature [°C], or [°F] in IP units.
 * @param {number} vr - Relative air speed [m/s], or [fps] in IP units.
 * @param {number} rh - Relative humidity [%].
 * @param {number} met - Metabolic rate [met].
 * @param {number} clo - Clothing insulation [clo].
 * @param {number} e_coefficient - Expectancy factor.
 * @param {number} [wme=0] - External work [met].
 * @param {E_pmvKwargs} [kwargs={}] - Optional units and applicability-limit settings.
 * @returns {EPmvResult} Object containing e_pmv.
 */
export const e_pmv = pmv_e;
