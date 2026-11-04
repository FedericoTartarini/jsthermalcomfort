"""Generate the parity suite's data: pinned pythermalcomfort on seeded inputs.

Run it only in the image scripts/parity/Dockerfile builds, on x86_64 (README.md):

    python -I scripts/parity/generate.py OUT_DIR [MODEL ...]

For each model it writes OUT_DIR/<model>.json: a header recording where and
with what the data were made, then one line per case with upstream's keyword
arguments, its outputs and the warnings it emitted. tests/parity/harness.ts
compares the library with these files (ADR 0020).
"""

import contextlib
import dataclasses
import importlib
import importlib.metadata
import json
import math
import os
import platform
import re
import sys
import warnings
from pathlib import Path
from unittest import mock

import numpy as np
from numpy._core._multiarray_umath import (
    __cpu_baseline__,
    __cpu_dispatch__,
    __cpu_features__,
)

import pythermalcomfort.models as models
from pythermalcomfort.models.sports_heat_stress_risk import _SportsValues
from scipy.optimize._minpack import error as minpack_error

HERE = Path(__file__).resolve().parent

# The data's fixed seed. Each model's generator is seeded with this and the
# model's name, so adding a model leaves every other model's cases unchanged.
SEED = 20261026

# Seeded cases per model.
N_CASES = 1000

MACHINE = "x86_64"
ENVIRONMENT = ("NUMBA_CPU_NAME", "NPY_DISABLE_CPU_FEATURES")


def _value(rng, low, high):
    """A double drawn from [low, high), rounded to one decimal half the time.

    Inputs written with one decimal, as measurements often are, reach the ties
    that rounded outputs flip at.
    """
    x = float(rng.uniform(low, high))
    return round(x, 1) if rng.random() < 0.5 else x


def _near(rng, bound, width):
    """A double within width of bound, on either side.

    Drawn at a bound past which upstream raises, it puts cases on both sides,
    where the library must throw exactly where upstream raises (decision 318).
    """
    return _value(rng, bound - width, bound + width)


def _across(rng, p, bounds, width, draw):
    """draw, or with probability p a double within width of one of bounds."""
    if rng.random() < p:
        return _near(rng, float(rng.choice(bounds)), width)
    return draw


def _rh(rng):
    """rh in [0, 100], at each bound now and then, and a tenth of the time
    within 5 % of a bound, past which upstream raises."""
    draw = rng.random()
    if draw < 0.05:
        return float(rng.choice([0.0, 100.0]))
    if draw < 0.15:
        return _near(rng, float(rng.choice([0.0, 100.0])), 5.0)
    return _value(rng, 0.0, 100.0)


def _adaptive_ashrae(rng):
    # The ranges reach past ASHRAE 55's limits (tdb and tr 10-40 °C, v 0-2 m/s,
    # t_running_mean 10-33.5 °C), so NaN positions are compared too, and v goes
    # below 0, which operative_tmp computes on. units comes in either case, as
    # upstream upper-cases it.
    units = str(rng.choice(["SI", "IP", "si", "ip"]))
    if units.upper() == "SI":
        t, trm, v = (5.0, 45.0), (5.0, 38.0), (-0.5, 2.5)
    else:
        t, trm, v = (41.0, 113.0), (41.0, 100.4), (-1.6, 8.2)
    return {
        "tdb": _value(rng, *t),
        "tr": _value(rng, *t),
        "t_running_mean": _value(rng, *trm),
        "v": _value(rng, *v),
        "units": units,
        "limit_inputs": bool(rng.random() < 0.5),
        "round_output": bool(rng.random() < 0.5),
    }


def _adaptive_en(rng):
    # The ranges reach past the model's t_running_mean limits (10-30 °C), so
    # NaN positions are compared too, and v goes below 0, where operative_tmp's
    # ISO square root gives NaN. units comes in either case, as upstream
    # upper-cases it.
    units = str(rng.choice(["SI", "IP", "si", "ip"]))
    if units.upper() == "SI":
        t, trm, v = (5.0, 45.0), (5.0, 35.0), (-0.5, 2.5)
    else:
        t, trm, v = (41.0, 113.0), (41.0, 95.0), (-1.6, 8.2)
    return {
        "tdb": _value(rng, *t),
        "tr": _value(rng, *t),
        "t_running_mean": _value(rng, *trm),
        "v": _value(rng, *v),
        "units": units,
        "limit_inputs": bool(rng.random() < 0.5),
        "round_output": bool(rng.random() < 0.5),
    }


def _ankle_draft(rng):
    # The ranges reach past ASHRAE 55's limits (tdb and tr 10-40 °C, met 1-4
    # met, clo 0-1.5 clo), so NaN positions and every check's warning are
    # compared too, and the hot, humid cases return the cooling effect's
    # warning. With limit_inputs on, vr reaches a little past 0-0.2 m/s on
    # both sides, outside which upstream raises (models/ankle_draft.py:152-155);
    # with it off, vr reaches past 0.2 and 2 m/s and below 0. units comes in
    # either case, as upstream upper-cases it.
    units = str(rng.choice(["SI", "IP", "si", "ip"]))
    limit_inputs = bool(rng.random() < 0.5)
    if units.upper() == "SI":
        t, v_ankle = (5.0, 45.0), (0.0, 0.6)
        vr = (-0.05, 0.25) if limit_inputs else (-0.2, 2.5)
    else:
        t, v_ankle = (41.0, 113.0), (0.0, 2.0)
        vr = (-0.16, 0.82) if limit_inputs else (-0.66, 8.2)
    return {
        "tdb": _value(rng, *t),
        "tr": _value(rng, *t),
        "vr": _value(rng, *vr),
        "rh": _value(rng, 0.0, 100.0),
        "met": _value(rng, 0.7, 4.4),
        "clo": _value(rng, 0.0, 2.0),
        "v_ankle": _value(rng, *v_ankle),
        "units": units,
        "limit_inputs": limit_inputs,
    }


def _at(rng):
    # rh reaches past [0, 100], outside which upstream's dew_point_tmp raises
    # through psy_ta_rh (psychrometrics/dew_point_tmp.py:46-47,
    # psychrometrics/psy_ta_rh.py:78). q is left out half the time, so its
    # None default picks the formula without solar load (models/at.py:71-75).
    inputs = {
        "tdb": _value(rng, -20.0, 50.0),
        "rh": _rh(rng),
        "v": _value(rng, 0.0, 20.0),
    }
    if rng.random() < 0.5:
        inputs["q"] = _value(rng, -100.0, 1000.0)
    inputs["round_output"] = bool(rng.random() < 0.5)
    return inputs


def _clo_tout(rng):
    # tout spans the breakpoints at -5, 5 and 26 °C (23, 41 and 78.8 °F), and
    # units comes in either case, as upstream upper-cases it.
    units = str(rng.choice(["SI", "IP", "si", "ip"]))
    tout = (-15.0, 35.0) if units.upper() == "SI" else (5.0, 95.0)
    return {"tout": _value(rng, *tout), "units": units}


def _cooling_effect(rng):
    # vr reaches the 0.1 m/s still-air cut-off from both sides, and the hot,
    # humid cases where the still-air SET root is not bracketed, which return 0
    # with upstream's warning; units comes in either case, as upstream
    # upper-cases it.
    units = str(rng.choice(["SI", "IP", "si", "ip"]))
    if units.upper() == "SI":
        tdb, tr, vr = (5.0, 50.0), (5.0, 60.0), (0.0, 3.0)
    else:
        tdb, tr, vr = (41.0, 122.0), (41.0, 140.0), (0.0, 9.8)
    return {
        "tdb": _value(rng, *tdb),
        "tr": _value(rng, *tr),
        "vr": _value(rng, vr[0], vr[1] / 10) if rng.random() < 0.2 else _value(rng, *vr),
        "rh": _value(rng, 0.0, 100.0),
        "met": _value(rng, 0.7, 4.0),
        "clo": _value(rng, 0.0, 2.0),
        "wme": _value(rng, 0.0, 1.0) if rng.random() < 0.3 else 0.0,
        "units": units,
    }


