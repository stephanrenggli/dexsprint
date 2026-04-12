# DexSprint Instructions

A browser-based Pokémon name quiz. The repo has two parts:
- **`site/`** — static ESM browser app (no build step)
- **`server/`** / **`shared/`** — TypeScript multiplayer server (compiled to `dist/`)

## Project Layout

### Browser (`site/`)

- `site/index.html` — app shell and initial markup
- `site/js/app.js` — browser entrypoint, registers all feature controllers
- `site/js/core/` — app state, persistence, timers, selectors, bootstrap sequencing
- `site/js/domain/` — pure data and string/guess/filter logic
- `site/js/services/` — external API calls and infrastructure
- `site/js/features/` — quiz, study, settings, sharing, debug, modals, multiplayer, weekly challenge
- `site/js/ui/` — reusable DOM helpers and presentation utilities
- `site/css/styles.css` — app styling
- `site/sw.js` — service-worker caching; update this when adding/moving browser modules
- `scripts/sync-site-version.mjs` — syncs version from `package.json` to `site/index.html`

### Server (`server/` / `shared/`)

- `server/src/index.ts` — server entrypoint (Fastify + WebSocket)
- `server/src/rooms/` — room state management
- `server/src/realtime/` — WebSocket room handling
- `server/src/catalog/` — PokeAPI catalog loading and storage
- `shared/src/` — shared protocol types, guess logic, and text utilities (used by both server and tests)

### Current Multiplayer Behavior

- The host controls multiplayer room settings, including group-by and room filters, from the multiplayer modal.
- The sprite-board filter bar stays hidden while a room is active; guests should not see or edit those controls.
- Multiplayer reset is host-only and clears room progress, timer state, and the room event log.
- Leaving a room marks the player disconnected instead of deleting the player record, so same-session rejoin can reuse the existing identity.
- The room timer starts on the first accepted guess, and multiplayer snapshots are the source of truth for synchronized reveals and badges.

## Developer Commands

```bash
# Browser (static, no build step) — serve through a local server
python -m http.server 8080 --directory site

# Server (development)
npm run dev:server       # tsx watch mode
npm run build:server     # compile TypeScript to dist/
npm start                # run compiled server (http://localhost:3000)

# TypeScript
npm run typecheck        # type-check server and shared code

# Tests (server + shared)
npm run test:server      # runs *.test.ts files via node --test

# Release
npm run release          # semantic-release (increments version, updates CHANGELOG.md, creates git tag)
```

## Key Constraints

- Browser code is **plain ESM JavaScript** — no TypeScript, no bundler. Changes work directly in `site/`.
- Server code is **TypeScript** with `moduleResolution: NodeNext`, output to `dist/`.
- `package.json` has `"type": "module"` — all `.js` files in the repo root are ESM.
- The service worker requires serving over HTTP(S), not `file://`. Always test via a local server.
- Release automation (`@semantic-release/exec`) runs `npm run sync-site-version -- <version>` to patch `site/index.html` on each release.

## Good Defaults

- When adding browser modules, add them to `site/sw.js` APP_SHELL array for offline support.
- Preserve the static-site structure unless a change clearly benefits from refactoring.
- Keep `README.md` and `ROADMAP.md` in sync with implementation.
- The app depends on live PokeAPI data — some features fail gracefully if the API is unavailable.
- In multiplayer UI work, avoid introducing separate guest/host code paths unless they are required by the room model; prefer shared state with host-only enablement.

## Git Conventions

- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`.
- Keep commits focused on a single concern.
- Do not rewrite or amend commits unless the user explicitly asks.
