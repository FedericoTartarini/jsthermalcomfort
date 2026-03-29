"""
Generate snapshot JSON files for JS thermal comfort model scalar tests.
Expected values are produced by calling pythermalcomfort via the handlers
defined in get_reference_value.py.

Usage:
    python scripts/python/generate_snapshots.py

Output:
    tests/snapshots/<model_name>.json  for each model in SNAPSHOT_CASES

To add a new model:
    1. Add a handler in get_reference_value.py
    2. Add test cases to SNAPSHOT_CASES below
    3. Re-run this script and commit the updated snapshot JSON

Rules for test cases:
    - Scalar only (no arrays)
    - Must not overlap with validation data (ts_*.json on GitHub)
    - Must not overlap with Python hardcoded test cases (tests/test_*.py)
    - Use Python test cases as references
"""

import json
import os
import sys

# Import handlers and NumpyEncoder from get_reference_value.py
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from get_reference_value import MODEL_HANDLERS, NumpyEncoder

# ============================================================
# Scalar test cases for each model.
# Add new models here following the same pattern.
# ============================================================
SNAPSHOT_CASES = {

    "adaptive_ashrae": [
        {
            "name": "SC-1 Neutral comfort, t_running_mean within range → comfort predicted",
            "inputs": {
                "tdb": 25, "tr": 25, "t_running_mean": 20, "v": 0.1,
            },
        },
        {
            "name": "SC-2 Warm indoor with high t_running_mean → not acceptable at 90%",
            "inputs": {
                "tdb": 28, "tr": 28, "t_running_mean": 26, "v": 0.1,
            },
        },
        {
            "name": "SC-3 Cool indoor with low t_running_mean → not acceptable",
            "inputs": {
                "tdb": 19, "tr": 19, "t_running_mean": 12, "v": 0.1,
            },
        },
        {
            "name": "SC-4 Out-of-range t_running_mean → tmp_cmf is NaN",
            "inputs": {
                "tdb": 25, "tr": 25, "t_running_mean": 5, "v": 0.1,
                "limit_inputs": True,
            },
        },
        {
            "name": "SC-5 IP units conversion",
            "inputs": {
                "tdb": 77, "tr": 77, "t_running_mean": 68, "v": 0.3,
                "units": "IP",
            },
        },
    ],
    "adaptive_en": [
        {
            "name": "SC-1 Neutral comfort, t_running_mean within range → category II acceptable",
            "inputs": {
                "tdb": 25, "tr": 25, "t_running_mean": 20, "v": 0.1,
            },
        },
        {
            "name": "SC-2 Warm indoor with high t_running_mean → category III only",
            "inputs": {
                "tdb": 27, "tr": 27, "t_running_mean": 26, "v": 0.1,
            },
        },
        {
            "name": "SC-3 Cool indoor → not acceptable in any category",
            "inputs": {
                "tdb": 20, "tr": 20, "t_running_mean": 12, "v": 0.1,
            },
        },
        {
            "name": "SC-4 Out-of-range t_running_mean → tmp_cmf is NaN",
            "inputs": {
                "tdb": 25, "tr": 25, "t_running_mean": 8, "v": 0.1,
                "limit_inputs": True,
            },
        },
        {
            "name": "SC-5 Higher air speed → wider comfort range",
            "inputs": {
                "tdb": 27, "tr": 27, "t_running_mean": 22, "v": 0.6,
            },
        },
    ],
    "ankle_draft": [
        {
            "name": "SC-1 Typical office conditions → low ankle draft PPD",
            "inputs": {
                "tdb": 25, "tr": 25, "vr": 0.2, "rh": 50,
                "met": 1.2, "clo": 0.5, "v_ankle": 0.1,
            },
        },
        {
            "name": "SC-2 Higher ankle velocity → increased PPD",
            "inputs": {
                "tdb": 25, "tr": 25, "vr": 0.2, "rh": 50,
                "met": 1.2, "clo": 0.5, "v_ankle": 0.4,
            },
        },
        {
            "name": "SC-3 Warm conditions with moderate ankle draft",
            "inputs": {
                "tdb": 27, "tr": 27, "vr": 0.2, "rh": 60,
                "met": 1.2, "clo": 0.5, "v_ankle": 0.2,
            },
        },
        {
            "name": "SC-4 High ankle velocity → PPD exceeds 20% not acceptable",
            "inputs": {
                "tdb": 25, "tr": 25, "vr": 0.2, "rh": 50,
                "met": 1.2, "clo": 0.5, "v_ankle": 0.6,
            },
        },
        {
            "name": "SC-5 IP units conversion",
            "inputs": {
                "tdb": 77, "tr": 77, "vr": 0.656, "rh": 50,
                "met": 1.2, "clo": 0.5, "v_ankle": 0.66,
                "units": "IP",
            },
        },
    ],
    "a_pmv": [
        {
            "name": "SC-1 Neutral comfort conditions",
            "inputs": {
                "tdb": 22, "tr": 22, "vr": 0.1, "rh": 50,
                "met": 1.2, "clo": 0.8, "a_coefficient": 0.293,
            },
        },
        {
            "name": "SC-2 Warm conditions with positive a_pmv",
            "inputs": {
                "tdb": 28, "tr": 28, "vr": 0.1, "rh": 60,
                "met": 1.4, "clo": 0.5, "a_coefficient": 0.293,
            },
        },
        {
            "name": "SC-3 Cool conditions with negative a_pmv",
            "inputs": {
                "tdb": 18, "tr": 18, "vr": 0.1, "rh": 40,
                "met": 1.2, "clo": 1.0, "a_coefficient": 0.293,
            },
        },
        {
            "name": "SC-4 Out-of-range tdb with limit_inputs=true returns NaN",
            "inputs": {
                "tdb": 35, "tr": 35, "vr": 0.1, "rh": 50,
                "met": 1.2, "clo": 0.5, "a_coefficient": 0.293,
                "limit_inputs": True,
            },
        },
        {
            "name": "SC-5 Higher a_coefficient with warm inputs",
            "inputs": {
                "tdb": 27, "tr": 27, "vr": 0.1, "rh": 55,
                "met": 1.3, "clo": 0.6, "a_coefficient": 0.5,
            },
        },
    ],
    "at": [
        {
            "name": "SC-1 Warm and humid conditions without solar radiation",
            "inputs": {
                "tdb": 30, "rh": 70, "v": 0.5,
            },
        },
        {
            "name": "SC-2 Cool and windy conditions without solar radiation → wind chill effect reduces AT below tdb",
            "inputs": {
                "tdb": 15, "rh": 50, "v": 3.0,
            },
        },
        {
            "name": "SC-3 Hot conditions with high relative humidity → humidity raises AT above tdb",
            "inputs": {
                "tdb": 35, "rh": 80, "v": 0.2,
            },
        },
        {
            "name": "SC-4 Solar radiation included (q=200 W/m2) → AT higher than without solar load",
            "inputs": {
                "tdb": 28, "rh": 60, "v": 0.5, "q": 200,
            },
        },
        {
            "name": "SC-5 Low humidity conditions without solar radiation",
            "inputs": {
                "tdb": 28, "rh": 20, "v": 0.5,
            },
        },
    ],
}


def generate_snapshot(model_name, cases):
    handler = MODEL_HANDLERS[model_name]
    snapshot = {
        "model": model_name,
        "cases": [],
    }
    for case in cases:
        inputs = case["inputs"]
        try:
            expected = handler(inputs)
        except Exception as e:
            print(f"  WARNING: '{case['name']}' failed: {e}")
            expected = {}
        snapshot["cases"].append({
            "name": case["name"],
            "inputs": inputs,
            "expected": expected,
        })
    return snapshot


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.join(script_dir, "..", "..")
    output_dir = os.path.join(project_root, "tests", "snapshots")
    os.makedirs(output_dir, exist_ok=True)

    for model_name, cases in SNAPSHOT_CASES.items():
        if model_name not in MODEL_HANDLERS:
            print(f"  WARNING: No handler for '{model_name}', skipping.")
            continue

        print(f"Generating snapshot for {model_name}...")
        snapshot = generate_snapshot(model_name, cases)

        output_path = os.path.join(output_dir, f"{model_name}.json")
        with open(output_path, "w") as f:
            json.dump(snapshot, f, indent=2, cls=NumpyEncoder)
        print(f"  -> {output_path} ({len(cases)} cases)")

    print("Done.")


if __name__ == "__main__":
    main()