def _discomfort_index(rng):
    # rh 100 makes di equal tdb, so a tdb on a category edge puts di on it,
    # where DISCOMFORT_CATEGORIES' right=False picks the upper class
    # (models/discomfort_index.py:11-21, :80). tdb reaches past 99 °C, where the
    # category is NaN.
    if rng.random() < 0.05:
        return {
            "tdb": float(rng.choice([21.0, 24.0, 27.0, 29.0, 32.0, 99.0])),
            "rh": 100.0,
        }
    return {
        "tdb": _value(rng, -20.0, 60.0) if rng.random() < 0.9 else _value(rng, 60.0, 130.0),
        "rh": _value(rng, 0.0, 100.0),
    }


def _esi(rng):
    # rh reaches past [0, 100] and sol_radiation_global below 0 W/m2, outside
    # which ESIInputs raises (classes_input.py:428-434), and each reaches its
    # bound now and then; at 0 W/m2 the (0.1 + sol) ** (-1) term is largest
    # (models/esi.py:62).
    draw = rng.random()
    if draw < 0.05:
        sol_radiation_global = 0.0
    elif draw < 0.1:
        sol_radiation_global = _near(rng, 0.0, 50.0)
    else:
        sol_radiation_global = _value(rng, 0.0, 1400.0)
    return {
        "tdb": _value(rng, -20.0, 50.0),
        "rh": _rh(rng),
        "sol_radiation_global": sol_radiation_global,
        "round_output": bool(rng.random() < 0.5),
    }


def _heat_index_lu(rng):
    # tdb spans [-50, 70] °C, and a tenth of the time reaches 220 °C, past
    # which upstream's root solver finds no interval and raises
    # (models/heat_index_lu.py:345): measured on 4.8.0 in the parity image, at
    # rh 100 between 127 and 128 °C and at rh 50 between 150 and 200 °C, while
    # at rh 10 it still returns at 200 °C. rh stays in [0, 100] and reaches 0 and 100 now
    # and then. Now and then the inputs are deviation heat_index_lu-3's, where
    # upstream raises: tdb -273.16 °C, where the solver reaches its maximum
    # iteration (:358), and rh -1e6 or 1e300.
    draw = rng.random()
    if rng.random() < 0.01:
        tdb = -273.16
    elif rng.random() < 0.1:
        tdb = _value(rng, 70.0, 220.0)
    else:
        tdb = _value(rng, -50.0, 70.0)
    if draw < 0.02:
        rh = float(rng.choice([-1e6, 1e300]))
    elif draw < 0.07:
        rh = float(rng.choice([0.0, 100.0]))
    else:
        rh = _value(rng, 0.0, 100.0)
    return {
        "tdb": tdb,
        "rh": rh,
        "round_output": bool(rng.random() < 0.5),
    }


def _heat_index_rothfusz(rng):
    # tdb reaches below the 27 °C gate, so NaN positions and the tdb warning
    # are compared too.
    return {
        "tdb": _value(rng, 10.0, 50.0),
        "rh": _value(rng, 0.0, 100.0),
        "round_output": bool(rng.random() < 0.5),
        "limit_inputs": bool(rng.random() < 0.5),
    }


def _heat_index_schoen(rng):
    # rh reaches past [0, 100], outside which upstream's dew_point_tmp raises
    # (psychrometrics/dew_point_tmp.py:46-47), and reaches 0 now and then,
    # where the dew point is NaN. tdb reaches 70 °C, where hi passes the
    # 1000 °C edge and the category is NaN.
    return {
        "tdb": _value(rng, -20.0, 70.0),
        "rh": _rh(rng),
        "round_output": bool(rng.random() < 0.5),
    }


def _humidex(rng):
    # rh reaches past [0, 100], outside which upstream raises
    # (models/humidex.py:70-71), and reaches 0 now and then, where the
    # masterson model's dew point is NaN. Both models come in, in the lower
    # case upstream's check compares.
    return {
        "tdb": _value(rng, -20.0, 50.0),
        "rh": _rh(rng),
        "model": str(rng.choice(["rana", "masterson"])),
        "round_output": bool(rng.random() < 0.5),
    }


def _ireq(rng):
    # The ranges reach past ISO 11079's limits (58-400 W/m2 for met, tdb up to
    # 10 °C, vr 0.4-18 m/s, walk_sp from min(0.0052 * (met - 58), 1.2) to
    # 1.2 m/s; models/ireq.py:413-425), so NaN positions are compared too, and
    # clo reaches 0 at mild tdb, where ireq and icl turn negative and are
    # masked (models/ireq.py:172). Each input bounded by IREQInputs' checks
    # (classes_input.py:1361-1374) is drawn a little past its bound now and
    # then, where upstream raises, and tdb is -235 °C, a zero divisor at which
    # the kernel raises ZeroDivisionError (deviation ireq-6).
    return {
        "tdb": -235.0 if rng.random() < 0.01 else _value(rng, -50.0, 20.0),
        "tr": _value(rng, -55.0, 30.0),
        "vr": _across(rng, 0.03, [0.0], 0.5, _value(rng, 0.0, 20.0)),
        "rh": _rh(rng),
        "met": _across(rng, 0.03, [0.0], 0.5, _value(rng, 0.7, 7.7)),
        "clo": _across(
            rng, 0.03, [0.0], 0.5, 0.0 if rng.random() < 0.05 else _value(rng, 0.0, 5.0)
        ),
        "p": _across(rng, 0.03, [0.0], 1.0, _value(rng, 1.0, 100.0)),
        "walk_sp": _across(rng, 0.03, [0.0], 0.5, _value(rng, 0.0, 1.5)),
        "wme": _across(
            rng, 0.03, [0.0], 0.5, _value(rng, 0.0, 1.0) if rng.random() < 0.5 else 0.0
        ),
        "limit_inputs": bool(rng.random() < 0.5),
        "round_output": bool(rng.random() < 0.5),
    }


def _net(rng):
    # Upstream checks no range (models/net.py:62-68, NETInputs at
    # classes_input.py:482-496), so tdb and v reach past the validation
    # table's 25-40 °C and 0.1-4.5 m/s (ts_net.json at validation data v1.1.0).
    return {
        "tdb": _value(rng, -40.0, 60.0),
        "rh": _value(rng, 0.0, 100.0),
        "v": _value(rng, 0.0, 30.0),
        "round_output": bool(rng.random() < 0.5),
    }


def _pet_steady(rng):
    # The ranges reach past everyday conditions, so the cases where fsolve stops
    # short of convergence, and warns, are compared too (decision 281). Now
    # and then the inputs reach decision 283's raises: clo and v come within
    # 0.1 of 0, and p_atm, weight and height are 0 or negative, a zero divisor
    # or a negative base under a fractional power, and height is 0.2, whose
    # y = (height - 0.2) / height is a zero divisor where 0.6 < clo < 2.0
    # (models/pet_steady.py:357-358, :365-366). position and
    # sex come in any case, as the check accepts, and the kernel compares them
    # as given. age, weight and wme are doubles, as a JavaScript number is,
    # where upstream's defaults are ints.
    def raising(values, draw):
        return float(rng.choice(values)) if rng.random() < 0.02 else draw

    return {
        "tdb": _value(rng, -30.0, 50.0),
        "tr": _value(rng, -30.0, 80.0),
        "v": _across(rng, 0.03, [0.0], 0.1, _value(rng, 0.0, 10.0)),
        "rh": _value(rng, 0.0, 100.0),
        "met": _value(rng, 0.7, 4.0),
        "clo": _across(rng, 0.03, [0.0], 0.1, _value(rng, 0.1, 3.0)),
        "p_atm": raising(
            [0.0, -1013.25],
            _value(rng, 600.0, 1100.0) if rng.random() < 0.3 else 1013.25,
        ),
        "position": str(
            rng.choice(
                [
                    "sitting",
                    "standing",
                    "standing, forced convection",
                    "Standing",
                    "SITTING",
                ]
            )
        ),
        "age": _value(rng, 5.0, 90.0) if rng.random() < 0.3 else 23.0,
        "sex": str(rng.choice(["male", "female", "Male", "FEMALE"])),
        "weight": raising(
            [0.0, -75.0], _value(rng, 30.0, 150.0) if rng.random() < 0.3 else 75.0
        ),
        "height": raising(
            [0.0, 0.2, -1.8], _value(rng, 1.2, 2.1) if rng.random() < 0.3 else 1.8
        ),
        "wme": _value(rng, 0.0, 0.3) if rng.random() < 0.3 else 0.0,
    }


