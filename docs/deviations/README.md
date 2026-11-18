# Deviation registers

Every difference between this library and pythermalcomfort v4.8.1, whose `.py` is the only standard, is a whitelisted mechanical translation or v2 documentation that replaces none of upstream's text, a representation mapping or a row in a register here (ADRs 0019, 0027, 0028). The user approves each class and addition once, and reviews each row outside them and each row flagged as doubtful (ADR 0019).

- `<model>.md` holds one main model's rows, named after upstream's function (`utci.md`). A model's ticket creates its register when it migrates the model. A model with no register here has not been migrated yet, and its differences from upstream are not recorded yet. `JOS3.md` is the exception: JOS3 stays JavaScript (ADR 0018), and its register holds only the differences in its comments.
- `_shared.md` holds the rows that belong to no single model: library-wide constants (`Units`), the shared infrastructure (the inputs parse, `classifyFromBins`, `ModelInfo`) and the helpers, whether a model calls them or not.

`tests/deviations.test.ts` checks the registers against the code.

The documentation site gives each function its own page, where upstream's site has one page per category, since every built-in TypeDoc router gives a function its own page (ADR 0020). This is not in the code, so it has no row. A module's page stands in for upstream's category page: it opens with one sentence and lists upstream's functions in the order of upstream's page. Where only the category page's own text conveys a statement of the 1.4.0 site, the module's comment holds that text after its opening sentence: the `models` comment holds the Heat Index section's text (`docs/documentation/models.rst:134-141`), with its `:py:class:` references as `{@link}`, and the definition of PMV (`:221-222`), in the order of upstream's page.

## The registers

Each register is on GitHub, on the `main` branch:

- [`JOS3`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/JOS3.md)
- [`_shared`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/_shared.md)
- [`adaptive_ashrae`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/adaptive_ashrae.md)
- [`adaptive_en`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/adaptive_en.md)
- [`ankle_draft`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/ankle_draft.md)
- [`at`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/at.md)
- [`clo_tout`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/clo_tout.md)
- [`cooling_effect`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/cooling_effect.md)
- [`discomfort_index`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/discomfort_index.md)
- [`esi`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/esi.md)
- [`heat_index_lu`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/heat_index_lu.md)
- [`heat_index_rothfusz`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/heat_index_rothfusz.md)
- [`heat_index_schoen`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/heat_index_schoen.md)
- [`humidex`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/humidex.md)
- [`ireq`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/ireq.md)
- [`net`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/net.md)
- [`pet_steady`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/pet_steady.md)
- [`phs`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/phs.md)
- [`pmv_a`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/pmv_a.md)
- [`pmv_athb`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/pmv_athb.md)
- [`pmv_e`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/pmv_e.md)
- [`pmv_ppd_ashrae`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/pmv_ppd_ashrae.md)
- [`pmv_ppd_iso`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/pmv_ppd_iso.md)
- [`ridge_regression_predict_t_re_t_sk`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/ridge_regression_predict_t_re_t_sk.md)
- [`set_tmp`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/set_tmp.md)
- [`solar_gain`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/solar_gain.md)
- [`sports_heat_stress_risk`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/sports_heat_stress_risk.md)
- [`thi`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/thi.md)
- [`two_nodes_gagge`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/two_nodes_gagge.md)
- [`two_nodes_gagge_ji`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/two_nodes_gagge_ji.md)
- [`two_nodes_gagge_sleep`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/two_nodes_gagge_sleep.md)
- [`use_fans_heatwaves`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/use_fans_heatwaves.md)
- [`utci`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/utci.md)
- [`vertical_tmp_grad_ppd`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/vertical_tmp_grad_ppd.md)
- [`wbgt`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/wbgt.md)
- [`wci`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/wci.md)
- [`wind_chill_temperature`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/wind_chill_temperature.md)
- [`work_capacity_dunne`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/work_capacity_dunne.md)
- [`work_capacity_hothaps`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/work_capacity_hothaps.md)
- [`work_capacity_iso`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/work_capacity_iso.md)
- [`work_capacity_niosh`](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/docs/deviations/work_capacity_niosh.md)

## Kinds of difference

**Whitelist (W).** A mechanical translation, or v2 documentation that replaces none of upstream's text, is not a deviation and gets no row (ADR 0019):

