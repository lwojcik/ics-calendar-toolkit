# AGENTS.md

`ics-calendar-toolkit`: TypeScript library (ESM, Node >= 24) for building, reading and validating `.ics` feeds. For using the package, read `llms.txt` and `README.md`. This file is for changing it.

## Commands

```sh
npm ci
npm test              # TZ=UTC vitest; 100% coverage is enforced
npm run typecheck
npm run lint
npm run format:check  # npm run format to fix
npm run build         # tsdown -> dist/
```

Run `format:check`, `typecheck`, `lint` and `test` before finishing; CI runs the same.

## Layout

- `index.ts`: the public API. Re-exports every module in `src/`; anything not exported here is not public.
- `src/`: one module per concern (`events`, `sequence`, `reader`, `duplicates`, `ics`, `dates`, `text`, `validator/`). Imports use the `@ics/*` alias.
- `examples/`: the README snippets, as real files. `test/unit/examples.test.ts` runs them. Change the example and the README together.
- `test/unit/`: Vitest, one file per module.

## Rules

- **Output is byte-stable.** Same input must give the same bytes. Property order, folding and escaping changes are breaking changes; snapshot tests guard them.
- **No comments in source.** ESLint forbids them (`no-comments/disallowComments`). Express intent with names and types. Put explanations in `README.md` / `llms.txt` instead.
- **Style is lint-enforced**: functional style, no `let`/loops without a justified disable, 80-column lines. Run `npm run lint` rather than guessing.
- **Pure functions.** Library functions do no I/O and take state in and out (see `trackSequences`).
- **Bad event data is reported, not thrown.** `buildFeed` returns `invalid`; `validate` returns `errors`.
- **Commits** follow Conventional Commits (commitlint + husky); PR titles are checked too. Releases are automated from tags via release-it.
- When the public API changes, update `llms.txt` and `README.md` in the same change.