def _phs(rng):
    # The ranges reach past ISO 7933's limits (tdb 15-50 °C, tr - tdb 0-60 °C,
    # v 0-3 m/s, p_a 0.5 or 0-4.5 kPa, met 56-250 or 100-450 W/m2, clo 0.1-1
    # clo), so NaN positions and every check's warning are compared too, in
    # either edition. posture is as upstream's own check compares it, in lower
    # case. The keyword arguments are left out half the time, so each edition's
    # defaults run, f_r, t_re and t_cr_eq among them; duration is a whole
    # number of minutes, a tenth of the time with a fraction, which numba's
    # range truncates. A tenth of the time, each keyword argument upstream
    # checks is drawn across its bound, where it raises
    # (models/phs.py:287-310): sweat_rate_watt and evap_load_wm2_min across 0,
    # t_sk_t_cr_wg across 0 or 1, acclimatized across 0 or 100 (which int()
    # truncates first), drink between -0.5 and 1.5, weight across 0 or 1000.
    # i_mst, height and clo stay clear of the zero divisors at which numba's
    # prange drops ZeroDivisionError and upstream returns uninitialised memory
    # (deviation phs-6).
    tdb = _value(rng, 10.0, 55.0)
    case = {
        "tdb": tdb,
        "tr": _value(rng, tdb - 10.0, tdb + 70.0),
        "v": _value(rng, 0.0, 3.5),
        "rh": _value(rng, 0.0, 100.0),
        "met": _value(rng, 0.8, 8.5),
        "clo": _value(rng, 0.06, 1.2),
        "posture": str(rng.choice(["standing", "sitting", "crouching"])),
        "wme": _value(rng, 0.0, 1.0) if rng.random() < 0.3 else 0.0,
        "round_output": bool(rng.random() < 0.5),
        "model": str(rng.choice(["7933-2023", "7933-2004"])),
        "limit_inputs": bool(rng.random() < 0.5),
    }
    duration = float(rng.integers(1, 481))
    if rng.random() < 0.1:
        duration += float(rng.uniform(0.0, 1.0))
    optional = {
        "i_mst": lambda: _value(rng, 0.1, 0.9),
        "a_p": lambda: _value(rng, 0.0, 1.0),
        "drink": lambda: _across(rng, 0.1, [0.5], 1.0, float(rng.choice([0.0, 1.0]))),
        "weight": lambda: _across(rng, 0.1, [0.0, 1000.0], 5.0, _value(rng, 40.0, 130.0)),
        "height": lambda: _value(rng, 1.4, 2.1),
        "walk_sp": lambda: _value(rng, 0.0, 2.0),
        "theta": lambda: _value(rng, 0.0, 180.0),
        "acclimatized": lambda: _across(
            rng, 0.1, [0.0, 100.0], 2.0, float(rng.choice([0.0, 100.0]))
        ),
        "duration": lambda: duration,
        "f_r": lambda: _value(rng, 0.0, 1.0),
        "t_sk": lambda: _value(rng, 30.0, 37.0),
        "t_cr": lambda: _value(rng, 36.0, 39.0),
        "t_re": lambda: _value(rng, 36.0, 39.0),
        "t_cr_eq": lambda: _value(rng, 36.0, 38.0),
        "t_sk_t_cr_wg": lambda: _across(rng, 0.1, [0.0, 1.0], 0.1, _value(rng, 0.1, 0.3)),
        "sweat_rate_watt": lambda: _across(rng, 0.1, [0.0], 30.0, _value(rng, 0.0, 300.0)),
        "evap_load_wm2_min": lambda: _across(
            rng, 0.1, [0.0], 500.0, _value(rng, 0.0, 50000.0)
        ),
    }
    for key, draw in optional.items():
        if rng.random() < 0.5:
            case[key] = draw()
    return case


def _pmv_a(rng):
    # The ranges reach past ISO 7730's limits, which the inner pmv_ppd_iso call
    # checks (tdb 10-30 °C, tr 10-40 °C, vr 0-1 m/s, met 0.8-4 met, clo 0-2
    # clo, pa 0-2700 Pa, pmv -2-2), so NaN positions and every check's warning
    # are compared too. a_coefficient takes either sign. units comes in either
    # case, as upstream upper-cases it.
    units = str(rng.choice(["SI", "IP", "si", "ip"]))
    if units.upper() == "SI":
        tdb, tr, vr = (5.0, 35.0), (5.0, 45.0), (-0.2, 1.3)
    else:
        tdb, tr, vr = (41.0, 95.0), (41.0, 113.0), (-0.66, 4.3)
    return {
        "tdb": _value(rng, *tdb),
        "tr": _value(rng, *tr),
        "vr": _value(rng, *vr),
        "rh": _value(rng, 0.0, 100.0),
        "met": _value(rng, 0.6, 4.4),
        "clo": _value(rng, 0.0, 2.4),
        "a_coefficient": _value(rng, -0.6, 0.6),
        "wme": _value(rng, 0.0, 1.0) if rng.random() < 0.5 else 0.0,
        "units": units,
        "limit_inputs": bool(rng.random() < 0.5),
    }


def _pmv_e(rng):
    # The ranges reach past ISO 7730's limits, which both inner pmv_ppd_iso
    # calls check (tdb 10-30 °C, tr 10-40 °C, vr 0-1 m/s, met 0.8-4 met, clo
    # 0-2 clo, pa 0-2700 Pa, pmv -2-2), so NaN positions and every check's
    # warning are compared too. e_coefficient takes either sign. units comes in
    # either case, as upstream upper-cases it.
    units = str(rng.choice(["SI", "IP", "si", "ip"]))
    if units.upper() == "SI":
        tdb, tr, vr = (5.0, 35.0), (5.0, 45.0), (-0.2, 1.3)
    else:
        tdb, tr, vr = (41.0, 95.0), (41.0, 113.0), (-0.66, 4.3)
    return {
        "tdb": _value(rng, *tdb),
        "tr": _value(rng, *tr),
        "vr": _value(rng, *vr),
        "rh": _value(rng, 0.0, 100.0),
        "met": _value(rng, 0.6, 4.4),
        "clo": _value(rng, 0.0, 2.4),
        "e_coefficient": _value(rng, -1.0, 1.0),
        "wme": _value(rng, 0.0, 1.0) if rng.random() < 0.5 else 0.0,
        "units": units,
        "limit_inputs": bool(rng.random() < 0.5),
    }


def _pmv_athb(rng):
    # pmv_athb checks no range, so the ranges span the kernel's usual inputs
    # and t_running_mean's outdoor climates; vr goes below 0, which the kernel
    # computes on. clo is upstream's False half the time, which computes the
    # adapted clothing (models/pmv_athb.py:98), and a number otherwise.
    return {
        "tdb": _value(rng, 5.0, 40.0),
        "tr": _value(rng, 5.0, 50.0),
        "vr": _value(rng, -0.2, 1.5),
        "rh": _value(rng, 0.0, 100.0),
        "met": _value(rng, 0.7, 4.2),
        "t_running_mean": _value(rng, -10.0, 35.0),
        "clo": False if rng.random() < 0.5 else _value(rng, 0.0, 2.2),
    }