1. A model's keyword arguments become one inputs object with the same keys and defaults (ADR 0002). A helper keeps upstream's positional order and defaults (ADR 0022).
2. Upstream's input dataclass becomes the model's `INFO.inputs`, the inputs type derived from it, and a parse function (ADR 0022).
3. `model` becomes `standard`, and `Models` becomes `Standard` (ADR 0003).
4. `.lower()` and `.upper()` become `.toLowerCase()` and `.toUpperCase()`, only where upstream calls them (ADR 0007).
5. A string option's type is a literal union derived from an `as const` object, and the parameter accepts the constant or the literal. `Standard` and `Units` are `as const` objects, not `enum`s.
6. `undefined`, or a missing key, takes the default. `null` is handled as upstream handles `None`. Optional types are written `?: T | undefined`.
7. `np.round` and `np.around` become the library's half-even `round`.
8. 0-d ndarrays and numpy scalars become a JS `number` or `boolean`.
9. Logic: numba kernels become scalar functions; `np.where` becomes a ternary, an `if` or an early return; conditional expressions and `max`/`min` become `if/else` or `Math.max`/`Math.min`; Python and numpy math becomes JS `Math`, with ADR 0009 site notes; inline literals become frozen module constants with the same values; `units_converter` takes and returns an object with the same keys.
10. Upstream's docstring maps onto TSDoc as ADR 0025 lists.
11. A model's Result and input types live in its model file, not in `classes_return.py` and `classes_input.py` (ADR 0021).
12. A docstring's examples are TypeScript calls, with upstream's inputs and outputs (ADR 0025).
13. A docstring's prose types, such as "float or list of floats", are dropped, since the signature gives the type (ADR 0025).
14. A helper, like every JavaScript function, ignores surplus arguments, where Python raises `TypeError` for a call that does not bind (ADR 0022).
15. Each `*_INFO` constant has the one-sentence TSDoc `Describes the standards, inputs and outputs of {@link <model>}.`, which replaces none of upstream's text, as `*_INFO` has no upstream counterpart (ADR 0025, 2026-11-18 amendment).
16. Each model's `@returns` list ends with the line ``- `warnings` - Added: the call's {@link ModelWarning} rows, in the order of its checks.``, the text of `ModelOutputs.warnings`, which replaces none of upstream's text, as `warnings` has no upstream counterpart (ADR 0025, 2026-11-18 amendment).

**Deviation classes (C).** The user approved each class once, and every instance gets a row that names its class:

| Class                     | What differs from upstream                                                                                                                                                                                                            | ADR  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| scalars only              | A public model takes scalars. Time-series models keep upstream's shape.                                                                                                                                                               | 0022 |
| booleans and `null`       | A boolean or `null` for a numeric parameter throws `TypeError`.                                                                                                                                                                       | 0022 |
| non-finite numbers        | A public model throws `RangeError` on NaN or ±Infinity.                                                                                                                                                                               | 0022 |
| error classes             | The error class follows JavaScript semantics (`TypeError`, `RangeError`, `Error`), not Python's class.                                                                                                                                | 0022 |
| unvalidated switches      | A switch upstream does not validate, such as `round_output`, is type-checked and throws `TypeError`.                                                                                                                                  | 0022 |
| check order               | Validation runs in `INFO.inputs`' order.                                                                                                                                                                                              | 0022 |
| messages                  | Upstream's own message about a value stays verbatim. A message that names Python's types or Python's call binding, or one for a check only the library makes, is the library's and names the key; the parse stops at the first error. | 0022 |
| zero divisors numba drops | Where upstream's kernel raises and numba's `prange` drops the exception, the library throws `RangeError`.                                                                                                                             | 0022 |
| loop cap                  | A loop with no upstream bound stops after 1000 iterations and throws `Error("Max iterations exceeded")`.                                                                                                                              | 0015 |
| `@throws`                 | Raises becomes `@throws`, with the JavaScript class.                                                                                                                                                                                  | 0025 |
| docstring errors          | An error in upstream's docstring, a typo included, is fixed. The user files the upstream issue, and the row then cites it by its full link.                                                                                           | 0025 |

ADR 0019 names error classes, check order and messages as classes of their own (whitelist item 2). ADR 0022 defines them.

**Additions.** Something upstream lacks that changes no upstream value. Every instance gets a row. The additions an ADR approves:

| Addition       | What it adds                                                                                                         | ADR  |
| -------------- | -------------------------------------------------------------------------------------------------------------------- | ---- |
| model info     | `*_INFO` for every model.                                                                                            | 0024 |
| warnings       | `warnings` as data, with range and notice rows.                                                                      | 0024 |
| gate-off rows  | Range rows whatever `limit_inputs` is.                                                                               | 0024 |
| added output   | An output upstream lacks, as an entry in `INFO.outputs` and so a field of the result, such as ISO 7730's `category`. | 0023 |
| added bins     | Bins for an approved added labelled output.                                                                          | 0024 |
| Table C-2 rows | `solar_gain`'s ASHRAE 55 Table C-2 rows.                                                                             | 0024 |
| `Units`        | The `Units` constant.                                                                                                | 0019 |

