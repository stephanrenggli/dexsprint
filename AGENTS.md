# DexSprint Instructions

This repository is a static Pokémon quiz app with the deployable site in `site/` and release tooling in the repo root. The codebase is ESM-only.

## Project Layout

- `site/index.html` is the app shell and initial theme/bootstrap markup.
- `site/js/app.js` is the browser entrypoint and bootstraps the feature modules under `site/js/`.
- `site/js/core/`, `site/js/domain/`, `site/js/features/`, `site/js/services/`, and `site/js/ui/` contain the actual runtime logic.
- `site/css/styles.css` contains the app styling.
- `site/sw.js` handles service-worker caching.
- `scripts/sync-site-version.mjs` keeps the visible site version in sync with `package.json`.
- The root-level `site/js/*.js` compatibility shims were removed. New code should import the concrete modules directly from the subdirectories above.

### High-Level Module Roles

- `site/js/app.js` wires the app together and registers the controllers.
- `site/js/core/` owns app state, persistence, timers, selectors, and bootstrap sequencing.
- `site/js/domain/` holds pure data and string/guess/filter logic.
- `site/js/services/` talks to external APIs or other non-UI infrastructure.
- `site/js/features/` contains feature controllers for quiz, study, settings, sharing, debug, and modal flows.
- `site/js/ui/` provides reusable DOM helpers and small presentation utilities.

## Working Rules

- Prefer `apply_patch` for manual file edits.
- Do not revert user changes or unrelated edits.
- Avoid destructive git commands unless the user explicitly asks.
- Keep changes ASCII-only unless the file already uses non-ASCII characters.
- This project has no build step, so changes should work directly in `site/`.

## App Notes

- The app depends on live PokeAPI data and GitHub release data for some features.
- Because the app uses a service worker, test it through a local web server instead of opening `index.html` directly.
- If you change the published version, update both `package.json` and the version markers in `site/index.html` using `npm run sync-site-version -- <version>`.
- `package.json` declares `"type": "module"`, so Node treats the repo's `.js` files as ESM.

## Good Defaults

- Preserve the existing static-site structure unless a change clearly benefits from deeper refactoring.
- When making behavior changes, check the effects on progress persistence, settings persistence, and service-worker caching.
- Keep `README.md` and `ROADMAP.md` aligned with the current implementation whenever setup, behavior, or priorities change.
- If a change affects how the project is run, deployed, or understood, update the docs in the same change rather than leaving a follow-up note.
- When adding or moving modules, update `site/sw.js` so the offline app shell stays in sync.

## Git Conventions

- Use conventional commits such as `feat:`, `fix:`, `chore:`, and `docs:`.
- Keep commits focused on a single concern whenever possible.
- When writing or updating a commit message, review the whole diff, not only the most recent change.
- Do not rewrite or amend existing commits unless the user explicitly asks.
- Avoid force-pushing or destructive history changes unless explicitly requested.
- If the worktree already contains unrelated changes, leave them alone and work around them.
