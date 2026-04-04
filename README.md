# DexSprint

A browser-based Pokemon name quiz inspired by [pkmnquiz.com](https://pkmnquiz.com/).

You type Pokemon names and reveal their sprites as you find them. The app supports multiple layouts, persistent progress, multilingual guessing, themed UI modes, and detail popups backed by PokeAPI data.

See [ROADMAP.md](ROADMAP.md) for future improvements.

## Features

- Guess Pokemon names in English, German, and Spanish at the same time
- Configurable typo tolerance with strict, normal, and forgiving modes
- Optional suggestion mode for close matches instead of auto-accepting them
- Reveal sprites as you find each Pokemon
- Normal mode and compact mode
- Grouping and filtering by generation/region and type
- Optional outlines, shiny sprites, Pokedex ID display, dark mode, and type-based themes
- Pokemon cries with optional legacy cries
- Persistent game state and settings via `localStorage`
- Achievement badges in a modal with unlock notifications and progress cues
- Weekly rotating challenge themes generated from the current dex data
- Rich Pokemon detail modal with previous/next navigation, copy actions, replayable cries, sprite, types, genus, stat cards, abilities, and related species data
- Mobile-friendly single-page UI

## Tech

- Plain HTML, CSS, and JavaScript
- [PokeAPI](https://pokeapi.co/) data via a vendored copy of [`pokeapi-js-wrapper`](https://github.com/PokeAPI/pokeapi-js-wrapper)
- `pokeapi-js-wrapper-sw.js` for service-worker-based caching support
- Public Pokemon sprite and cry assets from PokeAPI-related repositories

## Running Locally

There is no build step.

Because the app uses a service worker, you should run it through a local web server instead of opening `index.html` directly.

The deployable app lives in `site/`.

Examples:

```powershell
python -m http.server 8080 --directory site
```

Then open:

```text
http://localhost:8080/
```

## Deployment

This project can be deployed as a static site on any basic web server, including Nginx.

For Dokploy, set the static publish directory to `site`.

Make sure:

- the contents of `site/` are served over HTTP(S), not opened as local files
- `site/index.html`, `site/js/app.js`, `site/css/styles.css`, `site/assets/favicon.svg`, and `site/pokeapi-js-wrapper-sw.js` are all published together at the same path
- `site/js/vendor/pokeapi-js-wrapper.js` is published with the rest of the static assets
- the service worker file remains reachable from the same scope as the app

## Releases

Semantic Release is configured through `.github/workflows/release.yml` and `.releaserc.json`.

When commits land on `main`, GitHub Actions will:

- calculate the next semantic version from conventional commits
- create or update `CHANGELOG.md`
- bump the version in `package.json`
- create a git tag like `v1.2.3`
- publish a GitHub Release with release notes

Notes:

- the workflow uses the default `GITHUB_TOKEN`, so repository Actions permissions must allow creating and pushing contents
- commit messages should keep using conventional commit prefixes like `feat:`, `fix:`, and `chore:`

## Notes

- Progress and settings persist in the browser until reset
- The app fetches live Pokemon data from PokeAPI on load
- If PokeAPI is unavailable, the app shows a retry action
- A `window.dexsprintDebug` console API is available for local testing, including helpers to unlock Pokemon, types, generations, force weekly challenge modes, or clear save data

Example console commands:

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
- Built using [PokeAPI](https://pokeapi.co/), [`pokeapi-js-wrapper`](https://github.com/PokeAPI/pokeapi-js-wrapper), and public sprite/cry assets
- Fully vibe-coded using Codex

## Disclaimer

Pokemon and Pokemon character names are trademarks of Nintendo, Creatures Inc., and GAME FREAK Inc.

This is a fan-made derivative project.
