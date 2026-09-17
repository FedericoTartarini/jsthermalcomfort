import { round, validateInputs } from "../utilities/utilities.js";

const optionDefaults = {
  round_output: true,
  tdb: undefined,
  with_solar_load: false,
};

/** @typedef {number | number[]} NumericInput */

/**
 * @typedef {object} WbgtResult
 * @property {NumericInput} wbgt - Wet Bulb Globe Temperature Index, [°C]
 * @public
 */

const WBGT_SCHEMA = {
  round_output: { type: "boolean", required: false },
  with_solar_load: { type: "boolean", required: false },
};

function validateNumericInput(value, name) {
  const values = Array.isArray(value) ? value : [value];
  if (
    values.some((item) => typeof item !== "number" || !Number.isFinite(item))
  ) {
    throw new TypeError(
      `Parameter "${name}" must be a valid finite number or an array of valid finite numbers`,
    );
  }
}

function calculateWbgt(twb, tg, tdb, withSolarLoad) {
  if (withSolarLoad) {
    return 0.7 * twb + 0.2 * tg + 0.1 * tdb;
  }
  return 0.7 * twb + 0.3 * tg;
}

function broadcastValue(value, index, outputLength, name) {
  if (!Array.isArray(value)) return value;
  if (value.length === outputLength) return value[index];
  if (value.length === 1) return value[0];
  throw new RangeError(
    `Parameter "${name}" has length ${value.length}; input arrays must have compatible lengths`,
  );
}

/**
 * Calculates the Wet Bulb Globe Temperature (WBGT) index calculated in
 * compliance with the ISO 7243 {@link #ref_11|[11]}. The WBGT is a heat stress index that
 * measures the thermal environment to which a person is exposed. In most
 * situations, this index is simple to calculate. It should be used as a
 * screening tool to determine whether heat stress is present. The PHS model
 * allows a more accurate estimation of stress. PHS can be calculated using
 * the function `jsthermalcomfort.models.phs`.
 *
 * The WBGT determines the impact of heat on a person throughout the course of
 * a working day (up to 8 h). It does not apply to very brief heat exposures.
 * It pertains to the evaluation of male and female people who are fit for work
 * in both indoor and outdoor occupational environments, as well as other sorts
 * of surroundings {@link #ref_11|[11]}.
 *
 * The WBGT is defined as a function of only twb and tg if the person is not
 * exposed to direct radiant heat from the sun. When a person is exposed to
 * direct radiant heat, tdb must also be specified.
 *
 * @public
 * @memberof models
 * @docname Wet Bulb Globe Temperature Index (WBGT)
 *
 * @param {NumericInput} twb - natural (no forced air flow) wet bulb temperature, [°C]
 * @param {NumericInput} tg - globe temperature, [°C]
 * @param {object} [options] - configuration options for the function.
 * @param {boolean} [options.round_output = true] - If true rounds output value. If
 * false it does not round it.
 * @param {NumericInput} [options.tdb = undefined] - Dry bulb air temperature, [°C].
 * This value is needed as input if the person is exposed to direct solar
 * radiation.
 * @param {boolean} [options.with_solar_load = false] - If the globe sensor is
 * exposed to direct solar radiation. If this is set to true without also
 * setting `options.tdb` then an error will be thrown.
 *
 * @returns {WbgtResult} set containing results for the model
 *
 * @example
 * const result = wbgt(25, 32);
 * console.log(result); // -> {"wbgt": 27.1}
 *
 * @example
 * const result = wbgt(25, 32, { tdb: 20, with_solar_load: true });
 * console.log(result); // -> {"wbgt": 25.9}
 */
export function wbgt(twb, tg, options) {
  const opt = Object.assign({}, optionDefaults, options);
  validateNumericInput(twb, "twb");
  validateNumericInput(tg, "tg");
  if (opt.tdb !== undefined) validateNumericInput(opt.tdb, "tdb");
  validateInputs(
    {
      round_output: opt.round_output,
      with_solar_load: opt.with_solar_load,
    },
    WBGT_SCHEMA,
  );

  if (opt.with_solar_load && opt.tdb === undefined) {
    throw new Error("Please enter the dry bulb air temperature");
  }

  const numericInputs = opt.with_solar_load ? [twb, tg, opt.tdb] : [twb, tg];
  const arrayInputs = numericInputs.filter(Array.isArray);

  if (arrayInputs.length === 0) {
    let t_wbg = calculateWbgt(twb, tg, opt.tdb, opt.with_solar_load);
    if (opt.round_output) t_wbg = round(t_wbg, 1);
    return { wbgt: t_wbg };
  }

  const outputLength = Math.max(...arrayInputs.map((value) => value.length));
  const t_wbg = Array.from({ length: outputLength }, (_, index) => {
    const value = calculateWbgt(
      broadcastValue(twb, index, outputLength, "twb"),
      broadcastValue(tg, index, outputLength, "tg"),
      opt.with_solar_load
        ? broadcastValue(opt.tdb, index, outputLength, "tdb")
        : undefined,
      opt.with_solar_load,
    );
    return opt.round_output ? round(value, 1) : value;
  });

  return { wbgt: t_wbg };
}
