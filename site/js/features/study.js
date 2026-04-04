import { TYPE_ID_MAP } from "../core/app-config.js";
import { DEFAULT_STATUS } from "../core/app-state.js";
import { renderTextChips, renderTypeChips } from "../ui/chips.js";

export function createStudyController({
  state,
  studyPanel,
  studyCard,
  studyActions,
  studySubtitle,
  studyCounter,
  studySprite,
  studySpriteWrap,
  studyName,
  studyMeta,
  studyTypes,
  studyRevealBtn,
  studyNextBtn,
  inputEl,
  paletteByType,
  getSpriteForEntry,
  setInputStatus,
  syncInlineStatusVisibility,
  playCry,
  markPokemonFound,
  updateStats,
  updateSpriteCardsForPokemon,
  showRevealPreview,
  saveState,
  isStudyMode
}) {
  function getStudyCandidates() {
    return state.names.filter((name) => !state.found.has(name));
  }

  function sampleRandomNames(source, count) {
    const pool = source.slice();
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, Math.min(count, pool.length));
  }

  function ensureStudyDeck() {
    const candidates = getStudyCandidates();
    const candidateSet = new Set(candidates);
    state.studyDeck = state.studyDeck.filter((name) => candidateSet.has(name));

    if (state.studyCurrent && !candidateSet.has(state.studyCurrent)) {
      state.studyCurrent = null;
      state.studyRevealed = false;
    }

    if (!state.studyCurrent && state.studyDeck.length) {
      state.studyCurrent = state.studyDeck.shift();
      state.studyRevealed = false;
    }

    if (!state.studyCurrent && candidates.length) {
      state.studyDeck = sampleRandomNames(candidates, candidates.length);
      state.studyCurrent = state.studyDeck.shift() || null;
      state.studyRevealed = false;
    }
  }

  function renderStudyMeta(entry) {
    if (!studyMeta) return;
    const values = [];
    if (entry?.dexId) {
      values.push(`#${String(entry.dexId).padStart(4, "0")}`);
    }
    if (entry?.generation) {
      values.push(entry.generation);
    }
    renderTextChips(studyMeta, values, "study-card__meta-chip");
  }

  function renderStudyTypes(entry) {
    if (!studyTypes) return;
    renderTypeChips(studyTypes, entry?.types, getTypeId);
  }

  function getTypeId(typeName) {
    return TYPE_ID_MAP[typeName] || 1;
  }

  function getStudyScenePalette(entry) {
    const types = entry?.types || [];
    const primary = paletteByType[types[0]] || paletteByType.Normal;
    const secondary = paletteByType[types[1]] || primary;

    return {
      sky: primary.sky,
      sky2: secondary.sky2,
      ground: primary.ground,
      ground2: secondary.ground2,
      shadow: primary.shadow
    };
  }

  function applyStudyScene(entry) {
    if (!studySpriteWrap) return;
    const palette = getStudyScenePalette(entry);
    studySpriteWrap.style.setProperty("--study-sky", palette.sky);
    studySpriteWrap.style.setProperty("--study-sky-2", palette.sky2);
    studySpriteWrap.style.setProperty("--study-ground", palette.ground);
    studySpriteWrap.style.setProperty("--study-ground-2", palette.ground2);
    studySpriteWrap.style.setProperty("--study-shadow", palette.shadow);
  }

  function getMaskedStudyName(label) {
    return [...(label || "")]
      .map((char) => (/\s/.test(char) ? char : "?"))
      .join("");
  }

  function renderStudyName(label, { revealed = false, animate = false } = {}) {
    if (!studyName) return;
    if (studyName._revealTimer) {
      clearTimeout(studyName._revealTimer);
      studyName._revealTimer = null;
    }
    studyName.dataset.revealed = revealed ? "true" : "false";
    studyName.classList.remove("study-card__name--reveal");

    const text = label || "";
    if (!revealed) {
      studyName.textContent = getMaskedStudyName(text);
      return;
    }

    if (!animate) {
      studyName.textContent = text;
      return;
    }

    const chars = [...text];
    const revealedChars = chars.map((char) => (/\s/.test(char) ? char : "?"));
    const revealIndexes = chars
      .map((char, index) => (/\s/.test(char) ? -1 : index))
      .filter((index) => index >= 0);
    let revealStep = 0;

    studyName.textContent = revealedChars.join("");
    studyName.classList.add("study-card__name--reveal");

    const tick = () => {
      if (!studyName) return;
      const index = revealIndexes[revealStep];
      if (typeof index !== "number") {
        studyName.textContent = text;
        studyName.classList.remove("study-card__name--reveal");
        studyName._revealTimer = null;
        return;
      }
      revealedChars[index] = chars[index];
      studyName.textContent = revealedChars.join("");
      revealStep += 1;
      studyName._revealTimer = setTimeout(tick, 42);
    };

    studyName._revealTimer = setTimeout(tick, 42);
  }

  function clearStudyNameReveal() {
    if (!studyName) return;
    if (studyName._revealTimer) {
      clearTimeout(studyName._revealTimer);
      studyName._revealTimer = null;
    }
    studyName.classList.remove("study-card__name--reveal");
  }

  function renderStudyPanel() {
    if (!studyPanel) return;

    const active = isStudyMode();
    studyPanel.hidden = !active;
    if (!active) {
      clearStudyNameReveal();
      syncInlineStatusVisibility();
      return;
    }

    ensureStudyDeck();
    const candidates = getStudyCandidates();
    const currentName = state.studyCurrent;
    const entry = currentName ? state.meta.get(currentName) : null;

    if (!entry) {
      clearStudyNameReveal();
      if (studyCard) studyCard.hidden = true;
      if (studyActions) studyActions.hidden = true;
      if (studySubtitle) {
        studySubtitle.textContent = state.names.length
          ? "Everything here is found."
          : "Adjust your filters.";
      }
      if (studyCounter) studyCounter.textContent = "0 Pokemon left";
      if (studySprite) {
        studySprite.removeAttribute("src");
        studySprite.alt = "";
      }
      applyStudyScene(null);
      if (studyName) studyName.textContent = "";
      setInputStatus(
        state.names.length ? "All Pokemon in this filtered pool are already found." : DEFAULT_STATUS
      );
      renderStudyMeta(null);
      renderStudyTypes(null);
      return;
    }

    if (studyCard) studyCard.hidden = false;
    if (studyActions) studyActions.hidden = false;
    if (studySubtitle) {
      studySubtitle.textContent = state.studyRevealed
        ? "Answer revealed"
        : "Guess from the clues";
    }
    if (studyCounter) {
      const remaining = new Set([...candidates, ...state.studyDeck, currentName]).size;
      studyCounter.textContent = `${remaining} Pokemon left`;
    }
    if (studySprite) {
      studySprite.src = getSpriteForEntry(entry);
      studySprite.alt = state.studyRevealed ? entry.label : "Study Pokemon";
    }
    applyStudyScene(entry);
    renderStudyMeta(entry);
    renderStudyTypes(entry);
    if (studyName) {
      const shouldAnimate = state.studyRevealed && studyName.dataset.lastReveal !== currentName;
      renderStudyName(entry.label, {
        revealed: state.studyRevealed,
        animate: shouldAnimate
      });
      studyName.dataset.lastReveal = state.studyRevealed ? currentName : "";
    }
    if (!inputEl?.value.trim()) {
      setInputStatus(DEFAULT_STATUS);
    }
    if (studyRevealBtn) studyRevealBtn.disabled = state.studyRevealed;
    if (studyNextBtn) studyNextBtn.disabled = false;
  }

  function advanceStudyCard({ markFound = false, repeat = false } = {}) {
    const currentName = state.studyCurrent;
    if (!currentName) return;

    if (markFound && markPokemonFound(currentName)) {
      state.recentlyFound.add(currentName);
      showRevealPreview(state.meta.get(currentName));
      playCry(currentName);
    }

    const candidates = getStudyCandidates().filter((name) => name !== currentName);
    const candidateSet = new Set(candidates);
    state.studyDeck = state.studyDeck.filter((name) => candidateSet.has(name));
    if (repeat && candidateSet.has(currentName)) {
      state.studyDeck.push(currentName);
    }

    state.studyCurrent = state.studyDeck.shift() || null;
    if (!state.studyCurrent && candidates.length) {
      state.studyDeck = sampleRandomNames(candidates, candidates.length);
      state.studyCurrent = state.studyDeck.shift() || null;
    }
    state.studyRevealed = false;
    if (inputEl) inputEl.value = "";
    updateStats();
    if (markFound) {
      updateSpriteCardsForPokemon(currentName, { animateReveal: true });
    }
    renderStudyPanel();
    saveState();
  }

  return {
    getStudyCandidates,
    ensureStudyDeck,
    renderStudyMeta,
    renderStudyTypes,
    applyStudyScene,
    renderStudyName,
    renderStudyPanel,
    advanceStudyCard,
    clearStudyNameReveal
  };
}