def _pmv_ppd_ashrae(rng):
    # The ranges reach past ASHRAE 55's limits (tdb and tr 10-40 °C, vr 0-2
    # m/s, met 1-4 met, clo 0-1.5 clo), so NaN positions and every check's
    # warning are compared too; vr reaches the 0.1 m/s still-air cut-off from
    # both sides and goes below 0, and the hot, humid cases return the cooling
    # effect's warning. A third of the cases have the met < 1.3 and clo < 0.7
    # that the airspeed_control=False rules need. units comes in either case,
    # as upstream upper-cases it.
    units = str(rng.choice(["SI", "IP", "si", "ip"]))
    if units.upper() == "SI":
        tdb, tr, vr = (5.0, 45.0), (5.0, 50.0), (-0.2, 2.5)
    else:
        tdb, tr, vr = (41.0, 113.0), (41.0, 122.0), (-0.66, 8.2)
    low_activity = rng.random() < 0.3
    return {
        "tdb": _value(rng, *tdb),
        "tr": _value(rng, *tr),
        "vr": _value(rng, vr[0], vr[1] / 5) if rng.random() < 0.3 else _value(rng, *vr),
        "rh": _value(rng, 0.0, 100.0),
        "met": _value(rng, 0.7, 1.3) if low_activity else _value(rng, 0.7, 4.4),
        "clo": _value(rng, 0.0, 0.7) if low_activity else _value(rng, 0.0, 2.0),
        "wme": _value(rng, 0.0, 1.0) if rng.random() < 0.3 else 0.0,
        "model": "55-2023",
        "units": units,
        "limit_inputs": bool(rng.random() < 0.5),
        "airspeed_control": bool(rng.random() < 0.5),
        "round_output": bool(rng.random() < 0.5),
    }


def _pmv_ppd_iso(rng):
    # The ranges reach past ISO 7730's limits (tdb 10-30 °C, tr 10-40 °C,
    # vr 0-1 m/s, met 0.8-4 met, clo 0-2 clo, pa 0-2700 Pa, pmv -2-2), so NaN
    # positions and every check's warning are compared too, and vr goes below
    # 0, which the kernel computes on. units comes in either case, as upstream
    # upper-cases it, and model in either edition.
    units = str(rng.choice(["SI", "IP", "si", "ip"]))
    if units.upper() == "SI":
        tdb, tr, vr = (5.0, 35.0), (5.0, 45.0), (-0.2, 1.3)
    else:
        tdb, tr, vr = (41.0, 95.0), (41.0, 113.0), (-0.66, 4.3)
    return {
        "tdb": _value(rng, *tdb),
        "tr": _value(rng, *tr),
        "vr": _value(rng, *vr),
        "rh": _value(rng, 0.0, 100.0),
        "met": _value(rng, 0.6, 4.4),
        "clo": _value(rng, 0.0, 2.4),
        "wme": _value(rng, 0.0, 1.0) if rng.random() < 0.5 else 0.0,
        "model": str(rng.choice(["7730-2025", "7730-2005"])),
        "units": units,
        "limit_inputs": bool(rng.random() < 0.5),
        "round_output": bool(rng.random() < 0.5),
    }


def _ridge_regression_predict_t_re_t_sk(rng):
    # The ranges reach past the model's limits (age 60-100, height 130-230 cm,
    # weight 40-140 kg, tdb 0-60 °C;
    # models/ridge_regression_predict_t_re_t_sk.py:185-189), so NaN positions
    # are compared too, and now and then cross RidgeRegressionInputs' checks
    # (classes_input.py:846-910), where upstream raises: rh past [0, 100],
    # age, height and weight near 0, and duration -1 or 0. sex comes in either
    # case, as upstream lower-cases it. duration is an int, as upstream
    # requires, otherwise from 2: at 1 a scalar call returns a 0-d array
    # (deviation ridge_regression_predict_t_re_t_sk-7). Half the cases give
    # t_re and t_sk, which skip the baseline simulation.
    inputs = {
        "sex": str(rng.choice(["male", "female", "Male", "FEMALE"])),
        "age": _across(rng, 0.03, [0.0], 5.0, _value(rng, 50.0, 110.0)),
        "height": _across(rng, 0.03, [0.0], 0.5, _value(rng, 1.2, 2.4)),
        "weight": _across(rng, 0.03, [0.0], 10.0, _value(rng, 30.0, 150.0)),
        "tdb": _value(rng, -5.0, 65.0),
        "rh": _rh(rng),
        "duration": int(rng.integers(-1, 1)) if rng.random() < 0.03 else int(rng.integers(2, 61)),
        "limit_inputs": bool(rng.random() < 0.5),
        "round_output": bool(rng.random() < 0.5),
    }
    if rng.random() < 0.5:
        inputs["t_re"] = _value(rng, 35.5, 39.5)
        inputs["t_sk"] = _value(rng, 28.0, 38.0)
    return inputs


def _set_tmp(rng):
    # The ranges reach past ASHRAE 55's limits (tdb and tr 10-40 °C, v 0-2
    # m/s, met 1-4 met, clo 0-1.5 clo), so NaN positions and every check's
    # warning are compared too, and reach the hot, radiant, windy cases where
    # the library's SET once drifted from upstream's by up to 6.4 °C
    # (tdb 42-49 °C, tr 57-66 °C; docs/deviations/set_tmp.md, Notes).
    # position comes in any case, as two_nodes_gagge's check accepts.
    # calculate_ce takes the SET path, which ignores position.
    return {
        "tdb": _value(rng, 5.0, 50.0),
        "tr": _value(rng, 5.0, 67.0),
        "v": _value(rng, -0.1, 4.0),
        "rh": _value(rng, 0.0, 100.0),
        "met": _value(rng, 0.7, 4.5),
        "clo": _value(rng, 0.0, 2.0),
        "wme": _value(rng, 0.0, 0.5) if rng.random() < 0.3 else 0.0,
        "body_surface_area": _value(rng, 1.4, 2.2) if rng.random() < 0.3 else 1.8258,
        "p_atm": _value(rng, 60000.0, 110000.0) if rng.random() < 0.3 else 101325.0,
        "position": str(
            rng.choice(
                [
                    "sitting",
                    "standing",
                    "standing, forced convection",
                    "Sitting",
                    "STANDING",
                ]
            )
        ),
        "limit_inputs": bool(rng.random() < 0.5),
        "round_output": bool(rng.random() < 0.5),
        "calculate_ce": bool(rng.random() < 0.3),
    }


def _solar_gain(rng):
    # sol_altitude and sharp reach past the fp table's 0-90 and 0-180 degrees,
    # so NaN positions and their warnings are compared too, and
    # sol_radiation_dir and asw past ASHRAE 55 Table C-2's 200-1000 W/m2 and
    # 0.2-0.9. posture comes in any case, as upstream lower-cases it.
    posture = str(
        rng.choice(["standing", "sitting", "supine", "Standing", "SITTING", "Supine"])
    )
    return {
        "sol_altitude": _value(rng, -10.0, 100.0),
        "sharp": _value(rng, -10.0, 190.0),
        "sol_radiation_dir": _value(rng, 100.0, 1100.0),
        "sol_transmittance": _value(rng, 0.0, 1.0),
        "f_svv": _value(rng, 0.0, 1.0),
        "f_bes": _value(rng, 0.0, 1.0),
        "asw": _value(rng, 0.1, 1.0),
        "posture": posture,
        "floor_reflectance": _value(rng, 0.0, 1.0),
        "round_output": bool(rng.random() < 0.5),
    }


# Every sport upstream predefines, by its name in Sports, in upstream's order.
_SPORTS = [
    name for name, value in vars(models.Sports).items() if isinstance(value, _SportsValues)
]


