import {valid_range} from "../utilities/utilities"

const g = 9.81;
const c_to_k = 273.15;
const cp_air = 1004;

/**
 * Converts globe temperature reading into mean radiant temperature in accordance with either the Mixed Convection developed by Teitelbaum E. et al. (2022) or the ISO 7726:1998 Standard [5]_.
 * @param {Number | Number[]} tg - globe temperature, [°C]
 * @param {Number | Number[]} tdb - air temperature, [°C]
 * @param {Number | Number[]} v - air speed, [m/s]
 * @param {Number | Number[]} d - diameter of the globe, [m] default 0.15 m
 * @param {Number | Number[]} emissivity - emissivity of the globe temperature sensor, default 0.95
* @param {String} standard - {"Mixed Convection", "ISO"} either choose between the Mixed Convection and ISO formulations.
        The Mixed Convection formulation has been proposed by Teitelbaum E. et al. (2022)
        to better determine the free and forced convection coefficient used in the
        calculation of the mean radiant temperature. They also showed that mean radiant
        temperature measured with ping-pong ball-sized globe thermometers is not reliable
        due to a stochastic convective bias [22]_. The Mixed Convection model has only
        been validated for globe sensors with a diameter between 0.04 and 0.15 m.
* @returns {Number | Array}
*/

export function t_mrt(tg, tdb, v, d=0.15, emissivity=0.95, standard="Mixed Convection") {
    standard = standard.toLowerCase();
    tdb = Array.isArray(tdb) ? tdb : [tdb];
    tg = Array.isArray(tg) ? tg : [tg];
    v = Array.isArray(v) ? v : [v];
    d = Array.isArray(d) ? d : [d];
    let tr = 0

    if (standard === "mixed convection") {
        const mu = 0.0000181  // Pa s
        const k_air = 0.02662  // W/m-K
        const beta = 0.0034  // 1/K
        const nu = 0.0000148  // m2/s
        const alpha = 0.00002591  // m2/s
        const pr = cp_air * mu / k_air  // Prandtl constants, number

        const o = 0.0000000567
        const n = d.map((_d) => 1.27 * _d + 0.57) //size same as d
        //console.log(n)

        const ra = tg.map((_tg, i) => {
            const _tdb = tdb.length === 1 ? tdb[0] : tdb[i];
            const _d = d.length === 1 ? d[0] : d[i];
            return g * beta * Math.abs(_tg - _tdb) * _d * _d * _d / nu / alpha
        }) //tg size

        //console.log(ra)
        
        const re = d.map((_d, i) => {
            const _v = v.length === 1 ? v[0] : v[i]
            return _v * _d / nu
        }) //size d
        //console.log(re)

        const nu_natural = ra.map( (_ra) => {
            return 2 + (0.589 * Math.pow(_ra, (1 / 4))) / (
            Math.pow(1 + Math.pow(0.469 / pr, 9 / 16), (4 / 9))
        )}) //arr type, size same as tg

        const nu_forced = re.map( (_re) => {
            return 2 + (
                0.4 * Math.pow(_re, 0.5) + 0.06 * Math.pow(_re, 2 / 3)
            ) * Math.pow(pr, 0.4)
        }) //arr size same as d
        //console.log(nu_natural, tg)

        tr = tg.map((_tg, i) => {
            const _tdb = tdb.length === 1 ? tdb[0] : tdb[i]
            const _nu_forced = nu_forced.length === 1 ? nu_forced[0] : nu_forced[i]
            const _nu_natural = nu_natural.length === 1 ? nu_natural[0] : nu_natural[i]
            const _n = n.length === 1 ? n[0] : n[i]
            const _d = d.length === 1 ? d[0] : d[i]
            const _emissivity = Array.isArray(emissivity) ? emissivity[i] : emissivity
           // console.log(_tg, _tdb, _nu_forced, _nu_natural, _n, _d, emissivity, _emissivity)
            return (
                Math.pow(
                    Math.pow(_tg + 273.15, 4)
                    - (
                        (
                            (
                                (
                                    Math.pow(
                                        (Math.pow(_nu_forced, _n) + Math.pow(_nu_natural, _n)),
                                        1 / _n,
                                    )
                                )
                                * k_air
                                / _d
                            )
                            * (-_tg + _tdb)
                        )
                        / _emissivity
                        / o
                    ),
                    0.25,
                )
                - 273.15
            )
    
        })
        
        const d_valid = valid_range(d, [0.04, 0.15])
       // console.log(d_valid)
        const trResult = d_valid.map((_d_valid, i) => !isNaN(_d_valid) ? Math.round(tr[i] * 10) / 10 : NaN);
        console.log(trResult)
        return trResult
    }

    if(standard === "iso") {
        tg = tg.length === 1 ? [tg[0]+ c_to_k] : tg.map(_tg => _tg+c_to_k)
        tdb = tdb.length === 1 ? [tdb[0]+ c_to_k] : tdb.map(_tdb => _tdb+c_to_k)

        // calculate heat transfer coefficient
        const h_n = tg.map((_tg, i) => {
            const _tdb = tdb.length === 1 ? tdb[0] : tdb[i]
            const _d = d.length === 1 ? d[0] : d[i]
            return Math.pow(1.4 * (Math.abs(_tg - _tdb) / _d), 0.25)
        })   // natural convection

        const h_f = d.map((_d, i) => {
            const _v = v.length === 1 ? v[0] : v[i]
            return 6.3 * Math.pow(_v, 0.6) / Math.pow(_d, 0.4)
        })  // forced convection

        // get the biggest between the two coefficients
        const h = h_n.length >= h_f.length ? h_n.map((_h_n, i) => {
                const _h_f = h_f.length === 1 ? h_f[0] : h_f[i]
                return Math.max(_h_n, _h_f)
            }) : h_f.map((_h_f, i) => {
                const _h_n = h_n.length === 1 ? h_n[0] : h_n[i]
                return Math.max(_h_n, _h_f)
            })
        

        tr = tg.map((_tg, i) => {
            const _tdb = tdb.length === 1 ? tdb[0] : tdb[i]
            const _emissivity = !Array.isArray(emissivity) ? emissivity : emissivity[i]
            const _h = h.length === 1 ? h[0] : h[i]
            return Math.round((Math.pow(
                Math.pow(_tg, 4) + _h * (_tg - _tdb) / (_emissivity * (5.67 * Math.pow(10, -8))),
                0.25,
            )
            - c_to_k)*10)/10
        })

        return tr
    }
}
