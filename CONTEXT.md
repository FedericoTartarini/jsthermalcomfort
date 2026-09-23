# jsthermalcomfort

A JavaScript/TypeScript port of pythermalcomfort. Upstream owns the science; this library owns only the language-level shape it takes in JS, plus what its consumers need on top.

## Language

**Upstream**:
pythermalcomfort at its current release; the source of every model's name, arguments, defaults, return values, reference values and logic.
_Avoid_: Python version, original, reference implementation

**Kernel**:
The private solver a family of models shares (the PMV iteration). It is not part of the published surface.
_Avoid_: core, engine, optimized function

**Wrapper**:
A public model that binds a kernel to one standard's limits and conventions (`pmv_ppd_iso`, `pmv_ppd_ashrae`).
_Avoid_: variant, model function, facade

**Switch**:
A boolean option a model takes, named as upstream names it (`limit_inputs`, `round_output`, `airspeed_control`).
_Avoid_: flag, toggle, kwarg

**Options**:
The single trailing object that carries a model's switches and its non-numeric settings (`units`, `standard`).
_Avoid_: kwargs, config, params

**Standard**:
A versioned identifier for a published standard (`Standard.ashrae_55_2023`, value `"55-2023"`), the `standard` option that selects one. Upstream calls this `Models`/`model`; a model here is a function such as `pmv_ppd_iso`.
_Avoid_: model (for a standard), edition (except when contrasting two versions), norm

**Deviation**:
A documented difference from upstream, allowed only because JavaScript or TypeScript forces it or because a consumer needs it, and never in a value upstream returns.
_Avoid_: customisation, JS-only behaviour, fork

**Consumer contract**:
What every model the CBE Thermal Comfort Tool uses exposes beyond upstream's function: its model info, a `round_output` switch, `limit_inputs`, and for PMV the `warnings` rows and the exported sensation bins.
_Avoid_: pattern, app surface, extras

**Model info**:
The published metadata for one model (`<MODEL>_INFO`): label, description, standards, and per-quantity unit and applicability. Upstream has no equivalent.
_Avoid_: schema, metadata object, model docs

**Warnings rows**:
The applicability bounds a PMV call broke, returned as data instead of emitted as a Python `UserWarning`. Filled whatever `limit_inputs` is.
_Avoid_: console warnings, errors, validation messages

**Mirrored test**:
A test that carries an upstream test's name, inputs and expected values into Jest, one upstream test file per `describe`.
_Avoid_: ported test, parity test, copied test
