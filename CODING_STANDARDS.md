# Coding standards

What a review checks a change against. Prettier, ESLint over `src/` and `tests/` (less `eslint.config.mjs`'s `UNLINTED`), strict `tsc`, the register cross-check and the parity suite already run in the pre-commit hook and CI; a review covers what they cannot.

## Where the rules live

- **Upstream fidelity and the deviation register:** `docs/deviations/README.md` (the whitelist, the deviation classes, the additions, the row format, the TS site's symbol and the citing-comment form). Every difference from pythermalcomfort v4.8.0's `.py` is whitelisted or has a row.
- **Names, files, file order, exports:** ADR 0021, with its 2026-10-27 amendment.
- **Inputs, `INFO.inputs`, error classes and messages:** ADR 0022, with its 2026-10-27 amendment.
- **Outputs:** ADR 0023, with its 2026-10-27 amendment. **Model info and warnings rows:** ADR 0024, with its 2026-10-27 amendment.
- **TSDoc, mapped from upstream's docstring:** ADR 0025, with its 2026-10-26 and 2026-10-27 amendments.
- **The add-a-model steps:** `docs/contributing.md`, with `heat_index_rothfusz` as the worked example.
- **Arithmetic on upstream's executed path:** ADR 0009.
- **Mirrored tests:** the header of `tests/models/testUtils.ts`.
- **Terms:** `GLOSSARY.md`; each entry's _Avoid_ list names the words a change replaces.

The ADRs live in `docs/adr/`, which git ignores; from a worktree, read them at the main checkout.

## Judgement rules

- **Evidence in comments.** A factual claim in a comment, a test title or an upstream issue draft carries its source: an upstream `path:line` at v4.8.0, a doc with its scope, or the measurement with its scope (version, platform, case count).
- **Live referents.** A comment that names a symbol, file or line names one that exists and still means it; a rename or an unexport updates every comment that names the old form.
- **Upstream's words.** Copied TSDoc and code comments read as upstream's text, and so does upstream's own message about a value; any other change to them is whitelisted or a register row. Which messages are the library's is ADR 0022's rule; deviations `_shared-10` (the parse's), `_shared-23` (`units_converter`'s) and `_shared-31` (`transpose_sharp_altitude`'s) list them.
- **Only upstream's words in a model file.** A model file holds upstream's docstrings and code comments, and beside them at most a one-sentence comment saying why the code differs from upstream's line where the reason is not evident, which may cite the register row; a whitelisted translation gets none. What the library adds is documented once, in the shared types (`ModelOutputs`, `ModelWarning`, `ModelInfo`); every other note is a register row or a line of its Notes section. Elsewhere, a `//` comment is one sentence; anything longer is the TSDoc of the declaration it explains.
- **No shallow wrappers.** A function the library adds does more than forward to another; where it would only forward, the caller calls the target. A function upstream has keeps its name, whatever its body here: a public one is the API, and a private one (`_mapping`, `_set_for_cooling_effect`) keeps upstream's call sites and docstring comparable line by line.
- **Tests at the public surface.** Behaviour tests import through the subpath indexes (seam S1); the mirrored `describe` compares upstream's fields only.
