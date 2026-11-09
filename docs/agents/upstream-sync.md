# Upstream sync

How the library retargets to a new pythermalcomfort release (ADR 0028, "Tracking"). The library follows upstream's current release and does not lead it (ADR 0016), so every change below follows a release that is out.

Below, `vX` is the current pin and `vY` the new release.

## When

`.github/workflows/upstream-release.yml` schedules `scripts/parity/check-upstream-release.sh` for every Monday. The schedule runs once the workflow is on `main`, which it reaches with v2; until then run the script by hand at the start of each work session. The script fails, naming both versions, when PyPI's latest release (`info.version` of `https://pypi.org/pypi/pythermalcomfort/json`) differs from the pin in `scripts/parity/requirements.in`. GitHub runs a schedule only on the default branch, notifies the user who last changed its cron line, and, in a public repository, disables it after 60 days with no repository activity (GitHub docs, _Events that trigger workflows_, `schedule`). The script also runs locally: `bash scripts/parity/check-upstream-release.sh`.

## Measuring upstream

- Source and tests: the local clone `../pythermalcomfort` (`git -C ../pythermalcomfort fetch --tags origin`), read with `git show vY:<path>`.
- Behaviour (values, warnings, messages, raises): a script run in the parity image, `docker run --rm --platform linux/amd64 -v <dir>:/s:ro jsthermalcomfort-parity python -I /s/<script>.py`, with the image built per `scripts/parity/README.md`.

## 1. Measure what changed

Open a retarget ticket in `.scratch/<feature>/issues/` (`docs/agents/issue-tracker.md`). Its "What is measured" records:

- `git -C ../pythermalcomfort diff vX vY -- pythermalcomfort tests` (with `--stat` for the file list), `git log vX..vY` and `CHANGELOG.rst`'s vY section;
- of the upstream files a migrated model or helper uses, which vY changes and which it leaves unchanged;
- whether `setup.py`'s install requirements change, since they decide the lockfile;
- the validation-data ref in upstream's `tests/conftest.py`;
- the tracked mentions of vX, from `git grep -l` on its version with the dots escaped.

Then cross-check the diff against the "pythermalcomfort changes to port" issue in FedericoTartarini/jsthermalcomfort (label `pythermalcomfort sync`). Upstream's `.github/workflows/js-sync.yml` has kept it since v4.8.0. It lists each pull request merged into `development` that is labelled `js: needed`, or that touches code the library mirrors (`PORTED_PATHS` in `.github/scripts/js_sync.js`) and is not labelled `js: not needed`. At each final release the script renames the open issue "pythermalcomfort changes to port (up to vY)", closes it, and moves its unticked lines to a new one. The diff stays the record: a commit pushed to `development` without a pull request is not listed. cba6bf5, which changed `two_nodes_gagge`, is one.

## 2. Classify each change

Each change in the diff takes one class, ADR 0028's three layers plus docstrings, and each class lands in a ticket: the retarget ticket, or an alignment ticket it names. An open ticket whose model or helper vY changes gains a note naming the change.

| Class          | What it covers                                                                                | What the library does                                                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| computation    | What is computed, the branches, the order of operations, which inputs give NaN or raise       | Ported line for line, at the same place. A changed returned value is a breaking change (`!`).                                                        |
| mechanism      | numpy broadcasting, numba, `np.vectorize`, dataclass validation, Python's calling conventions | Translated into TypeScript idiom; often nothing changes.                                                                                             |
| representation | A returned value's type, its "no value", the shape of the arguments                           | Checked against its R mapping in `docs/deviations/README.md`. An upstream value outside every mapping's domain needs a mapping first (ADR 0028).     |
| docstring      | Docstrings, examples and references                                                           | Copied to TSDoc in the upstream docstring's order. An error in it is fixed and recorded as a register row (ADR 0025), and drafted upstream (step 8). |

A rename is not representation: the library renames too (ADR 0028, `AGENTS.md`). A new input or returned value is adopted now that the release has it (ADR 0016). A new main model migrates by ADR 0018.

