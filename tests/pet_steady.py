import numpy as np
import math

c_to_k = 273.15

def body_surface_area(weight, height, formula="dubois"):
    """Returns the body surface area in square meters.

    Parameters
    ----------
    weight : float
        body weight, [kg]
    height : float
        height, [m]
    formula : str, optional,
        formula used to calculate the body surface area. default="dubois"
        Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi".

    Returns
    -------
    body_surface_area : float
        body surface area, [m2]
    """

    if formula == "dubois":
        return 0.202 * (weight**0.425) * (height**0.725)
    elif formula == "takahira":
        return 0.2042 * (weight**0.425) * (height**0.725)
    elif formula == "fujimoto":
        return 0.1882 * (weight**0.444) * (height**0.663)
    elif formula == "kurazumi":
        return 0.2440 * (weight**0.383) * (height**0.693)
    else:
        raise ValueError(
            f"This {formula} to calculate the body_surface_area does not exists."
        )

def p_sat(tdb):
    """Calculates vapour pressure of water at different temperatures

    Parameters
    ----------
    tdb: float
        air temperature, [°C]

    Returns
    -------
    p_sat: float
        saturation vapor pressure, [Pa]
    """

    ta_k = tdb + c_to_k
    c1 = -5674.5359
    c2 = 6.3925247
    c3 = -0.9677843 * math.pow(10, -2)
    c4 = 0.62215701 * math.pow(10, -6)
    c5 = 0.20747825 * math.pow(10, -8)
    c6 = -0.9484024 * math.pow(10, -12)
    c7 = 4.1635019
    c8 = -5800.2206
    c9 = 1.3914993
    c10 = -0.048640239
    c11 = 0.41764768 * math.pow(10, -4)
    c12 = -0.14452093 * math.pow(10, -7)
    c13 = 6.5459673

    if ta_k < c_to_k:
        pascals = math.exp(
            c1 / ta_k
            + c2
            + ta_k * (c3 + ta_k * (c4 + ta_k * (c5 + c6 * ta_k)))
            + c7 * math.log(ta_k)
        )
    else:
        pascals = math.exp(
            c8 / ta_k
            + c9
            + ta_k * (c10 + ta_k * (c11 + ta_k * c12))
            + c13 * math.log(ta_k)
        )

    return round(pascals, 1)

