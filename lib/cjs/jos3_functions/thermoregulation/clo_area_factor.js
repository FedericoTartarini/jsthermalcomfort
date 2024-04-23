"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clo_area_factor = void 0;
/**
 * Calculate clothing area factor
 *
 * @param {math.Matrix} clo - Clothing insulation.
 *
 * @returns {math.Matrix} clothing area factor.
 */
function clo_area_factor(clo) {
    return clo.map((clo) => (clo < 0.5 ? clo * 0.2 + 1 : clo * 0.1 + 1.05));
}
exports.clo_area_factor = clo_area_factor;
