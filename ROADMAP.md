# Roadmap

This file captures future improvements and follow-up ideas for DexSprint.
It is intentionally separate from the README so the README stays focused on the current project and how to use it.

## High Priority

- Add a small automated test suite for normalization, typo matching, persistence restore, and progress encoding/decoding
- Improve support for richer offline behavior, such as clearer cache status and optional fully bundled offline datasets
- Decide whether DexSprint should stay shell-offline or become fully playable offline, then align caching and data loading with that choice
- Add additional game modes such as timed challenge, streak mode, or focused quizzes by generation or type
- Reduce DOM coupling by moving startup wiring and shared UI helpers into narrower modules

## Current Risks

- Offline support is good for the shell, but gameplay and changelog data still depend on live network calls
- There is no dedicated test runner yet, so regressions in core logic would be easy to miss

## Nice to Have

### Gameplay

- Add more milestone and session stats such as best time, guesses per minute, and per-generation completion times
- Add hint options like first letter, generation, type, or silhouette hints

### UI / UX

- Add more subtle milestone celebrations for progress checkpoints beyond generation/type/full completion
- Add better loading and offline states such as clearer cache-aware messaging or skeleton states

### Data / Features

- Improve support for special forms such as mega evolutions, regional forms, gigantamax, and other alternate form categories
- Add more supported guess languages beyond English, German, and Spanish
- Offer a fully bundled offline dataset mode as an alternative to live-first PokeAPI loading

### Technical / Refactor

- Add lightweight automated tests for normalization, typo matching, persistence restore, and filter/group behavior
- Introduce a clearer data abstraction layer for Pokemon metadata, localized names, forms, and derived groupings

## Notes

- Priorities may change as the project evolves
- This roadmap is a planning reference, not an issue tracker or a guarantee of implementation order