def _sports_heat_stress_risk(rng):
    # sport is named by its Sports attribute, since a case's inputs are JSON,
    # and _sports_by_name passes upstream the instance. tdb reaches below the
    # 23 °C under which upstream returns its default thresholds, and tr the
    # cold and hot surroundings where both brentq brackets of a threshold fail,
    # which warns and falls back to its maximum; vr reaches below every
    # sport's minimum, which upstream raises it to. rh reaches past [0, 100]
    # and vr below 0, where upstream raises (classes_input.py:1284-1289).
    tdb = _value(rng, 15.0, 55.0)
    return {
        "tdb": tdb,
        "tr": _value(rng, tdb - 40.0, tdb + 40.0),
        "rh": _rh(rng),
        "vr": _across(rng, 0.05, [0.0], 0.5, _value(rng, 0.0, 4.0)),
        "sport": str(rng.choice(_SPORTS)),
    }


def _thi(rng):
    # rh reaches past [0, 100], outside which THIInputs raises
    # (classes_input.py:931-933), and reaches its bounds now and then; upstream
    # checks no tdb range (models/thi.py:35-39).
    return {
        "tdb": _value(rng, -50.0, 60.0),
        "rh": _rh(rng),
        "round_output": bool(rng.random() < 0.5),
    }


def _two_nodes_gagge(rng):
    # The ranges reach skin wettedness at w_max, shivering and the 0.1 m/s air
    # speed floor; position comes in any case, which upstream's check accepts
    # and its kernel compares as given. w_max is left out half the time, as
    # its default computes it, and is otherwise 0.0, which also computes it, a
    # cap in (0.06, 1], or, a fifth of the time, within 0.05 of 0, 0.06 or 1,
    # where GaggeTwoNodesInputs raises outside 0 and (0.06, 1]
    # (classes_input.py:725-740). calculate_ce takes the SET path, which ignores
    # position, the two maxima, w_max and round_output.
    case = {
        "tdb": _value(rng, 0.0, 50.0),
        "tr": _value(rng, 0.0, 60.0),
        "v": _value(rng, 0.0, 4.0),
        "rh": _value(rng, 0.0, 100.0),
        "met": _value(rng, 0.7, 4.0),
        "clo": _value(rng, 0.0, 2.5),
        "wme": _value(rng, 0.0, 1.0) if rng.random() < 0.3 else 0.0,
        "body_surface_area": _value(rng, 1.4, 2.2) if rng.random() < 0.3 else 1.8258,
        "p_atm": _value(rng, 60000.0, 110000.0) if rng.random() < 0.3 else 101325.0,
        "position": str(
            rng.choice(
                [
                    "sitting",
                    "standing",
                    "standing, forced convection",
                    "Sitting",
                    "STANDING",
                ]
            )
        ),
        "max_skin_blood_flow": _value(rng, 30.0, 150.0),
        "round_output": bool(rng.random() < 0.5),
        "max_sweating": _value(rng, 100.0, 800.0),
        "calculate_ce": bool(rng.random() < 0.2),
    }
    if rng.random() < 0.5:
        draw = rng.random()
        if draw < 0.2:
            case["w_max"] = 0.0
        elif draw < 0.4:
            case["w_max"] = _near(rng, float(rng.choice([0.0, 0.06, 1.0])), 0.05)
        else:
            case["w_max"] = _value(rng, 0.07, 1.0)
    return case


def _two_nodes_gagge_ji(rng):
    # The model checks no range, so the draws cover its branches: v below and
    # above 0.2 m/s (free and forced convection) and the 0.1 m/s floor, clo
    # below and above 0.5 and 0 (naked skin), a vapor_pressure past
    # saturation (e_max < 0), shivering and both acclimatized paths. position
    # comes in any case, as choice_field accepts it, and the kernel compares
    # it as given. length_time_simulation is a float, which upstream ceils
    # (models/two_nodes_gagge_ji.py:190), down to 0 or below, which gives
    # empty series. Every other keyword argument is left out a third of the
    # time, for its default. Now and then the inputs are those at which the
    # register measured upstream's raises: body_weight or p_atm 0, a zero
    # divisor (deviation two_nodes_gagge_ji-4), and tdb 1e5, met 1e6 or
    # initial_skin_temp 1000, where the clothing-temperature loop raises
    # StopIteration (deviation two_nodes_gagge_ji-5).
    case = {
        "tdb": 1e5 if rng.random() < 0.01 else _value(rng, 0.0, 50.0),
        "tr": _value(rng, 0.0, 60.0),
        "v": _value(rng, 0.0, 3.0),
        "met": 1e6 if rng.random() < 0.01 else _value(rng, 0.7, 4.0),
        "clo": _value(rng, 0.0, 2.0) if rng.random() < 0.9 else 0.0,
        "vapor_pressure": _value(rng, 0.0, 70.0),
        "position": str(
            rng.choice(
                [
                    "sitting",
                    "standing",
                    "standing, forced convection",
                    "Sitting",
                    "STANDING",
                ]
            )
        ),
        "length_time_simulation": _value(rng, -2.0, 60.0),
    }
    optional = {
        "wme": lambda: _value(rng, 0.0, 1.0),
        "body_surface_area": lambda: _value(rng, 1.4, 2.2),
        "p_atm": lambda: 0.0 if rng.random() < 0.03 else _value(rng, 60000.0, 110000.0),
        "body_weight": lambda: 0.0 if rng.random() < 0.03 else _value(rng, 40.0, 120.0),
        "initial_skin_temp": lambda: 1000.0 if rng.random() < 0.03 else _value(rng, 30.0, 38.0),
        "initial_core_temp": lambda: _value(rng, 35.5, 38.5),
        "acclimatized": lambda: bool(rng.random() < 0.5),
    }
    for key, draw in optional.items():
        if rng.random() < 2 / 3:
            case[key] = draw()
    return case


def _two_nodes_gagge_sleep(rng):
    # The draws cover the model's branches: the 0.1 m/s floor on v, clo at or
    # below 0 (naked skin) and above, the wettedness cap (hot, humid nights),
    # shivering (cold nights) and ltime above 1, which repeats the
    # clothing-temperature loop. The six series are scalars a third of the
    # time, which upstream returns as scalars, and otherwise lists of 1 to 20
    # minutes, mixed with scalars where the length is 1 (decision 276). Every
    # keyword argument is left out a third of the time, for its default. Now
    # and then upstream raises: thickness_quilt comes within 0.5 cm of 0
    # (classes_input.py:801-802), ltime is -1 or 0
    # (models/two_nodes_gagge_sleep.py:86-88), and tdb equals
    # temp_skin_neutral at the first minute, where chc is 0 and the kernel
    # raises ZeroDivisionError (deviation two_nodes_gagge_sleep-4).
    hot = rng.random() < 0.3
    duration = 1 if rng.random() < 1 / 3 else int(rng.integers(1, 21))
    scalar = duration == 1 and rng.random() < 0.5
    draws = {
        "tdb": (24.0, 38.0) if hot else (5.0, 30.0),
        "tr": (24.0, 40.0) if hot else (5.0, 32.0),
        "v": (0.0, 0.5),
        "rh": (60.0, 100.0) if hot else (10.0, 100.0),
        "clo": (0.0, 3.0),
        "thickness_quilt": (0.0, 5.0),
    }
    optional = {
        "wme": lambda: _value(rng, 0.0, 0.3),
        "p_atm": lambda: _value(rng, 60000.0, 110000.0),
        "ltime": lambda: int(rng.integers(-1, 1)) if rng.random() < 0.1 else int(rng.integers(1, 6)),
        "height": lambda: _value(rng, 140.0, 200.0),
        "weight": lambda: _value(rng, 40.0, 120.0),
        "c_sw": lambda: _value(rng, 100.0, 250.0),
        "c_dil": lambda: _value(rng, 50.0, 200.0),
        "c_str": lambda: _value(rng, 0.1, 1.0),
        "temp_skin_neutral": lambda: _value(rng, 32.0, 35.0),
        "e_skin": lambda: _value(rng, 0.0, 50.0),
        "alfa": lambda: _value(rng, 0.05, 0.3),
        "skin_blood_flow": lambda: _value(rng, 1.0, 20.0),
        "met_shivering": lambda: _value(rng, 0.0, 50.0),
    }
    case = {}
    for key in optional:
        if rng.random() < 2 / 3:
            case[key] = optional[key]()
    series = {}
    for key, (low, high) in draws.items():
        values = [_value(rng, low, high) for _ in range(duration)]
        if key == "clo" and rng.random() < 0.1:
            values = [0.0] * duration
        if key == "thickness_quilt" and rng.random() < 0.1:
            values = [_near(rng, 0.0, 0.5) for _ in range(duration)]
        if key == "tdb" and rng.random() < 0.05:
            values[0] = case.get("temp_skin_neutral", 33.7)
        one = scalar or (duration == 1 and rng.random() < 0.5)
        series[key] = values[0] if one else values
    return {**series, **case}


