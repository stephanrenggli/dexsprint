import { normalizeName } from "../domain/text.js";

export function createDebugController({
  state,
  unlockGeneration,
  unlockType,
  unlockPokemonByCanonical,
  unlockAllPokemon,
  resetQuiz,
  clearState,
  getDebugState,
  listDebugGenerations,
  listDebugTypes,
  forceWeeklyChallengeWeek
}) {
  function installDebugCommands() {
    window.dexsprintDebug = {
      help() {
        return {
          unlockGeneration,
          unlockType,
          unlockPokemon: this.unlockPokemon,
          unlockAll: this.unlockAll,
          resetQuiz,
          clearSave: this.clearSave,
          listGenerations: listDebugGenerations,
          listTypes: listDebugTypes,
          forceWeeklyMode: forceWeeklyChallengeWeek,
          state: getDebugState
        };
      },
      unlockGeneration,
      unlockType,
      unlockPokemon(value) {
        const canonical = state.meta.has(value)
          ? value
          : [...state.meta.keys()].find((name) => {
              const entry = state.meta.get(name);
              return (
                entry &&
                (entry.label.toLowerCase() === String(value || "").trim().toLowerCase() ||
                  name === normalizeName(value))
              );
            });
        if (!canonical) return false;
        return unlockPokemonByCanonical(canonical);
      },
      unlockAllPokemon,
      unlockAll: unlockAllPokemon,
      resetQuiz,
      clearSave() {
        clearState();
        resetQuiz();
      },
      listGenerations: listDebugGenerations,
      listTypes: listDebugTypes,
      forceWeeklyMode: forceWeeklyChallengeWeek,
      state: getDebugState
    };
  }

  return {
    installDebugCommands
  };
}
