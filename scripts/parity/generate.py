"""Generate the parity suite's data: pinned pythermalcomfort on seeded inputs.

Run it only in the image scripts/parity/Dockerfile builds, on x86_64 (README.md):

    python -I scripts/parity/generate.py OUT_DIR [MODEL ...]

For each model it writes OUT_DIR/<model>.json: a header recording where and
with what the data were made, then one line per case with upstream's keyword
arguments, its outputs and the warnings it emitted. tests/parity/harness.ts
compares the library with these files (ADR 0020).
"""

import dataclasses
import importlib.metadata
import json
import math
import os
import platform
import re
import sys
import warnings
from pathlib import Path

import numpy as np
from numpy._core._multiarray_umath import (
    __cpu_baseline__,
    __cpu_dispatch__,
    __cpu_features__,
)

import pythermalcomfort.models as models

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


def _clo_tout(rng):
    # tout spans the breakpoints at -5, 5 and 26 °C (23, 41 and 78.8 °F), and
    # units comes in either case, as upstream upper-cases it.
    units = str(rng.choice(["SI", "IP", "si", "ip"]))
    tout = (-15.0, 35.0) if units.upper() == "SI" else (5.0, 95.0)
    return {"tout": _value(rng, *tout), "units": units}


def _heat_index_rothfusz(rng):
    # tdb reaches below the 27 °C gate, so NaN positions and the tdb warning
    # are compared too.
    return {
        "tdb": _value(rng, 10.0, 50.0),
        "rh": _value(rng, 0.0, 100.0),
        "round_output": bool(rng.random() < 0.5),
        "limit_inputs": bool(rng.random() < 0.5),
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


def _two_nodes_gagge(rng):
    # The ranges reach skin wettedness at w_max, shivering and the 0.1 m/s air
    # speed floor; position comes in any case, which upstream's check accepts
    # and its kernel compares as given. w_max is left out half the time, as
    # its default computes it, and is otherwise 0.0, which also computes it,
    # or a cap in (0.06, 1]. calculate_ce takes the SET path, which ignores
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
        case["w_max"] = 0.0 if rng.random() < 0.2 else _value(rng, 0.07, 1.0)
    return case


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


# Each model: upstream's function and the generator of one case's keyword
# arguments. A model joins the suite when its ticket migrates it.
MODELS = {
    "adaptive_ashrae": (models.adaptive_ashrae, _adaptive_ashrae),
    "clo_tout": (models.clo_tout, _clo_tout),
    "heat_index_rothfusz": (models.heat_index_rothfusz, _heat_index_rothfusz),
    "pmv_ppd_iso": (models.pmv_ppd_iso, _pmv_ppd_iso),
    "solar_gain": (models.solar_gain, _solar_gain),
    "two_nodes_gagge": (models.two_nodes_gagge, _two_nodes_gagge),
    "utci": (models.utci, _utci),
}


def _check_inputs(model, inputs):
    """Numeric inputs are doubles only (ADR 0027), as a JavaScript number is."""
    for key, value in inputs.items():
        if type(value) not in (float, bool, str):
            raise TypeError(f"{model}: input {key} is {type(value).__name__}")


def _encode(model, name, value):
    """A JSON value for one output; a non-finite float is tagged."""
    array = np.asarray(value)
    if array.ndim != 0:
        raise TypeError(f"{model}: output {name} is not a scalar")
    item = array.item()
    if isinstance(item, float) and not math.isfinite(item):
        return {"float": "nan" if math.isnan(item) else ("inf" if item > 0 else "-inf")}
    if item is not None and not isinstance(item, (bool, int, float, str)):
        raise TypeError(f"{model}: output {name} is {type(item).__name__}")
    return item


def _call(function, inputs):
    """Upstream's result for one call and every warning it emitted."""
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        result = function(**inputs)
    return result, [
        {"category": w.category.__name__, "message": str(w.message)} for w in caught
    ]


def _run(model, function, inputs):
    """Upstream's outputs and every warning it emitted for one case.

    A case with limit_inputs False also records the warnings of the same call
    with limit_inputs True: upstream checks the ranges only under the gate, and
    the library returns those range rows whatever limit_inputs is (ADR 0024).
    """
    result, emitted = _call(function, inputs)
    case = {
        "inputs": inputs,
        "outputs": {
            field.name: _encode(model, field.name, getattr(result, field.name))
            for field in dataclasses.fields(result)
        },
        "warnings": emitted,
    }
    if inputs.get("limit_inputs") is False:
        case["gated_warnings"] = _call(function, {**inputs, "limit_inputs": True})[1]
    return case


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
        print(f"{model}: {len(cases)} cases")


if __name__ == "__main__":
    main()