def _use_fans_heatwaves(rng):
    # The ranges reach past the limits (tdb and tr 20-50 °C, v 0.1-4.5 m/s,
    # rh 0-100 %, met 0.7-2 met, clo 0-1 clo), so NaN positions and every
    # check's warning are compared too, and reach the heat strain each maximum
    # gives: skin blood flow, skin wettedness and regulatory sweating. position
    # comes in any case, as two_nodes_gagge's check accepts.
    return {
        "tdb": _value(rng, 15.0, 55.0),
        "tr": _value(rng, 15.0, 60.0),
        "v": _value(rng, 0.0, 5.0),
        "rh": _value(rng, -5.0, 105.0),
        "met": _value(rng, 0.5, 2.5),
        "clo": _value(rng, 0.0, 1.3),
        "wme": _value(rng, 0.0, 0.5) if rng.random() < 0.3 else 0.0,
        "body_surface_area": _value(rng, 1.4, 2.2) if rng.random() < 0.3 else 1.8258,
        "p_atm": _value(rng, 60000.0, 110000.0) if rng.random() < 0.3 else 101325.0,
        "position": str(
            rng.choice(
                [
                    "sitting",
                    "standing",
                    "standing, forced convection",
                    "Sitting",
                    "STANDING",
                ]
            )
        ),
        "max_skin_blood_flow": _value(rng, 30.0, 150.0) if rng.random() < 0.5 else 80.0,
        "max_sweating": _value(rng, 50.0, 800.0) if rng.random() < 0.5 else 500.0,
        "limit_inputs": bool(rng.random() < 0.5),
        "round_output": bool(rng.random() < 0.5),
    }


def _utci(rng):
    # The ranges reach past the limits (tdb -50-50 °C, tr - tdb -30-70 °C,
    # v 0.5-17 m/s, rh 0-100 %, pa 0-5 kPa), so NaN positions and every
    # check's warning are compared too, and units comes in either case, as
    # upstream upper-cases it.
    units = str(rng.choice(["SI", "IP", "si", "ip"]))
    if units.upper() == "SI":
        tdb, delta, v = (-60.0, 60.0), (-40.0, 80.0), (0.0, 20.0)
    else:
        tdb, delta, v = (-76.0, 140.0), (-72.0, 144.0), (0.0, 65.6)
    t = _value(rng, *tdb)
    return {
        "tdb": t,
        "tr": _value(rng, t + delta[0], t + delta[1]),
        "v": _value(rng, *v),
        "rh": _value(rng, -5.0, 105.0),
        "units": units,
        "limit_inputs": bool(rng.random() < 0.5),
        "round_output": bool(rng.random() < 0.5),
    }


def _vertical_tmp_grad_ppd(rng):
    # The ranges reach past ASHRAE 55's limits (tdb and tr 10-40 °C, vr 0-0.2
    # m/s as v_limited, met 1-4 met, clo 0-1.5 clo), so NaN positions and
    # every check's warning are compared too, and the hot, humid cases return
    # the cooling effect's warning. vr goes below 0 and past 0.2 m/s with
    # either gate, more often with it off, and vertical_tmp_grad reaches the
    # gradients whose ppd_vg the 34.5 % baseline clamps to 0
    # (models/vertical_tmp_grad_ppd.py:126-128).
    limit_inputs = bool(rng.random() < 0.5)
    return {
        "tdb": _value(rng, 5.0, 45.0),
        "tr": _value(rng, 5.0, 45.0),
        "vr": _value(rng, -0.05, 0.3) if limit_inputs else _value(rng, -0.2, 2.5),
        "rh": _value(rng, 0.0, 100.0),
        "met": _value(rng, 0.7, 4.4),
        "clo": _value(rng, 0.0, 2.0),
        "vertical_tmp_grad": _value(rng, -2.0, 12.0),
        "round_output": bool(rng.random() < 0.5),
        "limit_inputs": limit_inputs,
    }


def _wbgt(rng):
    # Upstream checks no range (models/wbgt.py:70-76, WBGTInputs at
    # classes_input.py:1021-1037), so twb, tg and tdb reach past the
    # validation table's 0-25 °C, 0-55 °C and 0-20 °C (ts_wbgt.json at
    # validation data v1.1.0). tdb is left out half the time; half of the tdb
    # cases leave with_solar_load False, where tdb is ignored (:85-88), and a
    # fifth of the others set it True without a tdb, where upstream raises
    # (models/wbgt.py:82-83).
    inputs = {
        "twb": _value(rng, -30.0, 45.0),
        "tg": _value(rng, -30.0, 90.0),
    }
    if rng.random() < 0.5:
        inputs["tdb"] = _value(rng, -30.0, 60.0)
        inputs["with_solar_load"] = bool(rng.random() < 0.5)
    elif rng.random() < 0.2:
        inputs["with_solar_load"] = True
    inputs["round_output"] = bool(rng.random() < 0.5)
    return inputs


def _wci(rng):
    # v reaches past 25 m/s (90 km/h), where the index peaks and then
    # declines (models/wci.py:25-26), and tdb past 33 °C, where its
    # (33 - tdb) turns it negative (models/wci.py:68).
    return {
        "tdb": _value(rng, -50.0, 40.0),
        "v": _value(rng, 0.0, 40.0),
        "round_output": bool(rng.random() < 0.5),
    }


def _wind_chill_temperature(rng):
    # Upstream checks no range (models/wind_chill_temperature.py:49-62), so
    # tdb and v reach past the validation table's -40 to 0 °C and 0.1 to
    # 60 km/h (ts_wind_chill_temperature.json at validation data v1.1.0).
    return {
        "tdb": _value(rng, -50.0, 20.0),
        "v": _value(rng, 0.0, 120.0),
        "round_output": bool(rng.random() < 0.5),
    }


def _work_capacity_dunne(rng):
    # wbgt reaches below 25 °C, where capacity is 100, and past 33 °C, where
    # every intensity's capacity clips to 0, and stays mostly between, where
    # it is computed (models/work_capacity_dunne.py:58, :66). work_intensity
    # comes in either case, as upstream lower-cases it (:55).
    return {
        "wbgt": _value(rng, 23.0, 35.0),
        "work_intensity": str(
            rng.choice(["heavy", "moderate", "light", "HEAVY", "Moderate", "LIGHT"])
        ),
    }


def _work_capacity_hothaps(rng):
    # wbgt reaches below 0 °C, where (wbgt / divisor) ** exponent is NaN, and
    # past 50 °C, where every intensity's capacity nears its 10 % floor, and
    # stays mostly between, where the sigmoid falls
    # (models/work_capacity_hothaps.py:83). work_intensity comes in either
    # case, as upstream lower-cases it (:73).
    return {
        "wbgt": _value(rng, -2.0, 55.0),
        "work_intensity": str(
            rng.choice(["heavy", "moderate", "light", "HEAVY", "Moderate", "LIGHT"])
        ),
    }


