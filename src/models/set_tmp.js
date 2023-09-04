import {
    units_converter,
    _ankle_draft_compliance,
    check_standard_compliance_array,
    _ashrae_compliance,
    _iso7933_compliance
} from "../src/utilities";
import {
    two_nodes
} from "../src/models"


/**
 * @typedef {Object} SetTmpKwargs
 * @property {boolean} [round=true] 
 * @property {boolean} [calculate_ce=false] 
 */

/**
 * @typedef {Object} SetTmpKwargsRequired
 * @property {boolean} round
 * @property {boolean} calculate_ce
 */
/**
 * Calculates the Standard Effective Temperature (SET). The SET is the 
 * temperature of a hypothetical isothermal environment at 50% (rh), 
 * <0.1 m/s (20 fpm) average air speed (v), and tr = tdb, in which the 
 * total heat loss from the skin of an imaginary occupant wearing 
 * clothing, standardized for the activity concerned is the same as 
 * that from a person in the actual environment with actual clothing 
 * and activity level.
 * 
 * @param {number | number[]} tdb Dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'.
 * @param {number | number[]} tr Mean radiant temperature, default in [°C]
 * @param {number | number[]} v Air speed, default in [m/s]
 * @param {number | number[]} rh Relative humidity, [%].
 * @param {number | number[]} met Metabolic rate, [W/(m2)]
 * @param {number | number[]} clo Clothing insulation, [clo]
 * @param {number | number[]} wme External work, [W/(m2)] default 0
 * @param {number | number[]} body_surface_area Body surface area, default value 1.8258 [m2] in [ft2] if units = ‘IP’
 * @param {number | number[]} p_atm Atmospheric pressure, default value 101325 [Pa] in [atm] if units = ‘IP’
 * @param {"standing" | "sitting"} body_position Select either “sitting” or “standing”
 * @param {"SI" | "IP"} units Select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {boolean} limit_inputs By default, if the inputs are outsude the following limits the function returns nan. If False returns values regardless of the input values. 
 * @param {SetTmpKwargs} [kwargs]
 * @returns {number | number[]} SET (float or array-like) – Standard effective temperature, [°C]
 * 
 * @example
 * const set = set_tmp(25, 25, 0.1, 50, 1.2, 0.5); // returns 24.3 
 */
export function set_tmp(
    tdb, 
    tr, 
    v, 
    rh, 
    met, 
    clo, 
    wme = 0, 
    body_surface_area = 1.8258, 
    p_atm = 101325, 
    body_position = 'standing', 
    units = "SI",
    limit_inputs = true,
    kwargs = {}
){
    const defaults_kwargs = {
        calculate_ce: false,
        round: true,
    };

    let joint_kwargs = Object.assign(defaults_kwargs, kwargs);

    if (units === "IP") {
        if (body_surface_area === 1.8258) {
            body_surface_area = 19.65;
        }
        if (p_atm === 101325) {
            p_atm = 1;
        }
        const unit_convert = units_converter({
            tdb,
            tr,
            v,
            area: body_surface_area,
            pressure: p_atm,
        });
        tdb = unit_convert.tdb;
        tr = unit_convert.tr;
        v = unit_convert.v;
        body_surface_area = unit_convert.area;
        p_atm = unit_convert.pressure;
    }

    const tdbArray = Array.isArray(tdb) ? tdb : [tdb];
    const trArray = Array.isArray(tr) ? tr : [tr];
    const vArray = Array.isArray(v) ? v : [v];
    const rhArray = Array.isArray(rh) ? rh : [rh];
    const metArray = Array.isArray(met) ? met : [met];
    const cloArray = Array.isArray(clo) ? clo : [clo];
    const wmeArray = Array.isArray(wme) ? wme : [wme];

    let setArray = two_nodes(
        tdb=tdbArray,
        tr=trArray,
        v=vArray,
        rh=rhArray,
        met=metArray,
        clo=cloArray,
        wme=wmeArray,
        body_surface_area=body_surface_area,
        p_atmospheric=p_atm,
        body_position=body_position,
        joint_kwargs.calculate_ce=false,
        joint_kwargs.round=false,
    ).set;
    console.log(setArray)

    if (units === "IP") {
        const convertedSetArray = units_converter(setArray, "SI");
        setArray = convertedSetArray[0];
    }

    // setArray = Array.isArray(setArray) ? setArray : [setArray];
    // console.log(setArray);

    if (limit_inputs) {
        const {
          tdb: tdbValid,
          tr: trValid,
          v: vValid,
          met: metValid,
          clo: cloValid,
        } = check_standard_compliance_array("ashrae", {tdb,tr,v,met,clo});
      
        const allValid = !(
          tdbValid.includes(NaN) ||
          trValid.includes(NaN) ||
          vValid.includes(NaN) ||
          metValid.includes(NaN) ||
          cloValid.includes(NaN)
        );
      
        // setArray = setArray.map((value, index) => {
        //   allValid[index] ? value : NaN;
        // });
    }

    if (joint_kwargs.round) {
        return round(setArray, 1)
    }
    return setArray
}
