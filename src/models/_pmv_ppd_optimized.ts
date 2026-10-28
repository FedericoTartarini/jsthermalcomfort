import { met_to_w_m2 } from "../utilities/met_to_w_m2.ts";

export function _pmv_ppd_optimized(
  tdb: number,
  tr: number,
  vr: number,
  rh: number,
  met: number,
  clo: number,
  wme: number,
): number {
  const pa = rh * 10 * Math.exp(16.6536 - 4030.183 / (tdb + 235));

  const icl = 0.155 * clo; // thermal insulation of the clothing in M2K/W
  const m = met * met_to_w_m2; // metabolic rate in W/M2
  const w = wme * met_to_w_m2; // external work in W/M2
  const mw = m - w; // internal heat production in the human body
  // calculation of the clothing area factor
  const f_cl = icl <= 0.078 ? 1 + 1.29 * icl : 1.05 + 0.645 * icl; // ratio of surface clothed body over nude body

  // heat transfer coefficient by forced convection
  const hcf = 12.1 * Math.sqrt(vr);
  let hc = hcf; // initialize variable
  const taa = tdb + 273;
  const tra = tr + 273;
  // initial guess for clothing surface temperature, per ISO 7730:2025 Annex D
  const t_cla = taa + (35.5 - tdb) / (3.5 * (6.45 * icl + 0.1));

  const p1 = icl * f_cl;
  const p2 = p1 * 3.96;
  const p3 = p1 * 100;
  const p4 = p1 * taa;
  const p5 =
    308.7 -
    0.028 * mw +
    p2 * ((tra / 100.0) * (tra / 100.0) * ((tra / 100.0) * (tra / 100.0)));
  let xn = t_cla / 100;
  let xf = t_cla / 50;
  const eps = 0.00015;

  let n = 0;
  while (Math.abs(xn - xf) > eps) {
    xf = (xf + xn) / 2;
    const hcn = 2.38 * Math.pow(Math.abs(100.0 * xf - taa), 0.25);
    hc = hcf > hcn ? hcf : hcn;
    xn = (p5 + p4 * hc - p2 * (xf * xf * (xf * xf))) / (100 + p3 * hc);
    n += 1;
    if (n > 150) {
      throw new Error("Max iterations exceeded");
    }
  }

  const tcl = 100 * xn - 273;

  // heat loss diff. through skin
  const hl1 = 3.05 * 0.001 * (5733 - 6.99 * mw - pa);
  // heat loss by sweating
  const hl2 = mw > met_to_w_m2 ? 0.42 * (mw - met_to_w_m2) : 0;
  // latent respiration heat loss
  const hl3 = 1.7 * 0.00001 * m * (5867 - pa);
  // dry respiration heat loss
  const hl4 = 0.0014 * m * (34 - tdb);
  // heat loss by radiation
  const hl5 =
    3.96 *
    f_cl *
    (xn * xn * (xn * xn) -
      (tra / 100.0) * (tra / 100.0) * ((tra / 100.0) * (tra / 100.0)));
  // heat loss by convection
  const hl6 = f_cl * hc * (tcl - tdb);

  const ts = 0.303 * Math.exp(-0.036 * m) + 0.028;
  const _pmv = ts * (mw - hl1 - hl2 - hl3 - hl4 - hl5 - hl6);

  return _pmv;
}
