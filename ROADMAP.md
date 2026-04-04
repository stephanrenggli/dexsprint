# Roadmap

This file captures future improvements and follow-up ideas for DexSprint.
It is intentionally separate from the README so the README stays focused on the current project and how to use it.

## High Priority

- Add a small automated test suite for normalization, typo matching, persistence restore, and progress encoding/decoding
- Improve support for richer offline behavior, such as clearer cache status and optional fully bundled offline datasets
- Decide whether DexSprint should stay shell-offline or become fully playable offline, then align caching and data loading with that choice
- Add additional game modes such as timed challenge or streak mode

## Current Risks

- Offline support is good for the shell, but gameplay and changelog data still depend on live network calls
- There is no dedicated test runner yet, so regressions in core logic would be easy to miss

## Nice to Have

### Gameplay

- Add daily challenge runs with a shared seed and optional personal streak tracking
- Add timed sprint mode with best-time and best-score tracking
- Add streak or survival mode where wrong guesses cost lives or end the run
- Add more focused quiz modes for regions or special forms
- Add hint options like first letter, generation, type, silhouette, cry, or Pokedex range hints
- Add combo scoring for consecutive correct guesses and fast input bonuses
- Add boss rounds for curated pools like starters, pseudo-legendaries, regional forms, or form collections
- Add evolution-line challenges where the player clears an entire line instead of only the base form
- Add milestone and session stats such as best time, guesses per minute, accuracy, and per-generation completion times

### Replayability

- Add infinite mode that keeps generating new Pokemon after a set is cleared
- Add shareable challenge codes and seeded runs so players can replay the same session
- Add ghost races against a previous best time or best score
- Add unlockable modifiers that change the rules or difficulty as the player progresses

### UI / UX

- Add more visible session feedback such as inline confirmations, recent guess history, and progress-to-next-milestone indicators
- Add keyboard shortcuts for frequent actions like revealing the next Pokemon, toggling hints, opening settings, or skipping
- Keep input focus more aggressively after correct guesses and after closing modals
- Add clearer sprite loading and fallback states so missing assets do not feel like dead space
- Add stronger per-setting explanations and the ability to pin preferred modes or presets
- Add stronger visual distinction for completed and guessed states, especially in compact mode
- Add clearer loading and offline states such as skeleton screens, cache status messaging, and explicit retry fallback copy
- Add progress preloading for the most likely data in the selected mode or filter so the app feels faster
- Add stronger mobile and accessibility polish such as larger tap targets, better focus states, and safer modal dismissal behavior

### Data / Features

- Add more supported guess languages beyond English, German, and Spanish
- Offer a fully bundled offline dataset mode as an alternative to live-first PokeAPI loading

### Quality of Life

- Add paste-and-go support for trying multiple guesses quickly
- Add smarter autocomplete or recent-guess suggestions
- Add a better "you are here" indicator for progress by generation, type, or filter
- Add a continue-where-you-left-off prompt after refresh or revisit
- Add per-setting reset controls instead of requiring a full settings reset
- Add per-setting tooltips or short explanations for settings and modes
- Add a way to remember the last-used mode, filter, and theme more aggressively

### Technical / Refactor

- Add lightweight automated tests for filter/group behavior and related UI state transitions
- Introduce a clearer data abstraction layer for Pokemon metadata, localized names, forms, and derived groupings

## Notes

- Priorities may change as the project evolves
- This roadmap is a planning reference, not an issue tracker or a guarantee of implementation order