## 3. New NaN

The parity suite catches a NaN only where its data reach one. Read the diff for new NaN sources, as the v4.8.0 retarget did: `_valid_range`, `_mapping` and `_as_flag` in `_internal/validation.py`, `np.where(…, np.nan)` in the model files, and arithmetic on inputs the library accepts (a `log(0)`, a 0/0, a negative base to a non-integer power). For each output a new source can make NaN:

1. find an input that gives NaN, measured in the parity image;
2. declare the output `nullable` in its model's `INFO.outputs`;
3. pin it by a unit test that asserts `null` at that input, as `tests/models/at.test.ts` does for `at`.

## 4. New or moved raises

The generator samples both sides of each bound where upstream raises for an input's value, and the harness requires the library to throw exactly where upstream raises and to return exactly where it returns (`scripts/parity/README.md`, "What is generated and compared"). For a raise vY adds or moves, widen the model's draws in `scripts/parity/generate.py` across the new bound and add its class to the model's entry in `RAISES` (`GATED_RAISES` for a raise after the range warnings under `limit_inputs`); any other raise stops the script. The regenerated data then hold the raise-agreement cases on both sides of it. Choice-string, type and array-shape checks and non-finite inputs are not generated, and the mirrored tests cover them.

## 5. Parity pins and data

1. Follow `scripts/parity/README.md`, "When upstream is upgraded": the pin in `requirements.in`, the recompiled `requirements.txt`, the image rebuilt, numpy's dispatch targets if numpy moves, `Dockerfile`, and the README's table.
2. Regenerate every file in `tests/parity/data/`. Each header records the pinned versions, and the harness's pin check fails on a file left at vX.
3. Local data count only when they equal the **Parity data** workflow's artifact byte for byte (`scripts/parity/README.md`).
4. A test whose expected value vY changes, for a model an alignment ticket aligns, is marked `test.fails` with a comment naming that ticket. Its model's parity suite is marked `test.fails` too, through a list of those models added to `tests/parity.test.ts` and removed once they are aligned (`ALIGNED_LATER` in ca36668). Any other failure is reported, not marked.

## 6. Validation data

Upstream's `tests/conftest.py` pins a ref of `validation-data-comfort-models`. When it moves, move the library's pins with it: the default ref in `tests/models/comftest.ts`, `README.md`'s paragraph on the validation data (under "One thing to be careful about"), the comments in `scripts/parity/generate.py` that name a ref, and the pin in the feature's `.scratch/<feature>/spec.md`. Compare each file `comftest.ts` loads at the two refs byte for byte, read the data's CHANGELOG, and drop a fixture upstream drops.

## 7. Citations and target wording

- Every `path:line` into a file vY changes, in code, tests and registers: map each cited line from vX to vY, for one with a `difflib` script over the changed files. A citation whose content only moved is updated here; one whose content vY changed belongs to the alignment ticket.
- Each register row's upstream site (`docs/deviations/README.md`, "Register format").
- Each `// Mirrors pythermalcomfort vX` header moves to vY where upstream's test file is unchanged, and with its alignment otherwise.
- Every tracked mention of vX as the target becomes vY. A sentence that records a measurement made on vX keeps vX while it is still true there, and is re-measured or reworded otherwise. Git-ignored files follow too where they name the target: in `.scratch/<feature>/` the spec, the template and the open tickets, and the ADRs in `docs/adr/`; a decisions log keeps its history.

## 8. Upstream drafts

Drafts live in `.scratch/<feature>/upstream/NN-pythermalcomfort-<slug>.md`. Re-run each reproduction under vY in the parity image, and move its links to vY's tag with their new lines. A draft vY settles is reworded or dropped. Before drafting anything new, search upstream's open and closed issues and pull requests.

## 9. Finish

`npm run check:format`, `npm run lint`, `npm run build`, `npm test`, `npm run check:types:tests` and `npm run check:types` pass. The retarget commit changes no returned value, so its type has no `!`; an alignment commit that changes one has it (`CLAUDE.md`, commit messages).
