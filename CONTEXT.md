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

**Params**:
The single object a model takes, whose keys are upstream's keyword parameters: physical quantities and switches alike, named and defaulted as upstream names and defaults them.
_Avoid_: options, kwargs, config, arguments object

**Standard**:
A versioned identifier for a published standard (`Standard.ashrae_55_2023`, value `"55-2023"`), the `standard` option that selects one. Upstream calls this `Models`/`model`; a model here is a function such as `pmv_ppd_iso`.
_Avoid_: model (for a standard), edition (except when contrasting two versions), norm

**Deviation**:
A documented difference from upstream, allowed only because JavaScript or TypeScript forces it or because a consumer needs it, and never in a value upstream returns.
_Avoid_: customisation, JS-only behaviour, fork

**Consumer contract**:
What every model the CBE Thermal Comfort Tool uses exposes beyond upstream's function: its model info, a `round_output` switch, `limit_inputs`, the `warnings` rows, and for PMV the exported sensation bins.
_Avoid_: pattern, app surface, extras

**Model info**:
The published metadata for one model (`<MODEL>_INFO`): the name the model is exported under, label, description, standards, and per-quantity unit, applicability and, on a labelled output, classifier. A rule that is not a classifier, such as PMV ASHRAE's compliance interval, is an exported constant, not a model-info field. Upstream has no equivalent.
_Avoid_: schema, metadata object, model docs

**Classifier**:
A `ClassifierBins` (fixed ascending edges, one label per bin, `right`) that turns one number into one label, exported next to its model and referenced by identity from the model info. A model has one exactly when upstream computes that output with `_mapping()`; a bound that moves with another input (adaptive acceptability) is not a classifier. The model info does not say which output the bins cut (`tsv`'s bins cut `pmv`): a consumer that bands a number states that pairing itself, as the app's dynamic-chart declaration does with `output` and `bands`.
_Avoid_: mapping, thresholds, category table

**Warnings rows**:
The applicability bounds a call broke, as upstream checks them, returned as data instead of a Python `UserWarning`. Filled whatever `limit_inputs` is.
_Avoid_: console warnings, errors, validation messages

**Mirrored test**:
A test that carries an upstream test's name, inputs and expected values into Jest, one upstream test file per `describe`.
_Avoid_: ported test, parity test, copied test