**Representation mappings (R).** A returned value may take a TypeScript representation in place of upstream's only through a mapping that is one-to-one on upstream's domain, so that it cannot merge two upstream values (ADR 0028). The parity harness applies each mapping in one place, selected by the output's `INFO.outputs` entry, and fails on any upstream value outside its domain; it also fails where upstream returns NaN, or the library `null`, for an output not declared `nullable`. A mapping is registered once, here, with tests of its own (`tests/parity/mappings.test.ts`), and gets no row per model:

| Mapping         | Upstream's domain                                              | TypeScript value                        | Harness function                                | ADR  |
| --------------- | -------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------- | ---- |
| flag            | `_as_flag`'s 1.0, 0.0 and NaN, for a `flag` output             | `true`, `false` and `null`              | `flag_mapping` in `tests/parity/harness.ts`     | 0028 |
| nullable output | any value but `None`, for any other output declared `nullable` | NaN as `null`, any other value as it is | `nullable_mapping` in `tests/parity/harness.ts` | 0028 |

The library converts at one place too, `buildOutputs` in `src/_internal/modelInfo.ts`, through which a model returns its outputs (decision 314), and its inverse `toComputedOutputs` beside it, through which a model that calls another computes on upstream's NaN (decision 321).

**Other deviations an ADR approves.** A deviation an ADR approves outside the classes and additions above names that ADR in its row. One case is `classifyFromBins`, which throws `RangeError` unless its edges are strictly increasing (ADR 0024).

## Register format

A register is a Markdown file with a title, a line naming the model, one table with these columns, in this order, and a Notes section after it where the register has notes:

```text
| id  | part | upstream site | TS site | reason | class/ADR | status | date | parity |
| --- | ---- | ------------- | ------- | ------ | --------- | ------ | ---- | ------ |
```

| Column        | Content                                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id            | The register's file name without `.md`, a hyphen and a number: `utci-1`, `_shared-3`. Rows are numbered from 1 as they are added, and a number is never reused.                             |
| part          | One of `input`, `output`, `logic`, `comment`, `v2-addition` or `structure`. `structure` holds a difference in where code sits.                                                              |
| upstream site | The path under `pythermalcomfort/` and the line at v4.8.1, in a code span (`models/utci.py:155`), or `none` where upstream has nothing.                                                     |
| TS site       | The file and the symbol the row is about, each in a code span: `` `src/models/heat_index_rothfusz.ts` `HI.warnings` ``. A symbol is a top-level name, exported or not, followed by members. |
| reason        | Why the library differs, in a sentence.                                                                                                                                                     |
| class/ADR     | `C: <class> (ADR 00xx)` for an instance of a class above, `addition: <addition> (ADR 00xx)`, `ADR 00xx` for another deviation an ADR approves, or `none` for any other row.                 |
| status        | `approved`, `pending` or `pending (doubtful)`.                                                                                                                                              |
| date          | The date the status was last set, as `YYYY-MM-DD`.                                                                                                                                          |
| parity        | What the parity suite exempts for the row, in the grammar below.                                                                                                                            |

Every cell is filled. A pipe inside a cell is escaped as `\|`, code spans included, as GitHub Flavored Markdown requires. A class/ADR cell names a class or an addition exactly as the tables above list it, with the ADR they give. The register table is the file's only table.

### The TS site's symbol

A model file holds upstream's docstrings and code comments, and at most a one-sentence why-comment (ADRs 0019 and 0025, 2026-10-27 amendments), besides the one-sentence TSDoc of its `*_INFO` and the `warnings` line of its `@returns` list (ADR 0025, 2026-11-18 amendment), so a row names its symbol instead of relying on a citation at its site. The symbol is resolved as TypeScript resolves it: a top-level declaration of the file, then a property of its type at each dot. A value's members are its value's (`HEAT_INDEX_ROTHFUSZ_INFO.inputs.tdb`); an interface's or a type's are its instances', inherited members included (`HI.warnings`, declared on `ModelOutputs`).

### Notes

A register's `## Notes` section, after the table, holds what used to be comments at a site and is not a deviation, such as ADR 0009's notes on the arithmetic of upstream's executed path. Each note names the file and the symbol it is about, as a TS site does.

### Status and doubtful rows