def solve_pet(
    t_arr,
    _tdb,
    _tr,
    _v=0.1,
    _rh=50,
    _met=80,
    _clo=0.9,
    actual_environment=False,
    p_atm=1013.25,
    position=1,
    age=23,
    sex=1,
    weight=75,
    height=1.8,
    wme=0
    ):
    """
    This function allows solving for the PET : either it solves the vectorial balance
    of the 3 unknown temperatures (T_core, T_sk, T_clo) or it solves for the
    environment operative temperature that would yield the same energy balance as the
    actual environment.

    Parameters
    ----------
    t_arr : list or array-like
        [T_core, T_sk, T_clo], [°C]
    _tdb : float
        dry bulb air temperature, [°C]
    _tr : float
        mean radiant temperature, [°C]
    _v : float, default 0.1 m/s for the reference environment
        air speed, [m/s]
    _rh : float, default 50 % for the reference environment
        relative humidity, [%]
    _met : float, default 80 W for the reference environment
        metabolic rate, [W/m2]
    _clo : float, default 0.9 clo for the reference environment
        clothing insulation, [clo]
    actual_environment : boolean
        True=solve 3eqs/3unknowns, False=solve for PET

    Returns
    -------
    float
        PET or energy balance.
    """

    def vasomotricity(t_cr, t_sk):
        """Defines the vasomotricity (blood flow) in function of the core
        and skin temperatures.

        Parameters
        ----------
        t_cr : float
            The body core temperature, [°C]
        t_sk : float
            The body skin temperature, [°C]

        Returns
        -------
        dict
            "m_blood": Blood flow rate, [kg/m2/h] and "alpha": repartition of body
            mass
            between core and skin [].
        """
        # skin and core temperatures set values
        tc_set = 36.6  # 36.8
        tsk_set = 34  # 33.7
        # Set value signals
        sig_skin = tsk_set - t_sk
        sig_core = t_cr - tc_set
        if sig_core < 0:
            # In this case, T_core<Tc_set --> the blood flow is reduced
            sig_core = 0.0
        if sig_skin < 0:
            # In this case, Tsk>Tsk_set --> the blood flow is increased
            sig_skin = 0.0
        # 6.3 L/m^2/h is the set value of the blood flow
        m_blood = (6.3 + 75.0 * sig_core) / (1.0 + 0.5 * sig_skin)
        # 90 L/m^2/h is the blood flow upper limit
        if m_blood > 90:
            m_blood = 90.0
        # in other models, alpha is used to update tbody
        alpha = 0.0417737 + 0.7451833 / (m_blood + 0.585417)

        return {"m_blood": m_blood, "alpha": alpha}

    def sweat_rate(t_body):
        """Defines the sweating mechanism depending on the body and core
        temperatures.

        Parameters
        ----------
        t_body : float
            weighted average between skin and core temperatures, [°C]

        Returns
        -------
        m_rsw : float
            The sweating flow rate, [g/m2/h].
        """
        tc_set = 36.6  # 36.8
        tsk_set = 34  # 33.7
        tbody_set = 0.1 * tsk_set + 0.9 * tc_set  # Calculation of the body
        # temperature
        # through a weighted average
        sig_body = t_body - tbody_set
        if sig_body < 0:
            # In this case, Tbody<Tbody_set --> The sweat flow is 0
            sig_body = 0.0
        # from Gagge's model
        m_rsw = 304.94 * 10**-3 * sig_body
        # 500 g/m^2/h is the upper sweat rate limit
        if m_rsw > 500:
            m_rsw = 500

        return m_rsw

    e_skin = 0.99  # Skin emissivity
    e_clo = 0.95  # Clothing emissivity
    h_vap = 2.42 * 10**6  # Latent heat of evaporation [J/Kg]
    sbc = 5.67 * 10**-8  # Stefan-Boltzmann constant [W/(m2*K^(-4))]
    cb = 3640  # Blood specific heat [J/kg/k]

    t_arr = np.reshape(t_arr, (3, 1))  # reshape to proper dimensions for fsolve
    e_bal_vec = np.zeros(
        (3, 1)
    )  # required for the vectorial expression of the balance
    # Area parameters of the body:
    a_dubois = body_surface_area(weight, height)
    # Base metabolism for men and women in [W]
    met_female = (
        3.19
        * weight**0.75
        * (
            1.0
            + 0.004 * (30.0 - age)
            + 0.018 * (height * 100.0 / weight ** (1.0 / 3.0) - 42.1)
        )
    )
    met_male = (
        3.45
        * weight**0.75
        * (
            1.0
            + 0.004 * (30.0 - age)
            + 0.01 * (height * 100.0 / weight ** (1.0 / 3.0) - 43.4)
        )
    )
    # Attribution of internal energy depending on the sex of the subject
    met_correction = met_male if sex == 1 else met_female

    # Source term : metabolic activity
    he = (_met + met_correction) / a_dubois
    # impact of efficiency
    h = he * (1.0 - wme)  # [W/m2]

    # correction for wind
    i_m = 0.38  # Woodcock ratio for vapour transfer through clothing [-]

    # Calculation of the Burton surface increase coefficient, k = 0.31 for Hoeppe:
    fcl = (
        1 + 0.31 * _clo
    )  # Increase heat exchange surface depending on clothing level
    f_a_cl = (
        173.51 * _clo - 2.36 - 100.76 * _clo * _clo + 19.28 * _clo**3.0
    ) / 100
    a_clo = a_dubois * f_a_cl + a_dubois * (fcl - 1.0)  # clothed body surface area

    f_eff = 0.696 if position == 2 else 0.725  # effective radiation factor

    a_r_eff = (
        a_dubois * f_eff
    )  # Effective radiative area depending on the position of the subject

    # Partial pressure of water in the air
    vpa = _rh / 100.0 * p_sat(_tdb) / 100  # [hPa]
    if not actual_environment:  # mode=False means we are calculating the PET
        vpa = 12  # [hPa] vapour pressure of the standard environment

    # Convection coefficient depending on wind velocity and subject position
    hc = 2.67 + 6.5 * _v**0.67  # sitting
    if position == 2:  # standing
        hc = 2.26 + 7.42 * _v**0.67
    if position == 3:  # standing, forced convection
        hc = 8.6 * _v**0.513
    # h_cc corrected convective heat transfer coefficient
    h_cc = 3.0 * pow(p_atm / 1013.25, 0.53)
    hc = max(h_cc, hc)
    # modification of hc with the total pressure
    hc = hc * (p_atm / 1013.25) ** 0.55

    # Respiratory energy losses
    t_exp = 0.47 * _tdb + 21.0  # Expired air temperature calculation [degC]
    d_vent_pulm = he * 1.44 * 10.0 ** (-6.0)  # breathing flow rate
    c_res = 1010 * (_tdb - t_exp) * d_vent_pulm  # Sensible heat energy loss [W/m2]
    vpexp = p_sat(t_exp) / 100  # Latent heat energy loss [hPa]
    q_res = 0.623 * h_vap / p_atm * (vpa - vpexp) * d_vent_pulm  # [W/m2]
    ere = c_res + q_res  # [W/m2]

    # Calculation of the equivalent thermal resistance of body tissues
    alpha = vasomotricity(t_arr[0, 0], t_arr[1, 0])["alpha"]
    tbody = alpha * t_arr[1, 0] + (1 - alpha) * t_arr[0, 0]

    # Clothed fraction of the body approximation
    r_cl = _clo / 6.45  # Conversion in [m2.K/W]
    y = 0
    if f_a_cl > 1.0:
        f_a_cl = 1.0
    if _clo >= 2.0:
        y = 1.0
    if 0.6 < _clo < 2.0:
        y = (height - 0.2) / height
    if 0.6 >= _clo > 0.3:
        y = 0.5
    if 0.3 >= _clo > 0.0:
        y = 0.1
    # calculation of the clothing radius depending on the clothing level (6.28 = 2*
    # pi !)
    r2 = a_dubois * (fcl - 1.0 + f_a_cl) / (6.28 * height * y)  # External radius
    r1 = f_a_cl * a_dubois / (6.28 * height * y)  # Internal radius
    di = r2 - r1
    # Calculation of the equivalent thermal resistance of body tissues
    htcl = 6.28 * height * y * di / (r_cl * np.log(r2 / r1) * a_clo)  # [W/(m2.K)]

    # Calculation of sweat losses
    qmsw = sweat_rate(tbody)
    # h_vap/1000 = 2400 000[J/kg] divided by 1000 = [J/g] // qwsw/3600 for [g/m2/h]
    # to [
    # g/m2/s]
    esw = h_vap / 1000 * qmsw / 3600  # [W/m2]
    # Saturation vapor pressure at temperature Tsk
    p_v_sk = p_sat(t_arr[1, 0]) / 100  # hPa
    # Calculation of vapour transfer
    lr = 16.7 * 10 ** (-1)  # [K/hPa] Lewis ratio
    he_diff = hc * lr  # diffusion coefficient of air layer
    fecl = 1 / (1 + 0.92 * hc * r_cl)  # Burton efficiency factor
    e_max = he_diff * fecl * (p_v_sk - vpa)  # maximum diffusion at skin surface
    if e_max == 0:  # added this otherwise e_req / e_max cannot be calculated
        e_max = 0.001
    w = esw / e_max  # skin wettedness
    if w > 1:
        w = 1
        delta = esw - e_max
        if delta < 0:
            esw = e_max
    if esw < 0:
        esw = 0
    # i_m= Woodcock's ratio (see above)
    r_ecl = (1 / (fcl * hc) + r_cl) / (
        lr * i_m
    )  # clothing vapour transfer resistance after Woodcock's method
    ediff = (1 - w) * (p_v_sk - vpa) / r_ecl  # diffusion heat transfer
    evap = -(ediff + esw)  # [W/m2]

    # Radiation losses bare skin
    r_bare = (
        a_r_eff
        * (1.0 - f_a_cl)
        * e_skin
        * sbc
        * ((_tr + 273.15) ** 4.0 - (t_arr[1, 0] + 273.15) ** 4.0)
        / a_dubois
    )
    # ... for clothed area
    r_clo = (
        f_eff
        * a_clo
        * e_clo
        * sbc
        * ((_tr + 273.15) ** 4.0 - (t_arr[2, 0] + 273.15) ** 4.0)
        / a_dubois
    )
    r_sum = r_clo + r_bare  # radiation total

    # Convection losses for bare skin
    c_bare = (
        hc * (_tdb - t_arr[1, 0]) * a_dubois * (1.0 - f_a_cl) / a_dubois
    )  # [W/m^2]
    # ... for clothed area
    c_clo = hc * (_tdb - t_arr[2, 0]) * a_clo / a_dubois  # [W/m^2]
    csum = c_clo + c_bare  # convection total

    # Balance equations of the 3-nodes model
    e_bal_vec[0, 0] = (
        h
        + ere
        - (vasomotricity(t_arr[0, 0], t_arr[1, 0])["m_blood"] / 3600 * cb + 5.28)
        * (t_arr[0, 0] - t_arr[1, 0])
    )  # Core balance [W/m^2]
    e_bal_vec[1, 0] = (
        r_bare
        + c_bare
        + evap
        + (vasomotricity(t_arr[0, 0], t_arr[1, 0])["m_blood"] / 3600 * cb + 5.28)
        * (t_arr[0, 0] - t_arr[1, 0])
        - htcl * (t_arr[1, 0] - t_arr[2, 0])
    )  # Skin balance [W/m^2]
    e_bal_vec[2, 0] = (
        c_clo + r_clo + htcl * (t_arr[1, 0] - t_arr[2, 0])
    )  # Clothes balance [W/m^2]
    e_bal_scal = h + ere + r_sum + csum + evap

    # returning either the calculated core,skin,clo temperatures or the PET
    if actual_environment:
        # if we solve for the system we need to return 3 temperatures
        return [e_bal_vec[0, 0], e_bal_vec[1, 0], e_bal_vec[2, 0]]
    else:
        # solving for the PET requires the scalar balance only
        return e_bal_scal
    
print(solve_pet([1, 2, 3], 20, 20))

# t_arr,
    # _tdb,
    # _tr,