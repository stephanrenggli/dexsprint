# Roadmap

This file captures future improvements and follow-up ideas for DexSprint.
It is intentionally separate from the README so the README stays focused on the current project and how to use it.

## High Priority

- Split `app.js` into smaller modules such as state, rendering, data loading, settings, and audio
- Improve support for richer offline behavior, such as clearer cache status and optional fully bundled offline datasets
- Add additional game modes such as timed challenge, streak mode, or focused quizzes by generation or type

## Recently Completed

- Added milestone celebrations for completed generations and completed types
- Improved offline-first behavior with cached dataset fallback and stronger service worker caching
- Added configurable typo tolerance modes such as strict, normal, and forgiving

## Nice to Have

### Gameplay

- Add optional suggestions instead of always auto-accepting close matches
- Add more milestone and session stats such as best time, guesses per minute, and per-generation completion times
- Add hint options like first letter, generation, type, or silhouette hints

### UI / UX

- Refine the guess-input feedback model further, especially for compact and mobile layouts
- Add more subtle milestone celebrations for progress checkpoints beyond generation/type/full completion
- Improve the detail modal with richer presentation for type, size, abilities, and related data
- Add better loading and offline states such as clearer cache-aware messaging or skeleton states

### Data / Features

- Improve support for special forms such as mega evolutions, regional forms, gigantamax, and other alternate form categories
- Add more supported guess languages beyond English, German, and Spanish
- Offer a fully bundled offline dataset mode as an alternative to live-first PokeAPI loading

### Technical / Refactor

- Move theme definitions fully into CSS custom-property themes so early theme restore only sets theme ids and classes
- Add lightweight automated tests for normalization, typo matching, persistence restore, and filter/group behavior
- Introduce a clearer data abstraction layer for Pokemon metadata, localized names, forms, and derived groupings

## Notes

- Priorities may change as the project evolves
- This roadmap is a planning reference, not an issue tracker or a guarantee of implementation order