- A row in a listed class, a listed addition or another deviation an ADR approves is written `approved`.
- Any other row, its class/ADR `none`, is written `pending`. The user reviews it (ADR 0019).
- A row whose class the implementer doubts is flagged `pending (doubtful)`, and its reason ends with the doubt, as a question for the user. The user reviews it.

When the user approves a row, its status becomes `approved` and its date the approval date. A pending row fails the cross-check, so a ticket with pending rows is not finished.

### The `parity` column

The column states what the parity suite (ADR 0020) exempts for the row (ADR 0019):

```text
parity  = "none" | item ( ", " item )*
item    = "output `" name "`" | "warning `" key "`" | "throw `" message "`"
```

- `` output `name` `` exempts the output field `name` from comparison.
- `` warning `key` `` exempts the warning key `key`, upstream's name for the check, verbatim (`` warning `tr - tdb` ``).
- `` throw `message` `` exempts a case where upstream returns and the library throws an error whose message is `message`, verbatim (`` throw `division by zero` ``): a throw the library adds (decision 318). The suite otherwise requires the library to throw exactly where upstream raises.
- `none` exempts nothing.

No item appears twice. A pipe in a name is written `\|` and read as `|`.

An item in a model's register applies to that model, and an item in `_shared.md` applies to every model.

## Citing comments

A comment may cite a row, such as a test that checks the deviation, a line in `src/_internal/` or a model file's one-sentence why-comment (ADR 0025's 2026-10-27 amendment): the word `deviation` (or `Deviation`), a space and the id. Any comment counts: line, block or TSDoc, in a file under `src/` or `tests/`. A row needs no citation.

```ts
// Range rows are returned with the gate off (deviation utci-2).
```

One comment may cite several rows, each with its own `deviation`: `deviation utci-1, deviation _shared-3`. A string or a regular expression that holds the form cites nothing.

## The cross-check

`tests/deviations.test.ts` reads every register here and every comment under `src/` and `tests/`. It fails, naming the file, the line and the id, when:

- a row's TS site names a file that does not exist, or a symbol the file does not declare;
- a comment cites an id that has no row;
- a row is pending;
- a row breaks the format above.

Run it alone with `npm test -- tests/deviations.test.ts`.

## Mirrored tests that depart from upstream's

The header of `tests/models/testUtils.ts` sets how a test mirrors upstream's. This section lists each mirrored test that departs from its upstream test on purpose, and each upstream test or module with no mirror. Upstream's tests are cited from its repository root, and its modules from `pythermalcomfort/`, at v4.8.1.

- `tests/test_at.py:31`, `test_at_q`, calls `is_equal(result, 25.3, 0.1)` without `assert`, and 4.8.1 returns 30.9. `tests/models/at.test.ts` asserts 30.9 (`.scratch/v2-all-models/decisions.md`, decision 253; [pythermalcomfort#527](https://github.com/pythermalcomfort/pythermalcomfort/issues/527)).
- `tests/test_esi.py:36`, `:37` and `:38`, `test_esi_boundary_conditions`, never assert their 16.5, 19.5 and 18.0 (`:49`), and 4.8.1 returns 19.9, 33.1 and 24.8. `tests/models/esi.test.ts` asserts 19.9, 33.1 and 24.8 (decision 253; [pythermalcomfort#527](https://github.com/pythermalcomfort/pythermalcomfort/issues/527)).
- `tests/test_choice_field.py:55`, the four `series` cases of `test_choice_fields_preserve_valid_values`, pass a pandas Series, which has no JavaScript counterpart. They are todos in `tests/models/phs.test.ts`, `tests/models/ridge_regression_predict_t_re_t_sk.test.ts`, `tests/models/two_nodes_gagge.test.ts` and `tests/models/work_capacity_dunne.test.ts`.
- `tests/test_environment.py:292`, `test_legacy_scale_wind_speed_log_shims`, reads the deprecated alias `scale_wind_speed_log` from `pythermalcomfort.utils` (`[package]`) and from `pythermalcomfort.utils.scale_wind_speed_log` (`[submodule]`). ADR 0010 keeps no deprecated alias, so the library has none (`_shared-169`), and the test is a todo in `tests/environment/scale_wind_speed_log.test.ts`.
- `tests/test_classes_return.py` tests `AutoStrMixin`'s `str`, `repr` and `getitem`. It has no counterpart here, since Python's presentation has no JavaScript equivalent (decision 99).
- `plots` (`plots/matplotlib/`) is not ported, since it depends on matplotlib and pandas. Its tests, the seven `tests/test_plot_*.py`, have no counterpart here.
- `cli` (`cli.py` and `__main__.py`) is not ported. Its `main` prints `argv` and returns 0 (`cli.py:20-30`), and it has no upstream test.
