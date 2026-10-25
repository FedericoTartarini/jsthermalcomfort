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
    # t_running_mean 10-33.5 °C), so NaN positions are compared too.
    units = str(rng.choice(["SI", "IP"]))
    if units == "SI":
        t, trm, v = (5.0, 45.0), (5.0, 38.0), (0.0, 2.5)
    else:
        t, trm, v = (41.0, 113.0), (41.0, 100.4), (0.0, 8.2)
    return {
        "tdb": _value(rng, *t),
        "tr": _value(rng, *t),
        "t_running_mean": _value(rng, *trm),
        "v": _value(rng, *v),
        "units": units,
        "limit_inputs": bool(rng.random() < 0.5),
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


# Each model: upstream's function and the generator of one case's keyword
# arguments. A model joins the suite when its ticket migrates it.
MODELS = {
    "adaptive_ashrae": (models.adaptive_ashrae, _adaptive_ashrae),
    "heat_index_rothfusz": (models.heat_index_rothfusz, _heat_index_rothfusz),
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
