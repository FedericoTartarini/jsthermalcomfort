# jsthermalcomfort

A JavaScript/TypeScript port of pythermalcomfort. Upstream owns the science; this library owns only the language-level shape it takes in JS, plus the v2 additions the user approved (ADR 0027).

## Language

**Upstream**:
pythermalcomfort at its current release; the source of every model's name, arguments, defaults, return values, reference values and logic.
_Avoid_: Python version, original, reference implementation

**Kernel**:
The private solver behind one or more models, at upstream's path and under upstream's name (`_pmv_ppd_optimized`, `_utci_optimized`). It is exported from its file for tests only, never from an entry point (ADR 0021).
_Avoid_: core, engine, optimized function

**Wrapper**:
A public model that binds a kernel to one standard's limits and conventions (`pmv_ppd_iso`, `pmv_ppd_ashrae`).
_Avoid_: variant, model function, facade

**Main model**:
Every function and class upstream publishes in `pythermalcomfort.models`, that is, the `__all__` of `models/__init__.py`. At v4.8.0 that is 41 names: 39 functions, the class `JOS3` and the enum `Sports`, which goes with `sports_heat_stress_risk`. A private upstream file or helper that a main model calls goes with it and is not a main model itself, and neither is a function outside `models/` (`psy_ta_rh`, `operative_tmp`) (ADR 0018).
_Avoid_: core model, primary model, app model

**Switch**:
A boolean option a model takes, named as upstream names it (`limit_inputs`, `round_output`, `airspeed_control`).
_Avoid_: flag, toggle, kwarg

**Inputs**:
The single object a model takes, whose keys are upstream's keyword parameters: physical quantities and switches alike, named and defaulted as upstream names and defaults them. Its type, `InputsOf<typeof X_INFO>`, takes upstream's input class name (`HIInputs`), and `INFO.inputs` describes each key.
_Avoid_: params, options, kwargs, config, arguments object

**Outputs**:
What a model returns: the fields `INFO.outputs` describes, then `warnings`, which `ModelOutputs` holds. Its type, `OutputsOf<typeof X_INFO>`, is named after upstream's dataclass (`HI`).
_Avoid_: result, return value, response

**Standard**:
A versioned identifier for a published standard (`Standard.ashrae_55_2023`, value `"55-2023"`). Upstream calls this `Models`/`model`, and lacks only `en_16798_1_2019`, `iso_7243_2017` and `iso_11079_2007`, which the library adds for `adaptive_en`, `wbgt` and `ireq`; a model here is a function such as `pmv_ppd_iso`. A model's `INFO.standards` lists the standards it takes, and its `standard` input, where upstream takes `model`, picks one of them.
_Avoid_: model (for a standard), edition (except when contrasting two versions), norm

**Deviation**:
A difference from upstream, allowed only where JavaScript or TypeScript forces it or as an approved v2 addition. The user approves each one, and each has a row in its model's deviation register (ADRs 0019, 0027). It never changes a value upstream returns and never adds an input that changes what a model computes.
_Avoid_: customisation, JS-only behaviour, fork

**Deviation register**:
A model's table at `docs/deviations/<model>.md` of every deviation and addition. A comment at the deviation's site cites each row by id, and a test cross-checks the register against the code (ADR 0019).
_Avoid_: deviation list, ledger, changelog

**Whitelist**:
The approved list of mechanical translations from upstream's Python, such as an inputs object for keyword arguments or `Math` for numpy math. They are not deviations and get no register row (ADR 0019).
_Avoid_: allowlist, translation rules

**Deviation class**:
A kind of deviation the user approved once, such as scalar-only inputs or `@throws` with the JavaScript class. Each instance still gets a register row that names its class (ADR 0019).
_Avoid_: deviation type, deviation category

**Consumer contract**:
What a main model exposes beyond upstream's function. Every model has its model info. Beyond that it has what upstream has: `limit_inputs` and `round_output` where upstream has them, `warnings` range rows where upstream checks ranges and notice rows where it warns otherwise or a scipy routine it calls warns (`pet_steady`'s `fsolve`), and bins where upstream calls `_mapping()` or for an approved added labelled output (ADR 0024). An addition upstream lacks, such as ISO 7730's `category` or `solar_gain`'s ASHRAE 55 Table C-2 rows, has a row in the model's deviation register.
_Avoid_: pattern, app surface, extras

**Model info**:
The published metadata for one model (`<MODEL>_INFO`): the name the model is exported under (upstream's function name), label, standards (the standards whose values, such as equations, limits, thresholds and tables, the model takes; empty where upstream names none), its inputs (every keyword argument, with its kind, unit, applicability and default, and whether it is an integer or a time series), and per output its kind (`numeric`, `flag`, `label` or `label_or_numeric`, whether it is nullable, whether it is a time series, and whether the model leaves it at upstream's `None`), unit, applicability and, on a labelled output, classifier. Where upstream takes `model`, the inputs hold a `standard` choice entry whose allowed values are the model's standards, default first. Its shape is stable from v2. A rule that is not a classifier, such as PMV ASHRAE's compliance interval, is an exported constant, not a model-info field. Upstream has no equivalent.
_Avoid_: schema, metadata object, model docs

**Classifier**:
A `ClassifierBins` (fixed ascending edges, one label per bin, `right`) that turns one number into one label, exported next to its model and referenced by identity from the model info. A model has one when upstream computes that output with `_mapping()`, or for an approved added labelled output that can be written as one (ISO 7730's categories, cut on |pmv|; ADR 0024); a bound that moves with another input (adaptive acceptability) is not a classifier. The model info does not say which output the bins cut (`tsv`'s bins cut `pmv`): a consumer that bands a number states that pairing itself, as the app's dynamic-chart declaration does with `output` and `bands`.
_Avoid_: mapping, thresholds, category table

**Warnings rows**:
What a call returns in `warnings` in place of upstream's Python `UserWarning`, whatever `limit_inputs` is. A row is one of two kinds. A `range` row is an applicability bound the call broke, in upstream's unit and compared as upstream compares it, and it carries `unit`. A `notice` row holds the text of any other upstream `warnings.warn`, verbatim. A range row can also report a bound the model info publishes and upstream does not check, `solar_gain`'s ASHRAE 55 Table C-2 ranges for `sol_radiation_dir` and `asw`: the row is reported and the value returned is still upstream's (an addition, ADR 0024).
_Avoid_: console warnings, errors, validation messages

**Mirrored test**:
A test that carries an upstream test's name, inputs and expected values into Vitest, one upstream test file per `describe`. It compares only upstream's fields; an added field has its own test.
_Avoid_: ported test, parity test, copied test

**Parity suite**:
The golden-master tests that compare the library with the committed outputs of a pinned pythermalcomfort on seeded inputs. Registered deviations are exempt (ADR 0020).
_Avoid_: golden master, regression test, mirrored test
