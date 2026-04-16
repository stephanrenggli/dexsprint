export function createProgressController({
  state,
  foundCount,
  compactFoundCount,
  progressBar,
  progressValue,
  saveState,
  stopTimer,
  renderProgressMilestones,
  triggerCompletionCelebration,
  clearCompletionCelebration,
  syncProgressLinkPreview,
  renderBadges,
  getCompletedGroupEntries,
  syncProgressUnlockCues,
  syncProgressMilestoneCues,
  isStudyMode
}) {
  function recalculateActiveFoundCount() {
    let count = 0;
    state.names.forEach((name) => {
      if (state.found.has(name)) count += 1;
    });
    state.activeFoundCount = count;
    return count;
  }

  function markPokemonFound(canonical) {
    if (!canonical || state.found.has(canonical)) return false;
    state.found.add(canonical);
    if (state.activeNames.has(canonical)) {
      state.activeFoundCount += 1;
    }
    state.badgeRevision += 1;
    return true;
  }

  function updateStats() {
    const filteredTotal = state.names.length;
    const found = state.activeFoundCount;
    if (foundCount) foundCount.textContent = `${found}/${filteredTotal}`;
    if (compactFoundCount) compactFoundCount.textContent = `${found}/${filteredTotal}`;
    const progress = filteredTotal === 0 ? 0 : (found / filteredTotal) * 100;
    if (progressBar) progressBar.style.width = `${progress.toFixed(1)}%`;
    if (progressValue) progressValue.textContent = `${Math.round(progress)}%`;
    renderProgressMilestones(filteredTotal, found);
    const isComplete = filteredTotal > 0 && found === filteredTotal;
    if (isComplete && !state.hasCelebratedCompletion) {
      if (state.timerId) {
        stopTimer();
        saveState({ immediate: true });
      }
      triggerCompletionCelebration();
      state.hasCelebratedCompletion = true;
    } else if (!isComplete) {
      state.hasCelebratedCompletion = false;
      clearCompletionCelebration();
    }
    syncProgressUnlockCues();
    syncProgressMilestoneCues();
    if (state.renderedBadgeRevision !== state.badgeRevision) {
      try {
        renderBadges();
        state.renderedBadgeRevision = state.badgeRevision;
      } catch (err) {
        console.error("Badge rendering failed", err);
      }
    }
    syncProgressLinkPreview();
  }

  function highlightPokemon(spriteGrid, canonical) {
    if (!canonical || !spriteGrid) return;
    const card = spriteGrid.querySelector(`.sprite-card[data-pokemon="${canonical}"]`);
    if (!card) return;
    card.classList.remove("sprite-card--highlight");
    void card.offsetWidth;
    card.classList.add("sprite-card--highlight");
    setTimeout(() => {
      card.classList.remove("sprite-card--highlight");
    }, 600);
  }

  function showRevealPreview(revealPill, revealPillImg, revealPillLabel, getSpriteForEntry, entry) {
    if (!entry || !revealPill) return;
    if (revealPillImg) {
      revealPillImg.src = getSpriteForEntry(entry);
      revealPillImg.alt = entry.label || "Revealed Pokemon";
    }
    if (revealPillLabel) revealPillLabel.textContent = entry.label || "Pokemon";

    revealPill.hidden = false;
    revealPill.classList.remove("is-active");
    void revealPill.offsetWidth;
    revealPill.classList.add("is-active");
    clearTimeout(revealPill._hideTimer);
    revealPill._hideTimer = setTimeout(() => {
      revealPill.classList.remove("is-active");
      revealPill.hidden = true;
    }, 1150);
  }

  function getDebugState() {
    return {
      total: state.names.length,
      found: state.activeFoundCount,
      remaining: state.names.length - state.activeFoundCount,
      practiceMode: isStudyMode(),
      currentEntry: state.activeEntry ? state.activeEntry.label : null,
      completedGenerations: getCompletedGroupEntries(state.generationIndex),
      completedTypes: getCompletedGroupEntries(state.typeIndex),
      weeklyChallengeWeekOverride: state.weeklyChallengeWeekOverride
    };
  }

  return {
    recalculateActiveFoundCount,
    markPokemonFound,
    updateStats,
    highlightPokemon: (spriteGrid, canonical) => highlightPokemon(spriteGrid, canonical),
    showRevealPreview: (revealPill, revealPillImg, revealPillLabel, getSpriteForEntry, entry) =>
      showRevealPreview(revealPill, revealPillImg, revealPillLabel, getSpriteForEntry, entry),
    getDebugState
  };
}