def _work_capacity_iso(rng):
    # met is mostly 100-600 W, and reaches a little past
    # WorkCapacityStandardsInputs' 0-2500 W on both sides, outside which it
    # raises (classes_input.py:1098-1099); it is the resting 117 W one case in
    # twenty, where the limits coincide and the division is by zero
    # (models/work_capacity_iso.py:51-55). wbgt reaches past each met's two
    # limits, where capacity clips to 0 or 100 (:56).
    if rng.random() < 0.05:
        met = 117.0
    elif rng.random() < 0.5:
        met = _value(rng, 100.0, 600.0)
    else:
        met = _value(rng, -100.0, 2600.0)
    return {"wbgt": _value(rng, 0.0, 45.0), "met": met}


def _work_capacity_niosh(rng):
    # met is mostly 100-600 W, and reaches a little past
    # WorkCapacityStandardsInputs' 0-2500 W on both sides, outside which it
    # raises (classes_input.py:1098-1099); it is the resting 117 W one case in
    # twenty, where the limits coincide and the division is by zero, and 0 W
    # one case in twenty, where np.log10 gives -inf
    # (models/work_capacity_niosh.py:51-55). wbgt, up to 45 °C, reaches
    # past both limits for met above 10.4 W, where 56.7 - 11.5 * log10(met)
    # (:53) falls below 45 °C, and capacity clips to 0 or 100 there (:56).
    draw = rng.random()
    if draw < 0.05:
        met = 117.0
    elif draw < 0.1:
        met = 0.0
    elif rng.random() < 0.5:
        met = _value(rng, 100.0, 600.0)
    else:
        met = _value(rng, -100.0, 2600.0)
    return {"wbgt": _value(rng, 0.0, 45.0), "met": met}


# The exception a model's call with limit_inputs True raises after its
# warnings: ankle_draft's where vr is outside 0-0.2 m/s
# (models/ankle_draft.py:152-155). Any other raise stops the generator.
GATED_RAISES = {"ankle_draft": ValueError}

# The exception classes upstream raises past the bounds each model's generator
# crosses (decision 318). A case that raises one records its class and message
# as raises, in place of outputs and warnings, and the run prints each model's
# messages for review, since a generator's mistake of a listed class reads as
# a raise; any other class stops the generator. pet_steady's are decision
# 283's: a zero divisor, a complex value compared, and minpack's error on a
# complex residual.
RAISES = {
    "ankle_draft": (ValueError,),
    "at": (ValueError,),
    "esi": (ValueError,),
    "heat_index_lu": (ValueError,),
    "heat_index_schoen": (ValueError,),
    "humidex": (ValueError,),
    "ireq": (ValueError, ZeroDivisionError),
    "pet_steady": (ZeroDivisionError, TypeError, minpack_error),
    "phs": (ValueError,),
    "ridge_regression_predict_t_re_t_sk": (ValueError,),
    "sports_heat_stress_risk": (ValueError,),
    "thi": (ValueError,),
    "two_nodes_gagge": (ValueError,),
    "two_nodes_gagge_ji": (ZeroDivisionError, StopIteration),
    "two_nodes_gagge_sleep": (ValueError, ZeroDivisionError),
    "wbgt": (ValueError,),
    "work_capacity_iso": (ValueError,),
    "work_capacity_niosh": (ValueError,),
}

# A model whose inner public-model call takes an input that the gate changes:
# its gate-off case records, as gated_warnings, the warnings each inner call
# emits under the gate on the inputs it takes with the gate off. pmv_e adjusts
# met by the first pmv_ppd_iso call's pmv (models/pmv_e.py:134), which the gate
# masks to NaN, so the same call with the gate on checks an unadjusted met.
GATED_INNER = {"pmv_e": ("pythermalcomfort.models.pmv_e", "pmv_ppd_iso")}

# The models whose np.vectorize kernel numpy runs once more, on the first
# element, to find otypes, before the run whose result upstream returns
# (decisions 208, 285). A case records how many of its warnings that first run
# emitted, as otypes_warnings, since the library runs the kernel once.
OTYPES_PASS = {
    "pet_steady": ("pythermalcomfort.models.pet_steady", "_pet_steady_vectorised")
}


def _sports_by_name(**inputs):
    """sports_heat_stress_risk with sport given by its name in Sports."""
    return models.sports_heat_stress_risk(
        **{**inputs, "sport": getattr(models.Sports, inputs["sport"])}
    )


# Each model: upstream's function and the generator of one case's keyword
# arguments. A model joins the suite when its ticket migrates it.
MODELS = {
    "adaptive_ashrae": (models.adaptive_ashrae, _adaptive_ashrae),
    "adaptive_en": (models.adaptive_en, _adaptive_en),
    "ankle_draft": (models.ankle_draft, _ankle_draft),
    "at": (models.at, _at),
    "clo_tout": (models.clo_tout, _clo_tout),
    "cooling_effect": (models.cooling_effect, _cooling_effect),
    "discomfort_index": (models.discomfort_index, _discomfort_index),
    "esi": (models.esi, _esi),
    "heat_index_lu": (models.heat_index_lu, _heat_index_lu),
    "heat_index_rothfusz": (models.heat_index_rothfusz, _heat_index_rothfusz),
    "heat_index_schoen": (models.heat_index_schoen, _heat_index_schoen),
    "humidex": (models.humidex, _humidex),
    "ireq": (models.ireq, _ireq),
    "net": (models.net, _net),
    "pet_steady": (models.pet_steady, _pet_steady),
    "phs": (models.phs, _phs),
    "pmv_a": (models.pmv_a, _pmv_a),
    "pmv_athb": (models.pmv_athb, _pmv_athb),
    "pmv_e": (models.pmv_e, _pmv_e),
    "pmv_ppd_ashrae": (models.pmv_ppd_ashrae, _pmv_ppd_ashrae),
    "pmv_ppd_iso": (models.pmv_ppd_iso, _pmv_ppd_iso),
    "ridge_regression_predict_t_re_t_sk": (
        models.ridge_regression_predict_t_re_t_sk,
        _ridge_regression_predict_t_re_t_sk,
    ),
    "set_tmp": (models.set_tmp, _set_tmp),
    "solar_gain": (models.solar_gain, _solar_gain),
    "sports_heat_stress_risk": (_sports_by_name, _sports_heat_stress_risk),
    "thi": (models.thi, _thi),
    "two_nodes_gagge": (models.two_nodes_gagge, _two_nodes_gagge),
    "two_nodes_gagge_ji": (models.two_nodes_gagge_ji, _two_nodes_gagge_ji),
    "two_nodes_gagge_sleep": (models.two_nodes_gagge_sleep, _two_nodes_gagge_sleep),
    "use_fans_heatwaves": (models.use_fans_heatwaves, _use_fans_heatwaves),
    "utci": (models.utci, _utci),
    "vertical_tmp_grad_ppd": (models.vertical_tmp_grad_ppd, _vertical_tmp_grad_ppd),
    "wbgt": (models.wbgt, _wbgt),
    "wci": (models.wci, _wci),
    "wind_chill_temperature": (models.wind_chill_temperature, _wind_chill_temperature),
    "work_capacity_dunne": (models.work_capacity_dunne, _work_capacity_dunne),
    "work_capacity_hothaps": (models.work_capacity_hothaps, _work_capacity_hothaps),
    "work_capacity_iso": (models.work_capacity_iso, _work_capacity_iso),
    "work_capacity_niosh": (models.work_capacity_niosh, _work_capacity_niosh),
}


# The inputs upstream types as int (classes_input.py:60), which a JavaScript
# number holds exactly (deviation _shared-80).
INTEGER_INPUTS = {
    "ridge_regression_predict_t_re_t_sk": {"duration"},
    "two_nodes_gagge_sleep": {"ltime"},
}

