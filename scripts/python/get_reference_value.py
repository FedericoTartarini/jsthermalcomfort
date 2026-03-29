import sys
import json
import math
import numpy as np
from pythermalcomfort.models import (adaptive_ashrae, adaptive_en, pmv_a, ankle_draft, at,)
# To add a new model: import it here, then register it in MODEL_HANDLERS


class NumpyEncoder(json.JSONEncoder):
    """Handle numpy types and native float NaN, serializing them uniformly as null."""

    def default(self, obj):
        if isinstance(obj, np.bool_):
            return bool(obj)
        if isinstance(obj, (np.float32, np.float64)):
            return None if math.isnan(float(obj)) else float(obj)
        if isinstance(obj, (np.int32, np.int64)):
            return int(obj)
        if isinstance(obj, np.ndarray):
            return [
                None if (isinstance(x, float) and math.isnan(x)) else x
                for x in obj.tolist()
            ]
        return super().default(obj)

    def iterencode(self, obj, _one_shot=False):
        """Override to intercept native float NaN/Inf (not allowed in JSON standard), converting them to null."""
        obj = self._sanitize(obj)
        return super().iterencode(obj, _one_shot)

    def _sanitize(self, obj):
        """Recursively replace float NaN/Inf with None (-> JSON null)."""
        if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
            return None
        if isinstance(obj, dict):
            return {k: self._sanitize(v) for k, v in obj.items()}
        if isinstance(obj, (list, tuple)):
            return [self._sanitize(v) for v in obj]
        return obj


# ============================================================
# Handler function for each model: receives an inputs dict and returns a result dict.
# To add a new model: add a handler function here, then register it in MODEL_HANDLERS.
# ============================================================

def handle_adaptive_ashrae(inputs):
    result = adaptive_ashrae(
        tdb=inputs["tdb"],
        tr=inputs["tr"],
        t_running_mean=inputs["t_running_mean"],
        v=inputs["v"],
        units=inputs.get("units", "SI"),
        limit_inputs=inputs.get("limit_inputs", True),
    )
    return {
        "tmp_cmf":          result.tmp_cmf,
        "tmp_cmf_80_low":   result.tmp_cmf_80_low,
        "tmp_cmf_80_up":    result.tmp_cmf_80_up,
        "tmp_cmf_90_low":   result.tmp_cmf_90_low,
        "tmp_cmf_90_up":    result.tmp_cmf_90_up,
        "acceptability_80": result.acceptability_80,
        "acceptability_90": result.acceptability_90,
    }


def handle_adaptive_en(inputs):
    result = adaptive_en(
        tdb=inputs["tdb"],
        tr=inputs["tr"],
        t_running_mean=inputs["t_running_mean"],
        v=inputs["v"],
        units=inputs.get("units", "SI"),
        limit_inputs=inputs.get("limit_inputs", True),
    )
    return {
        "tmp_cmf":               result.tmp_cmf,
        "acceptability_cat_i":   result.acceptability_cat_i,
        "acceptability_cat_ii":  result.acceptability_cat_ii,
        "acceptability_cat_iii": result.acceptability_cat_iii,
        "tmp_cmf_cat_i_up":      result.tmp_cmf_cat_i_up,
        "tmp_cmf_cat_ii_up":     result.tmp_cmf_cat_ii_up,
        "tmp_cmf_cat_iii_up":    result.tmp_cmf_cat_iii_up,
        "tmp_cmf_cat_i_low":     result.tmp_cmf_cat_i_low,
        "tmp_cmf_cat_ii_low":    result.tmp_cmf_cat_ii_low,
        "tmp_cmf_cat_iii_low":   result.tmp_cmf_cat_iii_low,
    }


def handle_a_pmv(inputs):
    result = pmv_a(
        tdb=inputs["tdb"],
        tr=inputs["tr"],
        vr=inputs["vr"],
        rh=inputs["rh"],
        met=inputs["met"],
        clo=inputs["clo"],
        a_coefficient=inputs["a_coefficient"],
        wme=inputs.get("wme", 0),
        units=inputs.get("units", "SI"),
        limit_inputs=inputs.get("limit_inputs", True),
    )
    return {
        "a_pmv": result.a_pmv,
    }


def handle_ankle_draft(inputs):
    result = ankle_draft(
        tdb=inputs["tdb"],
        tr=inputs["tr"],
        vr=inputs["vr"],
        rh=inputs["rh"],
        met=inputs["met"],
        clo=inputs["clo"],
        v_ankle=inputs["v_ankle"],
        units=inputs.get("units", "SI"),
    )
    return {
        "ppd_ad":        result.ppd_ad,
        "acceptability": result.acceptability,
    }

def handle_at(inputs):
    result = at(
        tdb=inputs["tdb"],
        rh=inputs["rh"],
        v=inputs["v"],
        q=inputs.get("q", None),
    )
    return {
        "at": result.at,
    }




# ============================================================
# Model routing table: model name -> handler function.
# To add a new model: add a single entry here.
# ============================================================
MODEL_HANDLERS = {
    "adaptive_ashrae": handle_adaptive_ashrae,
    "adaptive_en":     handle_adaptive_en,
    "a_pmv":           handle_a_pmv,
    "ankle_draft":     handle_ankle_draft,
    "at":              handle_at,
}


def main():
    if len(sys.argv) < 2:
        return {"error": "Missing input arguments", "input_params": ""}

    try:
        params = json.loads(sys.argv[1])
        model_type = params.get("model")
        inputs = params.get("inputs", {})

        if model_type not in MODEL_HANDLERS:
            supported = list(MODEL_HANDLERS.keys())
            return {
                "error": f"Unsupported model: '{model_type}'. Currently supported: {supported}",
                "input_params": sys.argv[1],
            }

        result_dict = MODEL_HANDLERS[model_type](inputs)

        return {
            "model_type":   model_type,
            "full_result":  result_dict,
            "error":        None,
            "input_params": sys.argv[1],
        }

    except KeyError as e:
        return {"error": f"Missing required parameter: {str(e)}", "input_params": sys.argv[1]}
    except TypeError as e:
        return {"error": f"Parameter type error: {str(e)}", "input_params": sys.argv[1]}
    except AttributeError as e:
        return {"error": f"Attribute error (version incompatibility): {str(e)}", "input_params": sys.argv[1]}
    except Exception as e:
        return {"error": f"Unknown error: {str(e)}", "input_params": sys.argv[1]}


if __name__ == "__main__":
    try:
        output = main()
        print(json.dumps(output, cls=NumpyEncoder))
    except Exception as e:
        error_info = {
            "error": f"Script execution failed: {str(e)}",
            "input_params": sys.argv[1] if len(sys.argv) > 1 else "",
        }
        print(json.dumps(error_info))
        sys.exit(1)