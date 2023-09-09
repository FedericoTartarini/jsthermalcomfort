import {
  round,
} from "../utilities/utilities.js";
import { p_sat_torr } from "../psychrometrics/p_sat_torr.js";

// two_nodes(25, 25, 0.3, 50, 1.2, 0.5);

/**
 * @typedef {Object} TwoNodesReturnType
 * @property {number | number[]} eSkin – Total rate of evaporative heat loss from skin, [W/m2]. Equal to e_rsw + e_diff
 * @property {number | number[]} eRsw (float or array-like) – Rate of evaporative heat loss from sweat evaporation, [W/m2]
 * @property {number | number[]} eMax (float or array-like) – Maximum rate of evaporative heat loss from skin, [W/m2]
 * @property {number | number[]} qSensible (float or array-like) – Sensible heat loss from skin, [W/m2]
 * @property {number | number[]} qSkin (float or array-like) – Total rate of heat loss from skin, [W/m2]. Equal to q_sensible + e_skin
 * @property {number | number[]} qRes (float or array-like) – Total rate of heat loss through respiration, [W/m2]
 * @property {number | number[]} tCore (float or array-like) – Core temperature, [°C]
 * @property {number | number[]} tSkin (float or array-like) – Skin temperature, [°C]
 * @property {number | number[]} mBl (float or array-like) – Skin blood flow, [kg/h/m2]
 * @property {number | number[]} mRsw (float or array-like) – Rate at which regulatory sweat is generated, [kg/h/m2]
 * @property {number | number[]} w (float or array-like) – Skin wettedness, adimensional. Ranges from 0 and 1.
 * @property {number | number[]} w_max (float or array-like) – Skin wettedness (w) practical upper limit, adimensional. Ranges from 0 and 1.
 * @property {number | number[]} set (float or array-like) – Standard Effective Temperature (SET)
 * @property {number | number[]} et (float or array-like) – New Effective Temperature (ET)
 * @property {number | number[]} pmvGagge (float or array-like) – PMV Gagge
 * @property {number | number[]} pmvSet (float or array-like) – PMV SET
 * @property {number | number[]} disc (float or array-like) – Thermal discomfort
 * @property {number | number[]} tSens (float or array-like) – Predicted Thermal Sensation
 */

/**
 * @typedef {Object} TwoNodesKwargs
 * @property {boolean} [round=true]
 * @property {boolean} [calculate_ce=false]
 * @property {number | number[]} [max_sweating]
 * @property {number | number[]} [w_max]
 */

/**
 * @typedef {Object} TwoNodesKwargsRequired
 * @property {boolean} round
 * @property {boolean} calculate_ce
 * @property {number | number[]} max_sweating
 * @property {number | number[]} w_max
 */

/**
 * Two-node model of human temperature regulation:
 * this model it can be used to calculate a variety of indices, including:
 * Gagge’s version of Fanger’s Predicted Mean Vote (PMV). This function uses
 * the Fanger’s PMV equations but it replaces the heat loss and gain terms
 * with those calculated by the two node model PMV SET and the predicted
 * thermal sensation based on SET. This function is similar in all aspects
 * to the pythermalcomfort.models.pmv_gagge() however, it uses the
 * pythermalcomfort.models.set() equation to calculate the dry heat loss by
 * convection.
 * Thermal discomfort (DISC) as the relative thermoregulatory strain necessary
 * to restore a state of comfort and thermal equilibrium by sweating. DISC is
 * described numerically as: comfortable and pleasant (0), slightly
 * uncomfortable but acceptable (1), uncomfortable and unpleasant (2),
 * very uncomfortable (3), limited tolerance (4), and intolerable (S).
 * The range of each category is ± 0.5 numerically. In the cold, the classical
 * negative category descriptions used for Fanger’s PMV apply.
 * Heat gains and losses via convection, radiation and conduction.
 * The Standard Effective Temperature (SET)
 * The New Effective Temperature (ET)
 * The Predicted Thermal Sensation (TSENS)
 * The Predicted Percent Dissatisfied Due to Draft (PD)
 * Predicted Percent Satisfied With the Level of Air Movement” (PS)
 *
 * @param {number | number[]} tdb Dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'.
 * @param {number | number[]} tr Mean radiant temperature, default in [°C]
 * @param {number | number[]} v Air speed, default in [m/s]
 * @param {number | number[]} rh Relative humidity, [%].
 * @param {number | number[]} met Metabolic rate, [W/(m2)]
 * @param {number | number[]} clo Clothing insulation, [clo]
 * @param {number | number[]} wme External work, [W/(m2)] default 0
 * @param {number} body_surface_area Body surface area, default value 1.8258 [m2] in [ft2] if units = ‘IP’
 * @param {number} p_atmospheric Atmospheric pressure, default value 101325 [Pa] in [atm] if units = ‘IP’
 * @param {"standing" | "sitting"} body_position Select either “sitting” or “standing”
 * @param {number} max_skin_blood_flow Maximum blood flow from the core to the skin, [kg/h/m2] default 80
 * @param {TwoNodesKwargs} [kwargs]
 *
 * @returns {TwoNodesReturnType} object with results of two_nodes
 *
 * @example
 * const results = two_nodes(25, 25, 0.3, 50, 1.2, 0.5);
 * console.log(results); // {
  e_skin: 16.2,
  e_rsw: 7,
  e_max: 159.9,
  q_sensible: 47.6,
  q_skin: 63.8,
  q_res: 5.2,
  t_core: 36.9,
  t_skin: 33.7,
  m_bl: 12.9,
  m_rsw: 10.3,
  w: 0.1,
  w_max: 0.6,
  set: 23.6,
  et: 25,
  pmv_gagge: 0.1,
  pmv_set: -0,
  disc: 0.1,
  t_sens: 0.1
}
 *
 */
