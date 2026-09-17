# jsthermalcomfort

JavaScript port of pythermalcomfort (thermal comfort, thermal stress and thermophysiological indices), migrating to TypeScript one module at a time. Match pythermalcomfort's behaviour and reference values when porting.

- Tests are Jest under `--experimental-vm-modules`; single file: `npm test -- tests/<file>`. Type-check tests with `npm run check:types:tests`.
- Converted `.ts` files keep the original JSDoc verbatim: documentation.js builds the docs from the JSDoc, not the TS annotations.
- Commit messages: `type(#issue): summary`, semantic-release on `main`. Use `gh` for issues and PRs.

## Agent skills

### Issue tracker

Local markdown under `.scratch/<feature>/` (never GitHub Issues or PRs). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
