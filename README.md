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
- Pokemon detail modal with sprite, types, genus, size, and abilities
- Mobile-friendly single-page UI

## Tech

- Plain HTML, CSS, and JavaScript
- [PokeAPI](https://pokeapi.co/) data via [`pokeapi-js-wrapper`](https://github.com/PokeAPI/pokeapi-js-wrapper)
- `pokeapi-js-wrapper-sw.js` for service-worker-based caching support
- Public Pokemon sprite and cry assets from PokeAPI-related repositories

## Running Locally

There is no build step.

Because the app uses a service worker, you should run it through a local web server instead of opening `index.html` directly.

Examples:

```powershell
python -m http.server 8080
```

Then open:

```text
http://localhost:8080/
```

## Deployment

This project can be deployed as a static site on any basic web server, including Nginx.

Make sure:

- the site is served over HTTP(S), not opened as a local file
- `index.html`, `app.js`, `styles.css`, `favicon.svg`, and `pokeapi-js-wrapper-sw.js` are all published together at the same path
- the service worker file remains reachable from the same scope as the app

## Notes

- Progress and settings persist in the browser until reset
- The app fetches live Pokemon data from PokeAPI on load
- If PokeAPI is unavailable, the app shows a retry action

## Credits

- Inspired by [pkmnquiz.com](https://pkmnquiz.com/)
- Built using [PokeAPI](https://pokeapi.co/), [`pokeapi-js-wrapper`](https://github.com/PokeAPI/pokeapi-js-wrapper), and public sprite/cry assets
- Fully vibe-coded using Codex

## Disclaimer

Pokemon and Pokemon character names are trademarks of Nintendo, Creatures Inc., and GAME FREAK Inc.

This is a fan-made derivative project.