export function two_nodes(
  tdb,
  tr,
  v,
  rh,
  met,
  clo,
  wme = 0,
  body_surface_area = 1.8258,
  p_atmospheric = 101325,
  body_position = "standing",
  max_skin_blood_flow = 90,
  kwargs = {},
) {
  const defaults_kwargs = {
    calculate_ce: false,
    round: true,
    max_sweating: 500,
    w_max: false,
  };

  let joint_kwargs = Object.assign(defaults_kwargs, kwargs);

  // const tbdIsArray = Array.isArray(tdb);
  // if (!tbdIsArray) {
  //     const vapor_pressure = rh * p_sat_torr(tdb) / 100
  // }
  // else{
  //     const vapor_pressure = rhArray.map((_rh, index) => (
  //         _rh * p_sat_torr(tdbArray[index]) / 100
  //     ));
  // }

  // const tdbArray = Array.isArray(tdb) ? tdb : [tdb];
  // const trArray = Array.isArray(tr) ? tr : [tr];
  // const vArray = Array.isArray(v) ? v : [v];
  // const rhArray = Array.isArray(rh) ? rh : [rh];
  // const metArray = Array.isArray(met) ? met : [met];
  // const cloArray = Array.isArray(clo) ? clo : [clo];
  // const wmeArray = Array.isArray(wme) ? wme : [wme];
  // const bodyPositionArray = Array.isArray(body_position)
  //   ? body_position
  //   : [body_position];

  // const vapor_pressure = rhArray.map(
  //   (_rh, index) => (_rh * p_sat_torr(tdbArray[index])) / 100,
  // );
  const vapor_pressure = cal_vapor_pressure(tdb, rh);

  const result = calculate_two_nodes(
    tdb,
    tr,
    v,
    met,
    clo,
    vapor_pressure,
    wme,
    body_surface_area,
    p_atmospheric,
    body_position,
    joint_kwargs,
  );

  if (joint_kwargs.round) {
    return {
      e_skin: round(result.eSkin, 1),
      e_rsw: round(result.eRsw, 1),
      e_max: round(result.eMax, 1),
      q_sensible: round(result.qSensible, 1),
      q_skin: round(result.qSkin, 1),
      q_res: round(result.qRes, 1),
      t_core: round(result.tCore, 1),
      t_skin: round(result.tSkin, 1),
      m_bl: round(result.mBl, 1),
      m_rsw: round(result.mRsw, 1),
      w: round(result.w, 1),
      w_max: round(result.wMax, 1),
      set: round(result.set, 1),
      et: round(result.et, 1),
      pmv_gagge: round(result.pmvGagge, 1),
      pmv_set: round(result.pmvSet, 1),
      disc: round(result.disc, 1),
      t_sens: round(result.tSens, 1),
    };
  }
  return result;
}

/**
 * @param {number | number[]} tdb Dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'.
 * @param {number | number[]} tr Mean radiant temperature, default in [°C]
 * @param {number | number[]} v Air speed, default in [m/s]
 * @param {number | number[]} met Metabolic rate, [W/(m2)]
 * @param {number | number[]} clo Clothing insulation, [clo]
 * @param {number | number[]} vaporPressure
 * @param {number | number[]} wme External work, [W/(m2)] default 0
 * @param {number} bodySurfaceArea Body surface area, default value 1.8258 [m2] in [ft2] if units = ‘IP’
 * @param {number} pAtmospheric Atmospheric pressure, default value 101325 [Pa] in [atm] if units = ‘IP’
 * @param {"standing" | "sitting"} bodyPosition Select either “sitting” or “standing”
 * @param {TwoNodesKwargs} [kwargs]
 *
 */