# The time-series inputs, a double or a list of doubles (decision 277).
SERIES_INPUTS = {
    "two_nodes_gagge_sleep": {"tdb", "tr", "v", "rh", "clo", "thickness_quilt"},
}


def _check_inputs(model, inputs):
    """Numeric inputs are doubles only (ADR 0027), as a JavaScript number is,
    or ints where upstream requires one, or lists of doubles for a time
    series."""
    for key, value in inputs.items():
        if key in SERIES_INPUTS.get(model, ()) and type(value) is list:
            if all(type(item) is float for item in value):
                continue
            raise TypeError(f"{model}: input {key} holds a value that is not a float")
        allowed = (int,) if key in INTEGER_INPUTS.get(model, ()) else (float, bool, str)
        if type(value) not in allowed:
            raise TypeError(f"{model}: input {key} is {type(value).__name__}")


def _encode(model, name, value):
    """A JSON value for one output, or a list for a time series (decision 269);
    a non-finite float is tagged."""
    array = np.asarray(value)
    if array.ndim == 1:
        return [_encode(model, name, item) for item in array]
    if array.ndim != 0:
        raise TypeError(f"{model}: output {name} is neither a scalar nor a series")
    item = array.item()
    # An object array holds a numpy scalar, such as pmv_ppd_ashrae's compliance.
    if isinstance(item, np.generic):
        item = item.item()
    if isinstance(item, float) and not math.isfinite(item):
        return {"float": "nan" if math.isnan(item) else ("inf" if item > 0 else "-inf")}
    if item is not None and not isinstance(item, (bool, int, float, str)):
        raise TypeError(f"{model}: output {name} is {type(item).__name__}")
    return item


def _call(function, inputs, expected=()):
    """Upstream's result for one call and every warning it emitted.

    Where the call raises one of the `expected` exceptions, the result is None
    and the warnings are those emitted before the raise.
    """
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        try:
            result = function(**inputs)
        except expected:
            result = None
    return result, [
        {"category": w.category.__name__, "message": str(w.message)} for w in caught
    ]


def _run(model, function, inputs):
    """Upstream's outputs and every warning it emitted for one case.

    A case with limit_inputs False also records the warnings of the same call
    with limit_inputs True: upstream checks the ranges only under the gate, and
    the library returns those range rows whatever limit_inputs is (ADR 0024).
    For a model in GATED_INNER, they are its inner calls' warnings instead.
    For a model in OTYPES_PASS, the case records how many of its warnings come
    from numpy's otypes run, which come first. A case that raises one of the
    model's RAISES records the exception instead.
    """
    otypes = []
    patch = contextlib.nullcontext()
    if model in OTYPES_PASS:
        path, name = OTYPES_PASS[model]
        kernel = getattr(importlib.import_module(path), name)
        patch = mock.patch.object(kernel, "pyfunc", _counted(kernel.pyfunc, otypes))
    try:
        with patch:
            result, emitted = _call(function, inputs)
    except RAISES.get(model, ()) as error:
        return {
            "inputs": inputs,
            "raises": {"type": type(error).__name__, "message": str(error)},
        }
    case = {
        "inputs": inputs,
        "outputs": {
            field.name: _encode(model, field.name, getattr(result, field.name))
            for field in dataclasses.fields(result)
        },
        "warnings": emitted,
    }
    if model in OTYPES_PASS:
        case["otypes_warnings"] = otypes[0]
    if inputs.get("limit_inputs") is False:
        if model in GATED_INNER:
            path, name = GATED_INNER[model]
            module = importlib.import_module(path)
            with mock.patch.object(module, name, _gated(getattr(module, name))):
                case["gated_warnings"] = _call(function, inputs)[1]
        else:
            case["gated_warnings"] = _call(
                function, {**inputs, "limit_inputs": True}, GATED_RAISES.get(model, ())
            )[1]
    return case


def _counted(pyfunc, otypes):
    """`pyfunc`, appending to `otypes` the number of warnings its first run,
    numpy's otypes run, emits, and passing those warnings on in order."""

    def counted(*args, **kwargs):
        if otypes:
            return pyfunc(*args, **kwargs)
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            result = pyfunc(*args, **kwargs)
        otypes.append(len(caught))
        for w in caught:
            warnings.warn_explicit(w.message, w.category, w.filename, w.lineno)
        return result

    return counted


def _gated(inner):
    """`inner` run again with limit_inputs True first, for its warnings only."""

    def gated(**kwargs):
        inner(**{**kwargs, "limit_inputs": True})
        return inner(**kwargs)

    return gated


def _pins():
    """The pinned Python version and every locked package version."""
    dockerfile = (HERE / "Dockerfile").read_text()
    python = re.search(r"^FROM python:(\d+\.\d+\.\d+)-", dockerfile, re.M).group(1)
    requirements = (HERE / "requirements.txt").read_text()
    packages = {
        name.lower(): version
        for name, version in re.findall(r"^([A-Za-z0-9._-]+)==(\S+)", requirements, re.M)
    }
    return python, packages


def _header():
    """Where and with what the data are made; fails off the pinned platform."""
    python, pins = _pins()
    packages = {name: importlib.metadata.version(name) for name in sorted(pins)}
    header = {
        "machine": platform.machine(),
        "python": platform.python_version(),
        "packages": packages,
        "environment": {name: os.environ.get(name) for name in ENVIRONMENT},
        # The simd_extensions entry of np.show_runtime(), built as it builds it;
        # its other entries name the host and the build.
        "numpy_runtime": {
            "baseline": list(__cpu_baseline__),
            "found": [f for f in __cpu_dispatch__ if __cpu_features__[f]],
            "not_found": [f for f in __cpu_dispatch__ if not __cpu_features__[f]],
        },
        "seed": SEED,
    }
    failures = []
    if header["machine"] != MACHINE:
        failures.append(f"machine is {header['machine']}, expected {MACHINE}")
    if header["python"] != python:
        failures.append(f"python is {header['python']}, expected {python}")
    failures += [
        f"{name} is {packages[name]}, expected {version}"
        for name, version in pins.items()
        if packages[name] != version
    ]
    failures += [f"{name} is not set" for name in ENVIRONMENT if os.environ.get(name) is None]
    if os.environ.get("NUMBA_CPU_NAME") != "generic":
        failures.append("NUMBA_CPU_NAME is not generic")
    # NPY_DISABLE_CPU_FEATURES must name every dispatch target numpy has.
    if header["numpy_runtime"]["found"]:
        failures.append(f"numpy dispatches to {header['numpy_runtime']['found']}")
    if failures:
        sys.exit("not the pinned environment: " + "; ".join(failures))
    return header


def _write(path, model, header, cases):
    """One case per line, so a regenerated file diffs case by case."""
    lines = [
        "{",
        f'  "model": {json.dumps(model)},',
        '  "header": ' + json.dumps(header, indent=2).replace("\n", "\n  ") + ",",
        '  "cases": [',
        ",\n".join(
            "    " + json.dumps(case, ensure_ascii=False, allow_nan=False) for case in cases
        ),
        "  ]",
        "}",
        "",
    ]
    path.write_text("\n".join(lines), encoding="utf-8", newline="\n")


def main():
    out_dir = Path(sys.argv[1])
    names = sys.argv[2:] or sorted(MODELS)
    header = _header()
    out_dir.mkdir(parents=True, exist_ok=True)
    for model in names:
        function, generate = MODELS[model]
        rng = np.random.default_rng([SEED, *model.encode()])
        cases = []
        for _ in range(N_CASES):
            inputs = generate(rng)
            _check_inputs(model, inputs)
            cases.append(_run(model, function, inputs))
        _write(out_dir / f"{model}.json", model, header, cases)
        raising = [case["raises"] for case in cases if "raises" in case]
        print(f"{model}: {len(cases)} cases, {len(raising)} raising")
        for raises in sorted({(r["type"], r["message"]) for r in raising}):
            print("  raises %s: %s" % raises)


if __name__ == "__main__":
    main()
