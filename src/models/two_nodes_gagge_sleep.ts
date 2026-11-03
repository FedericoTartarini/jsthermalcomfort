import { parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
import type {
  ComputedOutputsOf,
  InputsOf,
  ModelInfo,
  ModelWarning,
  OutputsOf,
} from "../_internal/modelInfo.ts";

export const TWO_NODES_GAGGE_SLEEP_INFO = deepFreeze({
  name: "two_nodes_gagge_sleep",
  label: "Gagge two-node model for sleep",
  standards: [],
  inputs: {
    tdb: { kind: "numeric", unit: "°C", series: true },
    tr: { kind: "numeric", unit: "°C", series: true },
    v: { kind: "numeric", unit: "m/s", series: true },
    rh: { kind: "numeric", unit: "%", series: true },
    clo: { kind: "numeric", unit: "clo", series: true },
    thickness_quilt: { kind: "numeric", unit: "cm", series: true },
    wme: { kind: "numeric", unit: "met", default: 0 },
    p_atm: { kind: "numeric", unit: "Pa", default: 101325 },
    ltime: { kind: "numeric", unit: null, default: 1, integer: true },
    height: { kind: "numeric", unit: "cm", default: 171 },
    weight: { kind: "numeric", unit: "kg", default: 70 },
    c_sw: { kind: "numeric", unit: null, default: 170 },
    c_dil: { kind: "numeric", unit: null, default: 120 },
    c_str: { kind: "numeric", unit: null, default: 0.5 },
    temp_skin_neutral: { kind: "numeric", unit: "°C", default: 33.7 },
    e_skin: { kind: "numeric", unit: "W/m²", default: 0.094 },
    alfa: { kind: "numeric", unit: null, default: 0.1 },
    skin_blood_flow: { kind: "numeric", unit: "kg/h/m²", default: 6.3 },
    met_shivering: { kind: "numeric", unit: "W/m²", default: 0 },
  },
  outputs: {
    set: { kind: "numeric", nullable: true, unit: "°C", series: true },
    t_core: { kind: "numeric", nullable: true, unit: "°C", series: true },
    t_skin: { kind: "numeric", nullable: true, unit: "°C", series: true },
    wet: { kind: "numeric", nullable: true, unit: null, series: true },
    t_sens: { kind: "numeric", nullable: true, unit: null, series: true },
    disc: { kind: "numeric", nullable: true, unit: null, series: true },
    e_skin: { kind: "numeric", nullable: true, unit: "W/m²", series: true },
    met_shivering: {
      kind: "numeric",
      nullable: true,
      unit: "W/m²",
      series: true,
    },
    alfa: { kind: "numeric", nullable: true, unit: null, series: true },
    skin_blood_flow: {
      kind: "numeric",
      nullable: true,
      unit: "kg/h/m²",
      series: true,
    },
  },
} as const satisfies ModelInfo);

/** @interface */
export type GaggeTwoNodesSleepInputs<
  Series extends number | readonly number[] = number | readonly number[],
> = InputsOf<typeof TWO_NODES_GAGGE_SLEEP_INFO, Series>;

/**
 * Dataclass to represent the results of the two-node sleep model.
 *
 * @interface
 */
export type GaggeTwoNodesSleep<
  Series extends number | readonly number[] = number | readonly number[],
> = OutputsOf<typeof TWO_NODES_GAGGE_SLEEP_INFO, Series>;

/**
 * Adaption of the Gagge two-node model for sleep thermal environment, developed by
 * Yan, S., Xiong, J., Kim, J. and de Dear, R. [Yan2022](../../docs/references.md#yan2022).
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, [°C].
 *
 * > [!NOTE]
 * > tdb, tr, v, rh, clo and thickness_quilt must have the same length.
 * > This length will be the duration of the simulation.
 * @param inputs.tr - Mean radiant temperature, [°C].
 * @param inputs.v - Air speed, [m/s].
 * @param inputs.rh - Relative humidity, [%].
 * @param inputs.clo - Clothing insulation, [clo].
 * @param inputs.thickness_quilt - Thickness of the quilt. [cm].
 * @param inputs.wme - External work, [met]. Defaults to 0.
 * @param inputs.p_atm - Atmospheric pressure, default value 101325 [Pa]. Defaults to 101325.
 * @param inputs.ltime - Number of time steps for each iteration. Defaults to 1.
 * @param inputs.height - Height of the person, [cm]. Defaults to 171.
 * @param inputs.weight - Weight of the person, [kg]. Defaults to 70.
 * @param inputs.c_sw - Driving coefficient for regulatory sweating. Defaults to 170.
 * @param inputs.c_dil - Driving coefficient for vasodilation. Defaults to 120.
 * @param inputs.c_str - Driving coefficient for vasoconstriction. Defaults to 0.5.
 * @param inputs.temp_skin_neutral - Skin temperature at neutral conditions, [°C]. Defaults to 33.7.
 * @param inputs.e_skin - Total evaporative heat loss, [W/m2]. Defaults to 0.094.
 * @param inputs.alfa - Dynamic fraction of total body mass assigned to the skin node. Defaults to 0.1.
 * @param inputs.skin_blood_flow - Skin-blood-flow rate per unit surface area, [kg/h/m2]. Defaults to 6.3.
 * @param inputs.met_shivering - Metabolic rate due to shivering, [W/m2]. Defaults to 0.
 *
 * @returns A dataclass containing the results of the Gagge two-node model for sleep thermal environment.
 * See {@link GaggeTwoNodesSleep} for more details.
 * To access the results, use the corresponding attributes of the returned instance, e.g. `result.e_skin`.
 *
 * - `set` - Standard Effective Temperature (SET).
 * - `t_core` - Core temperature, [°C].
 * - `t_skin` - Skin temperature, [°C].
 * - `wet` - Skin wettedness, adimensional. Ranges from 0 to 1.
 * - `t_sens` - Predicted Thermal Sensation.
 * - `disc` - Thermal discomfort.
 * - `e_skin` - Total rate of evaporative heat loss from skin, [W/m2]. Equal to e_rsw + e_diff.
 * - `met_shivering` - Metabolic rate due to shivering, [W/m2].
 * - `alfa` - Dynamic fraction of total body mass assigned to the skin node (dimensionless).
 * - `skin_blood_flow` - Skin-blood-flow rate per unit surface area, [kg/h/m2].
 */
export function two_nodes_gagge_sleep(
  inputs: GaggeTwoNodesSleepInputs<number>,
): GaggeTwoNodesSleep<number>;
export function two_nodes_gagge_sleep(
  inputs: GaggeTwoNodesSleepInputs,
): GaggeTwoNodesSleep;
export function two_nodes_gagge_sleep(
  inputs: GaggeTwoNodesSleepInputs,
): GaggeTwoNodesSleep {
  const {
    tdb,
    tr,
    v,
    rh,
    clo,
    thickness_quilt,
    wme,
    p_atm,
    ltime,
    height,
    weight,
    c_sw,
    c_dil,
    c_str,
    temp_skin_neutral,
    e_skin,
    alfa,
    skin_blood_flow,
    met_shivering,
  } = parseInputs(TWO_NODES_GAGGE_SLEEP_INFO, inputs);
  if (ltime < 1) {
    // BigInt writes an int as Python's str() does, without an exponent from 1e21.
    const error_msg = `ltime must be a positive integer, got ${BigInt(ltime)}`;
    throw new RangeError(error_msg);
  }
  if (thickness_quilt.some((x) => x < 0)) {
    throw new RangeError(
      "thickness_quilt must be greater than or equal to 0 cm.",
    );
  }

  // These variables should have the same length, which will be the duration
  const lengths = [tdb, tr, v, rh, clo, thickness_quilt].map((x) => x.length);
  if (new Set(lengths).size !== 1) {
    const error_message = `Parameters tdb, tr, v, rh, clo and thickness_quilt must have the same length. Got lengths [${lengths.join(", ")}]`;
    throw new Error(error_message);
  }
  const duration = tdb.length;
  if (duration === 0) {
    throw new Error("Time-series inputs must not be empty.");
  }

  const result_arrays = _two_nodes_gagge_sleep_optimized(
    tdb,
    tr,
    v,
    rh,
    clo,
    thickness_quilt,
    wme,
    p_atm,
    ltime,
    height,
    weight,
    c_sw,
    c_dil,
    c_str,
    temp_skin_neutral,
    e_skin,
    alfa,
    skin_blood_flow,
    met_shivering,
  );

  const fields = [
    "set",
    "t_core",
    "t_skin",
    "wet",
    "t_sens",
    "disc",
    "e_skin",
    "met_shivering",
    "alfa",
    "skin_blood_flow",
  ] as const;
  const output = Object.fromEntries(
    fields.map((field, i) => {
      const values = result_arrays[i] ?? [];
      return [field, duration === 1 ? values[0] : values];
    }),
  ) as ComputedOutputsOf<typeof TWO_NODES_GAGGE_SLEEP_INFO>;

  const warnings: ModelWarning[] = [];
  return buildOutputs(TWO_NODES_GAGGE_SLEEP_INFO, output, warnings);
}

/**
 * Run the stateful sleep simulation inside one Numba-compiled loop.
 *
 * Carries `t_skin`, `e_skin`, `alfa`, `skin_blood_flow` and
 * `met_shivering` forward from one time step to the next, since each step
 * depends on the physiological state left by the previous one.
 *
 * @param tdb - Per-time-step inputs, all the same length. See
 * {@link two_nodes_gagge_sleep} for units.
 * @param tr - Per-time-step inputs, all the same length. See
 * {@link two_nodes_gagge_sleep} for units.
 * @param v - Per-time-step inputs, all the same length. See
 * {@link two_nodes_gagge_sleep} for units.
 * @param rh - Per-time-step inputs, all the same length. See
 * {@link two_nodes_gagge_sleep} for units.
 * @param clo - Per-time-step inputs, all the same length. See
 * {@link two_nodes_gagge_sleep} for units.
 * @param thickness_quilt - Per-time-step inputs, all the same length. See
 * {@link two_nodes_gagge_sleep} for units.
 * @param wme - Constants held fixed across the whole simulation. See
 * {@link two_nodes_gagge_sleep} for units.
 * @param p_atm - Constants held fixed across the whole simulation. See
 * {@link two_nodes_gagge_sleep} for units.
 * @param ltime - Constants held fixed across the whole simulation. See
 * {@link two_nodes_gagge_sleep} for units.
 * @param height - Constants held fixed across the whole simulation. See
 * {@link two_nodes_gagge_sleep} for units.
 * @param weight - Constants held fixed across the whole simulation. See
 * {@link two_nodes_gagge_sleep} for units.
 * @param c_sw - Constants held fixed across the whole simulation. See
 * {@link two_nodes_gagge_sleep} for units.
 * @param c_dil - Constants held fixed across the whole simulation. See
 * {@link two_nodes_gagge_sleep} for units.
 * @param c_str - Constants held fixed across the whole simulation. See
 * {@link two_nodes_gagge_sleep} for units.
 * @param temp_skin_neutral - Initial physiological state for the first time step.
 * @param e_skin - Initial physiological state for the first time step.
 * @param alfa - Initial physiological state for the first time step.
 * @param skin_blood_flow - Initial physiological state for the first time step.
 * @param met_shivering - Initial physiological state for the first time step.
 * @returns `(set, t_core, t_skin, wet, t_sens, disc, e_skin, met_shivering,
 * alfa, skin_blood_flow)`, one array per output field, each the same
 * length as the inputs.
 */
export function _two_nodes_gagge_sleep_optimized(
  tdb: readonly number[],
  tr: readonly number[],
  v: readonly number[],
  rh: readonly number[],
  clo: readonly number[],
  thickness_quilt: readonly number[],
  wme: number,
  p_atm: number,
  ltime: number,
  height: number,
  weight: number,
  c_sw: number,
  c_dil: number,
  c_str: number,
  temp_skin_neutral: number,
  e_skin: number,
  alfa: number,
  skin_blood_flow: number,
  met_shivering: number,
): [
  number[],
  number[],
  number[],
  number[],
  number[],
  number[],
  number[],
  number[],
  number[],
  number[],
] {
  const duration = tdb.length;
  const out_set: number[] = [];
  const out_t_core: number[] = [];
  const out_t_skin: number[] = [];
  const out_wet: number[] = [];
  const out_t_sens: number[] = [];
  const out_disc: number[] = [];
  const out_e_skin: number[] = [];
  const out_met_shivering: number[] = [];
  const out_alfa: number[] = [];
  const out_skin_blood_flow: number[] = [];

  let state_t_skin = temp_skin_neutral;
  let state_e_skin = e_skin;
  let state_met_shivering = met_shivering;
  let state_alfa = alfa;
  let state_skin_blood_flow = skin_blood_flow;

  for (let i = 0; i < duration; i++) {
    const hour = (i - 1) / 60;
    const met =
      -0.000000000000575 * (hour * (hour * hour * (hour * hour))) +
      0.000000000785521 * (hour * hour * (hour * hour)) -
      0.00000039173563 * (hour * (hour * hour)) +
      0.000087620232151 * (hour * hour) -
      0.008801558913211 * hour +
      1.09952538864493;
    const t_core_neutral = 0.022234 * (hour * hour) - 0.27677 * hour + 37.02;

    [
      out_set[i],
      out_t_core[i],
      out_t_skin[i],
      out_wet[i],
      out_t_sens[i],
      out_disc[i],
      out_e_skin[i],
      out_met_shivering[i],
      out_alfa[i],
      out_skin_blood_flow[i],
    ] = _sleep_set_optimized(
      tdb[i] ?? NaN,
      tr[i] ?? NaN,
      v[i] ?? NaN,
      rh[i] ?? NaN,
      clo[i] ?? NaN,
      thickness_quilt[i] ?? NaN,
      met,
      wme,
      p_atm,
      ltime,
      height,
      weight,
      c_sw,
      c_dil,
      c_str,
      state_t_skin,
      t_core_neutral,
      state_e_skin,
      state_alfa,
      state_skin_blood_flow,
      state_met_shivering,
    );

    state_t_skin = out_t_skin[i] ?? NaN;
    state_e_skin = out_e_skin[i] ?? NaN;
    state_met_shivering = out_met_shivering[i] ?? NaN;
    state_alfa = out_alfa[i] ?? NaN;
    state_skin_blood_flow = out_skin_blood_flow[i] ?? NaN;
  }

  return [
    out_set,
    out_t_core,
    out_t_skin,
    out_wet,
    out_t_sens,
    out_disc,
    out_e_skin,
    out_met_shivering,
    out_alfa,
    out_skin_blood_flow,
  ];
}

function _sleep_set_optimized(
  tdb: number,
  tr: number,
  v: number,
  rh: number,
  clo: number,
  thickness: number,
  met: number,
  wme: number,
  p_atm: number,
  ltime: number,
  height: number,
  weight: number,
  c_sw: number,
  c_dil: number,
  c_str: number,
  temp_skin_neutral: number,
  temp_core_neutral: number,
  e_skin: number,
  alfa: number,
  skin_blood_flow: number,
  met_shivering: number,
): [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
] {
  let m = met * 58.2;
  const w = wme * 58.2;
  const k_clo = 0.25;
  const temp_body_neutral = 36.49;
  const skin_blood_flow_neutral = 6.3;
  const sbc = 5.6697 * 10 ** -8;
  const sa = Math.pow((height * weight) / 3600, 0.5);

  v = 0.1 > v ? 0.1 : v;
  let t_skin = temp_skin_neutral;
  let t_core = temp_core_neutral;
  const rmm = m;

  // initialize some variables
  let e_rsw = 0; // heat lost by vaporization sweat
  let e_diff = 0; // vapor diffusion through skin
  let e_max = 0; // maximum evaporative capacity
  let dry = 0;
  let r_ea = 0;
  let r_ecl = 0;
  let p_wet = 0;
  let t_body = 0;
  let x = 0;

  const pressure_in_atmospheres = p_atm / 101325;
  const r_clo = 0.155 * clo;
  const f_a_cl = 0.0308 * thickness + 0.7695;
  // numba raises ZeroDivisionError at a zero divisor (deviation two_nodes_gagge_sleep-4).
  if (pressure_in_atmospheres === 0) throw new RangeError("division by zero");
  const lr = 2.2 / pressure_in_atmospheres;
  if (tdb + 235 === 0) throw new RangeError("division by zero");
  const pa = (rh * Math.exp(18.6686 - 4030.183 / (tdb + 235))) / 100;
  let w_max: number;
  let i_cl: number;
  if (clo <= 0) {
    w_max = 0.38 * Math.pow(v, -0.29);
    i_cl = 1;
  } else {
    w_max = 0.59 * Math.pow(v, -0.08);
    i_cl = 0.45;
  }

  const temp_diff = Math.abs(t_skin - tdb);
  const chc = 4.4854 * Math.pow(temp_diff, 0.274) * Math.pow(v, 0.1242);
  let h_r = 3.235;
  let ctc = h_r + chc;
  if (f_a_cl * ctc === 0) throw new RangeError("division by zero");
  let r_a = 1 / (f_a_cl * ctc);
  if (ctc === 0) throw new RangeError("division by zero");
  let t_op = (h_r * tr + chc * tdb) / ctc;
  if (ctc * (r_a + r_clo) === 0) throw new RangeError("division by zero");
  let t_cl = t_op + (t_skin - t_op) / (ctc * (r_a + r_clo));
  let t_cl_old = t_cl;
  let flag = false;

  for (let _ = 0; _ < ltime; _++) {
    if (flag) {
      if (r_a + r_clo === 0) throw new RangeError("division by zero");
      t_cl = (r_a * t_skin + r_clo * t_op) / (r_a + r_clo);
      if (Math.abs(t_cl - t_cl_old) > 0.01) {
        flag = false;
        t_cl_old = t_cl;
      } else {
        flag = true;
      }
    }

    const max_iter = 100;
    let iter_cnt = 0;
    while (!flag && iter_cnt < max_iter) {
      h_r =
        4 *
        sbc *
        (((t_cl + tr) / 2 + 273.15) *
          (((t_cl + tr) / 2 + 273.15) * ((t_cl + tr) / 2 + 273.15))) *
        0.72;
      ctc = h_r + chc;
      if (f_a_cl * ctc === 0) throw new RangeError("division by zero");
      r_a = 1 / (f_a_cl * ctc);
      if (ctc === 0) throw new RangeError("division by zero");
      t_op = (h_r * tr + chc * tdb) / ctc;
      if (r_a + r_clo === 0) throw new RangeError("division by zero");
      t_cl = (r_a * t_skin + r_clo * t_op) / (r_a + r_clo);
      if (Math.abs(t_cl - t_cl_old) > 0.01) {
        flag = false;
        t_cl_old = t_cl;
      } else {
        flag = true;
      }
      iter_cnt += 1;
    }

    if (r_a + r_clo === 0) throw new RangeError("division by zero");
    dry = (t_skin - t_op) / (r_a + r_clo);
    const hf_cs = (t_core - t_skin) * (5.28 + 1.163 * skin_blood_flow);
    const q_res = 0.0023 * m * (44 - pa);
    const c_res = 0.0014 * m * (34 - tdb);
    const s_core = m - hf_cs - q_res - c_res - w;
    const s_skin = hf_cs - dry - e_skin;
    const tc_sk = 0.97 * alfa * weight;
    const tc_cr = 0.97 * (1 - alfa) * weight;
    if (tc_sk === 0) throw new RangeError("division by zero");
    const d_t_sk = (s_skin * sa) / tc_sk / 60;
    if (tc_cr === 0) throw new RangeError("division by zero");
    const d_t_cr = (s_core * sa) / tc_cr / 60;
    t_skin += d_t_sk;
    t_core += d_t_cr;
    t_body = alfa * t_skin + (1 - alfa) * t_core;

    const warm_sk = 0 > t_skin - 33.7 ? 0 : t_skin - 33.7;
    const cold_s = 0 > 33.7 - t_skin ? 0 : 33.7 - t_skin;
    const warm_c =
      0 > t_core - temp_core_neutral ? 0 : t_core - temp_core_neutral;
    const cold_c =
      0 > temp_core_neutral - t_core ? 0 : temp_core_neutral - t_core;
    const warm_b =
      0 > t_body - temp_body_neutral ? 0 : t_body - temp_body_neutral;

    if (1 + c_str * cold_s === 0) throw new RangeError("division by zero");
    skin_blood_flow =
      (skin_blood_flow_neutral + c_dil * warm_c) / (1 + c_str * cold_s);
    skin_blood_flow = 0.5 > skin_blood_flow ? 0.5 : skin_blood_flow;
    skin_blood_flow = 90 < skin_blood_flow ? 90 : skin_blood_flow;
    let reg_sw = c_sw * warm_b * Math.exp(warm_sk / 10.7);
    reg_sw = 500 < reg_sw ? 500 : reg_sw;
    e_rsw = 0.68 * reg_sw;
    if (lr * f_a_cl * chc === 0) throw new RangeError("division by zero");
    r_ea = 1 / (lr * f_a_cl * chc);
    if (lr * i_cl === 0) throw new RangeError("division by zero");
    r_ecl = r_clo / (lr * i_cl);
    if (r_ea + r_ecl === 0) throw new RangeError("division by zero");
    e_max = (_fnsvp(t_skin) - pa) / (r_ea + r_ecl);
    // otherwise e_rsw / e_max cannot be calculated
    if (e_max === 0) {
      e_max = 0.001;
    }
    let p_rsw = e_rsw / e_max;
    p_wet = 0.06 + 0.94 * p_rsw;
    e_diff = p_wet * e_max - e_rsw;
    if (p_wet > w_max) {
      p_wet = w_max;
      // inverse of p_wet = 0.06 + 0.94 * p_rsw, as in Gagge et al. (1986). The ASHRAE 55
      // code uses w_max / 0.94, which makes SET discontinuous at the cap (#489)
      p_rsw = (w_max - 0.06) / 0.94;
      e_rsw = p_rsw * e_max;
      e_diff = 0.06 * (1 - p_rsw) * e_max;
    }
    // the air is more humid than the skin, so no sweat evaporates
    if (e_max < 0) {
      e_diff = 0;
      e_rsw = 0;
      p_wet = w_max;
    }
    e_skin = e_rsw + e_diff;
    met_shivering = 19.4 * cold_s * cold_c;
    m = rmm + met_shivering;
    alfa = 0.0417737 + 0.7451833 / (skin_blood_flow + 0.585417);
  }

  const q_skin = dry + e_skin;
  const rn = m - w;
  let e_comfort = 0.42 * (rn - 58.2);
  e_comfort = 0 > e_comfort ? 0 : e_comfort;
  e_max *= w_max;
  if (r_a + r_clo === 0) throw new RangeError("division by zero");
  const h_d = 1 / (r_a + r_clo);
  if (r_ea + r_ecl === 0) throw new RangeError("division by zero");
  const h_e = 1 / (r_ea + r_ecl);
  const wet = p_wet;
  const p_s_sk = _fnsvp(t_skin);
  const chrs = h_r;
  let chcs = met >= 0.85 ? 5.66 * Math.pow(met - 0.85, 0.39) : 0;
  chcs = chcs > 3 ? chcs : 3;
  const ctcs = chcs + chrs;
  if (met - wme + 0.6944 === 0) throw new RangeError("division by zero");
  const r_clo_s = 1.52 / (met - wme + 0.6944) - 0.1835;
  const r_cl_s = 0.155 * r_clo_s;
  const f_a_cl_s = 1 + k_clo * r_clo_s;
  if (1 + 0.155 * f_a_cl_s * ctcs * r_clo_s === 0)
    throw new RangeError("division by zero");
  const f_cl_s = 1 / (1 + 0.155 * f_a_cl_s * ctcs * r_clo_s);
  const i_m_s = 0.45;
  if (ctcs === 0) throw new RangeError("division by zero");
  if (chcs / ctcs - f_cl_s * i_m_s === 0)
    throw new RangeError("division by zero");
  const i_cl_s =
    (((i_m_s * chcs) / ctcs) * (1 - f_cl_s)) / (chcs / ctcs - f_cl_s * i_m_s);
  if (f_a_cl_s * ctcs === 0) throw new RangeError("division by zero");
  const r_a_s = 1 / (f_a_cl_s * ctcs);
  if (lr * f_a_cl_s * chcs === 0) throw new RangeError("division by zero");
  const r_ea_s = 1 / (lr * f_a_cl_s * chcs);
  if (lr * i_cl_s === 0) throw new RangeError("division by zero");
  const r_ecl_s = r_cl_s / (lr * i_cl_s);
  if (r_a_s + r_cl_s === 0) throw new RangeError("division by zero");
  const h_d_s = 1 / (r_a_s + r_cl_s);
  if (r_ea_s + r_ecl_s === 0) throw new RangeError("division by zero");
  const h_e_s = 1 / (r_ea_s + r_ecl_s);
  const delta = 1e-4;
  if (h_d === 0) throw new RangeError("division by zero");
  let xold = t_skin - q_skin / h_d;

  let flag1 = false;
  let iterations = 0;
  while (!flag1) {
    const err1 = _fnerre(xold, q_skin, h_d, t_skin, wet, h_e, p_s_sk);
    const err2 = _fnerre(xold + delta, q_skin, h_d, t_skin, wet, h_e, p_s_sk);
    const err_diff = err2 - err1;
    // Avoid division by very small values
    if (Math.abs(err_diff) < 1e-10) {
      // Use a fallback approach or break iteration
      break;
    }
    x = xold - (delta * err1) / err_diff;
    if (Math.abs(x - xold) > 0.01) {
      xold = x;
      flag1 = false;
    } else {
      flag1 = true;
    }
    iterations += 1;
    if (!flag1 && iterations === 1000)
      throw new Error("Max iterations exceeded");
  }

  if (h_d_s === 0) throw new RangeError("division by zero");
  xold = t_skin - q_skin / h_d_s;

  let flag2 = false;
  iterations = 0;
  while (!flag2) {
    const err1 = _fnerrs(xold, q_skin, h_d_s, t_skin, wet, h_e_s, p_s_sk);
    const err2 = _fnerrs(
      xold + delta,
      q_skin,
      h_d_s,
      t_skin,
      wet,
      h_e_s,
      p_s_sk,
    );
    if (err2 - err1 === 0) throw new RangeError("division by zero");
    x = xold - (delta * err1) / (err2 - err1);
    if (Math.abs(x - xold) > 0.01) {
      xold = x;
      flag2 = false;
    } else {
      flag2 = true;
    }
    iterations += 1;
    if (!flag2 && iterations === 1000)
      throw new Error("Max iterations exceeded");
  }

  const set_temp = x;
  const tbm_l = (0.194 / 58.15) * rn + 36.301;
  const tbm_h = (0.347 / 58.15) * rn + 36.669;
  let t_sens: number;
  if (t_body < tbm_l) {
    t_sens = 0.4685 * (t_body - tbm_l);
  } else if (tbm_l <= t_body && t_body < tbm_h) {
    t_sens = (w_max * 4.7 * (t_body - tbm_l)) / (tbm_h - tbm_l);
  } else {
    t_sens = w_max * 4.7 + 0.4685 * (t_body - tbm_h);
  }

  // e_max was multiplied by w_max above, as in two_nodes_gagge's e_max * w_max
  let disc: number;
  if (t_sens > 0 && 0 > e_max - e_comfort - e_diff) {
    disc = 6.0;
  } else {
    if (e_max - e_comfort - e_diff === 0)
      throw new RangeError("division by zero");
    disc = (4.7 * (e_rsw - e_comfort)) / (e_max - e_comfort - e_diff);
  }
  if (disc < 0) {
    disc = t_sens;
  }
  disc = 6.0 < disc ? 6.0 : disc;

  return [
    set_temp,
    t_core,
    t_skin,
    wet,
    t_sens,
    disc,
    e_skin,
    met_shivering,
    alfa,
    skin_blood_flow,
  ];
}

/**
 * Calculate saturation vapor pressure at temperature t.
 *
 * @param t - Temperature [°C]
 * @returns Saturation vapor pressure [torr]
 */
function _fnsvp(t: number): number {
  if (t + 235 === 0) throw new RangeError("division by zero");
  return Math.exp(18.6686 - 4030.183 / (t + 235));
}

/**
 * Error function for iterative solution of SET temperature.
 *
 * Used in the Newton-Raphson algorithm.
 */
function _fnerre(
  x: number,
  hsk: number,
  hd: number,
  tsk: number,
  w: number,
  he: number,
  pssk: number,
): number {
  return hsk - hd * (tsk - x) - w * he * (pssk - 0.5 * _fnsvp(x));
}

/**
 * Error function for iterative solution of SET temperature (second version).
 *
 * Used in the Newton-Raphson algorithm.
 */
function _fnerrs(
  x: number,
  hsk: number,
  hd_s: number,
  tsk: number,
  w: number,
  he_s: number,
  pssk: number,
): number {
  return hsk - hd_s * (tsk - x) - w * he_s * (pssk - 0.5 * _fnsvp(x));
}
