# DexSprint

DexSprint is a browser-based Pokémon name quiz inspired by [pkmnquiz.com](https://pkmnquiz.com/). Type Pokémon names, reveal sprites as you find them, and keep filling out the Pokédex at your own pace.

This project was fully vibe-coded using Codex. Review the code carefully before relying on it.

## What You Can Do

- Guess Pokémon names in English, German, and Spanish
- Choose how strict the typo handling should be
- Turn close matches into suggestions, or auto-accept them
- Play in Challenge, Weekly Challenge, or Practice mode
- Filter and group Pokémon by generation/region and type
- Reveal sprites, including shiny sprites if you want them
- Switch on optional outlines, dark mode, Dex numbers, and themed color palettes
- Open detailed Pokémon cards with types, stats, abilities, genus, cries, and related info
- Track progress, milestones, and achievements
- Save your progress and settings in the browser
- Share progress with a link or QR code
- Create or join private multiplayer rooms with host-controlled room settings and synchronized timers
- Use compact mode for a denser layout on smaller screens

## Getting Started

The browser app runs directly from `site/`. Serve that folder over HTTP and open it in your browser.

```bash
python -m http.server 8080 --directory site
```

Then visit:

```text
http://localhost:8080/
```

If you want multiplayer, run the Node server instead:

```bash
npm install
npm run dev:server
```

The server listens on `http://localhost:3000`.

## Development

### Repository Layout

- `site/` is the browser app and static assets
- `site/js/app.js` is the browser bootstrap entrypoint
- `site/js/core/` handles app state, persistence, timers, and startup
- `site/js/domain/` contains pure guessing, text, and filter logic
- `site/js/services/` handles data loading, audio, QR codes, and multiplayer client wiring
- `site/js/features/` contains the gameplay, settings, modal, study, and multiplayer controllers
- `site/js/ui/` holds reusable DOM and presentation helpers
- `server/` is the TypeScript multiplayer server
- `shared/` contains shared protocol and text logic used by the server and tests
- `site/sw.js` caches the app shell for offline use and should be updated when browser modules move

### Commands

```bash
npm install
npm run dev:server       # start the TypeScript server in watch mode
npm run build:server     # compile the server to dist/
npm run typecheck        # type-check shared and server code
npm run test:server      # run server and shared tests
npm run release:dry-run  # preview the release automation
```

### Multiplayer Endpoints

- `GET /health`
- `GET /api/catalog/version`
- `GET /api/catalog`
- `POST /api/rooms`
- `POST /api/rooms/:code/join`
- `GET /ws/rooms/:roomId?sessionToken=...`

### Browser Debug Helpers

Debug helpers available in the browser console:

```javascript
dexsprintDebug.unlockGeneration("kanto")
dexsprintDebug.unlockType("fire")
dexsprintDebug.unlockPokemon("pikachu")
dexsprintDebug.unlockAll()
dexsprintDebug.forceWeeklyMode(0)
dexsprintDebug.clearSave()
```

## Credits

- Inspired by [pkmnquiz.com](https://pkmnquiz.com/)
- Built with data and assets from [PokeAPI](https://pokeapi.co/), [`pokeapi-js-wrapper`](https://github.com/PokeAPI/pokeapi-js-wrapper), [PokeAPI sprites](https://github.com/PokeAPI/sprites), and [PokeAPI cries](https://github.com/PokeAPI/cries)

## Disclaimer

Pokémon and Pokémon character names are trademarks of Nintendo, Creatures Inc., GAME FREAK Inc. and The Pokémon Company.

This is an unofficial fan project. It is not affiliated with or endorsed by Nintendo, Creatures Inc., GAME FREAK Inc., The Pokémon Company, or PokeAPI.
