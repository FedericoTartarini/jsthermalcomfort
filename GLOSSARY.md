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

**Main model**:
A model a user selects and reads in the deployed CBE Thermal Comfort Tool's UI or in its prototype (`refactor-draft`): a method, a page, a dialog or a registered model. Today `pmv_ppd_ashrae`, `pmv_ppd_iso`, `adaptive_ashrae`, `adaptive_en`, `phs`, `use_fans_heatwaves`, `vertical_tmp_grad_ppd`, `ankle_draft`, `utci`, `heat_index_rothfusz`, `humidex` and `wci`. A function that computes part of a main model's result or is shown beside it (`cooling_effect`, `set_tmp` and `two_nodes_gagge` under PMV; `wind_chill_temperature` beside `wci`) is not one, and neither is an input calculator.
_Avoid_: core model, primary model, app model

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
A documented difference from upstream, allowed only because JavaScript or TypeScript forces it, because a consumer needs it, or as a correction under ADR 0004. Outside a correction, it is never in a value upstream returns.
_Avoid_: customisation, JS-only behaviour, fork

**Consumer contract**:
What every main model exposes beyond upstream's function: its model info, `round_output` and `limit_inputs` where upstream has them (`ankle_draft` has no `round_output`), the `warnings` rows, and for PMV the exported sensation bins and, under ISO 7730, the category bins. An input calculator, a function whose result fills another model's input (`clo_tout`, `solar_gain`), exposes its model info and only what upstream gives it grounds for: `round_output` where upstream has one (`solar_gain`; `clo_tout` always rounds), `warnings` rows where it has a range to report (`solar_gain`), and no `limit_inputs`, as upstream has none for either.
_Avoid_: pattern, app surface, extras

**Model info**:
The published metadata for one model (`<MODEL>_INFO`): the name the model is exported under, label, description, standards, and per-quantity unit, applicability and, on a labelled output, classifier. A rule that is not a classifier, such as PMV ASHRAE's compliance interval, is an exported constant, not a model-info field. Upstream has no equivalent.
_Avoid_: schema, metadata object, model docs

**Classifier**:
A `ClassifierBins` (fixed ascending edges, one label per bin, `right`) that turns one number into one label, exported next to its model and referenced by identity from the model info. A model has one when upstream computes that output with `_mapping()`, or when a consumer-needed labelled output can be written as one (ISO 7730's categories, cut on |pmv|); a bound that moves with another input (adaptive acceptability) is not a classifier. The model info does not say which output the bins cut (`tsv`'s bins cut `pmv`): a consumer that bands a number states that pairing itself, as the app's dynamic-chart declaration does with `output` and `bands`.
_Avoid_: mapping, thresholds, category table

**Warnings rows**:
The applicability bounds a call broke, as upstream checks them, returned as data instead of a Python `UserWarning`. Filled whatever `limit_inputs` is. A row can also report a bound the model info publishes and upstream does not check, `solar_gain`'s ASHRAE 55 Table C-2 ranges for `sol_radiation_dir` and `asw`: the row is reported and the value returned is still upstream's (a deviation, reason at `SOLAR_GAIN_LIMITS`).
_Avoid_: console warnings, errors, validation messages

**Mirrored test**:
A test that carries an upstream test's name, inputs and expected values into Jest, one upstream test file per `describe`. A test whose expected value an ADR 0004 correction changed keeps its upstream name and inputs, adding only an input the correction introduces, and says at the site that ADR 0004 changed it. Where an upstream test expects a value upstream's own code does not return, the mirror asserts what the code returns, and the upstream expectation is a `test.todo` that gives the reason.
_Avoid_: ported test, parity test, copied test