const kClo = 0.25;
const bodyWeight = 70; 
const metFactor = 58.2; 
const sbc = 0.000000056697; 
const cSw = 170; 
const cDil = 120; 
const cStr = 0.5; 
const tempSkinNeutral = 33.7;
const tempCoreNeutral = 36.8;
const skinBloodFlowNeutral = 6.3;

function calculate_two_nodes(
  tdb,
  tr,
  v,
  met,
  clo,
  vaporPressure,
  wme,
  bodySurfaceArea,
  pAtmospheric,
  bodyPosition,
  kwargs,
) {

  let alfa = 0.1;    
  const tempBodyNeutral = alfa * tempSkinNeutral + (1 - alfa) * tempCoreNeutral;
  const airSpeed = Math.max(v, 0.1);
  
  let tSkin = tempSkinNeutral;
  let tCore = tempCoreNeutral;
  let mBl = skinBloodFlowNeutral;
  let eSkin = 0.1 * met; 
  let qSensible = 0; 
  let w = 0; 
  let set = 0; 
  let eRsw = 0; 
  let eDiff = 0; 
  let eMax = 0; 
  let mRsw = 0; 
  let qRes = 0; 
  let et = 0; 
  let eReq = 0; 
  let rEa = 0;
  let rEcl = 0;
  let cRes = 0; 
  
  const pressureInAtmospheres = pAtmospheric / 101325;
  const lengthTimeSimulation = 60;
  
  const fACl = 1.0 + 0.15 * clo; 
  const lr = 2.2 / pressureInAtmospheres; 
  
  let rm = calculate_metabolic_rate(met, wme);
  let rClo = calculate_clothing_resistance(clo)
  let m = met * metFactor; 
  let wMax = 0;

  const eComfort = 0.42 * (rm - metFactor); 
  if (eComfort < 0) {
    eComfort = 0;
  }

  let iCl = 1.0; 
  if (clo > 0) {
    iCl = 0.45; 
  }

  if (!kwargs.w_max) {
    kwargs.w_max = 0.38 * Math.pow(airSpeed, -0.29); 
    wMax = kwargs.w_max;
    if (clo > 0) {
      kwargs.w_max = 0.59 * Math.pow(airSpeed, -0.08); 
      wMax = kwargs.w_max;
    }
  }

  let hCc = 3.0 * Math.pow(pressureInAtmospheres, 0.53);
  const hFc = 8.600001 * Math.pow(airSpeed * pressureInAtmospheres, 0.53);
  hCc = Math.max(hCc, hFc);
  if (!kwargs.calculate_ce && met > 0.85) {
    const hCMet = 5.66 * Math.pow(met - 0.85, 0.39);
    hCc = Math.max(hCc, hCMet);
  }

  let hR = 4.7;
  let hT = hR + hCc; 
  let rA = 1.0 / (fACl * hT); 
  let tOp = (hR * tr + hCc * tdb) / hT; 

  let tBody = alfa * tSkin + (1 - alfa) * tCore; 

  qRes = 0.0023 * m * (44.0 - vaporPressure); 
  cRes = 0.0014 * m * (34.0 - tdb); 

  let nSimulation = 0;
  while (nSimulation < lengthTimeSimulation) {
    nSimulation += 1;

    const iterationLimit = 150;
    let tCl = (rA * tSkin + rClo * tOp) / (rA + rClo);
    let nIterations = 0;
    let tcConverged = false;

    while (!tcConverged) {

      if (bodyPosition === "sitting") {

        hR = 4.0 * 0.95 * sbc * ((tCl + tr) / 2.0 + 273.15) ** 3.0 * 0.7;
      } else {

        hR = 4.0 * 0.95 * sbc * ((tCl + tr) / 2.0 + 273.15) ** 3.0 * 0.73;
      }
      hT = hR + hCc;
      rA = 1.0 / (fACl * hT);
      tOp = (hR * tr + hCc * tdb) / hT;
      const tClNew = (rA * tSkin + rClo * tOp) / (rA + rClo);
      if (Math.abs(tClNew - tCl) <= 0.01) {
        tcConverged = true;
      }
      tCl = tClNew;
      nIterations += 1;

      if (nIterations > iterationLimit) {
        throw new Error("Max iterations exceeded");
      }
    }

    let qSensible = (tSkin - tOp) / (rA + rClo); // total sensible heat loss, W
    const hfCs = (tCore - tSkin) * (5.28 + 1.163 * mBl);
    const sCore = m - hfCs - qRes - cRes - wme; // rate of energy storage in the core
    const sSkin = hfCs - qSensible - eSkin; // rate of energy storage in the skin
    const tcSk = 0.97 * alfa * bodyWeight; // thermal capacity skin
    const tcCr = 0.97 * (1 - alfa) * bodyWeight; // thermal capacity core
    const dTSk = (sSkin * bodySurfaceArea) / (tcSk * 60.0); // rate of change skin temperature °C per minute
    const dTCr = (sCore * bodySurfaceArea) / (tcCr * 60.0); // rate of change core temperature °C per minute
    tSkin = tSkin + dTSk;
    tCore = tCore + dTCr;
    tBody = alfa * tSkin + (1 - alfa) * tCore;
    // skSig thermoregulatory control signal from the skin
    const skSig = tSkin - tempSkinNeutral;
    const warmSk = (skSig > 0) * skSig; // vasodilation signal
    const colds = (-1.0 * skSig > 0) * (-1.0 * skSig); // vasoconstriction signal
    // cRegSig thermoregulatory control signal from the skin, °C
    const cRegSig = tCore - tempCoreNeutral;
    // cWarm vasodilation signal
    const cWarm = (cRegSig > 0) * cRegSig;
    // cCold vasoconstriction signal
    const cCold = (-1.0 * cRegSig > 0) * (-1.0 * cRegSig);
    // bdSig thermoregulatory control signal from the body
    const bdSig = tBody - tempBodyNeutral;
    const warmB = (bdSig > 0) * bdSig;
    mBl = (skinBloodFlowNeutral + cDil * cWarm) / (1 + cStr * colds);
    if (mBl > kwargs.max_skin_blood_flow) {
      mBl = kwargs.max_skin_blood_flow;
    }
    if (mBl < 0.5) {
      mBl = 0.5;
    }
    mRsw = cSw * warmB * Math.exp(warmSk / 10.7); // regulatory sweating
    if (mRsw > kwargs.max_sweating) {
      mRsw = kwargs.max_sweating;
    }
    eRsw = 0.68 * mRsw; // heat lost by vaporization sweat
    rEa = 1.0 / (lr * fACl * hCc); // evaporative resistance air layer
    rEcl = rClo / (lr * iCl);
    eReq = rm - qRes - cRes - qSensible; // evaporative heat loss required for tmp regulation
    eMax =
      (Math.exp(18.6686 - 4030.183 / (tSkin + 235.0)) - vaporPressure) /
      (rEa + rEcl);
    const pRsw = eRsw / eMax; // ratio heat loss sweating to max heat loss sweating
    w = 0.06 + 0.94 * pRsw; // skin wetness
    eDiff = w * eMax - eRsw; // vapor diffusion through skin
    if (w > kwargs.w_max) {
      w = kwargs.w_max;
      const pRsw = kwargs.w_max / 0.94;
      eRsw = pRsw * eMax;
      eDiff = 0.06 * (1.0 - pRsw) * eMax;
    }
    if (eMax < 0) {
      eDiff = 0;
      eRsw = 0;
      w = kwargs.w_max;
    }
    eSkin = eRsw + eDiff; // total evaporative heat loss sweating and vapor diffusion
    mRsw = eRsw / 0.68; // back calculating the mass of regulatory sweating as a function of eRsw
    const metShivering = 19.4 * colds * cCold; // met shivering W/m2
    m = rm + metShivering;
    alfa = 0.0417737 + 0.7451833 / (mBl + 0.585417);
  }

  const qSkin = qSensible + eSkin; 
  const pSSk = Math.exp(18.6686 - 4030.183 / (tSkin + 235.0));
  const hRS = hR; 
  let hCS = 3.0 * Math.pow(pressureInAtmospheres, 0.53);
  if (!kwargs.calculate_ce && met > 0.85) {
    const hCMet = 5.66 * Math.pow(met - 0.85, 0.39);
    hCS = Math.max(hCS, hCMet);
  }
  if (hCS < 3.0) {
    hCS = 3.0;
  }

  const hTS = hCS + hRS;
  const rCloS = 1.52 / (met - wme / metFactor + 0.6944) - 0.1835; 
  const rClS = 0.155 * rCloS; 
  const fAClS = 1.0 + kClo * rCloS; 
  const fClS = 1.0 / (1.0 + 0.155 * fAClS * hTS * rCloS); 
  const iMS = 0.45; 
  const iClS = iMS * (hCS / hTS) * ((1 - fClS) / (hCS / hTS - fClS * iMS)); 
  const rAS = 1.0 / (fAClS * hTS); 
  const rEaS = 1.0 / (lr * fAClS * hCS);
  const rEclS = rClS / (lr * iClS);
  const hDS = 1.0 / (rAS + rClS);
  const hES = 1.0 / (rEaS + rEclS);


  // calculate Standard Effective Temperature (SET)
  let delta = 0.0001;
  let dx = 100.0;
  let setOld = round(tSkin - qSkin / hDS, 2);
  // console.log(setOld);//21.06
  while (Math.abs(dx) > 0.01) {
    const err1 =
      qSkin -
      hDS * (tSkin - setOld) -
      w * hES * (pSSk - 0.5 * Math.exp(18.6686 - 4030.183 / (setOld + 235.0))); 
    const err2 =
      qSkin -
      hDS * (tSkin - (setOld + delta)) -
      w *
        hES *
        (pSSk - 0.5 * Math.exp(18.6686 - 4030.183 / (setOld + delta + 235.0)));
    set = setOld - (delta * err1) / (err2 - err1);
    dx = set - setOld;
    setOld = set;
  }

  // Calculate Effective Temperature (ET)
  const hD = 1 / (rA + rClo);
  const hE = 1 / (rEa + rEcl);
  let etOld = tSkin - qSkin / hD;
  delta = 0.0001;
  dx = 100.0;
  while (Math.abs(dx) > 0.01) {
    const err1 =
      qSkin -
      hD * (tSkin - etOld) -
      w * hE * (pSSk - 0.5 * Math.exp(18.6686 - 4030.183 / (etOld + 235.0)));

    const err2 =
      qSkin -
      hD * (tSkin - (etOld + delta)) -
      w *
        hE *
        (pSSk - 0.5 * Math.exp(18.6686 - 4030.183 / (etOld + delta + 235.0)));

    et = etOld - (delta * err1) / (err2 - err1);
    dx = et - etOld;
    etOld = et;
  }

  const tbmL = (0.194 / 58.15) * rm + 36.301;
  const tbmH = (0.347 / 58.15) * rm + 36.669;

  let tSens = 0.4685 * (tBody - tbmL);
  if (tBody >= tbmL && tBody < tbmH) {
    tSens = (kwargs.w_max * 4.7 * (tBody - tbmL)) / (tbmH - tbmL);
  } else if (tBody >= tbmH) {
    tSens = kwargs.w_max * 4.7 + 0.4685 * (tBody - tbmH);
  }

  //dis
  let disc =
    (4.7 * (eRsw - eComfort)) / (eMax * kwargs.w_max - eComfort - eDiff); // predicted thermal discomfort
  if (disc <= 0) {
    disc = tSens;
  }

  // PMV Gagge
  const pmvGagge =
    (0.303 * Math.exp(-0.036 * m) + 0.028) * (eReq - eComfort - eDiff);

  // PMV SET
  const drySet = hDS * (tSkin - set);
  const eReqSet = rm - cRes - qRes - drySet;
  const pmvSet =
    (0.303 * Math.exp(-0.036 * m) + 0.028) * (eReqSet - eComfort - eDiff);

  // Predicted Percent Satisfied With the Level of Air Movement
  const ps =
    100 * (1.13 * Math.sqrt(tOp) - 0.24 * tOp + 2.7 * Math.sqrt(v) - 0.99 * v);


  return {
    set,
    eSkin,
    eRsw,
    eMax,
    qSensible,
    qSkin,
    qRes,
    tCore,
    tSkin,
    mBl,
    mRsw,
    w,
    wMax,
    et,
    pmvGagge,
    pmvSet,
    disc,
    tSens,
  };
}

// console.log(cal_vapor_pressure(25, 50));
// calculate_two_nodes(25,25,0.3,50,1.2,0.5);

/**
 * Calculate vapor pressure based on air temperature and relative humidity.
 *
 * @param {number} tdb - air temperature [C]
 * @param {number} rh - relative humidity [%]
 * @returns {number} vapor pressure
 */
function cal_vapor_pressure(tdb, rh){
  return rh * p_sat_torr(tdb) / 100;
}

/**
 * Calculate metabolic rate based on metabolic [W/(m2)] and external work.
 *
 * @param {number} met - Metabolic rate, [W/(m2)]
 * @param {number} wme - External work, default 0
 * @returns {number} metabolic rate
 */
function calculate_metabolic_rate(met, wme) {
  return (met - wme) * metFactor;
}

function calculate_clothing_resistance(clo) {
  return 0.155 * clo;
}

console.log(two_nodes(25, 25, 0.3, 50, 1.2, 0.5));
