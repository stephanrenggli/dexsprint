export function createQuizController({
  state,
  inputEl,
  autocorrectToggle,
  typoModeSelect,
  normalizeGuess,
  playCry,
  findTypoMatch,
  isStudyMode,
  advanceStudyCard,
  markPokemonFound,
  showRevealPreview,
  updateStats,
  updateSpriteCardsForPokemon,
  renderStudyPanel,
  saveState,
  showStatusHint,
  setInputStatus,
  startTimer,
  highlightPokemon,
  syncInlineStatusVisibility
}) {
  function findExactMatchAcrossAllPokemon(normalized) {
    if (!normalized) return null;
    for (const canonical of state.allNames) {
      const entry = state.meta.get(canonical);
      if (!entry) continue;
      if (normalizeGuess(entry.label) === normalized) {
        return { canonical, language: "en" };
      }
      const localizedNames = state.namesByLang.get(canonical);
      if (!localizedNames) continue;
      for (const [language, name] of localizedNames.entries()) {
        if (normalizeGuess(name) === normalized) {
          return { canonical, language };
        }
      }
    }
    return null;
  }

  function getExactGuessMatchState(normalized) {
    const exactMatch = findExactMatchAcrossAllPokemon(normalized);
    if (!exactMatch) return null;
    return {
      ...exactMatch,
      isActive: state.activeNames.has(exactMatch.canonical)
    };
  }

  function getGuessRejectionMessage(value, normalized) {
    const exactMatch = getExactGuessMatchState(normalized);
    if (exactMatch) {
      return exactMatch.isActive
        ? "That Pokemon is already found."
        : "That Pokemon is filtered out by the current filters.";
    }

    if (normalized.length < 3) {
      return "That guess is too short.";
    }

    if (/[a-z]/i.test(value || "")) {
      return "Too far off. Try English, German, or Spanish names.";
    }

    return "Too far off.";
  }

  function syncTypoSettings() {
    if (!typoModeSelect || !autocorrectToggle) return;
    const isStrict = typoModeSelect.value === "strict";
    autocorrectToggle.disabled = isStrict;
    autocorrectToggle.closest(".toggle")?.classList.toggle("toggle--disabled", isStrict);
  }

  function handleGuess(value) {
    const normalized = normalizeGuess(value);
    if (!normalized) return;
    if (isStudyMode()) {
      const currentName = state.studyCurrent;
      if (!currentName) return;
      if (state.studyRevealed) {
        showStatusHint("Use Next to continue.");
        return;
      }
      const canonical = state.guessIndex.get(normalized);
      if (canonical === currentName) {
        advanceStudyCard({ markFound: true });
        showStatusHint("Correct!");
        return;
      }
      const typoMatchValue = findTypoMatch(normalized);
      if (typoMatchValue === currentName) {
        advanceStudyCard({ markFound: true });
        const label = state.meta.get(currentName)?.label || "Pokemon";
        showStatusHint(`Corrected to ${label}.`);
        return;
      }
      const exactMatch = getExactGuessMatchState(normalized);
      if (exactMatch) {
        showStatusHint(
          exactMatch.isActive
            ? "That Pokemon is not this practice card."
            : "That Pokemon is filtered out by the current filters."
        );
        return;
      }
      showStatusHint("Not quite. Reveal it or press Next.");
      return;
    }

    const canonical = state.guessIndex.get(normalized);
    if (canonical && state.activeNames.has(canonical)) {
      const isNew = markPokemonFound(canonical);
      if (isNew) state.recentlyFound.add(canonical);
      updateStats();
      updateSpriteCardsForPokemon(canonical, { animateReveal: isNew });
      renderStudyPanel();
      if (isNew) {
        showRevealPreview(state.meta.get(canonical));
        playCry(canonical);
        saveState();
        showStatusHint("");
      } else {
        showStatusHint("Already found!");
        highlightPokemon(canonical);
      }
      return;
    }
    const typoMatchValue = findTypoMatch(normalized);
    if (typoMatchValue && state.activeNames.has(typoMatchValue)) {
      if (autocorrectToggle && !autocorrectToggle.checked) {
        const label = state.meta.get(typoMatchValue)?.label || "Pokemon";
        showStatusHint(`Did you mean ${label}?`);
        return;
      }
      const isNew = markPokemonFound(typoMatchValue);
      if (isNew) state.recentlyFound.add(typoMatchValue);
      updateStats();
      updateSpriteCardsForPokemon(typoMatchValue, { animateReveal: isNew });
      renderStudyPanel();
      if (isNew) {
        showRevealPreview(state.meta.get(typoMatchValue));
        playCry(typoMatchValue);
        saveState();
        const label = state.meta.get(typoMatchValue)?.label || "Pokemon";
        showStatusHint(`Corrected to ${label}.`);
      } else {
        showStatusHint("Already found!");
        highlightPokemon(typoMatchValue);
      }
      return;
    }
    const rejectionMessage = getGuessRejectionMessage(value, normalized);
    if (rejectionMessage) {
      showStatusHint(rejectionMessage);
    }
  }

  function handleInputEvent(e) {
    startTimer();
    const value = e.target.value;
    syncInlineStatusVisibility();
    if (!value.includes(",")) return;
    const parts = value.split(",");
    parts.slice(0, -1).forEach(handleGuess);
    e.target.value = parts[parts.length - 1];
    syncInlineStatusVisibility();
  }

  function handleLiveMatch(e) {
    const value = e.target.value;
    const normalized = normalizeGuess(value);
    syncInlineStatusVisibility();
    if (!normalized) return;
    if (state.guessIndex.has(normalized) && !state.guessPrefixes.has(normalized)) {
      handleGuess(value);
      e.target.value = "";
      syncInlineStatusVisibility();
    }
  }

  function handleKeydown(e) {
    if (e.key !== "Enter") return;
    startTimer();
    const value = e.target.value;
    handleGuess(value);
    e.target.value = "";
    syncInlineStatusVisibility();
  }

  return {
    syncTypoSettings,
    handleGuess,
    handleInputEvent,
    handleLiveMatch,
    handleKeydown,
    getGuessRejectionMessage,
    getExactGuessMatchState
  };
}
