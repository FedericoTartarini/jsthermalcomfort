# jsthermalcomfort

JavaScript port of pythermalcomfort (thermal comfort, thermal stress and thermophysiological indices), migrating to TypeScript one module at a time.

- Tests are Jest under `--experimental-vm-modules`; single file: `npm test -- tests/<file>`. Type-check tests with `npm run check:types:tests`.
- Converted `.ts` files keep the original JSDoc verbatim: documentation.js builds the docs from the JSDoc, not the TS annotations.
- Commit messages: `type(#issue): summary`, semantic-release on `main`.
- Follow pythermalcomfort's current release: adopt its logic, reference values _and_ naming by default; when upstream renames something, rename here too. Deviate only where TypeScript requires it, and write the reason at the site.
- `lib/` is the published surface. Run `npm run build` after any change under `src/`: `prepack` only fires on publish, so a consumer linked with `file:` keeps seeing the stale build until you do.

## Agent skills

### Issue tracker

Local markdown under `.scratch/<feature>/` (never GitHub Issues or PRs). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
