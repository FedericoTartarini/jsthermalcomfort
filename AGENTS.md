# jsthermalcomfort

JavaScript port of pythermalcomfort (thermal comfort, thermal stress and thermophysiological indices), migrating every model to v2 TypeScript (ADR 0018).

- Tests are Vitest (ADR 0020): all with `npm test`, a single file with `npm test -- tests/<file>`, type-check with `npm run check:types:tests`.
- Comments are TSDoc, with sections in the upstream docstring's order, and TypeDoc builds the docs (ADRs 0020, 0025) from `typedoc.json` into the ignored `_site/`, with the hand-written pages in `docs/`, the local plugin `scripts/typedoc-plugin.mjs`, which changes what a page holds but never the source comments and copies the fonts from the `@fontsource` development dependencies into the site, and the browser script `docs/site.js`, which runs the header's theme button and collapses every module in the left column but the one of the function page shown. Only JOS3 (`src/models/JOS3.js`, `src/jos3_functions/` and `src/supa.js`) stays JavaScript with JSDoc; TypeDoc documents the `JOS3` class from that JSDoc, with its underscore-prefixed fields marked `@hidden`, and `src/jos3_functions/` and `src/supa.js` are not on the site (ADR 0018).
- Commit messages: `type(scope): summary`, scope the model or module touched, `!` after the scope for a breaking change, `type(#issue)` only when a GitHub issue exists.
- Releases: a pushed `v*` tag publishes to npm (README, "Releasing"). Tag prereleases `vX.Y.Z-next.N` on `development`, which go to the `next` dist-tag, and final versions on `main`.
- Follow pythermalcomfort's current release: adopt its logic, reference values _and_ naming by default; when upstream renames something, rename here too. Deviate only where TypeScript requires it or as an approved v2 addition; each deviation gets a row in `docs/deviations/<model>.md`, whose TS site names the file and the symbol (ADRs 0019, 0027).
- Every main model (`GLOSSARY.md`) moves to v2 TypeScript on a feature branch merged by pull request into `development`, which reaches `main` through a reviewed pull request, together with the functions it calls directly; every other export is TypeScript too, and only JOS3 is deferred and stays JavaScript (ADR 0018). Change a model's inputs or returned values only after a pythermalcomfort release has (ADR 0016). `docs/adr/` is git-ignored, so from a worktree read it at the main checkout.
- `lib/` is the published surface. Run `npm run build` after any change under `src/`: the `prepare` script builds only on `npm install`, pack and publish, so a consumer linked with `file:` keeps seeing the stale build until you do.
- Upstream sync: retargeting to a new pythermalcomfort release, which `.github/workflows/upstream-release.yml` reports weekly once it is on `main`; until then run `scripts/parity/check-upstream-release.sh` by hand. See `docs/agents/upstream-sync.md`.

## Agent skills

### Issue tracker

Local markdown under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
